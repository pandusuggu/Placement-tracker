from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.coding import CodingProgress
from app.utils.auth import get_current_user
from app.services.coding_service import CodingService
from app.services.placement_service import PlacementService

router = APIRouter(prefix="/api/coding", tags=["Coding Tracker & Placement Hub"])

class UsernamesSchema(BaseModel):
    leetcode_username: Optional[str] = ""
    codechef_username: Optional[str] = ""
    hackerrank_username: Optional[str] = ""

class DSATopicUpdateSchema(BaseModel):
    topic: str  # e.g., "Arrays", "Strings"
    status: str  # "not_started", "in_progress", "completed"

class CoreSubjectUpdateSchema(BaseModel):
    subject: str  # "DBMS", "OS", "CN", "OOP"
    completion_percentage: float  # 0.0 to 100.0

class AptitudeUpdateSchema(BaseModel):
    topic: str  # "Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"
    completion_percentage: float  # 0.0 to 100.0

class ProjectUpdateSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    completion_percentage: float

class CareerStateSchema(BaseModel):
    resume_status: Optional[str] = None  # "not_started", "in_progress", "completed", "reviewed"
    mock_interview_score: Optional[float] = None

class RegenerateQuestionsSchema(BaseModel):
    subject: str  # "DBMS", "OS", "CN", "OOP"

class RegenerateAptitudeQuestionsSchema(BaseModel):
    topic: str  # "Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"

class DSAYoutubeLinkUpdateSchema(BaseModel):
    question_id: str
    youtube_link: str

DEFAULT_APTITUDE_QUESTIONS = {
    "Quantitative Aptitude": [
        "Solve Percentages Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/percentage/",
        "Solve Profit & Loss Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/profit-and-loss/",
        "Solve Ratio & Proportion Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/ratio-and-proportion/",
        "Solve Time & Work Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/time-and-work/",
        "Solve Time & Distance Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/time-and-distance/"
    ],
    "Logical Reasoning": [
        "Solve Arrangements & Seating Puzzles || https://www.indiabix.com/verbal-reasoning/seating-arrangement/",
        "Solve Venn Diagram & Syllogism Deductions || https://www.indiabix.com/verbal-reasoning/syllogism/",
        "Solve Letter & Symbol Series || https://www.indiabix.com/logical-reasoning/letter-and-symbol-series/",
        "Solve Blood Relation Queries || https://www.indiabix.com/verbal-reasoning/blood-relation-test/",
        "Solve Clocks & Calendar Puzzles || https://www.indiabix.com/aptitude/clock/"
    ],
    "Verbal Ability": [
        "Solve Reading Comprehension Inquiries || https://www.indiabix.com/verbal-ability/comprehension/",
        "Solve Sentence Correction & Grammar Checks || https://www.indiabix.com/verbal-ability/sentence-correction/",
        "Solve Synonyms & Antonyms Queries || https://www.indiabix.com/verbal-ability/synonyms/",
        "Solve Para Jumbles & Ordering of Sentences || https://www.indiabix.com/verbal-ability/ordering-of-sentences/",
        "Solve Idioms and Phrases Questions || https://www.indiabix.com/verbal-ability/idioms-and-phrases/"
    ]
}

DEFAULT_CS_QUESTIONS = {
    "DBMS": [
        "Explain ACID Properties in Transactions (transaction safety).",
        "What is Database Indexing and how does B-Tree work?",
        "Compare SQL vs NoSQL databases (relational vs non-relational).",
        "What is Database Normalization (1NF, 2NF, 3NF)?",
        "What is the difference between Inner, Left, Right, and Full Joins?"
    ],
    "OS": [
        "What is the difference between a Process and a Thread?",
        "Explain Deadlocks, their 4 necessary conditions, and prevention.",
        "What is Virtual Memory and Paging?",
        "Explain CPU Scheduling algorithms (e.g. Round Robin, FCFS).",
        "What is Thread Synchronization, Mutex, and Semaphore?"
    ],
    "CN": [
        "Explain the OSI Model layers and their functions.",
        "What is the difference between TCP and UDP?",
        "What happens when you type a URL in the browser (DNS, TCP, HTTP)?",
        "What is the difference between HTTP and HTTPS (SSL/TLS handshake)?",
        "Compare IPv4 vs IPv6 addressing."
    ],
    "OOP": [
        "Explain the 4 Pillars of OOP (Abstraction, Encapsulation, Inheritance, Polymorphism).",
        "What is the difference between Method Overloading and Method Overriding?",
        "Compare Abstract Class vs Interface.",
        "What is the difference between Composition and Inheritance?",
        "Explain the concept of Constructor and Destructor."
    ]
}

