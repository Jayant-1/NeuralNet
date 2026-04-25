"""
Authentication routes — signup, login, profile
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from auth import register_user, login_user, update_profile, change_password, delete_account, get_current_user
from fastapi import Depends

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
        result = await register_user(req.email, req.password, req.full_name)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login")
async def login(req: LoginRequest):
    try:
        result = await login_user(req.email, req.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


class ProfileUpdateRequest(BaseModel):
    full_name: str

@router.put("/auth/profile")
async def update_user_profile(
    req: ProfileUpdateRequest, 
    user_id: str = Depends(get_current_user)
):
    try:
        await update_profile(user_id, req.full_name)
        return {"status": "success", "full_name": req.full_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/auth/password")
async def change_user_password(
    req: PasswordChangeRequest, 
    user_id: str = Depends(get_current_user)
):
    try:
        await change_password(user_id, req.current_password, req.new_password)
        return {"status": "success", "message": "Password updated successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/auth/account")
async def delete_user_account(user_id: str = Depends(get_current_user)):
    try:
        await delete_account(user_id)
        return {"status": "success", "message": "Account deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

