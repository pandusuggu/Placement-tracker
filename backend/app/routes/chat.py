import json
import logging
from datetime import datetime, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from beanie import PydanticObjectId
from pydantic import BaseModel

from app.models.user import User
from app.models.chat import ChatMessage
from app.utils.auth import get_current_user
from app.utils.security import decode_token

logger = logging.getLogger("codepilot")
router = APIRouter(prefix="/api/chat", tags=["Community Chat"])

class MessageSendSchema(BaseModel):
    message: str

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New WebSocket client connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Active connections: {len(self.active_connections)}")

    async def broadcast(self, message_data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message_data)
            except Exception as e:
                logger.error(f"Error broadcasting to WebSocket client, removing: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

@router.get("/history")
async def get_chat_history(user: User = Depends(get_current_user)):
    # Fetch last 50 messages, sorted ascending by created_at for stream sequence
    messages = await ChatMessage.find().sort("-created_at").limit(50).to_list()
    # Reverse to get chronological order (oldest first)
    messages.reverse()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "user_name": m.user_name,
            "user_role": m.user_role,
            "message": m.message,
            "created_at": m.created_at
        } for m in messages
    ]

@router.post("/send")
async def send_chat_message(data: MessageSendSchema, user: User = Depends(get_current_user)):
    if not data.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be empty."
        )
        
    msg = ChatMessage(
        user_id=user.id,
        user_name=user.name,
        user_role=getattr(user, "role", "user"),
        message=data.message.strip()
    )
    await msg.create()
    
    payload = {
        "type": "message",
        "id": str(msg.id),
        "user_id": str(msg.user_id),
        "user_name": msg.user_name,
        "user_role": msg.user_role,
        "message": msg.message,
        "created_at": msg.created_at.isoformat()
    }
    
    # Broadcast to all active websockets
    await manager.broadcast(payload)
    return payload

@router.get("/active")
async def get_active_users(user: User = Depends(get_current_user)):
    # Active in the last 5 minutes
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    active_users = await User.find(User.last_active >= five_mins_ago).to_list()
    return [
        {
            "name": u.name,
            "role": getattr(u, "role", "user"),
            "college": u.college or "N/A",
            "branch": u.branch or "N/A",
            "target_role": u.target_role or "Software Engineer",
            "last_active": getattr(u, "last_active", u.created_at)
        } for u in active_users
    ]

@router.delete("/delete/{message_id}")
async def delete_chat_message(message_id: str, user: User = Depends(get_current_user)):
    # Enforce admin permission
    if getattr(user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin access only."
        )
    
    try:
         msg_oid = PydanticObjectId(message_id)
    except Exception:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Invalid message ID format."
         )
         
    msg = await ChatMessage.get(msg_oid)
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found."
        )
        
    await msg.delete()
    
    # Broadcast deletion update so clients can remove it in real-time
    payload = {
        "type": "delete",
        "id": message_id
    }
    await manager.broadcast(payload)
    return {"message": "Message deleted successfully."}

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
        user = await User.get(PydanticObjectId(user_id))
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    await manager.connect(websocket)
    try:
        while True:
            # Wait for incoming text frames (keep-alive / ping-pong)
            data = await websocket.receive_text()
            try:
                parsed = json.loads(data)
                msg_text = parsed.get("message")
                if msg_text and msg_text.strip():
                    msg = ChatMessage(
                        user_id=user.id,
                        user_name=user.name,
                        user_role=getattr(user, "role", "user"),
                        message=msg_text.strip()
                    )
                    await msg.create()
                    
                    # Touch user active state
                    user.last_active = datetime.utcnow()
                    await user.save()
                    
                    broadcast_payload = {
                        "type": "message",
                        "id": str(msg.id),
                        "user_id": str(msg.user_id),
                        "user_name": msg.user_name,
                        "user_role": msg.user_role,
                        "message": msg.message,
                        "created_at": msg.created_at.isoformat()
                    }
                    await manager.broadcast(broadcast_payload)
            except Exception:
                # Ignore malformed WebSocket text payloads
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket execution error: {e}")
        manager.disconnect(websocket)
