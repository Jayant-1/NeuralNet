"""
Local JWT Authentication — bcrypt + PyJWT
No external auth service needed.
"""
import os
import uuid
import hashlib
import hmac
import time
import json
import base64
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Header
from typing import Optional
from database import get_db, dict_row, db_fetchone, db_close, db_execute, db_commit

# Simple secret key for JWT signing
from config import JWT_SECRET as SECRET_KEY
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def _hash_password(password: str) -> str:
    """Hash a password using SHA-256 with salt."""
    salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
    return f"{salt}${hashed}"


def _verify_password(password: str, stored_hash: str) -> bool:
    """Verify a password against stored hash."""
    try:
        salt, hashed = stored_hash.split('$')
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()
        return hmac.compare_digest(hashed, check)
    except Exception:
        return False


def _create_jwt(user_id: str, email: str) -> str:
    """Create a JWT token without external libraries."""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "exp": int(time.time()) + TOKEN_EXPIRE_HOURS * 3600,
        "iat": int(time.time()),
    }

    def b64url(data):
        return base64.urlsafe_b64encode(json.dumps(data, separators=(',', ':')).encode()).rstrip(b'=').decode()

    header_b64 = b64url(header)
    payload_b64 = b64url(payload)
    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).rstrip(b'=').decode()

    return f"{message}.{sig_b64}"


def _decode_jwt(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token format")

        header_b64, payload_b64, sig_b64 = parts

        # Verify signature
        message = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
        expected_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b'=').decode()

        if not hmac.compare_digest(sig_b64, expected_b64):
            raise ValueError("Invalid signature")

        # Decode payload
        padding = 4 - len(payload_b64) % 4
        payload_b64 += '=' * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))

        # Check expiration
        if payload.get("exp", 0) < time.time():
            raise ValueError("Token expired")

        return payload
    except Exception as e:
        raise ValueError(f"Invalid token: {e}")


async def register_user(email: str, password: str, full_name: str = "") -> dict:
    """Register a new user. Returns user dict + token."""
    conn = get_db()
    try:
        # Check if user exists
        existing = await db_fetchone(conn, "SELECT id FROM users WHERE email = ?", (email,))
        if existing:
            raise ValueError("Email already registered")

        user_id = str(uuid.uuid4())
        password_hash = _hash_password(password)
        now = datetime.now(timezone.utc).isoformat()

        await db_execute(
            conn,
            "INSERT INTO users (id, email, password_hash, full_name, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, email, password_hash, full_name, now),
        )
        await db_commit(conn)

        token = _create_jwt(user_id, email)
        return {
            "user": {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "created_at": now,
            },
            "token": token,
        }
    finally:
        await db_close(conn)


async def login_user(email: str, password: str) -> dict:
    """Authenticate user. Returns user dict + token."""
    conn = get_db()
    try:
        row = await db_fetchone(conn, "SELECT * FROM users WHERE email = ?", (email,))
        if not row:
            raise ValueError("Invalid email or password")

        user = dict_row(row)
        if not _verify_password(password, user["password_hash"]):
            raise ValueError("Invalid email or password")

        token = _create_jwt(user["id"], user["email"])
        return {
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "created_at": user["created_at"],
            },
            "token": token,
        }
    finally:
        await db_close(conn)


async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """Extract user_id from JWT token in Authorization header."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "")
    try:
        payload = _decode_jwt(token)
        user_id = payload["sub"]

        # Guard against stale JWTs that reference users removed from the local DB.
        conn = get_db()
        try:
            row = await db_fetchone(conn, "SELECT id FROM users WHERE id = ?", (user_id,))
            if not row:
                raise HTTPException(status_code=401, detail="User not found. Please sign in again.")
        finally:
            await db_close(conn)

        return user_id
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


async def update_profile(user_id: str, full_name: str):
    """Update user's full name."""
    conn = get_db()
    try:
        await db_execute(conn, "UPDATE users SET full_name = ? WHERE id = ?", (full_name, user_id))
        await db_commit(conn)
    finally:
        await db_close(conn)


async def change_password(user_id: str, current_password: str, new_password: str):
    """Change user password, verifying current password first."""
    conn = get_db()
    try:
        row = await db_fetchone(conn, "SELECT password_hash FROM users WHERE id = ?", (user_id,))
        if not row:
            raise ValueError("User not found")
        
        user = dict_row(row)
        if not _verify_password(current_password, user["password_hash"]):
            raise ValueError("Incorrect current password")
            
        new_hash = _hash_password(new_password)
        await db_execute(conn, "UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
        await db_commit(conn)
    finally:
        await db_close(conn)


async def delete_account(user_id: str):
    """Delete a user account and explicitly clean up un-cascaded resources."""
    conn = get_db()
    try:
        # Delete deployments explicitly because they don't have ON DELETE CASCADE
        await db_execute(conn, "DELETE FROM deployments WHERE user_id = ?", (user_id,))
        
        # Then delete user, cascading through projects, datasets, models, training_jobs
        await db_execute(conn, "DELETE FROM users WHERE id = ?", (user_id,))
        await db_commit(conn)
    finally:
        await db_close(conn)

