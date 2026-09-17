import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import ProcessedImage, Subject, User, AuditLog
from backend.app.api.auth import get_current_user
from backend.app.agents.vision_agent import VisionAgent
from backend.app.core.config import settings

router = APIRouter(prefix="/vision", tags=["Vision & Diagram Extractor"])

@router.post("/process-image")
async def process_image(
    subject_id: int = Form(1),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filename = file.filename
    file_path = os.path.join(settings.UPLOAD_DIR, f"vision_{subject_id}_{filename}")
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    subject_code = subject.code if subject else "CS8591"

    # Process through Vision Agent
    result = VisionAgent.process_academic_image(filename, file_path, subject_code=subject_code)

    # Save to database
    img_rec = ProcessedImage(
        subject_id=subject_id,
        filename=filename,
        file_path=file_path,
        file_type=filename.split(".")[-1].lower() if "." in filename else "png",
        detected_type=result["detected_type"],
        extracted_text=result["extracted_text"],
        extracted_mermaid=result.get("extracted_mermaid", ""),
        detected_entities_json="[]"
    )
    db.add(img_rec)

    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="PROCESS_IMAGE_OCR",
        resource_type="IMAGE",
        resource_id=str(img_rec.id or filename),
        details_json=f'{{"detected_type": "{result["detected_type"]}"}}',
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()
    db.refresh(img_rec)

    return {
        "id": img_rec.id,
        "filename": filename,
        "detected_type": result["detected_type"],
        "extracted_text": result["extracted_text"],
        "extracted_mermaid": result.get("extracted_mermaid", ""),
        "extracted_questions": result.get("extracted_questions", []),
        "confidence_score": result.get("confidence_score", 0.98)
    }

@router.get("/history/{subject_id}")
def get_processed_images(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    images = db.query(ProcessedImage).filter(ProcessedImage.subject_id == subject_id).all()
    return [
        {
            "id": img.id,
            "filename": img.filename,
            "detected_type": img.detected_type,
            "extracted_text": img.extracted_text,
            "extracted_mermaid": img.extracted_mermaid,
            "created_at": img.created_at
        } for img in images
    ]
