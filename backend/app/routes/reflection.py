from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.reflection import DailyReflection
from app.utils.auth import get_current_user
from app.utils.rate_limit import verify_ai_rate_limit
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/reflections", tags=["AI Reflection Assistant"])

class ReflectionInputSchema(BaseModel):
    date: str  # "YYYY-MM-DD"
    q_well: str
    q_distracted: str
    q_improve: str

@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_reflection(data: ReflectionInputSchema, user: User = Depends(verify_ai_rate_limit)):
    # Verify date string format
    try:
        datetime.strptime(data.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Check if a reflection already exists for today
    existing = await DailyReflection.find_one(
        DailyReflection.user_id == user.id,
        DailyReflection.date == data.date
    )
    if existing:
        # We can update it instead of failing
        reflection = existing
        reflection.q_well = data.q_well
        reflection.q_distracted = data.q_distracted
        reflection.q_improve = data.q_improve
    else:
        reflection = DailyReflection(
            user_id=user.id,
            date=data.date,
            q_well=data.q_well,
            q_distracted=data.q_distracted,
            q_improve=data.q_improve
        )

    # Call AI synthesizer
    summary_data = await AIService.generate_reflection_summary(
        q_well=data.q_well,
        q_distracted=data.q_distracted,
        q_improve=data.q_improve,
        user_id=user.id
    )

    reflection.ai_summary = summary_data.get("summary", "")
    reflection.improvement_suggestions = summary_data.get("suggestions", [])
    
    if existing:
        await reflection.save()
    else:
        await reflection.create()

    res = reflection.model_dump()
    res["id"] = str(reflection.id)
    res["user_id"] = str(reflection.user_id)
    return res

@router.get("/history", response_model=List[dict])
async def list_reflections(user: User = Depends(get_current_user)):
    reflections = await DailyReflection.find(
        DailyReflection.user_id == user.id
    ).sort(-DailyReflection.date).to_list()
    
    result = []
    for r in reflections:
        item = r.model_dump()
        item["id"] = str(r.id)
        item["user_id"] = str(r.user_id)
        result.append(item)
        
    return result
