from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.roadmap import StudyRoadmap
from app.utils.auth import get_current_user
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/study-planner", tags=["AI Study Planner"])

class RoadmapInputSchema(BaseModel):
    target_role: str
    daily_available_hours: float
    skill_level: str  # "beginner", "intermediate", "advanced"
    deadline: Optional[datetime] = None
    topics_to_learn: List[str]

def format_to_string(val) -> str:
    if not val:
        return ""
    if isinstance(val, str):
        return val
    elif isinstance(val, list):
        lines = []
        for item in val:
            if isinstance(item, dict):
                for k, v in item.items():
                    if isinstance(v, dict):
                        lines.append(f"• {k}:")
                        for subk, subv in v.items():
                            lines.append(f"  - {subk}: {subv}")
                    elif isinstance(v, list):
                        lines.append(f"• {k}:")
                        for subval in v:
                            lines.append(f"  - {subval}")
                    else:
                        lines.append(f"• {k}: {v}")
            elif isinstance(item, str):
                lines.append(f"• {item}")
            else:
                lines.append(str(item))
        return "\n".join(lines)
    elif isinstance(val, dict):
        lines = []
        for k, v in val.items():
            if isinstance(v, dict):
                lines.append(f"• {k}:")
                for subk, subv in v.items():
                    lines.append(f"  - {subk}: {subv}")
            elif isinstance(v, list):
                lines.append(f"• {k}:")
                for subval in v:
                    lines.append(f"  - {subval}")
            else:
                lines.append(f"• {k}: {v}")
        return "\n".join(lines)
    return str(val)

@router.post("", status_code=status.HTTP_201_CREATED)
async def generate_roadmap(data: RoadmapInputSchema, user: User = Depends(get_current_user)):
    if not data.topics_to_learn:
        raise HTTPException(status_code=400, detail="Must provide at least one topic to learn")

    # Call Gemini/Groq via AI Service
    roadmap_data = await AIService.generate_study_roadmap(
        target_role=data.target_role,
        daily_hours=data.daily_available_hours,
        skill_level=data.skill_level,
        deadline=data.deadline,
        topics_to_learn=data.topics_to_learn
    )

    # Save to database
    roadmap = StudyRoadmap(
        user_id=user.id,
        target_role=data.target_role,
        daily_available_hours=data.daily_available_hours,
        skill_level=data.skill_level,
        deadline=data.deadline,
        topics_to_learn=data.topics_to_learn,
        daily_plan=format_to_string(roadmap_data.get("daily_plan")),
        weekly_roadmap=format_to_string(roadmap_data.get("weekly_roadmap")),
        monthly_roadmap=format_to_string(roadmap_data.get("monthly_roadmap")),
        recommendations=roadmap_data.get("recommendations", []),
        learning_priorities=roadmap_data.get("learning_priorities", [])
    )
    await roadmap.create()

    # Update User Profile settings synchronously
    user.target_role = data.target_role
    user.daily_available_hours = data.daily_available_hours
    await user.save()

    res = roadmap.model_dump()
    res["id"] = str(roadmap.id)
    res["user_id"] = str(roadmap.user_id)
    return res

@router.get("/current")
async def get_current_roadmap(user: User = Depends(get_current_user)):
    roadmap = await StudyRoadmap.find(StudyRoadmap.user_id == user.id).sort(-StudyRoadmap.created_at).first_or_none()
    if not roadmap:
        return {}
    res = roadmap.model_dump()
    res["id"] = str(roadmap.id)
    res["user_id"] = str(roadmap.user_id)
    return res
