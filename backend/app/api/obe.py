import json
import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Subject, CourseOutcome, QuestionPaper, User, AuditLog
from backend.app.schemas.schemas import (
    CourseOutcomeSchema, CourseOutcomeUpdateRequest, OBEMatrixResponse, CourseFrameworkResponse
)
from backend.app.api.auth import get_current_user
from backend.app.agents.obe_engine import (
    OBEEngine, STANDARD_PO_DEFINITIONS, STANDARD_PSO_DEFINITIONS
)
from backend.app.agents.export_service import ExportService

router = APIRouter(prefix="/obe", tags=["Outcome-Based Education (OBE) & NBA Accreditation"])

@router.get("/subject/{subject_id}", response_model=OBEMatrixResponse)
def get_or_create_subject_obe(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this subject's OBE data")

    # Fetch existing Course Outcomes or Auto-Initialize 5 COs
    existing_cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.unit_number.asc()).all()

    if not existing_cos:
        units_data = [
            {"unit_number": u.unit_number, "title": u.title, "topics": json.loads(u.topics_json or "[]")} for u in subject.units
        ]
        default_cos_data = OBEEngine.generate_default_course_outcomes(
            subject_code=subject.code,
            subject_name=subject.name,
            units_data=units_data
        )

        for co_data in default_cos_data:
            co_obj = CourseOutcome(
                subject_id=subject_id,
                co_code=co_data["co_code"],
                description=co_data["description"],
                bloom_level=co_data["bloom_level"],
                unit_number=co_data["unit_number"],
                target_attainment_pct=co_data["target_attainment_pct"],
                po_mapping_json=json.dumps(co_data["po_mapping"])
            )
            db.add(co_obj)
        db.commit()
        existing_cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.unit_number.asc()).all()

    # Format COs for response
    cos_list = []
    for co in existing_cos:
        po_map = json.loads(co.po_mapping_json) if co.po_mapping_json else {}
        cos_list.append(CourseOutcomeSchema(
            id=co.id,
            subject_id=co.subject_id,
            co_code=co.co_code,
            description=co.description,
            bloom_level=co.bloom_level,
            unit_number=co.unit_number,
            target_attainment_pct=co.target_attainment_pct,
            po_mapping=po_map,
            created_at=co.created_at
        ))

    # Compute Articulation Matrix
    cos_dict_list = [
        {
            "co_code": c.co_code,
            "bloom_level": c.bloom_level,
            "po_mapping": c.po_mapping
        } for c in cos_list
    ]
    articulation = OBEEngine.compute_articulation_matrix(cos_dict_list)

    # Compute latest Question Paper CO distribution if available
    latest_qp = db.query(QuestionPaper).filter(QuestionPaper.subject_id == subject_id).order_by(QuestionPaper.created_at.desc()).first()
    qp_co_distribution = None
    if latest_qp and latest_qp.sets:
        sets_data = []
        for s in latest_qp.sets:
            items_data = [
                {"unit_number": it.unit_number, "co_mapped": it.co_mapped, "marks": it.marks}
                for it in s.items
            ]
            sets_data.append({"set_code": s.set_code, "items": items_data})
        qp_co_distribution = OBEEngine.compute_question_paper_co_distribution(sets_data, latest_qp.total_marks)

    return OBEMatrixResponse(
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        course_outcomes=cos_list,
        po_definitions=STANDARD_PO_DEFINITIONS,
        pso_definitions=STANDARD_PSO_DEFINITIONS,
        articulation_matrix=articulation,
        qp_co_distribution=qp_co_distribution
    )

