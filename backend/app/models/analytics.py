from datetime import datetime
from typing import List
from beanie import Document, PydanticObjectId
from pydantic import Field

class Analytics(Document):
    user_id: PydanticObjectId
    date: str  # "YYYY-MM-DD"
    productivity_score: float = 0.0  # 0 to 100
    consistency_score: float = 0.0
    focus_score: float = 0.0
    habit_score: float = 0.0
    coding_score: float = 0.0
    placement_readiness_score: float = 0.0
    tasks_completed: int = 0
    tasks_total: int = 0
    habits_completed: int = 0
    habits_total: int = 0
    focus_duration_minutes: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "analytics"


class PlacementScore(Document):
    user_id: PydanticObjectId
    score: float = 0.0  # 0 to 100
    readiness_level: str = "Low"  # "Low", "Medium", "High", "Excellent"
    dsa_score: float = 0.0
    core_subjects_score: float = 0.0
    aptitude_score: float = 0.0
    projects_score: float = 0.0
    resume_score: float = 0.0
    mock_interview_score: float = 0.0
    suggestions: List[str] = Field(default_factory=list)
    
    # Resume Analysis fields
    resume_ats_score: float = 0.0
    resume_strengths: List[str] = Field(default_factory=list)
    resume_improvements: List[str] = Field(default_factory=list)
    resume_suggestions: List[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "placement_scores"
