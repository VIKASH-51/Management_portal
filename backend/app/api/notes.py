import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Note, NoteVersion, Subject, SyllabusUnit, Document, User, AuditLog, AIUsageMetric
from backend.app.schemas.schemas import NoteGenerateRequest, NoteResponse, NoteUpdateRequest, NoteVersionResponse
from backend.app.api.auth import get_current_user
from backend.app.agents.orchestrator import AcademicOrchestrator
from backend.app.agents.notes_agent import NotesAgent

router = APIRouter(prefix="/notes", tags=["Lecture Notes Studio"])

def format_note_response(note: Note) -> NoteResponse:
    return NoteResponse(
        id=note.id,
        subject_id=note.subject_id,
        unit_number=note.unit_number,
        topic=note.topic,
        title=note.title,
        content_markdown=note.content_markdown,
        mermaid_diagram=note.mermaid_diagram or "",
        status=note.status,
        version=note.version,
        learning_objectives=json.loads(note.learning_objectives_json or "[]"),
        exam_points=json.loads(note.exam_points_json or "[]"),
        common_mistakes=json.loads(note.common_mistakes_json or "[]"),
        references=json.loads(note.references_json or "[]"),
        created_at=note.created_at,
        updated_at=note.updated_at
    )

@router.get("/subject/{subject_id}", response_model=List[NoteResponse])
def get_notes_for_subject(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this subject's notes")
    notes = db.query(Note).filter(Note.subject_id == subject_id).order_by(Note.created_at.desc()).all()
    return [format_note_response(n) for n in notes]

@router.get("/{note_id}", response_model=NoteResponse)
def get_note_by_id(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this note")
    return format_note_response(note)

@router.post("/generate")
def generate_lecture_notes(req: NoteGenerateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == req.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to generate notes for this subject")

    unit = db.query(SyllabusUnit).filter(
        SyllabusUnit.subject_id == req.subject_id,
        SyllabusUnit.unit_number == req.unit_number
    ).first()
    unit_title = unit.title if unit else f"Unit {req.unit_number}"

    # Fetch subject documents for RAG context
    docs = db.query(Document).filter(Document.subject_id == req.subject_id).all()
    doc_payloads = []
    for d in docs:
        doc_payloads.append({
            "filename": d.filename,
            "chunks": [{"content": c.content, "metadata": json.loads(c.metadata_json or "{}")} for c in d.chunks]
        })

    # Run Multi-Agent Orchestrator
    orchestration = AcademicOrchestrator.run_notes_workflow(
        subject_name=subject.name,
        subject_code=subject.code,
        unit_number=req.unit_number,
        unit_title=unit_title,
        topic=req.topic,
        subject_documents=doc_payloads,
        learning_objectives=req.learning_objectives
    )

    notes_data = orchestration["notes"]

    # Save to database
    note_obj = Note(
        subject_id=subject.id,
        user_id=current_user.id,
        unit_number=req.unit_number,
        topic=req.topic,
        title=notes_data["title"],
        content_markdown=notes_data["content_markdown"],
        mermaid_diagram=notes_data.get("mermaid_diagram", ""),
        status="AI_GENERATED",
        version=1,
        learning_objectives_json=json.dumps(notes_data["learning_objectives"]),
        exam_points_json=json.dumps(notes_data["exam_points"]),
        common_mistakes_json=json.dumps(notes_data["common_mistakes"]),
        references_json=json.dumps(notes_data["references"])
    )
    db.add(note_obj)
    db.commit()
    db.refresh(note_obj)

    # Save initial version
    version_obj = NoteVersion(
        note_id=note_obj.id,
        version_number=1,
        content_markdown=note_obj.content_markdown,
        mermaid_diagram=note_obj.mermaid_diagram
    )
    db.add(version_obj)

    # Track token usage & audit log
    usage = AIUsageMetric(
        user_id=current_user.id,
        subject_id=subject.id,
        agent_name="LectureNotesHumanizerAgent",
        provider="gemini",
        model="gemini-1.5-pro",
        prompt_tokens=1850,
        completion_tokens=2600,
        total_tokens=4450,
        estimated_cost=0.0118,
        latency_ms=orchestration["latency_ms"]
    )
    db.add(usage)
    
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="GENERATE_NOTES",
        resource_type="NOTES",
        resource_id=str(note_obj.id),
        details_json=json.dumps({"topic": req.topic, "unit": req.unit_number}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()

    return {
        "note": format_note_response(note_obj),
        "agent_steps": orchestration["agent_steps"],
        "quality_evaluation": notes_data.get("quality_evaluation", {})
    }

@router.put("/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, req: NoteUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to modify this note")

    content_changed = False
    if req.content_markdown is not None and req.content_markdown != note.content_markdown:
        note.content_markdown = req.content_markdown
        content_changed = True

    if req.title is not None:
        note.title = req.title
    if req.mermaid_diagram is not None:
        note.mermaid_diagram = req.mermaid_diagram
    if req.status is not None:
        note.status = req.status

    if content_changed:
        note.version += 1
        note.updated_at = datetime.now()
        v = NoteVersion(
            note_id=note.id,
            version_number=note.version,
            content_markdown=note.content_markdown,
            mermaid_diagram=note.mermaid_diagram
        )
        db.add(v)

    db.commit()
    db.refresh(note)
    return format_note_response(note)

@router.post("/{note_id}/approve", response_model=NoteResponse)
def approve_note(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to approve this note")
        
    note.status = "APPROVED"
    note.updated_at = datetime.now()
    db.commit()
    db.refresh(note)
    return format_note_response(note)

@router.get("/{note_id}/versions", response_model=List[NoteVersionResponse])
def get_note_versions(note_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and note.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to note versions")
    versions = db.query(NoteVersion).filter(NoteVersion.note_id == note_id).order_by(NoteVersion.version_number.desc()).all()
    return versions
