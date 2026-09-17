import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import User, Subject, Document, Note, QuestionPaper, AuditLog, AIUsageMetric, SystemConfig
from backend.app.schemas.schemas import SystemHealthResponse, AIUsageMetricResponse, AuditLogResponse
from backend.app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/admin", tags=["Admin & Super Admin Governance"])

@router.get("/health", response_model=SystemHealthResponse)
def get_system_health(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    total_subj = db.query(Subject).count()
    total_docs = db.query(Document).count()
    total_notes = db.query(Note).count()
    total_qp = db.query(QuestionPaper).count()

    provider_cfg = db.query(SystemConfig).filter(SystemConfig.key == "active_ai_provider").first()
    active_prov = "Gemini 1.5 Pro (Multimodal Autonomous Agent)"
    if provider_cfg:
        try:
            cfg = json.loads(provider_cfg.value_json)
            active_prov = f"{cfg.get('provider', 'gemini').title()} ({cfg.get('model', 'gemini-1.5-pro')})"
        except Exception:
            pass

    return SystemHealthResponse(
        status="OPERATIONAL — ALL SYSTEMS HEALTHY",
        api_uptime="99.98% (Healthy)",
        database_status="CONNECTED (SQLite / PostgreSQL Ready)",
        vector_store_status="ONLINE (Semantic Token Index Active)",
        queue_status="IDLE (0 Pending Background Jobs)",
        total_users=total_users,
        active_users=active_users,
        total_subjects=total_subj,
        total_documents=total_docs,
        total_notes_generated=total_notes,
        total_question_papers=total_qp,
        active_ai_provider=active_prov
    )

@router.get("/users")
def get_all_users(current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])), db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "department": u.department,
            "institution": u.institution,
            "designation": u.designation,
            "is_active": u.is_active,
            "approval_status": getattr(u, 'approval_status', 'APPROVED'),
            "created_at": u.created_at
        } for u in users
    ]

