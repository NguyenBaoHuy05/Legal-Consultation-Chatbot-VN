import json
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "user"  # "admin" or "user"
    gemini_api_key: Optional[str] = None
    subscription_type: str = "free" # "free" or "premium"
    daily_usage_count: int = 0
    last_usage_date: Optional[datetime] = None
    disabled: Optional[bool] = False
    is_verified: bool = False
    verification_token: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[datetime] = None
    upgrade_requested: bool = False

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None

class FileRecord(BaseModel):
    filename: str
    size: int
    upload_date: datetime
    uploaded_by: str
    status: str

class Config:
    allow_population_by_field_name = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: str

class MessageForContract(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    link: str

class ChatContractRequest(BaseModel):
    message: str
    ## dùng để lưu trữ các biến đã trích xuất từ hợp đồng
    variables: Optional[dict] = {}
    messages: Optional[List[MessageForContract]] = []
    contentTemplate: Optional[str] = None
    
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

class ContractFile(BaseModel):
    name: str
    filename: str

class Message(BaseModel):
    role: str # "user" or "assistant"
    content: str
    sources: Optional[List[dict]] = [] # [{"content": "...", "source": "...", "page": 1}]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class Conversation(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    session_id: str
    user_id: str # username
    title: str
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
