import os
from datetime import datetime, timedelta
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from motor.motor_asyncio import AsyncIOMotorClient
from rag_engine import RAGSystem
from chatbot import GeminiBot
from dotenv import load_dotenv
from auth import (
    create_access_token, get_password_hash, verify_password, 
    ACCESS_TOKEN_EXPIRE_MINUTES, oauth2_scheme, get_user,
    SECRET_KEY, ALGORITHM
)
from models import (
    ChatContractRequest, ChatRequest, ConfigRequest, ChatEntry, FileRecord,
    Token, UserCreate, User, UserInDB, Message, Conversation
)
from email_utils import send_verification_email, send_password_reset_email
import secrets
from jose import JWTError, jwt
from security import encrypt_key, decrypt_key
import requests
import tempfile
import re
import json
from docxtpl import DocxTemplate

load_dotenv()

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL = os.getenv("API_URL", "http://localhost:8000")

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET")
SUPABASE_LINK_BUCKET = os.getenv("SUPABASE_LINK_BUCKET")
client = AsyncIOMotorClient(MONGO_URI)
db = client.legal_chatbot
chat_collection = db.chats
conversations_collection = db.conversations
users_collection = db.users



def download_template(url, path="template.docx"):
    r = requests.get(url)
    r.raise_for_status()

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
    tmp.write(r.content)
    tmp.close()
    doc = DocxTemplate(tmp.name)
    doc.save("output_template.docx")
    txt = "\n".join([p.text for p in doc.docx.paragraphs if p.text])

    vars = set(re.findall(r"{{(.*?)}}", txt))

    return {var_name: "" for var_name in vars}
def fill_contract(template_path, data, output_path="contract.docx"):
    """
    Điền dữ liệu vào template và lưu file kết quả (ghi đè nếu file đã tồn tại).

    Args:
        template_path (str): Đường dẫn đến file template.
        data (dict): Dữ liệu để điền vào các trường.
        output_path (str): Đường dẫn lưu file kết quả (mặc định là 'contract.docx').

    Returns:
        str: Đường dẫn của file kết quả.
    """
    doc = DocxTemplate(template_path)
    doc.render(data)  # Điền dữ liệu vào template
    #nếu file đã tồn tai thì xóa đi
    if os.path.exists(output_path):
        os.remove(output_path)
    doc.save(output_path)  # Ghi đè file nếu đã tồn tại
    return output_path
@app.on_event("startup")
async def startup_db_client():
    try:
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

    # Check Email Config on Startup
    email_from = os.getenv("EMAIL_FROM")
    if email_from:
        print(f"Email configuration detected. Sending from: {email_from}")
    else:
        print("WARNING: EMAIL_FROM is not set. Email sending will fail.")

# Initialize RAG System (System-wide Pinecone)
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "legal-chatbot")

rag_system = None
if PINECONE_API_KEY and PINECONE_INDEX_NAME:
    rag_system = RAGSystem(PINECONE_API_KEY, PINECONE_INDEX_NAME)
    rag_system.load_index()

# Dependency to get DB
async def get_db():
    return db

# Dependency to get current user (Re-implemented here to access global 'db')
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await get_user(db, username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_admin_user(current_user: UserInDB = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email not verified. Please check your email.",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register", response_model=User)
async def register_user(user: UserCreate):
    existing_user = await get_user(db, user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    
    verification_token = secrets.token_urlsafe(32)
    
    user_in_db = UserInDB(
        **user.dict(),
        hashed_password=hashed_password,
        role="user", # Default role
        is_verified=False,
        verification_token=verification_token
    )
    
    # First user is admin (optional logic, or manually set in DB)
    if await db.users.count_documents({}) == 0:
        user_in_db.role = "admin"
        user_in_db.is_verified = True # Auto verify first admin for convenience

    await db.users.insert_one(user_in_db.dict())
    
    if not user_in_db.is_verified and user.email:
        # Send verification email
        try:
            send_verification_email(user.email, verification_token)
        except Exception as e:
            # Rollback: Delete the user if email sending fails
            # Delete by username since it is unique and we have it readily available
            await db.users.delete_one({"username": user.username})
            raise HTTPException(status_code=400, detail=f"Failed to send verification email: {str(e)}")
        
    return user_in_db

@app.get("/verify-email")
async def verify_email(token: str):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "verification_token": None}}
    )
    return {"message": "Email verified successfully"}

