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

        print("2a. Testing admin registration passcode failure (invalid passcode)...")
        reg_admin_fail = await client.post("/api/auth/register", json={
            "name": "API Admin Fail",
            "email": "bad.admin@example.com",
            "password": "password123",
            "role": "admin",
            "admin_passcode": "wrong_key"
        })
        assert reg_admin_fail.status_code == 403, f"Registration should have failed: {reg_admin_fail.text}"
        print("   Success! Unauthorized admin registration blocked with 403 Forbidden.")

        print("2b. Registering placement admin user via API with correct passcode...")
        reg_admin_res = await client.post("/api/auth/register", json={
            "name": "API Admin",
            "email": admin_email,
            "password": "password123",
            "role": "admin",
            "admin_passcode": "admin123"
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

        # Test 6: Verify manual checklist solves integration and backfilling
        print("6. Testing checklist solved counting and toggling via API...")
        
        # A: Toggle a specific question to completed
        # Question ID: "reverse-linked-list" (not a topic category name)
        toggle_res = await client.post("/api/coding/dsa", json={
            "topic": "reverse-linked-list",
            "status": "completed"
        }, headers=headers_student)
        assert toggle_res.status_code == 200, f"Toggle failed: {toggle_res.text}"
        
        # Let's verify progress endpoint shows it completed and daily solved count is incremented by 1
        progress_res = await client.get("/api/coding/progress", headers=headers_student)
        progress_data = progress_res.json()
        
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        assert progress_data["dsa_progress"]["reverse-linked-list"] == "completed"
        # Initial today solves was 3, should now be 4!
        assert progress_data["daily_solved_count"][today_str] == 4
        print("   Toggling a checklist question to completed incremented daily solved count.")

        # B: Toggle a checklist question to not_started
        toggle_res2 = await client.post("/api/coding/dsa", json={
            "topic": "reverse-linked-list",
            "status": "not_started"
        }, headers=headers_student)
        assert toggle_res2.status_code == 200
        
        progress_res2 = await client.get("/api/coding/progress", headers=headers_student)
        progress_data2 = progress_res2.json()
        assert progress_data2["dsa_progress"]["reverse-linked-list"] == "not_started"
        # Today solves should go back to 3!
        assert progress_data2["daily_solved_count"][today_str] == 3
        print("   Toggling a checklist question to not_started decremented daily solved count.")

        # C: Backfilling check:
        # If we manually update dsa_progress with completed questions but empty daily_solved_count
        db_progress = await CodingProgress.find_one(CodingProgress.user_id == stu_doc.id)
        db_progress.dsa_progress["two-sum"] = "completed"
        db_progress.dsa_progress["contains-duplicate"] = "completed"
        db_progress.dsa_progress["Arrays"] = "completed"  # category, should not count towards solved count
        db_progress.daily_solved_count = {}  # empty it out
        await db_progress.save()
        
        # When user retrieves progress, it should backfill the difference (2 solves) to today
        progress_res3 = await client.get("/api/coding/progress", headers=headers_student)
        progress_data3 = progress_res3.json()
        # Should backfill two completed questions into today
        assert progress_data3["daily_solved_count"][today_str] == 2
        print("   Self-healing backfill successfully synced completed checklist questions into daily solved count.")

        # Test 7: Verify student deletion cascading logic
        print("7. Testing student deletion cascading logic...")
        
        # Register a temporary student to delete
        temp_student_email = "delete.me@example.com"
        reg_temp_res = await client.post("/api/auth/register", json={
            "name": "Delete Me",
            "email": temp_student_email,
            "password": "password123",
            "role": "user"
        })
        assert reg_temp_res.status_code == 201
        temp_user_id = reg_temp_res.json()["user"]["id"]
        
        # A: Student trying to delete another student should fail
        del_fail_res = await client.delete(f"/api/admin/users/{temp_user_id}", headers=headers_student)
        assert del_fail_res.status_code == 403, "Student should not be able to delete another user"
        print("   Success! Student restricted from deleting other accounts.")
        
        # B: Admin deleting student should succeed
        del_success_res = await client.delete(f"/api/admin/users/{temp_user_id}", headers=headers_admin)
        assert del_success_res.status_code == 200, f"Admin deletion failed: {del_success_res.text}"
        
        # Verify user document is deleted
        temp_user_check = await User.find_one(User.email == temp_student_email)
        assert temp_user_check is None, "User document should have been deleted"
        print("   Success! Admin deleted student account successfully.")

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
