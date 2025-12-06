import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from dotenv import load_dotenv

load_dotenv()

# Get the secret key from environment or use a default (NOT RECOMMENDED FOR PRODUCTION)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-should-be-changed-in-production")

def _get_fernet():
    # Derive a 32-byte key from the SECRET_KEY using PBKDF2
    # This ensures we have a valid url-safe base64-encoded key for Fernet
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'static_salt_for_mvp', # In production, salt should be unique or managed better
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(SECRET_KEY.encode()))
    return Fernet(key)

def encrypt_key(key: str) -> str:
    if not key:
        return None
    f = _get_fernet()
    return f.encrypt(key.encode()).decode()

def decrypt_key(token: str) -> str:
    if not token:
        return None
    f = _get_fernet()
    try:
        return f.decrypt(token.encode()).decode()
    except Exception:
        return None