@router.get("/progress")
async def get_progress(user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        # Lazy create if not found
        progress = CodingProgress(
            user_id=user.id,
            leetcode_username="",
            codechef_username="",
            hackerrank_username="",
            dsa_progress={},
            core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
            core_subjects_questions=DEFAULT_CS_QUESTIONS,
            aptitude_questions=DEFAULT_APTITUDE_QUESTIONS,
            aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
            projects_progress=[]
        )
        await progress.create()
    else:
        # Initialize core & aptitude questions if missing
        need_save = False
        if not progress.core_subjects_questions:
            progress.core_subjects_questions = DEFAULT_CS_QUESTIONS
            need_save = True
        else:
            for subject in ["DBMS", "OS", "CN", "OOP"]:
                if subject not in progress.core_subjects_questions or not progress.core_subjects_questions[subject]:
                    progress.core_subjects_questions[subject] = DEFAULT_CS_QUESTIONS[subject]
                    need_save = True
                    
        if not progress.aptitude_questions:
            progress.aptitude_questions = DEFAULT_APTITUDE_QUESTIONS
            need_save = True
        else:
            # Self-healing migration check: if they have the old defaults, 404 links, or quantitative-aptitude links, overwrite them
            has_old = "Quantitative Aptitude" in progress.aptitude_questions and \
                      any("Arithmetic (Percentages" in q for q in progress.aptitude_questions["Quantitative Aptitude"])
            has_404 = "Logical Reasoning" in progress.aptitude_questions and \
                      any("logical-reasoning/coding-decoding" in q for q in progress.aptitude_questions["Logical Reasoning"])
            has_quant = "Quantitative Aptitude" in progress.aptitude_questions and \
                        any("quantitative-aptitude" in q for q in progress.aptitude_questions["Quantitative Aptitude"])
            if has_old or has_404 or has_quant:
                progress.aptitude_questions = DEFAULT_APTITUDE_QUESTIONS
                need_save = True
            else:
                for topic in ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]:
                    if topic not in progress.aptitude_questions or not progress.aptitude_questions[topic]:
                        progress.aptitude_questions[topic] = DEFAULT_APTITUDE_QUESTIONS[topic]
                        need_save = True
                    
        if need_save:
            await progress.save()
        
    res = progress.model_dump()
    res["id"] = str(progress.id)
    res["user_id"] = str(progress.user_id)
    return res

