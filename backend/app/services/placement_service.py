from typing import List, Dict
from app.models.coding import CodingProgress
from app.models.analytics import PlacementScore
from beanie import PydanticObjectId

class PlacementService:
    @staticmethod
    def calculate_readiness_score(progress: CodingProgress) -> Dict[str, any]:
        """
        Calculates the placement readiness score dynamically.
        Max potential points: 100
        - DSA Progress (30 points)
        - Core Subjects (20 points)
        - Aptitude Prep (20 points)
        - Projects (15 points)
        - Resume Status (5 points)
        - Mock Interview (10 points)
        """
        suggestions = []
        
        # 1. DSA Score (30 pts)
        dsa_topics = [
            "Arrays", "Strings", "Linked Lists", "Stack", "Queue", 
            "Trees", "Graphs", "Heap", "Recursion", "Backtracking", 
            "Greedy", "Dynamic Programming"
        ]
        completed_dsa = sum(1 for topic in dsa_topics if progress.dsa_progress.get(topic) == "completed")
        dsa_score = (completed_dsa / len(dsa_topics)) * 30.0
        
        if completed_dsa < 6:
            suggestions.append("Complete fundamental DSA topics (Arrays, Strings, Linked Lists, Stack) to clear basic coding rounds.")
        elif completed_dsa < len(dsa_topics):
            suggestions.append("Focus on advanced DSA topics like Dynamic Programming, Graphs, and Backtracking which are common in top product companies.")
            
        # 2. Core Subjects (20 pts)
        # We expect 4 subjects: DBMS, OS, CN, OOP
        core_subjects = ["DBMS", "OS", "CN", "OOP"]
        core_sum = sum(progress.core_subjects_progress.get(sub, 0.0) for sub in core_subjects)
        core_score = (core_sum / (len(core_subjects) * 100.0)) * 20.0
        
        for sub in core_subjects:
            if progress.core_subjects_progress.get(sub, 0.0) < 50.0:
                suggestions.append(f"Revise {sub} interview theory questions. Your current completion is low.")
                
        # 3. Aptitude (20 pts)
        # Quant, Logical, Verbal
        apt_topics = ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]
        apt_sum = sum(progress.aptitude_progress.get(topic, 0.0) for topic in apt_topics)
        apt_score = (apt_sum / (len(apt_topics) * 100.0)) * 20.0
        
        if apt_sum / len(apt_topics) < 60.0:
            suggestions.append("Dedicate weekly sessions to Quantitative Aptitude and Logical Reasoning. Many companies use these for initial screening.")
            
        # 4. Projects (15 pts)
        # Evaluate projects completion percentage
        proj_score = 0.0
        if progress.projects_progress:
            total_proj_progress = sum(proj.get("completion_percentage", 0.0) for proj in progress.projects_progress)
            avg_proj = total_proj_progress / len(progress.projects_progress)
            proj_score = (avg_proj / 100.0) * 15.0
            
            if avg_proj < 75.0:
                suggestions.append("Push your major software project to completion and make sure it has an interactive deployment links.")
        else:
            suggestions.append("Add at least one flagship development project to your profile to demonstrate real-world programming skills.")

        # 5. Resume (5 pts)
        resume_values = {
            "not_started": 0.0,
            "in_progress": 2.0,
            "completed": 4.0,
            "reviewed": 5.0
        }
        res_score = resume_values.get(progress.resume_status, 0.0)
        if progress.resume_status in ["not_started", "in_progress"]:
            suggestions.append("Draft your resume. Include links to Leetcode/Github profiles and list core technical stacks.")
        elif progress.resume_status == "completed":
            suggestions.append("Get your resume reviewed by mentors or alumni to improve formatting for ATS screening.")

        # 6. Mock Interview (10 pts)
        mock_score = (progress.mock_interview_score / 100.0) * 10.0
        if progress.mock_interview_score < 70.0:
            suggestions.append("Schedule a mock interview. Focus on improving technical communication and problem-solving explanation.")

        # Aggregate overall score
        total_score = dsa_score + core_score + apt_score + proj_score + res_score + mock_score
        total_score = round(min(max(total_score, 0.0), 100.0), 1)

        # Map to readiness level
        if total_score >= 85:
            readiness_level = "Excellent"
            suggestions.append("You are fully prepared! Keep refining advanced coding patterns and take Mock Interviews to stay sharp.")
        elif total_score >= 65:
            readiness_level = "High"
        elif total_score >= 45:
            readiness_level = "Medium"
        else:
            readiness_level = "Low"

        if not suggestions:
            suggestions.append("Continue daily practice and coding streaks.")

        return {
            "score": total_score,
            "readiness_level": readiness_level,
            "dsa_score": round(dsa_score, 1),
            "core_subjects_score": round(core_score, 1),
            "aptitude_score": round(apt_score, 1),
            "projects_score": round(proj_score, 1),
            "resume_score": round(res_score, 1),
            "mock_interview_score": round(mock_score, 1),
            "suggestions": suggestions[:4]  # Top 4 recommendations
        }
        
    @staticmethod
    async def create_or_update_placement_score(user_id: PydanticObjectId, progress: CodingProgress) -> PlacementScore:
        """
        Saves or updates user's placement readiness record.
        """
        metrics = PlacementService.calculate_readiness_score(progress)
        
        # Check if record exists
        score_record = await PlacementScore.find_one(PlacementScore.user_id == user_id)
        if not score_record:
            score_record = PlacementScore(user_id=user_id, **metrics)
        else:
            # Update fields
            score_record.score = metrics["score"]
            score_record.readiness_level = metrics["readiness_level"]
            score_record.dsa_score = metrics["dsa_score"]
            score_record.core_subjects_score = metrics["core_subjects_score"]
            score_record.aptitude_score = metrics["aptitude_score"]
            score_record.projects_score = metrics["projects_score"]
            score_record.resume_score = metrics["resume_score"]
            score_record.mock_interview_score = metrics["mock_interview_score"]
            score_record.suggestions = metrics["suggestions"]
            
        await score_record.save()
        return score_record
