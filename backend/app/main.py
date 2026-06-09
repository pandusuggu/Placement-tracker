import uvicorn
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.config.db import init_db
from app.routes import auth, tasks, habits, pomodoro, calendar, coding, study_planner, coach, reflection, placement, notifications, analytics, leaderboard, admin, chat, problems


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("codepilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Database Connection
    logger.info("Starting up Placement Tracker & Productivity Planner FastAPI Server...")
    await init_db()
    yield
    # Shutdown logic if any
    logger.info("Shutting down Placement Tracker & Productivity Planner FastAPI Server...")

app = FastAPI(
    title="Placement Tracker & Productivity Planner API",
    description="Productivity, routine tracking, habit tracking, coding tracker, and placement preparation assistant.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware Configurations
origins = [
    "http://localhost:5173",  # React Vite development client
    "http://localhost:3000",
    "https://codepilot-ai.vercel.app",  # Production Vercel deploy
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(habits.router)
app.include_router(pomodoro.router)
app.include_router(calendar.router)
app.include_router(coding.router)
app.include_router(study_planner.router)
app.include_router(coach.router)
app.include_router(reflection.router)
app.include_router(placement.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(leaderboard.router)
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(problems.router)


@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "Placement Tracker & Productivity Planner API Server",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=True)
