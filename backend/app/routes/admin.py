from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin Control Panel"])

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if getattr(user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access only."
        )
    return user

@router.get("/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    # 1. Total users count
    total_users = await User.count()
    
    # 2. Active users calculation
    # Online Now (active in the last 5 minutes)
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    online_now = await User.find(User.last_active >= five_mins_ago).count()
    
    # Active Today (active in the last 24 hours)
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    active_today = await User.find(User.last_active >= one_day_ago).count()
    
    # 3. Fetch all users list with their profiles and activity timestamps
    users = await User.find_all().to_list()
    users_list = []
    for u in users:
        users_list.append({
            "id": str(u.id),
            "name": u.name,
            "email": u.email,
            "college": u.college or "N/A",
            "branch": u.branch or "N/A",
            "target_role": u.target_role or "Software Engineer",
            "role": getattr(u, "role", "user"),
            "created_at": u.created_at,
            "last_active": getattr(u, "last_active", u.created_at)
        })
        
    return {
        "total_users": total_users,
        "online_now": online_now,
        "active_today": active_today,
        "users": users_list
    }
