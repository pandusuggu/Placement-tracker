from datetime import datetime, timedelta
from typing import Optional
import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.user import User
from app.models.coding import CodingProgress
from app.utils.security import verify_password, get_password_hash, create_access_token
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "user"
    admin_passcode: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None

class LoginSchema(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    college: Optional[str] = None
    branch: Optional[str] = None
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = None
    target_role: Optional[str] = None
    daily_available_hours: Optional[float] = None
    avatar: Optional[str] = None

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class GoogleLoginSchema(BaseModel):
    token: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
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
        
    role = data.role or "user"
    if role == "admin":
        from app.config.settings import settings
        if not data.admin_passcode or data.admin_passcode != settings.admin_passcode:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Invalid admin registration passcode."
            )

    hashed_pwd = get_password_hash(data.password)
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hashed_pwd,
        role=role,
        college=data.college,
        branch=data.branch
    )
    await user.create()
    
    # Initialize blank Coding Progress profile for this user
    progress = CodingProgress(
        user_id=user.id,
        leetcode_username="",
        gfg_username="",
        hackerrank_username="",
        codechef_username="",
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
            "daily_available_hours": user.daily_available_hours,
            "role": user.role,
            "college": user.college,
            "branch": user.branch
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
            "cgpa": getattr(user, "cgpa", None),
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours,
            "role": user.role
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
        "cgpa": getattr(user, "cgpa", None),
        "graduation_year": user.graduation_year,
        "target_role": user.target_role,
        "daily_available_hours": user.daily_available_hours,
        "role": user.role,
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
    if data.cgpa is not None:
        user.cgpa = data.cgpa
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
            "cgpa": getattr(user, "cgpa", None),
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
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    email = None
    name = None
    avatar = None

    if client_id:
        try:
            # Verify the ID token using Google's verification library
            idinfo = id_token.verify_oauth2_token(data.token, google_requests.Request(), client_id)
            email = idinfo.get("email")
            name = idinfo.get("name")
            avatar = idinfo.get("picture")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google token payload missing email claim."
                )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google token: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google token verification failed: {str(e)}"
            )
    else:
        # Simulator mode - use client-provided details
        email = data.email
        name = data.name or (email.split("@")[0] if email else "Google User")
        avatar = data.avatar
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required when Google Client ID is not configured (simulation mode)."
            )

    user = await User.find_one(User.email == email)
    if not user:
        # Register new OAuth user with arbitrary password
        dummy_password = get_password_hash(f"google_oauth_{data.token[:10]}")
        user = User(
            name=name,
            email=email,
            hashed_password=dummy_password,
            avatar=avatar
        )
        await user.create()
        
        # Initialize progress
        progress = CodingProgress(
            user_id=user.id,
            leetcode_username="",
            gfg_username="",
            hackerrank_username="",
            codechef_username="",
            dsa_progress={},
            core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
            aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
            projects_progress=[]
        )
        await progress.create()
    else:
        # Update user's avatar if they don't have one, or sync from Google
        if avatar and not user.avatar:
            user.avatar = avatar
            await user.save()

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
            "cgpa": getattr(user, "cgpa", None),
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        }
    }

@router.get("/profile/{user_id}")
async def get_public_profile(user_id: str, current_user: User = Depends(get_current_user)):
    try:
        obj_id = PydanticObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
        
    user = await User.get(obj_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Get coding progress
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    progress_data = None
    if progress:
        from app.routes.coding import get_progress_response
        progress_data = get_progress_response(progress)
        
    # Get placement readiness
    from app.services.placement_service import PlacementService
    readiness_data = None
    if progress:
        # Get readiness score
        score_doc = await PlacementService.create_or_update_placement_score(user.id, progress)
        if score_doc:
            readiness_data = {
                "score": score_doc.score,
                "readiness_level": score_doc.readiness_level,
                "resume_ats_score": score_doc.resume_ats_score,
                "resume_strengths": score_doc.resume_strengths,
                "resume_improvements": score_doc.resume_improvements,
                "resume_suggestions": score_doc.resume_suggestions
            }
            
    # Get weekly rank & score
    from app.routes.leaderboard import get_weekly_leaderboard
    weekly_rank = None
    weekly_score = 0
    try:
        leaderboard = await get_weekly_leaderboard(user)
        for item in leaderboard:
            if item["user_id"] == user_id:
                weekly_rank = item["rank"]
                weekly_score = item["score"]
                break
    except Exception:
        pass
        
    return {
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar,
            "college": user.college,
            "branch": user.branch,
            "cgpa": getattr(user, "cgpa", None),
            "graduation_year": user.graduation_year,
            "target_role": user.target_role,
            "daily_available_hours": user.daily_available_hours
        },
        "progress": progress_data,
        "readiness": readiness_data,
        "weekly_rank": weekly_rank,
        "weekly_score": weekly_score
    }