@router.put("/usernames")
async def update_usernames(data: UsernamesSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        progress = CodingProgress(user_id=user.id)
        
    progress.leetcode_username = data.leetcode_username
    progress.codechef_username = data.codechef_username
    progress.hackerrank_username = data.hackerrank_username
    
    await progress.save()
    # Trigger coding stats sync
    progress = await CodingService.sync_user_coding_progress(progress)
    await progress.save()
    
    # Calculate and store placement readiness score
    await PlacementService.create_or_update_placement_score(user.id, progress)
    
    return {"message": "Usernames updated and stats synced successfully", "progress": {"id": str(progress.id)}}

@router.post("/sync")
async def sync_stats(user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Coding progress profile not found")
        
    progress = await CodingService.sync_user_coding_progress(progress)
    await progress.save()
    
    # Trigger placement score update
    await PlacementService.create_or_update_placement_score(user.id, progress)
    
    res = progress.model_dump()
    res["id"] = str(progress.id)
    res["user_id"] = str(progress.user_id)
    return {"message": "Coding stats synced successfully", "progress": res}

@router.post("/dsa")
async def update_dsa_topic(data: DSATopicUpdateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    progress.dsa_progress[data.topic] = data.status
    await progress.save()
    
    # Recalculate readiness
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": f"DSA Topic '{data.topic}' updated to '{data.status}'"}

@router.post("/core-subjects")
async def update_core_subject(data: CoreSubjectUpdateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    progress.core_subjects_progress[data.subject] = data.completion_percentage
    await progress.save()
    
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": f"Core Subject '{data.subject}' updated to {data.completion_percentage}%"}

@router.post("/aptitude")
async def update_aptitude(data: AptitudeUpdateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    progress.aptitude_progress[data.topic] = data.completion_percentage
    await progress.save()
    
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": f"Aptitude topic '{data.topic}' updated to {data.completion_percentage}%"}

@router.post("/project")
async def add_or_update_project(data: ProjectUpdateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    # Check if project exists in list
    found = False
    for proj in progress.projects_progress:
        if proj["name"] == data.name:
            proj["description"] = data.description
            proj["completion_percentage"] = data.completion_percentage
            found = True
            break
            
    if not found:
        progress.projects_progress.append({
            "name": data.name,
            "description": data.description,
            "completion_percentage": data.completion_percentage
        })
        
    await progress.save()
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": f"Project '{data.name}' saved with {data.completion_percentage}% progress"}

@router.post("/career-state")
async def update_career_state(data: CareerStateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    if data.resume_status is not None:
        progress.resume_status = data.resume_status
    if data.mock_interview_score is not None:
        progress.mock_interview_score = data.mock_interview_score
        
    await progress.save()
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": "Career state settings updated successfully"}

@router.delete("/project/{project_name}")
async def delete_project(project_name: str, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
    
    # Filter out project by name
    progress.projects_progress = [p for p in progress.projects_progress if p["name"] != project_name]
    await progress.save()
    await PlacementService.create_or_update_placement_score(user.id, progress)
    return {"message": f"Project '{project_name}' deleted successfully"}

@router.post("/core-subjects/regenerate")
async def regenerate_core_subjects_questions(data: RegenerateQuestionsSchema, user: User = Depends(get_current_user)):
    from app.services.ai_service import AIService
    
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    if data.subject not in ["DBMS", "OS", "CN", "OOP"]:
        raise HTTPException(status_code=400, detail="Invalid subject")
        
    # Call AI to generate 5 new questions
    new_qs = await AIService.generate_cs_questions(data.subject)
    if not new_qs or len(new_qs) != 5:
        raise HTTPException(status_code=500, detail="Failed to generate questions from AI")
        
    if progress.core_subjects_questions is None:
        progress.core_subjects_questions = {}
    progress.core_subjects_questions[data.subject] = new_qs
    # Reset completion progress to 0% for this subject
    progress.core_subjects_progress[data.subject] = 0.0
    
    await progress.save()
    await PlacementService.create_or_update_placement_score(user.id, progress)
    
    return {
        "message": f"Successfully regenerated interview questions for {data.subject}",
        "questions": new_qs,
        "progress": 0.0
    }

@router.post("/aptitude/regenerate")
async def regenerate_aptitude_questions(data: RegenerateAptitudeQuestionsSchema, user: User = Depends(get_current_user)):
    from app.services.ai_service import AIService
    
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    if data.topic not in ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"]:
        raise HTTPException(status_code=400, detail="Invalid topic")
        
    # Call AI to generate 5 new aptitude questions
    new_qs = await AIService.generate_aptitude_questions(data.topic)
    if not new_qs or len(new_qs) != 5:
        raise HTTPException(status_code=500, detail="Failed to generate aptitude questions from AI")
        
    if progress.aptitude_questions is None:
        progress.aptitude_questions = {}
    progress.aptitude_questions[data.topic] = new_qs
    # Reset completion progress to 0% for this topic
    progress.aptitude_progress[data.topic] = 0.0
    
    await progress.save()
    await PlacementService.create_or_update_placement_score(user.id, progress)
    
    return {
        "message": f"Successfully regenerated aptitude questions for {data.topic}",
        "questions": new_qs,
        "progress": 0.0
    }

@router.post("/dsa/youtube")
async def update_dsa_youtube_link(data: DSAYoutubeLinkUpdateSchema, user: User = Depends(get_current_user)):
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if not progress:
        raise HTTPException(status_code=404, detail="Progress record not found")
        
    if progress.dsa_youtube_links is None:
        progress.dsa_youtube_links = {}
        
    progress.dsa_youtube_links[data.question_id] = data.youtube_link
    await progress.save()
    return {"message": f"YouTube link for question '{data.question_id}' updated successfully"}
