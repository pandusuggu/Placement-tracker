from datetime import datetime
from typing import Dict, List, Optional
from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel

class ProjectTrackerItem(BaseModel):
    name: str
    description: Optional[str] = None
    completion_percentage: float = 0.0

class CodingProgress(Document):
    user_id: PydanticObjectId
    leetcode_username: Optional[str] = None
    gfg_username: Optional[str] = None
    hackerrank_username: Optional[str] = None
    
    easy_solved: int = 0
    medium_solved: int = 0
    hard_solved: int = 0
    
    current_streak: int = 0
    longest_streak: int = 0
    daily_solved_count: Dict[str, int] = Field(default_factory=dict)  # Format: {"YYYY-MM-DD": 3}
    
    # DSA Roadmaps Progress: {"Arrays": "completed", "Strings": "in-progress", ...}
    dsa_progress: Dict[str, str] = Field(default_factory=dict) 
    
    # Youtube links for DSA questions: {"two-sum": "https://www.youtube.com/watch?v=..."}
    dsa_youtube_links: Dict[str, str] = Field(default_factory=dict)
    
    # Core Subjects: {"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0}
    core_subjects_progress: Dict[str, float] = Field(default_factory=dict)
    
    # Core Subjects Questions: {"DBMS": ["Q1", "Q2", ...], "OS": [...]}
    core_subjects_questions: Dict[str, List[str]] = Field(default_factory=dict)
    
    # Aptitude Questions: {"Quantitative Aptitude": ["Q1", ...], ...}
    aptitude_questions: Dict[str, List[str]] = Field(default_factory=dict)
    
    # Aptitude Prep: {"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0}
    aptitude_progress: Dict[str, float] = Field(default_factory=dict)
    
    # Project progress: list of dicts: [{"name": "E-Commerce", "completion_percentage": 75}]
    projects_progress: List[dict] = Field(default_factory=list)
    
    resume_status: str = "not_started"  # "not_started", "in_progress", "completed", "reviewed"
    mock_interview_score: float = 0.0  # 0.0 to 100.0
    
    last_synced: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "coding_progress"
