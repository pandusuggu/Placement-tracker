from datetime import datetime
from typing import List, Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class DailyReflection(Document):
    user_id: PydanticObjectId
    date: str  # "YYYY-MM-DD"
    q_well: str
    q_distracted: str
    q_improve: str
    ai_summary: Optional[str] = None
    improvement_suggestions: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "daily_reflections"
