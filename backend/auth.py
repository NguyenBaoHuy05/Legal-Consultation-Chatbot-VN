import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from models import TokenData, User, UserInDB
from motor.motor_asyncio import AsyncIOMotorDatabase

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-should-be-changed-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(db: AsyncIOMotorDatabase, username: str):
    user_dict = await db.users.find_one({"username": username})
    if user_dict:
        return UserInDB(**user_dict)
    return None

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(lambda: None)): # db dependency injected in main
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
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    # Note: In a real app, we need to access the DB here.
    # Since Depends doesn't easily allow passing arguments from the parent dependency without global state or complex setup,
    # we will handle the DB connection in the main file and pass it or use a global reference if necessary.
    # For simplicity in this refactor, we'll assume the caller injects the user or we use a global db reference in main.
    # BUT, to follow best practices, let's just return the TokenData/username and let the endpoint fetch the user,
    # OR we move this logic to main.py where 'db' is available.
    return token_data

async def get_current_active_user(token_data: TokenData = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(lambda: None)):
    user = await get_user(db, token_data.username)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    if user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

async def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=400, detail="Not enough permissions")
    return current_user
