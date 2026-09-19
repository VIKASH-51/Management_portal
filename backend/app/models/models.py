from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, index=True, nullable=False)  # SUPER_ADMIN, DEAN, STAFF
    description = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", back_populates="role_obj")

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, index=True, nullable=False)  # e.g., manage_users, delete_user
    description = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class RolePermission(Base):
    __tablename__ = "role_permissions"
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission")

class UserPermission(Base):
    __tablename__ = "user_permissions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "permission_id", name="uq_user_permission"),
    )

    user = relationship("User", back_populates="custom_permissions")
    permission = relationship("Permission")

class Tenant(Base):
    __tablename__ = "tenants"
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, index=True, nullable=False)
    full_name = Column(String(150), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="STAFF", index=True)  # SUPER_ADMIN, DEAN, STAFF (FACULTY/ADMIN for compat)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True)
    department = Column(String(100), default="Computer Science & Engineering")
    institution = Column(String(200), default="Autonomous Institute of Technology")
    designation = Column(String(100), default="Faculty Member")
    contact = Column(String(50), default="")
    is_active = Column(Boolean, default=True)
    account_status = Column(String(50), default="ACTIVE", index=True)  # ACTIVE, PENDING, DEACTIVATED, REJECTED
    approval_status = Column(String(50), default="APPROVED")  # APPROVED, PENDING, REJECTED
    deleted_at = Column(DateTime, nullable=True)
    tenant_id = Column(String(50), ForeignKey("tenants.id", ondelete="SET NULL"), default="default_tenant", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    role_obj = relationship("Role", back_populates="users", foreign_keys=[role_id])
    custom_permissions = relationship("UserPermission", back_populates="user", cascade="all, delete-orphan")
    subjects = relationship("Subject", back_populates="owner", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", foreign_keys="AuditLog.user_id")

class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    id = Column(Integer, primary_key=True, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    target_user = relationship("User", foreign_keys=[target_user_id])
    requester = relationship("User", foreign_keys=[requester_id])
    resolver = relationship("User", foreign_keys=[resolved_by])

class LoginLog(Base):
    __tablename__ = "login_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(150), index=True, nullable=False)
    action = Column(String(50), nullable=False)  # LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT
    ip_address = Column(String(50), default="127.0.0.1")
    user_agent = Column(String(255), default="")
    details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), index=True, nullable=False)
    name = Column(String(200), nullable=False)
    department = Column(String(100), default="Computer Science & Engineering")
    regulation = Column(String(50), default="R2021")
    semester = Column(String(20), default="V")
    academic_year = Column(String(50), default="2025-2026")
    description = Column(Text, default="")
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    tenant_id = Column(String(50), default="default_tenant", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="subjects")
    units = relationship("SyllabusUnit", back_populates="subject", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="subject", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="subject", cascade="all, delete-orphan")
    question_papers = relationship("QuestionPaper", back_populates="subject", cascade="all, delete-orphan")
    question_bank_items = relationship("QuestionBankItem", back_populates="subject", cascade="all, delete-orphan")
    course_outcomes = relationship("CourseOutcome", back_populates="subject", cascade="all, delete-orphan")

class SyllabusUnit(Base):
    __tablename__ = "syllabus_units"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    unit_number = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    topics_json = Column(Text, default="[]")
    learning_outcomes_json = Column(Text, default="[]")
    hours = Column(Integer, default=9)
    
    subject = relationship("Subject", back_populates="units")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    tenant_id = Column(String(50), default="default_tenant", index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), default="pdf")
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    document_type = Column(String(50), default="SYLLABUS")
    status = Column(String(50), default="PROCESSED")
    chunk_count = Column(Integer, default=0)
    extracted_metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    subject = relationship("Subject", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    embedding_json = Column(Text, default="[]")
    
    document = relationship("Document", back_populates="chunks")

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    unit_number = Column(Integer, nullable=False)
    topic = Column(String(250), nullable=False)
    title = Column(String(250), nullable=False)
    content_markdown = Column(Text, nullable=False)
    mermaid_diagram = Column(Text, default="")
    status = Column(String(50), default="AI_GENERATED")
    version = Column(Integer, default=1)
    learning_objectives_json = Column(Text, default="[]")
    exam_points_json = Column(Text, default="[]")
    common_mistakes_json = Column(Text, default="[]")
    references_json = Column(Text, default="[]")
    learned_insights_json = Column(Text, default="[]")
    attached_images_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    subject = relationship("Subject", back_populates="notes")
    versions = relationship("NoteVersion", back_populates="note", cascade="all, delete-orphan")

class NoteVersion(Base):
    __tablename__ = "note_versions"
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), index=True, nullable=False)
    version_number = Column(Integer, nullable=False)
    content_markdown = Column(Text, nullable=False)
    mermaid_diagram = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    note = relationship("Note", back_populates="versions")

