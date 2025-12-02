from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "user"  # "admin" or "user"
    gemini_api_key: Optional[str] = None
    disabled: Optional[bool] = False

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class FileRecord(BaseModel):
    filename: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    uploaded_by: str
    num_pages: int
    status: str  # e.g., "processed", "pending

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str

class ConfigRequest(BaseModel):
    pinecone_api_key: str
    pinecone_index_name: str
    gemini_api_key: Optional[str] = None

class ChatEntry(BaseModel):
    session_id: str
    user_message: str
    bot_response: str
    sources: List[str] = []
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    username: str
