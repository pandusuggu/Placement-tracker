from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
import pypdf
import io
from app.models.user import User
from app.models.analytics import PlacementScore
from app.models.coding import CodingProgress
from app.utils.auth import get_current_user
from app.utils.rate_limit import verify_ai_rate_limit
from app.services.placement_service import PlacementService
from app.services.ai_service import AIService
from pydantic import BaseModel

router = APIRouter(prefix="/api/placement", tags=["Placement Readiness"])

@router.get("/readiness")
async def get_placement_readiness(user: User = Depends(get_current_user)):
    # Find active placement score record
    score_record = await PlacementScore.find_one(PlacementScore.user_id == user.id)
    
    if not score_record:
        # Generate on the fly
        progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
        if not progress:
            progress = CodingProgress(
                user_id=user.id,
                leetcode_username="",
                gfg_username="",
                hackerrank_username="",
                dsa_progress={},
                core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
                aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
                projects_progress=[]
            )
            await progress.create()
            
        score_record = await PlacementService.create_or_update_placement_score(user.id, progress)
        
    res = score_record.model_dump()
    res["id"] = str(score_record.id)
    res["user_id"] = str(score_record.user_id)
    return res

@router.post("/resume/analyze")
async def analyze_user_resume(
    file: UploadFile = File(...),
    user: User = Depends(verify_ai_rate_limit)
):
    filename = file.filename.lower()
    if not (filename.endswith(".pdf") or filename.endswith(".txt")):
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are supported.")
    
    text = ""
    try:
        if filename.endswith(".pdf"):
            content = await file.read()
            pdf_file = io.BytesIO(content)
            reader = pypdf.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        else:
            content = await file.read()
            text = content.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")
        
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file. Ensure it contains readable text.")
        
    try:
        analysis = await AIService.analyze_resume(text, user_id=user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")
        
    progress = await CodingProgress.find_one(CodingProgress.user_id == user.id)
    if progress:
        suggested_status = analysis.get("suggested_status", "completed")
        progress.resume_status = suggested_status
        await progress.save()
        
    score_record = await PlacementScore.find_one(PlacementScore.user_id == user.id)
    if not score_record:
        if not progress:
            progress = CodingProgress(
                user_id=user.id,
                leetcode_username="",
                gfg_username="",
                hackerrank_username="",
                dsa_progress={},
                core_subjects_progress={"DBMS": 0.0, "OS": 0.0, "CN": 0.0, "OOP": 0.0},
                aptitude_progress={"Quantitative Aptitude": 0.0, "Logical Reasoning": 0.0, "Verbal Ability": 0.0},
                projects_progress=[]
            )
            await progress.create()
        score_record = await PlacementService.create_or_update_placement_score(user.id, progress)
        
    score_record.resume_ats_score = float(analysis.get("score", 60.0))
    score_record.resume_strengths = list(analysis.get("strengths", []))
    score_record.resume_improvements = list(analysis.get("improvements", []))
    score_record.resume_suggestions = list(analysis.get("suggestions", []))
    
    if progress:
        metrics = PlacementService.calculate_readiness_score(progress)
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
    
    res = score_record.model_dump()
    res["id"] = str(score_record.id)
    res["user_id"] = str(score_record.user_id)
    return res

class CompanyRoundRegenerateRequest(BaseModel):
    company: str
    round_name: str
    round_desc: str

@router.post("/company-rounds/regenerate")
async def regenerate_company_round_questions(
    payload: CompanyRoundRegenerateRequest,
    user: User = Depends(verify_ai_rate_limit)
):
    try:
        questions = await AIService.generate_company_round_questions(
            payload.company,
            payload.round_name,
            payload.round_desc,
            user_id=user.id
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")