class QuestionPaper(Base):
    __tablename__ = "question_papers"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String(250), nullable=False)
    regulation = Column(String(50), default="R2021")
    semester = Column(String(20), default="V")
    academic_year = Column(String(50), default="2025-2026")
    exam_name = Column(String(150), default="End Semester Autonomous Examination")
    duration_minutes = Column(Integer, default=180)
    total_marks = Column(Integer, default=100)
    difficulty_easy_pct = Column(Integer, default=30)
    difficulty_med_pct = Column(Integer, default=50)
    difficulty_hard_pct = Column(Integer, default=20)
    format_type = Column(String(50), default="FORMAT_A")
    format_details_json = Column(Text, default="{}")
    sets_count = Column(Integer, default=3)
    validation_score_json = Column(Text, default="{}")
    status = Column(String(50), default="APPROVED")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    subject = relationship("Subject", back_populates="question_papers")
    sets = relationship("QuestionPaperSet", back_populates="question_paper", cascade="all, delete-orphan")
    answer_keys = relationship("AnswerKey", back_populates="question_paper", cascade="all, delete-orphan")

class QuestionPaperSet(Base):
    __tablename__ = "question_paper_sets"
    id = Column(Integer, primary_key=True, index=True)
    question_paper_id = Column(Integer, ForeignKey("question_papers.id"), index=True, nullable=False)
    set_code = Column(String(20), nullable=False)
    title = Column(String(250), nullable=False)
    validation_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    question_paper = relationship("QuestionPaper", back_populates="sets")
    items = relationship("QuestionPaperItem", back_populates="qp_set", cascade="all, delete-orphan")

class QuestionPaperItem(Base):
    __tablename__ = "question_paper_items"
    id = Column(Integer, primary_key=True, index=True)
    set_id = Column(Integer, ForeignKey("question_paper_sets.id"), index=True, nullable=False)
    section_name = Column(String(50), nullable=False)
    question_number = Column(Integer, nullable=False)
    sub_division = Column(String(10), default="")
    question_text = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False)
    difficulty = Column(String(20), default="MEDIUM")
    bloom_level = Column(String(50), default="Understand")
    unit_number = Column(Integer, default=1)
    internal_choice_group = Column(String(50), default="")
    question_type = Column(String(50), default="DESCRIPTIVE")
    co_mapped = Column(String(20), default="CO1")
    options_json = Column(Text, default="[]")
    correct_answer = Column(Text, default="")
    explanation = Column(Text, default="")
    scenario_text = Column(Text, default="")
    image_attachment_url = Column(String(500), default="")
    
    qp_set = relationship("QuestionPaperSet", back_populates="items")

class AnswerKey(Base):
    __tablename__ = "answer_keys"
    id = Column(Integer, primary_key=True, index=True)
    question_paper_id = Column(Integer, ForeignKey("question_papers.id"), index=True, nullable=False)
    set_code = Column(String(20), nullable=False)
    title = Column(String(250), nullable=False)
    content_markdown = Column(Text, nullable=False)
    marking_rubric_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    question_paper = relationship("QuestionPaper", back_populates="answer_keys")