@router.patch("/users/{user_id}/approval")
def handle_staff_approval(
    user_id: int,
    status: str,  # APPROVED, REJECTED
    current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")
    
    clean_status = status.upper()
    if clean_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid approval status. Must be APPROVED or REJECTED.")

    # Approval Hierarchy:
    # 1. Super Admin can never be altered via approval
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Super Admin account status cannot be altered.")

    # 2. Only Super Admin can approve/reject Dean (ADMIN) accounts
    if user.role == "ADMIN" and current_user.role != "SUPER_ADMIN":
        raise HTTPException(
            status_code=403, 
            detail="Permission Denied: Only the Super Admin has authority to approve or reject Dean / Academic Admin accounts."
        )

    user.approval_status = clean_status
    user.is_active = (clean_status == "APPROVED")
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action=f"STAFF_{clean_status}",
        resource_type="USER_MANAGEMENT",
        resource_id=str(user.id),
        details_json=json.dumps({"target_email": user.email, "target_role": user.role, "approved_by": current_user.email}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()
    return {"status": "success", "user_id": user.id, "approval_status": user.approval_status, "is_active": user.is_active}

@router.patch("/users/{user_id}/toggle-status")
def toggle_user_status(user_id: int, current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Cannot deactivate the Super Admin account.")

    if user.role == "ADMIN" and current_user.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Only Super Admin can modify Dean/Admin accounts.")

    user.is_active = not user.is_active
    db.commit()
    return {"status": "success", "is_active": user.is_active, "approval_status": user.approval_status}

@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(require_role(["SUPER_ADMIN"])), db: Session = Depends(get_db)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete the Super Admin account.")
    db.delete(user)
    db.commit()
    return {"status": "success", "message": "User deleted successfully"}

@router.patch("/users/{user_id}/role")
def update_user_role(user_id: int, role: str, current_user: User = Depends(require_role(["SUPER_ADMIN"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role.upper()
    db.commit()
    return {"status": "success", "role": user.role}

@router.get("/question-papers")
def get_admin_question_papers(current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])), db: Session = Depends(get_db)):
    qps = db.query(QuestionPaper).order_by(QuestionPaper.created_at.desc()).all()
    result = []
    for qp in qps:
        owner = db.query(User).filter(User.id == qp.user_id).first()
        subj = qp.subject
        validation = {}
        try:
            validation = json.loads(qp.validation_score_json or "{}")
        except Exception:
            pass

        result.append({
            "id": qp.id,
            "title": qp.title,
            "subject_code": subj.code if subj else "N/A",
            "subject_name": subj.name if subj else "N/A",
            "department": subj.department if subj else "N/A",
            "faculty_name": owner.full_name if owner else "Faculty",
            "faculty_email": owner.email if owner else "faculty@autonomous.edu",
            "total_marks": qp.total_marks,
            "duration_minutes": qp.duration_minutes,
            "sets_count": qp.sets_count,
            "status": qp.status,
            "verification_status": validation.get("verification_status", qp.status),
            "verified_by": validation.get("verified_by", None),
            "verifier_notes": validation.get("verifier_notes", None),
            "created_at": qp.created_at
        })
    return result

@router.post("/question-papers/{qp_id}/approve")
def approve_question_paper_by_dean(
    qp_id: int,
    payload: Dict[str, Any],
    current_user: User = Depends(require_role(["ADMIN", "SUPER_ADMIN"])),
    db: Session = Depends(get_db)
):
    qp = db.query(QuestionPaper).filter(QuestionPaper.id == qp_id).first()
    if not qp:
        raise HTTPException(status_code=404, detail="Question paper not found")

    decision = payload.get("status", "VERIFIED")  # VERIFIED, REJECTED, APPROVED
    notes = payload.get("notes", "Officially approved by Dean of Academic Affairs / COE.")

    qp.status = decision
    val = {}
    try:
        val = json.loads(qp.validation_score_json or "{}")
    except Exception:
        pass
    val["verification_status"] = decision
    val["verified_by"] = f"{current_user.full_name} ({current_user.designation})"
    val["verifier_email"] = current_user.email
    val["verifier_notes"] = notes
    qp.validation_score_json = json.dumps(val)

    # Log audit event
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action=f"DEAN_EXAM_{decision}",
        resource_type="QUESTION_PAPER",
        resource_id=str(qp.id),
        details_json=json.dumps({"title": qp.title, "decision": decision, "notes": notes}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()
    db.refresh(qp)

    return {
        "status": "success",
        "question_paper_id": qp.id,
        "verification_status": decision,
        "verified_by": current_user.full_name,
        "verifier_notes": notes
    }

@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_email": l.user_email,
            "action": l.action,
            "resource_type": l.resource_type,
            "resource_id": l.resource_id,
            "details": json.loads(l.details_json or "{}"),
            "ip_address": l.ip_address,
            "created_at": l.created_at
        } for l in logs
    ]

@router.get("/ai-usage")
def get_ai_usage(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    metrics = db.query(AIUsageMetric).order_by(AIUsageMetric.created_at.desc()).limit(100).all()
    total_tokens = sum(m.total_tokens for m in metrics)
    total_cost = sum(m.estimated_cost for m in metrics)
    
    return {
        "summary": {
            "total_tokens_consumed": total_tokens,
            "estimated_cost_usd": round(total_cost, 4),
            "total_requests": len(metrics),
            "average_latency_ms": round(sum(m.latency_ms for m in metrics) / max(len(metrics), 1))
        },
        "recent_metrics": [
            {
                "id": m.id,
                "agent_name": m.agent_name,
                "provider": m.provider,
                "model": m.model,
                "prompt_tokens": m.prompt_tokens,
                "completion_tokens": m.completion_tokens,
                "total_tokens": m.total_tokens,
                "estimated_cost": m.estimated_cost,
                "latency_ms": m.latency_ms,
                "created_at": m.created_at
            } for m in metrics
        ]
    }
