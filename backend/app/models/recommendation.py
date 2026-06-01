from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class AIRecommendation(Document):
    user_id: PydanticObjectId
    recommendation_type: str  # "productivity", "schedule_optimization", "burnout_alert", "time_management"
    title: str
    content: str
    severity: str = "medium"  # "info", "low", "medium", "high", "critical"
    status: str = "active"  # "active", "dismissed"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "ai_recommendations"
