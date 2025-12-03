import os
from datetime import datetime, timedelta
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
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
    ChatRequest, ConfigRequest, ChatEntry, FileRecord,
    Token, UserCreate, User, UserInDB
)
from jose import JWTError, jwt

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

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI)
db = client.legal_chatbot
chat_collection = db.chats
users_collection = db.users

@app.on_event("startup")
async def startup_db_client():
    try:
        await client.admin.command('ping')
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")

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
    user_in_db = UserInDB(
        **user.dict(),
        hashed_password=hashed_password,
        role="user" # Default role
    )
    
    # First user is admin (optional logic, or manually set in DB)
    if await db.users.count_documents({}) == 0:
        user_in_db.role = "admin"

    await db.users.insert_one(user_in_db.dict())
    return user_in_db

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.put("/users/me/gemini")
async def update_gemini_key(key: str = Body(..., embed=True), current_user: UserInDB = Depends(get_current_active_user)):
    await db.users.update_one({"username": current_user.username}, {"$set": {"gemini_api_key": key}})
    return {"status": "success"}

@app.post("/chat")
async def chat(request: ChatRequest, current_user: UserInDB = Depends(get_current_active_user)):
    global rag_system
    
    # Use user's Gemini Key if available, else system's (if you want to allow that)
    # Prompt says: "User just adds gemini key".
    gemini_key = current_user.gemini_api_key
    if not gemini_key:
         raise HTTPException(status_code=400, detail="Please configure your Gemini API Key in settings.")

    if not rag_system:
        raise HTTPException(status_code=503, detail="System RAG (Pinecone) not configured by Admin.")

    # Retrieve context
    context_chunks = rag_system.retrieve(request.message)
    
    # Generate response
    try:
        bot = GeminiBot(gemini_key)
        response_text = bot.generate_response(request.message, context_chunks)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Error: {str(e)}")
    
    # Save to MongoDB
    chat_entry = {
        "session_id": request.session_id,
        "username": current_user.username,
        "user_message": request.message,
        "bot_response": response_text,
        "sources": [doc.page_content for doc in context_chunks],
        "timestamp": datetime.utcnow()
    }
    await chat_collection.insert_one(chat_entry)
    
    return {
        "response": response_text,
        "sources": [{"content": doc.page_content, "source": doc.metadata.get("source", "Unknown")} for doc in context_chunks]
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
            print ([f.name for f in saved_files])
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

@app.get("/history/{session_id}")
async def get_history(session_id: str, current_user: User = Depends(get_current_active_user)):
    # Users can only see their own history? Or just by session ID if they have it?
    # Let's restrict to own history if we track sessions per user.
    # For now, just return by session_id but ensure it belongs to user if we stored username.
    cursor = chat_collection.find({"session_id": session_id, "username": current_user.username})
    history = await cursor.to_list(length=100)
    for doc in history:
        doc["_id"] = str(doc["_id"])
    return history

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
    files = await files_cursor.to_list(length=100)
    for file in files:
        if "_id" in file:
            file["_id"] = str(file["_id"])
    return files
@app.post("/admin/create-file")
async def createFile(file: FileRecord, current_user: User = Depends(get_current_admin_user)):
    file_dict = file.dict()
    await db.files.insert_one(file_dict)
    return {"status": "success", "message": f"File {file.filename} created"}
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
