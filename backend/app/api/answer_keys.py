import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import AnswerKey, QuestionPaper, User
from backend.app.schemas.schemas import AnswerKeyResponse
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/answer-keys", tags=["Answer Key Studio"])

def format_ak_response(ak: AnswerKey) -> AnswerKeyResponse:
    return AnswerKeyResponse(
        id=ak.id,
        question_paper_id=ak.question_paper_id,
        set_code=ak.set_code,
        title=ak.title,
        content_markdown=ak.content_markdown,
        marking_rubrics=json.loads(ak.marking_rubric_json or "[]"),
        created_at=ak.created_at
    )

@router.get("/question-paper/{qp_id}", response_model=List[AnswerKeyResponse])
def get_answer_keys_for_qp(qp_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    qp = db.query(QuestionPaper).filter(QuestionPaper.id == qp_id).first()
    if not qp:
        raise HTTPException(status_code=404, detail="Question paper not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and qp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to answer keys")
    keys = db.query(AnswerKey).filter(AnswerKey.question_paper_id == qp_id).all()
    return [format_ak_response(k) for k in keys]

@router.get("/{ak_id}", response_model=AnswerKeyResponse)
def get_answer_key_by_id(ak_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ak = db.query(AnswerKey).filter(AnswerKey.id == ak_id).first()
    if not ak:
        raise HTTPException(status_code=404, detail="Answer Key not found")
    qp = db.query(QuestionPaper).filter(QuestionPaper.id == ak.question_paper_id).first()
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and qp and qp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this answer key")
    return format_ak_response(ak)
