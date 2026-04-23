"""
Authentication routes — signup, login, profile
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from auth import register_user, login_user

router = APIRouter()


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/auth/signup")
async def signup(req: SignupRequest):
    try:
        result = register_user(req.email, req.password, req.full_name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def login(req: LoginRequest):
    try:
        result = login_user(req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
