import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.models import User, Subject, Document, Note, QuestionPaper, AnswerKey, QuestionBankItem, AuditLog, AIUsageMetric, CourseOutcome
from backend.app.seed.seed_data import seed_database

def reset_and_clean_db():
    print("[CLEAN] Resetting database tables for fresh user state...")
    db = SessionLocal()
    try:
        # Delete all non-superadmin users and associated data if desired
        db.query(AuditLog).delete()
        db.query(AIUsageMetric).delete()
        db.query(AnswerKey).delete()
        db.query(QuestionBankItem).delete()
        db.query(QuestionPaper).delete()
        db.query(Note).delete()
        db.query(Document).delete()
        db.query(CourseOutcome).delete()
        db.query(Subject).delete()
        db.query(User).delete()
        db.commit()
        print("[CLEAN] All old user accounts, courses, and data cleared.")
        
        # Seed fresh single Super Admin
        seed_database(db)
        print("[CLEAN] Single Super Admin initialized successfully.")
    except Exception as e:
        db.rollback()
        print(f"[CLEAN ERROR] {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_clean_db()
