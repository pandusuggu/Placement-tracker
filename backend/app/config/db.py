import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config.settings import settings
from app.models.user import User
from app.models.task import Task
from app.models.habit import Habit, HabitLog
from app.models.scheduler import Goal, Schedule
from app.models.calendar import CalendarEvent
from app.models.pomodoro import PomodoroSession
from app.models.coding import CodingProgress
from app.models.roadmap import StudyRoadmap
from app.models.recommendation import AIRecommendation
from app.models.reflection import DailyReflection
from app.models.notification import Notification
from app.models.analytics import Analytics, PlacementScore
from app.models.chat import ChatMessage
from app.models.ai_log import AIRequestLog
from app.models.ai_coach_message import AICoachMessage
from app.models.problem import ProblemDetail

logger = logging.getLogger("codepilot")

async def init_db():
    logger.info("Initializing database connection...")
    try:
        # Monkeypatch AsyncIOMotorClient to avoid compatibility issue with Beanie / Motor 3.x
        AsyncIOMotorClient.append_metadata = lambda self, *args, **kwargs: None
        
        # Create Motor client with 5s timeout to prevent hanging on bad connections
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
        
        # Get default database name from URI or default to "codepilot"
        db_name = settings.mongodb_uri.split("/")[-1].split("?")[0]
        if not db_name:
            db_name = "codepilot"
            
        db = client[db_name]
        
        # Gather all models
        models = [
            User,
            Task,
            Habit,
            HabitLog,
            Goal,
            Schedule,
            CalendarEvent,
            PomodoroSession,
            CodingProgress,
            StudyRoadmap,
            AIRecommendation,
            DailyReflection,
            Notification,
            Analytics,
            PlacementScore,
            ChatMessage,
            AIRequestLog,
            AICoachMessage,
            ProblemDetail
        ]
        
        # Initialize Beanie
        await init_beanie(database=db, document_models=models)
        logger.info(f"Database successfully initialized. Connected to '{db_name}' database.")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        # We do not crash the app, but alert. The fallback mock logic will help in development.
        raise e
