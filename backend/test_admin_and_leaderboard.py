import asyncio
import os
import sys
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

# Ensure backend path is in sys.path for proper imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.config.db import init_db
from app.models.user import User
from app.models.coding import CodingProgress
from app.models.pomodoro import PomodoroSession

async def run_realistic_tests():
    # 1. Initialize Beanie in the current loop
    await init_db()
    
    student_email = "api.student@example.com"
    admin_email = "api.admin@example.com"
    
    # Cleanup pre-existing
    stu = await User.find_one(User.email == student_email)
    if stu:
        # Find progress and pomodoros to delete
        await CodingProgress.find(CodingProgress.user_id == stu.id).delete()
        await PomodoroSession.find(PomodoroSession.user_id == stu.id).delete()
        await stu.delete()
        
    ad = await User.find_one(User.email == admin_email)
    if ad:
        await CodingProgress.find(CodingProgress.user_id == ad.id).delete()
        await ad.delete()
    
    # We construct the AsyncClient targeting the ASGI app
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("1. Registering standard student user via API...")
        reg_student_res = await client.post("/api/auth/register", json={
            "name": "API Student",
            "email": student_email,
            "password": "password123",
            "role": "user"
        })
        assert reg_student_res.status_code == 201, f"Registration failed: {reg_student_res.text}"
        student_token = reg_student_res.json()["access_token"]
        print(f"   Success! Student registered. Token: {student_token[:15]}...")

        print("2. Registering placement admin user via API...")
        reg_admin_res = await client.post("/api/auth/register", json={
            "name": "API Admin",
            "email": admin_email,
            "password": "password123",
            "role": "admin"
        })
        assert reg_admin_res.status_code == 201, f"Registration failed: {reg_admin_res.text}"
        admin_token = reg_admin_res.json()["access_token"]
        print(f"   Success! Admin registered. Token: {admin_token[:15]}...")

        # Let's seed coding/pomodoro for the API student
        stu_doc = await User.find_one(User.email == student_email)
        stu_doc.college = "Vignans Institute"
        stu_doc.branch = "CSE"
        await stu_doc.save()
        
        # Seed 5 solves (3 today, 2 yesterday) on the existing progress document
        progress = await CodingProgress.find_one(CodingProgress.user_id == stu_doc.id)
        assert progress is not None, "CodingProgress should have been automatically initialized upon registration!"
        
        progress.leetcode_username = "api_student_lc"
        progress.daily_solved_count = {
            datetime.utcnow().strftime("%Y-%m-%d"): 3,
            (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d"): 2
        }
        await progress.save()

        # Seed 120 focus minutes (2 hours)
        session1 = PomodoroSession(
            user_id=stu_doc.id,
            duration=60,
            completed=True,
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        await session1.create()
        session2 = PomodoroSession(
            user_id=stu_doc.id,
            duration=60,
            completed=True,
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        await session2.create()

        # Test 3: Unauthorized user accessing admin stats
        print("3. Testing unauthorized access to /api/admin/stats...")
        headers_student = {"Authorization": f"Bearer {student_token}"}
        admin_stats_fail = await client.get("/api/admin/stats", headers=headers_student)
        print(f"   Response status: {admin_stats_fail.status_code}")
        assert admin_stats_fail.status_code == 403, "Should fail with 403 Forbidden!"
        print("   Banned student successfully restricted from admin panel.")

        # Test 4: Authorized admin accessing admin stats
        print("4. Testing authorized admin access to /api/admin/stats...")
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        admin_stats_success = await client.get("/api/admin/stats", headers=headers_admin)
        print(f"   Response status: {admin_stats_success.status_code}")
        assert admin_stats_success.status_code == 200, f"Admin fetch failed: {admin_stats_success.text}"
        stats_data = admin_stats_success.json()
        print(f"   Stats data payload: {stats_data}")
        assert stats_data["total_users"] >= 2, "Expected at least 2 users registered."
        assert stats_data["online_now"] >= 2, "Both registered users should be online (active recently)."
        
        # Verify user list details
        users_list = stats_data["users"]
        stu_list_item = next(u for u in users_list if u["email"] == student_email)
        assert stu_list_item["college"] == "Vignans Institute"
        assert stu_list_item["branch"] == "CSE"
        print("   Admin Panel metrics validated successfully.")

        # Test 5: Verify Weekly Leaderboard
        print("5. Testing /api/leaderboard calculation formula...")
        leaderboard_res = await client.get("/api/leaderboard", headers=headers_student)
        assert leaderboard_res.status_code == 200, f"Leaderboard fetch failed: {leaderboard_res.text}"
        leaderboard_data = leaderboard_res.json()
        print(f"   Leaderboard entries count: {len(leaderboard_data)}")
        
        # Locate student in leaderboard
        student_entry = next(item for item in leaderboard_data if item["email"] == student_email)
        print(f"   Student leaderboard entry: {student_entry}")
        
        # Verify values
        # Solves = 3 + 2 = 5
        # Focus hours = (60 + 60) / 60.0 = 2.0 hours
        # Score formula = (5 * 10) + (2.0 * 5) = 50 + 10 = 60
        assert student_entry["weekly_problems_solved"] == 5
        assert student_entry["weekly_focus_hours"] == 2.0
        assert student_entry["score"] == 60
        print("   Weekly Leaderboard scores calculated correctly (Score = 60 pts).")

        # Clean up test accounts
        await stu_doc.delete()
        await progress.delete()
        await session1.delete()
        await session2.delete()
        admin_doc = await User.find_one(User.email == admin_email)
        if admin_doc:
            await CodingProgress.find(CodingProgress.user_id == admin_doc.id).delete()
            await admin_doc.delete()
        print("   Test accounts successfully cleaned up.")

if __name__ == "__main__":
    asyncio.run(run_realistic_tests())
