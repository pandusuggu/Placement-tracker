from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId

from app.models.user import User
from app.models.coding import CodingProgress
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    target_role: Optional[str] = None
    daily_available_hours: Optional[float] = None
    avatar: Optional[str] = None

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class GoogleLoginSchema(BaseModel):
    token: str
    email: EmailStr
    name: str
    avatar: Optional[str] = None

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: RegisterSchema):
    # Check if email exists
    existing_user = await User.find_one(User.email == data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
        
    hashed_pwd = get_password_hash(data.password)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hashed_pwd
    )
    await user.create()
    
    # Initialize blank Coding Progress profile for this user
    progress = CodingProgress(
        user_id=user.id,
        leetcode_username="",
        codechef_username="",
        hackerrank_username="",
        dsa_progress={},
        core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
        aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
        projects_progress=[]
    )
    await progress.create()
    
    # Create Access Token
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        }
    }

@router.post("/login")
async def login(data: LoginSchema):
    user = await User.find_one(User.email == data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
        
    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "college": user.college,
            "branch": user.branch,
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        }
    }

@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar,
        "college": user.college,
        "branch": user.branch,
        "graduation_year": user.graduation_year,
        "target_role": user.target_role,
        "daily_available_hours": user.daily_available_hours,
        "created_at": user.created_at
    }

@router.put("/profile")
async def update_profile(data: ProfileUpdateSchema, user: User = Depends(get_current_user)):
    if data.name is not None:
        user.name = data.name
    if data.college is not None:
        user.college = data.college
    if data.branch is not None:
        user.branch = data.branch
    if data.graduation_year is not None:
        user.graduation_year = data.graduation_year
    if data.target_role is not None:
        user.target_role = data.target_role
    if data.daily_available_hours is not None:
        user.daily_available_hours = data.daily_available_hours
    if data.avatar is not None:
        user.avatar = data.avatar
        
    await user.save()
    return {
        "message": "Profile updated successfully",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "college": user.college,
            "branch": user.branch,
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        }
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordSchema):
    # Simulated recovery sendout
    user = await User.find_one(User.email == data.email)
    if not user:
        # Avoid user enumeration, return success regardless
        return {"message": "If this email is registered, a password reset link has been simulated."}
    return {"message": f"Password reset email simulation sent successfully to {data.email}."}

@router.post("/google")
async def google_login(data: GoogleLoginSchema):
    # Verify Google token placeholder / mock OAuth flow
    user = await User.find_one(User.email == data.email)
    if not user:
        # Register new OAuth user with arbitrary password
        dummy_password = get_password_hash(f"google_oauth_{data.token[:10]}")
        user = User(
            name=data.name,
            email=data.email,
            hashed_password=dummy_password,
            avatar=data.avatar
        )
        await user.create()
        
        # Initialize progress
        progress = CodingProgress(
            user_id=user.id,
            leetcode_username="",
            codechef_username="",
            hackerrank_username="",
            dsa_progress={},
            core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
            aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
            projects_progress=[]
        )
        await progress.create()

    token = create_access_token(user.id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "college": user.college,
            "branch": user.branch,
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        }
    }
