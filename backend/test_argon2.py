import argon2
print(f"Argon2 version: {argon2.__version__}")
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
print(pwd_context.hash("test"))