class QuestionBankItem(Base):
    __tablename__ = "question_bank_items"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    unit_number = Column(Integer, nullable=False)
    topic = Column(String(200), nullable=False)
    question_text = Column(Text, nullable=False)
    expected_answer = Column(Text, default="")
    marks = Column(Integer, default=2)
    difficulty = Column(String(20), default="MEDIUM")
    bloom_level = Column(String(50), default="Understand")
    question_type = Column(String(50), default="SHORT_ANSWER")
    tags_json = Column(Text, default="[]")
    set_origin = Column(String(50), default="")  # Set A, Set B, Set C, Extra Pool
    is_extra_pool = Column(Boolean, default=False)
    co_mapped = Column(String(20), default="CO1")
    options_json = Column(Text, default="[]")
    correct_answer = Column(Text, default="")
    explanation = Column(Text, default="")
    scenario_text = Column(Text, default="")
    image_url = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    subject = relationship("Subject", back_populates="question_bank_items")

class CourseOutcome(Base):
    __tablename__ = "course_outcomes"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    co_code = Column(String(20), nullable=False)  # CO1, CO2, CO3, CO4, CO5
    description = Column(Text, nullable=False)
    bloom_level = Column(String(50), default="Understand")
    unit_number = Column(Integer, default=1)
    target_attainment_pct = Column(Float, default=70.0)
    po_mapping_json = Column(Text, default="{}")  # {"PO1": 3, "PO2": 2, "PO3": 1, ..., "PSO1": 3}
    created_at = Column(DateTime, default=datetime.utcnow)
    
    subject = relationship("Subject", back_populates="course_outcomes")

class ExamTrendAnalysis(Base):
    __tablename__ = "exam_trend_analyses"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), index=True, nullable=False)
    title = Column(String(250), nullable=False)
    analysis_json = Column(Text, default="{}")
    unit_weightage_json = Column(Text, default="{}")
    recurring_topics_json = Column(Text, default="[]")
    bloom_distribution_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

# Autonomous Agent Self-Training & Memory Model
class AgentMemory(Base):
    __tablename__ = "agent_memories"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, nullable=True)
    agent_name = Column(String(100), nullable=False, index=True) # NotesAgent, QuestionPaperAgent, VisionAgent, etc.
    concept_key = Column(String(250), nullable=False, index=True)
    learned_insight = Column(Text, nullable=False)
    source = Column(String(250), default="AUTONOMOUS_SEARCH_LEARNING")
    confidence_score = Column(Float, default=0.95)
    usage_count = Column(Integer, default=1)
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# Vision & OCR Processed Images
class ProcessedImage(Base):
    __tablename__ = "processed_images"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, nullable=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="png")
    detected_type = Column(String(50), default="DIAGRAM") # DIAGRAM, HANDWRITTEN_QUESTION, FORMULA, FLOWCHART, TEXTBOOK_SNIPPET
    extracted_text = Column(Text, default="")
    extracted_mermaid = Column(Text, default="")
    detected_entities_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    tenant_id = Column(String(50), default="default_tenant", index=True)
    user_email = Column(String(150), default="system")
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), default="")
    resource_id = Column(String(100), default="")
    details_json = Column(Text, default="{}")
    ip_address = Column(String(50), default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="audit_logs", foreign_keys=[user_id])

class AIUsageMetric(Base):
    __tablename__ = "ai_usage_metrics"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    subject_id = Column(Integer, nullable=True)
    agent_name = Column(String(100), nullable=False)
    provider = Column(String(50), default="gemini")
    model = Column(String(100), default="gemini-1.5-pro")
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemConfig(Base):
    __tablename__ = "system_configs"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=datetime.utcnow)
