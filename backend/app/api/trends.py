import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import ExamTrendAnalysis, Subject, User
from backend.app.api.auth import get_current_user
from backend.app.agents.trend_agent import TrendAgent

router = APIRouter(prefix="/trends", tags=["Exam Trend & Pattern Analysis"])

@router.get("/subject/{subject_id}")
def get_trend_analysis_for_subject(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    analysis_rec = db.query(ExamTrendAnalysis).filter(ExamTrendAnalysis.subject_id == subject_id).first()
    if analysis_rec:
        return json.loads(analysis_rec.analysis_json or "{}")

    # If none saved yet, generate on-the-fly
    trend_data = TrendAgent.analyze_historical_trends(subject.code, subject.name)
    new_rec = ExamTrendAnalysis(
        subject_id=subject.id,
        title=trend_data["analysis_title"],
        analysis_json=json.dumps(trend_data),
        unit_weightage_json=json.dumps(trend_data["unit_weightage"]),
        recurring_topics_json=json.dumps(trend_data["recurring_topics"]),
        bloom_distribution_json=json.dumps(trend_data["bloom_distribution"])
    )
    db.add(new_rec)
    db.commit()
    return trend_data