@router.post("/subject/{subject_id}/auto-generate-framework", response_model=CourseFrameworkResponse)
def auto_generate_course_framework(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Intelligently synthesizes and updates Course Outcomes (CO1-CO5), 5x15 NBA/NAAC Articulation Matrix,
    Prerequisites, Educational Objectives, Recommended Textbooks, Tools, and Bloom Assessment Plan
    directly referring to the syllabus and subject code.
    """
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to synthesize framework for this subject")

    units_data = [
        {
            "unit_number": u.unit_number,
            "title": u.title,
            "topics": json.loads(u.topics_json or "[]")
        } for u in subject.units
    ]

    framework = OBEEngine.synthesize_course_framework(
        subject_code=subject.code,
        subject_name=subject.name,
        department=subject.department or "Computer Science & Engineering",
        semester=subject.semester or "V",
        regulation=subject.regulation or "R2021",
        units_data=units_data
    )

    # Persist / overwrite Course Outcomes in DB
    db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).delete()
    db.commit()

    saved_cos = []
    for co_data in framework["course_outcomes"]:
        co_obj = CourseOutcome(
            subject_id=subject_id,
            co_code=co_data["co_code"],
            description=co_data["description"],
            bloom_level=co_data["bloom_level"],
            unit_number=co_data["unit_number"],
            target_attainment_pct=co_data["target_attainment_pct"],
            po_mapping_json=json.dumps(co_data["po_mapping"])
        )
        db.add(co_obj)
        saved_cos.append(co_obj)

    db.commit()
    for co_obj in saved_cos:
        db.refresh(co_obj)

    cos_list = []
    for co in saved_cos:
        po_map = json.loads(co.po_mapping_json) if co.po_mapping_json else {}
        cos_list.append(CourseOutcomeSchema(
            id=co.id,
            subject_id=co.subject_id,
            co_code=co.co_code,
            description=co.description,
            bloom_level=co.bloom_level,
            unit_number=co.unit_number,
            target_attainment_pct=co.target_attainment_pct,
            po_mapping=po_map,
            created_at=co.created_at
        ))

    return CourseFrameworkResponse(
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        department=subject.department or "Computer Science & Engineering",
        regulation=subject.regulation or "R2021",
        semester=subject.semester or "V",
        prerequisites=framework["prerequisites"],
        course_objectives=framework["course_objectives"],
        course_outcomes=cos_list,
        recommended_textbooks=framework["recommended_textbooks"],
        reference_books=framework["reference_books"],
        computing_requirements=framework["computing_requirements"],
        blooms_distribution=framework["blooms_distribution"],
        articulation_matrix=framework["articulation_matrix"]
    )

@router.get("/subject/{subject_id}/requirements", response_model=CourseFrameworkResponse)
def get_subject_requirements_framework(
    subject_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to view subject requirements")

    units_data = [
        {
            "unit_number": u.unit_number,
            "title": u.title,
            "topics": json.loads(u.topics_json or "[]")
        } for u in subject.units
    ]

    framework = OBEEngine.synthesize_course_framework(
        subject_code=subject.code,
        subject_name=subject.name,
        department=subject.department or "Computer Science & Engineering",
        semester=subject.semester or "V",
        regulation=subject.regulation or "R2021",
        units_data=units_data
    )

    existing_cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.unit_number.asc()).all()
    if not existing_cos:
        for co_data in framework["course_outcomes"]:
            co_obj = CourseOutcome(
                subject_id=subject_id,
                co_code=co_data["co_code"],
                description=co_data["description"],
                bloom_level=co_data["bloom_level"],
                unit_number=co_data["unit_number"],
                target_attainment_pct=co_data["target_attainment_pct"],
                po_mapping_json=json.dumps(co_data["po_mapping"])
            )
            db.add(co_obj)
        db.commit()
        existing_cos = db.query(CourseOutcome).filter(CourseOutcome.subject_id == subject_id).order_by(CourseOutcome.unit_number.asc()).all()

    cos_list = []
    for co in existing_cos:
        po_map = json.loads(co.po_mapping_json) if co.po_mapping_json else {}
        cos_list.append(CourseOutcomeSchema(
            id=co.id,
            subject_id=co.subject_id,
            co_code=co.co_code,
            description=co.description,
            bloom_level=co.bloom_level,
            unit_number=co.unit_number,
            target_attainment_pct=co.target_attainment_pct,
            po_mapping=po_map,
            created_at=co.created_at
        ))

    cos_dict_list = [
        {
            "co_code": c.co_code,
            "bloom_level": c.bloom_level,
            "po_mapping": c.po_mapping
        } for c in cos_list
    ]
    articulation = OBEEngine.compute_articulation_matrix(cos_dict_list)

    return CourseFrameworkResponse(
        subject_id=subject.id,
        subject_code=subject.code,
        subject_name=subject.name,
        department=subject.department or "Computer Science & Engineering",
        regulation=subject.regulation or "R2021",
        semester=subject.semester or "V",
        prerequisites=framework["prerequisites"],
        course_objectives=framework["course_objectives"],
        course_outcomes=cos_list,
        recommended_textbooks=framework["recommended_textbooks"],
        reference_books=framework["reference_books"],
        computing_requirements=framework["computing_requirements"],
        blooms_distribution=framework["blooms_distribution"],
        articulation_matrix=articulation
    )

@router.put("/subject/{subject_id}/co/{co_id}")
def update_course_outcome(
    subject_id: int,
    co_id: int,
    payload: CourseOutcomeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    co = db.query(CourseOutcome).filter(CourseOutcome.id == co_id, CourseOutcome.subject_id == subject_id).first()
    if not co:
        raise HTTPException(status_code=404, detail="Course Outcome not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and co.subject and co.subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to modify this course outcome")

    if payload.description is not None:
        co.description = payload.description
    if payload.bloom_level is not None:
        co.bloom_level = payload.bloom_level
    if payload.target_attainment_pct is not None:
        co.target_attainment_pct = payload.target_attainment_pct
    if payload.po_mapping is not None:
        co.po_mapping_json = json.dumps(payload.po_mapping)

    db.commit()
    db.refresh(co)

    return {
        "status": "success",
        "message": f"{co.co_code} updated successfully",
        "co": {
            "id": co.id,
            "co_code": co.co_code,
            "description": co.description,
            "bloom_level": co.bloom_level,
            "target_attainment_pct": co.target_attainment_pct,
            "po_mapping": json.loads(co.po_mapping_json) if co.po_mapping_json else {}
        }
    }

@router.get("/question-paper/{qp_id}")
def get_question_paper_obe_distribution(
    qp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    qp = db.query(QuestionPaper).filter(QuestionPaper.id == qp_id).first()
    if not qp:
        raise HTTPException(status_code=404, detail="Question Paper not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and qp.subject and qp.subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to question paper OBE distribution")

    sets_data = []
    for s in qp.sets:
        items_data = [
            {"unit_number": it.unit_number, "co_mapped": it.co_mapped, "marks": it.marks}
            for it in s.items
        ]
        sets_data.append({"set_code": s.set_code, "items": items_data})

    distribution = OBEEngine.compute_question_paper_co_distribution(sets_data, qp.total_marks)

    return {
        "qp_id": qp.id,
        "subject_code": qp.subject.code,
        "subject_name": qp.subject.name,
        "sets_count": len(qp.sets),
        "distribution": distribution
    }
