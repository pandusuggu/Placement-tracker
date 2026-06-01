import logging
from datetime import datetime, timedelta
from app.models.task import Task
from app.models.notification import Notification
from beanie import PydanticObjectId

logger = logging.getLogger("codepilot")

class SchedulerService:
    @staticmethod
    async def smart_reschedule_missed_tasks(user_id: PydanticObjectId) -> int:
        """
        Detects pending tasks that are overdue (due_date in the past) and:
        1. Reschedules them to today.
        2. Increments `rescheduled_count`.
        3. Recalculates priorities: bumps priority level based on rescheduling loops.
        4. Triggers a system notification to keep the user accountable.
        """
        now = datetime.utcnow()
        # Find pending tasks that have due_date set and are overdue (with 1 hour grace period)
        overdue_tasks = await Task.find(
            Task.user_id == user_id,
            Task.status == "pending",
            Task.due_date < now - timedelta(hours=1)
        ).to_list()

        if not overdue_tasks:
            return 0

        rescheduled_count = 0
        priority_ladder = ["low", "medium", "high", "urgent"]

        for task in overdue_tasks:
            task.rescheduled_count += 1
            
            # Recalculate priority: bump up if rescheduled more than twice
            if task.rescheduled_count >= 2:
                curr_idx = priority_ladder.index(task.priority) if task.priority in priority_ladder else 1
                new_idx = min(curr_idx + 1, len(priority_ladder) - 1)
                task.priority = priority_ladder[new_idx]
                
            # Postpone due_date to today evening (e.g., 6:00 PM local time or end of day)
            today_end = datetime.utcnow().replace(hour=18, minute=0, second=0, microsecond=0)
            if today_end < datetime.utcnow():
                # If 6:00 PM has already passed, schedule for tomorrow 6:00 PM
                today_end += timedelta(days=1)
            
            task.due_date = today_end
            await task.save()
            rescheduled_count += 1

            # Log system notification
            notif = Notification(
                user_id=user_id,
                title="Task Smart-Rescheduled ⏳",
                message=f"'{task.title}' was overdue. Placement Tracker has automatically moved it to today and set priority to '{task.priority.upper()}'.",
                notification_type="alert"
            )
            await notif.create()

        logger.info(f"Smart-rescheduled {rescheduled_count} overdue tasks for user {user_id}")
        return rescheduled_count
