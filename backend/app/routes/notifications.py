from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId

from app.models.user import User
from app.models.notification import Notification
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[dict])
async def list_notifications(user: User = Depends(get_current_user)):
    notifications = await Notification.find(
        Notification.user_id == user.id
    ).sort(-Notification.created_at).to_list()
    
    result = []
    for n in notifications:
        item = n.model_dump()
        item["id"] = str(n.id)
        item["user_id"] = str(n.user_id)
        result.append(item)
        
    return result

@router.put("/{notification_id}/read")
async def mark_as_read(notification_id: str, user: User = Depends(get_current_user)):
    try:
        notif_oid = PydanticObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Notification ID")
        
    notification = await Notification.get(notif_oid)
    if not notification or notification.user_id != user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.read = True
    await notification.save()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
async def mark_all_as_read(user: User = Depends(get_current_user)):
    await Notification.find(
        Notification.user_id == user.id,
        Notification.read == False
    ).update({"$set": {"read": True}})
    return {"message": "All notifications marked as read"}
