import os
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Document, DocumentChunk, Subject, User, AuditLog
from backend.app.schemas.schemas import DocumentResponse
from backend.app.api.auth import get_current_user
from backend.app.agents.rag_engine import RAGEngine
from backend.app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents & RAG Vault"])

@router.get("/subject/{subject_id}", response_model=List[DocumentResponse])
def get_subject_documents(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access to this subject's documents")
    docs = db.query(Document).filter(Document.subject_id == subject_id).all()
    return docs

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    subject_id: int = Form(...),
    document_type: str = Form("SYLLABUS"), # SYLLABUS, REFERENCE_BOOK, PREVIOUS_PAPER, LECTURE_NOTES, RESEARCH_PAPER
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and subject.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to upload documents to this subject")
        
    filename = file.filename
    file_ext = filename.split(".")[-1].lower() if "." in filename else "txt"
    file_path = os.path.join(settings.UPLOAD_DIR, f"{subject_id}_{filename}")
    
    # Save file contents
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    file_size = len(content)
    
    # Extract text using multi-format extractor (PDF, DOCX, XLSX, TXT, CSV, etc.)
    from backend.app.agents.document_extractor import DocumentExtractorAgent
    text_content = DocumentExtractorAgent.extract_text_from_file_bytes(content, filename)
    if not text_content.strip():
        text_content = f"Uploaded document for {subject.name}: {filename}. Contains key syllabus guidelines and reference materials."

    chunks = RAGEngine.chunk_text(text_content, chunk_size=300, overlap=40)
    
    doc = Document(
        subject_id=subject_id,
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        filename=filename,
        file_type=file_ext,
        file_path=file_path,
        file_size=file_size,
        document_type=document_type,
        status="PROCESSED",
        chunk_count=len(chunks)
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    for idx, c_text in enumerate(chunks):
        chunk_obj = DocumentChunk(
            document_id=doc.id,
            subject_id=subject_id,
            chunk_index=idx + 1,
            content=c_text,
            metadata_json=json.dumps({"filename": filename, "type": document_type, "unit": 1})
        )
        db.add(chunk_obj)
        
    # Log audit event
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="UPLOAD_DOCUMENT",
        resource_type="DOCUMENT",
        resource_id=str(doc.id),
        details_json=json.dumps({"filename": filename, "type": document_type, "size": file_size}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()
    db.refresh(doc)
    
    return doc

@router.delete("/{document_id}")
def delete_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if current_user.role not in ["ADMIN", "DEAN", "SUPER_ADMIN"] and doc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this document")
        
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Document deleted"}
