import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import QuestionBankItem, Subject, User
from backend.app.schemas.schemas import QuestionBankItemCreate, QuestionBankItemResponse
from backend.app.api.auth import get_current_user

router = APIRouter(prefix="/question-bank", tags=["Question Bank Manager"])

def format_qb_response(item: QuestionBankItem) -> QuestionBankItemResponse:
    return QuestionBankItemResponse(
        id=item.id,
        subject_id=item.subject_id,
        unit_number=item.unit_number,
        topic=item.topic,
        question_text=item.question_text,
        expected_answer=item.expected_answer or "",
        marks=item.marks,
        difficulty=item.difficulty,
        bloom_level=item.bloom_level,
        question_type=item.question_type,
        tags=json.loads(item.tags_json or "[]"),
        set_origin=item.set_origin or "",
        is_extra_pool=bool(item.is_extra_pool),
        created_at=item.created_at
    )

@router.get("/subject/{subject_id}", response_model=List[QuestionBankItemResponse])
@router.get("/{subject_id}", response_model=List[QuestionBankItemResponse])
def get_question_bank_items(
    subject_id: int,
    unit: Optional[int] = Query(None),
    difficulty: Optional[str] = Query(None),
    bloom: Optional[str] = Query(None),
    marks: Optional[int] = Query(None),
    set_origin: Optional[str] = Query(None),
    is_extra_pool: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role != "ADMIN" and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this subject's question bank")

    query = db.query(QuestionBankItem).filter(QuestionBankItem.subject_id == subject_id)

    if unit is not None:
        query = query.filter(QuestionBankItem.unit_number == unit)
    if difficulty:
        query = query.filter(QuestionBankItem.difficulty == difficulty.upper())
    if bloom:
        query = query.filter(QuestionBankItem.bloom_level == bloom)
    if marks is not None:
        query = query.filter(QuestionBankItem.marks == marks)
    if set_origin:
        query = query.filter(QuestionBankItem.set_origin == set_origin)
    if is_extra_pool is not None:
        query = query.filter(QuestionBankItem.is_extra_pool == is_extra_pool)
    if search:
        query = query.filter(QuestionBankItem.question_text.ilike(f"%{search}%"))

    items = query.order_by(QuestionBankItem.unit_number.asc(), QuestionBankItem.id.asc()).all()
    return [format_qb_response(it) for it in items]

@router.post("", response_model=QuestionBankItemResponse)
def add_question_bank_item(item_in: QuestionBankItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == item_in.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role != "ADMIN" and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to add questions to this subject")
    item = QuestionBankItem(
        subject_id=item_in.subject_id,
        user_id=current_user.id,
        unit_number=item_in.unit_number,
        topic=item_in.topic,
        question_text=item_in.question_text,
        expected_answer=item_in.expected_answer or "",
        marks=item_in.marks,
        difficulty=item_in.difficulty,
        bloom_level=item_in.bloom_level,
        question_type=item_in.question_type,
        tags_json=json.dumps(item_in.tags),
        set_origin=item_in.set_origin or "Custom Entry",
        is_extra_pool=item_in.is_extra_pool
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return format_qb_response(item)

@router.post("/generate-extra-pool/{subject_id}")
def generate_extra_question_pool(
    subject_id: int,
    count: int = 15,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Synthesizes an Extra Auxiliary Question Pool (exclusive 2M, 13M, 16M questions,
    numerical problems, and case studies) across all syllabus units that are NOT part of any exam set.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role != "ADMIN" and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to generate questions for this subject")

    units = subject.units
    if not units or len(units) == 0:
        raise HTTPException(status_code=400, detail="Please configure course syllabus units first")

    created_items = []
    bloom_spectrum = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]

    for u_idx, unit in enumerate(units):
        u_num = unit.unit_number
        u_title = unit.title
        topics = json.loads(unit.topics_json or "[]")
        t1 = topics[0] if len(topics) > 0 else f"{u_title} Foundations"
        t2 = topics[1] if len(topics) > 1 else f"{u_title} Architecture"
        t3 = topics[2] if len(topics) > 2 else f"{u_title} Analysis"

        # Extra 2-Mark Question
        q2m = QuestionBankItem(
            subject_id=subject.id,
            user_id=current_user.id,
            unit_number=u_num,
            topic=t1,
            question_text=f"[Auxiliary Pool - Unit {u_num}] State the fundamental theorem and mathematical boundary condition of {t1} in {subject.name}.",
            expected_answer=f"Definition of {t1}, key parameters, and mathematical constraints as per autonomous engineering standard.",
            marks=2,
            difficulty="EASY",
            bloom_level="Remember",
            question_type="SHORT_ANSWER",
            tags_json=json.dumps(["Auxiliary Pool", "Quiz/Homework", f"Unit {u_num}"]),
            set_origin="Extra Pool",
            is_extra_pool=True,
            co_mapped=f"CO{min(max(u_num, 1), 5)}"
        )
        db.add(q2m)
        created_items.append(q2m)

        # Extra 13-Mark Descriptive Question
        q13m = QuestionBankItem(
            subject_id=subject.id,
            user_id=current_user.id,
            unit_number=u_num,
            topic=t2,
            question_text=f"[Auxiliary Pool - Unit {u_num}] Provide a comprehensive architectural derivation and algorithmic walkthrough of {t2}. Illustrate with labeled sequence diagrams and practical performance trade-offs.",
            expected_answer=f"Detailed step-by-step mechanism of {t2}, architectural schematic, mathematical derivation, and performance complexity bounds.",
            marks=13,
            difficulty="MEDIUM",
            bloom_level="Analyze",
            question_type="DESCRIPTIVE",
            tags_json=json.dumps(["Auxiliary Pool", "Re-Examination", f"Unit {u_num}"]),
            set_origin="Extra Pool",
            is_extra_pool=True,
            co_mapped=f"CO{min(max(u_num, 1), 5)}"
        )
        db.add(q13m)
        created_items.append(q13m)

        # Extra 15/16-Mark Design / Case Problem
        q16m = QuestionBankItem(
            subject_id=subject.id,
            user_id=current_user.id,
            unit_number=u_num,
            topic=t3,
            question_text=f"[Auxiliary Pool - Unit {u_num}] Autonomous Case Study Challenge: Formulate an optimal fault-tolerant design for {t3} under heavy campus server workload. Validate with throughput calculations.",
            expected_answer=f"System design blueprint for {t3}, latency equations, failure recovery protocol, and empirical evaluation metrics.",
            marks=15,
            difficulty="HARD",
            bloom_level="Create",
            question_type="CASE_STUDY",
            tags_json=json.dumps(["Auxiliary Pool", "Autonomous Design Challenge", f"Unit {u_num}"]),
            set_origin="Extra Pool",
            is_extra_pool=True,
            co_mapped=f"CO{min(max(u_num, 1), 5)}"
        )
        db.add(q16m)
        created_items.append(q16m)

    db.commit()
    for it in created_items:
        db.refresh(it)

    return {
        "status": "success",
        "message": f"Successfully generated {len(created_items)} extra auxiliary questions across {len(units)} units",
        "total_generated": len(created_items),
        "items": [format_qb_response(it) for it in created_items]
    }

@router.delete("/{item_id}")
@router.delete("/item/{item_id}")
def delete_question_bank_item(item_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    item = db.query(QuestionBankItem).filter(QuestionBankItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if current_user.role != "ADMIN" and item.user_id != current_user.id and (item.subject and item.subject.user_id != current_user.id):
        raise HTTPException(status_code=403, detail="Access denied to delete this question item")
    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Question deleted from bank"}