@app.post("/forgot-password")
async def forgot_password(email: str = Body(..., embed=True)):
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if user exists
        return {"message": "If email exists, reset link sent"}
    
    reset_token = secrets.token_urlsafe(32)
    expiry = datetime.utcnow() + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
    )
    
    send_password_reset_email(email, reset_token)
    return {"message": "If email exists, reset link sent"}

@app.post("/reset-password")
async def reset_password(token: str = Body(...), new_password: str = Body(...)):
    user = await db.users.find_one({"reset_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    if user.get("reset_token_expiry") and user["reset_token_expiry"] < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token expired")
    
    hashed_password = get_password_hash(new_password)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "reset_token": None,
            "reset_token_expiry": None
        }}
    )
    return {"message": "Password reset successfully"}

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.put("/users/me/gemini")
async def update_gemini_key(key: str = Body(..., embed=True), current_user: UserInDB = Depends(get_current_active_user)):
    encrypted_key = encrypt_key(key)
    await db.users.update_one({"username": current_user.username}, {"$set": {"gemini_api_key": encrypted_key}})
    return {"status": "success"}

@app.post("/users/me/upgrade")
async def upgrade_subscription(current_user: UserInDB = Depends(get_current_active_user)):
    # Request upgrade instead of immediate grant
    await db.users.update_one({"username": current_user.username}, {"$set": {"upgrade_requested": True}})
    return {"status": "success", "message": "Yêu cầu nâng cấp đã được gửi. Vui lòng chờ Admin duyệt."}

