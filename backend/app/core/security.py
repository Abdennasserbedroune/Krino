"""Security utilities for authentication and authorization."""
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.db.models.user import User
from app.db.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Generate a password hash."""
    # Truncate password to 72 bytes if necessary (bcrypt limitation)
    password_bytes = password.encode('utf-8')[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    """Get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print(f"DEBUG: Verifying token: {token[:10]}...")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        print(f"DEBUG: Token decoded. Username (sub): {username}")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        print(f"DEBUG: JWT Error: {e}")
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Unexpected error in JWT decode: {e}")
        raise
    
    print(f"DEBUG: Querying DB for user: {username}")
    user = db.query(User).filter(User.email == username).first()
    if user is None:
        print("DEBUG: User not found in DB")
        # For Supabase integration, we might need to create the user if they don't exist
        # But for now, let's see if we even get here
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_supabase_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)) -> User:
    """Authenticate a user from a Supabase-issued JWT.

    For local demo, we decode the token without verifying the signature and
    auto-provision the user in the local database if they don't exist yet.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate Supabase credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decode token without verifying signature (demo mode only).
        payload = jwt.get_unverified_claims(token)
        sub = payload.get("sub")
        email = payload.get("email") or payload.get("user_metadata", {}).get("email")
        if not sub and not email:
            raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Supabase token decode error: {e}")
        raise credentials_exception

    identifier = email or sub

    user = db.query(User).filter(User.email == identifier).first()
    if user is None:
        # Auto-create a local user record linked to the Supabase identity
        user = User(
            email=identifier,
            full_name=email or "",
            hashed_password=get_password_hash("supabase-placeholder"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user
