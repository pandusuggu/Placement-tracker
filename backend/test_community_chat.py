import asyncio
import os
import sys
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.config.db import init_db
from app.models.user import User
from app.models.chat import ChatMessage
from app.models.coding import CodingProgress

async def run_chat_tests():
    # 1. Initialize Beanie in the current loop
    await init_db()
    
    student_email = "chat.student@example.com"
    admin_email = "chat.admin@example.com"
    
    # Cleanup pre-existing
    stu = await User.find_one(User.email == student_email)
    if stu:
        await CodingProgress.find(CodingProgress.user_id == stu.id).delete()
        await ChatMessage.find(ChatMessage.user_id == stu.id).delete()
        await stu.delete()
        
    ad = await User.find_one(User.email == admin_email)
    if ad:
        await CodingProgress.find(CodingProgress.user_id == ad.id).delete()
        await ChatMessage.find(ChatMessage.user_id == ad.id).delete()
        await ad.delete()
        
    # We construct the AsyncClient targeting the ASGI app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("1. Registering test accounts...")
        # Register student
        reg_student = await client.post("/api/auth/register", json={
            "name": "Chat Student",
            "email": student_email,
            "password": "password123",
            "role": "user"
        })
        assert reg_student.status_code == 201
        student_token = reg_student.json()["access_token"]
        headers_student = {"Authorization": f"Bearer {student_token}"}
        
        # Register admin
        reg_admin = await client.post("/api/auth/register", json={
            "name": "Chat Admin",
            "email": admin_email,
            "password": "password123",
            "role": "admin",
            "admin_passcode": "admin123"
        })
        assert reg_admin.status_code == 201
        admin_token = reg_admin.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        print("2. Testing GET /api/chat/history (empty state)...")
        hist_res = await client.get("/api/chat/history", headers=headers_student)
        assert hist_res.status_code == 200
        assert isinstance(hist_res.json(), list)
        print(f"   Success! History fetched successfully. Length: {len(hist_res.json())}")

        print("3. Testing POST /api/chat/send (student message)...")
        send_res = await client.post("/api/chat/send", json={"message": "Hello community!"}, headers=headers_student)
        assert send_res.status_code == 200
        msg_id = send_res.json()["id"]
        assert send_res.json()["user_name"] == "Chat Student"
        assert send_res.json()["message"] == "Hello community!"
        print("   Success! Message sent and saved to database.")

        print("4. Testing GET /api/chat/history (populated state)...")
        hist_res2 = await client.get("/api/chat/history", headers=headers_student)
        assert hist_res2.status_code == 200
        assert len(hist_res2.json()) == 1
        assert hist_res2.json()[0]["id"] == msg_id
        print("   Success! Saved message retrieved in history stream.")

        print("5. Testing GET /api/chat/active (active users list)...")
        active_res = await client.get("/api/chat/active", headers=headers_student)
        assert active_res.status_code == 200
        active_list = active_res.json()
        assert len(active_list) >= 2 # student and admin should be active due to recent requests
        # Find active student in list
        student_active = next((u for u in active_list if u["name"] == "Chat Student"), None)
        assert student_active is not None
        assert student_active["role"] == "user"
        print("   Success! Active members returned with privacy-safe profile telemetry.")

        print("6. Testing DELETE /api/chat/delete/{msg_id} (student tries to delete)...")
        del_fail = await client.delete(f"/api/chat/delete/{msg_id}", headers=headers_student)
        assert del_fail.status_code == 403
        print("   Success! Student restricted from deleting messages.")

        print("7. Testing DELETE /api/chat/delete/{msg_id} (admin deletes)...")
        del_success = await client.delete(f"/api/chat/delete/{msg_id}", headers=headers_admin)
        assert del_success.status_code == 200
        
        # Check database
        db_check = await ChatMessage.get(msg_id)
        assert db_check is None, "Message should be deleted in MongoDB"
        print("   Success! Admin purged message and database updated.")

        # Clean up
        stu_doc = await User.find_one(User.email == student_email)
        if stu_doc:
            await CodingProgress.find(CodingProgress.user_id == stu_doc.id).delete()
            await stu_doc.delete()
        admin_doc = await User.find_one(User.email == admin_email)
        if admin_doc:
            await CodingProgress.find(CodingProgress.user_id == admin_doc.id).delete()
            await admin_doc.delete()
        print("   Cleaned up test accounts successfully.")

if __name__ == "__main__":
    asyncio.run(run_chat_tests())