@app.put("/admin/users/{username}/subscription")
async def update_user_subscription(username: str, subscription_type: str = Body(..., embed=True), current_user: User = Depends(get_current_admin_user)):
    if subscription_type not in ["free", "premium"]:
        raise HTTPException(status_code=400, detail="Invalid subscription type")
        
    update_data = {"subscription_type": subscription_type}
    if subscription_type == "premium":
        update_data["upgrade_requested"] = False # Clear request if approved
        
    result = await users_collection.update_one({"username": username}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {"status": "success", "message": f"User {username} subscription set to {subscription_type}"}

@app.post("/chat")
async def chat(request: ChatRequest, current_user: UserInDB = Depends(get_current_active_user)):
    global rag_system

    # Use user's Gemini Key if available, else system's (if you want to allow that)
    # Prompt says: "User just adds gemini key".
    user_gemini_key = current_user.gemini_api_key
    
    final_gemini_key = None
    
    if user_gemini_key:
        final_gemini_key = decrypt_key(user_gemini_key)
    
    if not final_gemini_key:
        # Check subscription and limits
        if current_user.subscription_type == "premium":
             # Use system key (from env or config)
             # For now, assuming system key is set in env GOOGLE_API_KEY or similar, 
             # BUT chatbot.py uses the key passed to it. 
             # We need a system-wide key. Let's assume one is in env.
             final_gemini_key = os.getenv("GOOGLE_API_KEY")
             if not final_gemini_key:
                 raise HTTPException(status_code=503, detail="System Gemini Key not configured.")
        else:
            # Free user - Check limits
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            last_usage = current_user.last_usage_date
            
            if last_usage and last_usage >= today:
                if current_user.daily_usage_count >= 5:
                    raise HTTPException(status_code=402, detail="Daily limit reached. Please upgrade or add your own API Key.")
                
                # Increment
                await db.users.update_one(
                    {"username": current_user.username},
                    {"$inc": {"daily_usage_count": 1}, "$set": {"last_usage_date": datetime.utcnow()}}
                )
            else:
                # Reset and increment
                await db.users.update_one(
                    {"username": current_user.username},
                    {"$set": {"daily_usage_count": 1, "last_usage_date": datetime.utcnow()}}
                )
            
            final_gemini_key = os.getenv("GOOGLE_API_KEY")
            if not final_gemini_key:
                 raise HTTPException(status_code=503, detail="System Gemini Key not configured.")

    if not final_gemini_key:
         raise HTTPException(status_code=400, detail="Please configure your Gemini API Key in settings or upgrade to Premium.")

    if not rag_system:
        raise HTTPException(status_code=503, detail="System RAG (Pinecone) not configured by Admin.")

    # Retrieve context
    context_chunks = rag_system.retrieve(request.message)

    # if request.isConstract:
    #     try:
    #         # Process contract mode
    #         meta = context_chunks[0].metadata
    #         url = meta["source"]
    #         variables = download_template(url)

    #         bot = GeminiBot(gemini_key)
    #         # print("Extracted Variables:", variables)

    #         response = bot.generate_response(request.message, variables, request.isConstract)

    #         # Parse response as JSON
    #         try:
    #             response_json = json.loads(response)
    #         except json.JSONDecodeError as e:
    #             raise HTTPException(status_code=500, detail=f"Failed to parse response as JSON: {str(e)}")

    #         # Generate contract document
    #         print("Contract Data:", response_json)
    #         output_path = fill_contract("output_template.docx", response_json)

    #         # Return the generated document to the user
    #         return {
    #             "message": "Contract generated successfully.",
    #             "contract_path": output_path
    #         }
    #     except Exception as e:
    #         print(f"Error during contract generation: {str(e)}")
    #         raise HTTPException(status_code=500, detail=f"Error generating contract: {str(e)}")

    # Generate response for normal chat mode
    try:
        bot = GeminiBot(final_gemini_key)
        response_text = bot.generate_response(request.message, context_chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")

    # Create Messages
    user_msg = {
        "role": "user",
        "content": request.message,
        "timestamp": datetime.utcnow()
    }

    formatted_sources = []
    for doc in context_chunks:
        formatted_sources.append({
            "content": doc.page_content,
            "source": doc.metadata.get("source", "Unknown"),
            "page": doc.metadata.get("page", 0) + 1  # Convert 0-index to 1-index for display
        })

    bot_msg = {
        "role": "assistant",
        "content": response_text,
        "sources": formatted_sources,
        "timestamp": datetime.utcnow()
    }

    # Update Conversation in MongoDB
    existing_conv = await conversations_collection.find_one({"session_id": request.session_id, "user_id": current_user.username})

    if existing_conv:
        await conversations_collection.update_one(
            {"session_id": request.session_id},
            {
                "$push": {"messages": {"$each": [user_msg, bot_msg]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    else:
        title = request.message[:50] + "..." if len(request.message) > 50 else request.message
        new_conv = {
            "session_id": request.session_id,
            "user_id": current_user.username,
            "title": title,
            "messages": [user_msg, bot_msg],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await conversations_collection.insert_one(new_conv)

    return {
        "response": response_text,
        "sources": formatted_sources
    }
@app.post("/download-template")
async def download_template_endpoint(filename: str = Body(..., embed=True), current_user: UserInDB = Depends(get_current_active_user)):
    url = f"{SUPABASE_LINK_BUCKET}{filename}"
    print("Downloading template from URL:", url)
    try:
        variables = download_template(url)
        return {"variables": variables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading template: {str(e)}")

@app.post("/chat-contract")
async def chat_contract(request: ChatContractRequest, current_user: UserInDB = Depends(get_current_active_user)):
    gemini_key = current_user.gemini_api_key
    if not gemini_key:
        raise HTTPException(status_code=400, detail="Please configure your Gemini API Key in settings.")

    bot = GeminiBot(gemini_key)
    response_raw = bot.generate_response_contract(request.message, request.variables, request.messages)
    print("Raw contract response:", response_raw)

    # Loại bỏ code block ```json
    cleaned = response_raw.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()

    # Parse JSON
    try:
        response_json = json.loads(cleaned)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini JSON parse error: {str(e)}")
    if response_json.get("status") == "complete":
        # Generate contract document
        try:
            output_path = fill_contract("output_template.docx", response_json.get("variables", {}))
            return {
                "response": "Bấm để tải về",
                "variables": response_json.get("variables", {}),
                "link": output_path
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error generating contract document: {str(e)}")
    return {
        "response": response_json.get("response", ""),
        "variables": response_json.get("variables", {}),
        "link": ""
    }

@app.post("/admin/upload")
async def upload_files(files: List[UploadFile] = File(...), current_user: User = Depends(get_current_admin_user)):
    global rag_system
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG System not configured")
        
    saved_files = []
    file_metadata = []

    for file in files:
        file_location = f"temp_{file.filename}"
        content = await file.read() # Read async
        with open(file_location, "wb+") as file_object:
            file_object.write(content)
        
        file_size = len(content)
        
        class FileWrapper:
            def __init__(self, path, name):
                self.name = name
                self.path = path
            def getbuffer(self):
                with open(self.path, "rb") as f:
                    return f.read()
        
        saved_files.append(FileWrapper(file_location, file.filename))
        file_metadata.append({
            "filename": file.filename,
            "size": file_size,
            "upload_date": datetime.utcnow(),
            "uploaded_by": current_user.username,
            "status": "processed"
        })

    try:
        documents = rag_system.load_documents(saved_files)
        if documents:
            print (documents)
            # return
            rag_system.create_vector_db(documents)
            
            # Save metadata to MongoDB
            if file_metadata:
                await db.files.insert_many(file_metadata)
                
            return {"message": f"Successfully processed {len(documents)} documents"}
        else:
            raise HTTPException(status_code=400, detail="No documents processed")
    finally:
        for f in saved_files:
            if os.path.exists(f.path):
                os.remove(f.path)

@app.post("/admin/upload-supabase")
async def upload_files_supabase(files: List[UploadFile] = File(...), current_user: User = Depends(get_current_admin_user)):
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    for file in files:
        file_location = f"temp_{file.filename}"
        with open(file_location, "wb") as f:
            f.write(await file.read())
        res = supabase.storage.from_(SUPABASE_BUCKET).upload(
            file.filename,
            file_location
        )

@app.post("/admin/config")
async def admin_config(config: ConfigRequest, current_user: User = Depends(get_current_admin_user)):
    global rag_system, PINECONE_API_KEY, PINECONE_INDEX_NAME
    # Update global config (In production, save to DB or .env file)
    PINECONE_API_KEY = config.pinecone_api_key
    PINECONE_INDEX_NAME = config.pinecone_index_name
    
    rag_system = RAGSystem(PINECONE_API_KEY, PINECONE_INDEX_NAME)
    success = rag_system.load_index()
    
    return {"status": "success", "pinecone_connected": success}

@app.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_current_admin_user)):
    users_cursor = users_collection.find({})
    users = await users_cursor.to_list(length=100)
    return users

@app.put("/admin/users/{username}/status")
async def update_user_status(username: str, disabled: bool = Body(..., embed=True), current_user: User = Depends(get_current_admin_user)):
    if username == current_user.username:
         raise HTTPException(status_code=400, detail="Cannot change your own status")
         
    result = await users_collection.update_one({"username": username}, {"$set": {"disabled": disabled}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": f"User {username} disabled status set to {disabled}"}

@app.get("/history", response_model=List[dict])
async def get_history_list(current_user: User = Depends(get_current_active_user)):
    # Return list of conversations (id, title, date)
    cursor = conversations_collection.find({"user_id": current_user.username}).sort("updated_at", -1)
    conversations = await cursor.to_list(length=100)
    result = []
    for conv in conversations:
        result.append({
            "session_id": conv["session_id"],
            "title": conv.get("title", "New Chat"),
            "updated_at": conv["updated_at"]
        })
    return result

@app.get("/history/{session_id}")
async def get_history_detail(session_id: str, current_user: User = Depends(get_current_active_user)):
    conv = await conversations_collection.find_one({"session_id": session_id, "user_id": current_user.username})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if "_id" in conv:
        conv["_id"] = str(conv["_id"])
    return conv

@app.delete("/admin/deleteAll")
async def delete_all_data(current_user: User = Depends(get_current_admin_user)):
    global rag_system
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG System not configured")
    #delete all file on pinecone
    rag_system.deleteAll()
    await chat_collection.delete_many({})
    return {"status": "success", "message": "All chat history and Pinecone data deleted"}
    
@app.get("/admin/list-file", response_model=List[FileRecord], response_model_by_alias=True)
async def listFile(current_user: User = Depends(get_current_admin_user)):
    files_cursor = db.files.find({})
    files = await files_cursor.to_list(length=205)
    for file in files:
        if "_id" in file:
            file["_id"] = str(file["_id"])
    return files

@app.get("/contract")
async def get_contracts(current_user: User = Depends(get_current_active_user)):
    contracts_cursor = db.contract.find({})
    contracts = await contracts_cursor.to_list(length=100)
    for contract in contracts:
        if "_id" in contract:
            contract["_id"] = str(contract["_id"])
    return contracts

@app.delete("/admin/delete-file/{filename}")
async def deleteFile(filename: str, current_user: User = Depends(get_current_admin_user)):
    global rag_system
    if not rag_system:
        raise HTTPException(status_code=503, detail="RAG System not configured")
    # Delete file record from Pinecone and MongoDB
    rag_system.deleteSource(filename)
    result = await db.files.delete_one({"filename": filename})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"status": "success", "message": f"File {filename} deleted"}
#kiểm tra có file trong mongo không
@app.get("/admin/check-file/{filename}")
async def checkFile(filename: str, current_user: User = Depends(get_current_admin_user)):
    file = await db.files.find_one({"filename": filename})
    if file:
        return {"exists": True}
    else:
        return {"exists": False}
@app.get("/download/{filename}")
async def download_file(filename: str, current_user: UserInDB = Depends(get_current_active_user)):
    file_path = os.path.join("",filename)  # Đường dẫn thư mục chứa file
    print(f"Looking for file at: {file_path}")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)