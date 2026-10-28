"""
Security utilities for authentication and authorization.
"""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import base64

from app.core.config import settings
from app.models.user import UserItem
from app.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Password hashing using PBKDF2-HMAC-SHA256 (standard library)
def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256."""
    salt = secrets.token_bytes(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    # Return salt + hash as hex
    return salt.hex() + pwdhash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    try:
        # Extract salt and hash from the stored value
        salt = bytes.fromhex(hashed_password[:32])  # First 32 hex chars = 16 bytes
        stored_hash = bytes.fromhex(hashed_password[32:])  # Rest is the hash
        # Compute hash of the provided password
        pwdhash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        # Compare hashes
        return hmac.compare_digest(pwdhash, stored_hash)
    except (TypeError, ValueError):
        return False

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# JWT settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def authenticate_user(db: Session, email: str, password: str) -> Optional[UserItem]:
    """Authenticate a user by email and password."""
    result = db.execute(select(UserItem).where(UserItem.email == email))
    user = result.scalar_one_or_none()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(db: Session, user_id: int) -> Optional[UserItem]:
    """Get a user by ID."""
    result = db.execute(select(UserItem).where(UserItem.id == user_id))
    return result.scalar_one_or_none()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserItem:
    """Get the current user from a JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        # Get user ID from token (we'll store user ID in sub field)
        user_id: int = payload.get("user_id")
        if user_id is None:
            # Fallback to email lookup if user_id not in token (for backward compatibility)
            result = db.execute(select(UserItem).where(UserItem.email == email))
            user = result.scalar_one_or_none()
        else:
            result = db.execute(select(UserItem).where(UserItem.id == user_id))
            user = result.scalar_one_or_none()
        if user is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserItem = Depends(get_current_user)) -> UserItem:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user# Encryption utilities for sensitive tokens

TOKEN_ENCRYPTION_SALT = b"fixed-salt-for-instagram-tokens"

def _get_fernet() -> Fernet:
    """Return a Fernet cipher instance derived from the SECRET_KEY."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=TOKEN_ENCRYPTION_SALT,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return Fernet(key)
def encrypt_token(token: str) -> str:
    """Encrypt a token for storage."""
    f = _get_fernet()
    encrypted = f.encrypt(token.encode())
    return encrypted.decode()
def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a token from storage."""
    f = _get_fernet()
    try:
        decrypted = f.decrypt(encrypted_token.encode())
        return decrypted.decode()
    except InvalidToken:
        raise ValueError("Invalid encryption token")
