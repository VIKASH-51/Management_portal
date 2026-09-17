from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Subject, User
from backend.app.api.auth import get_current_user
from backend.app.agents.research_agent import ResearchAgent

router = APIRouter(prefix="/research", tags=["Research, Books & YouTube Hub"])

@router.get("/references")
def search_references(query: str = Query(..., min_length=2), current_user: User = Depends(get_current_user)):
    return ResearchAgent.search_verified_references(query)

@router.get("/books/{subject_id}")
def get_book_recommendations(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return ResearchAgent.get_books_for_subject(subject.code)

@router.get("/youtube/{subject_id}")
def get_youtube_resources(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return ResearchAgent.get_youtube_resources(subject.code)
