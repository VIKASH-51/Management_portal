import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.core.config import settings
from backend.app.core.database import engine, Base, SessionLocal, sync_database_schema
from backend.app.seed.seed_data import seed_database
from backend.app.agents.learning_memory_agent import LearningMemoryAgent

# API Routers
from backend.app.api.auth import router as auth_router
from backend.app.api.subjects import router as subjects_router
from backend.app.api.documents import router as documents_router
from backend.app.api.notes import router as notes_router
from backend.app.api.question_papers import router as question_papers_router
from backend.app.api.answer_keys import router as answer_keys_router
from backend.app.api.question_bank import router as question_bank_router
from backend.app.api.trends import router as trends_router
from backend.app.api.research import router as research_router
from backend.app.api.export import router as export_router
from backend.app.api.admin import router as admin_router
from backend.app.api.copilot import router as copilot_router
from backend.app.api.vision import router as vision_router
from backend.app.api.learning import router as learning_router
from backend.app.api.obe import router as obe_router

# Ensure schema is synced on import
sync_database_schema(engine, Base)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables & columns synced, seed default data and agent memories
    sync_database_schema(engine, Base)
    db = SessionLocal()
    try:
        seed_database(db)
        LearningMemoryAgent.seed_initial_memory(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Agentic AI Academic Assistant Platform for Faculty Members (Autonomous College / University Edition)",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(subjects_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(notes_router, prefix=settings.API_V1_STR)
app.include_router(question_papers_router, prefix=settings.API_V1_STR)
app.include_router(answer_keys_router, prefix=settings.API_V1_STR)
app.include_router(question_bank_router, prefix=settings.API_V1_STR)
app.include_router(trends_router, prefix=settings.API_V1_STR)
app.include_router(research_router, prefix=settings.API_V1_STR)
app.include_router(export_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(copilot_router, prefix=settings.API_V1_STR)
app.include_router(vision_router, prefix=settings.API_V1_STR)
app.include_router(learning_router, prefix=settings.API_V1_STR)
app.include_router(obe_router, prefix=settings.API_V1_STR)

# Determine if frontend dist directory exists (for monolithic / single-container deployment)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_FRONTEND_DIST = os.path.join(_PROJECT_ROOT, "frontend", "dist")

if os.path.isdir(_FRONTEND_DIST):
    assets_dir = os.path.join(_FRONTEND_DIST, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="static_assets")

    @app.get("/health")
    def health_check():
        return {
            "status": "healthy",
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "mode": "Autonomous Institute Production Engine (Full-Stack Unified)"
        }

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return {"error": "API route not found"}
        target_file = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "status": "active",
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "api_docs": "/docs"
        }

    @app.get("/health")
    def health_check():
        return {
            "status": "healthy",
            "app": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "mode": "Autonomous Institute Production Engine (API Only)",
            "multi_agent_modules": [
                "NotesPedagogicalAgent",
                "QuestionPaperMultiSetAgent",
                "VisionOCRDiagramAgent",
                "AutonomousLearningMemoryAgent",
                "DocumentExtractorAgent",
                "StepMarkingAnswerKeyAgent",
                "ExamTrendPatternAgent",
                "ExportService"
            ]
        }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=False)
