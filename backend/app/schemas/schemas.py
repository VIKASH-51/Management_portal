from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr

# Auth Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "FACULTY"
    department: str = "Computer Science & Engineering"
    institution: str = "Autonomous Institute of Technology"
    designation: str = "Associate Professor"
    approval_status: Optional[str] = "APPROVED"

class UserCreate(UserBase):
    password: str
    tenant_id: Optional[str] = "default_tenant"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    institution: Optional[str] = None
    designation: Optional[str] = None
    password: Optional[str] = None

class UserApprovalRequest(BaseModel):
    status: str  # APPROVED, REJECTED

class UserResponse(UserBase):
    id: int
    is_active: bool
    approval_status: str = "APPROVED"
    tenant_id: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Subject & Unit Schemas
class UnitSchema(BaseModel):
    id: Optional[int] = None
    unit_number: int
    title: str
    topics: List[str]
    learning_outcomes: List[str] = []
    hours: int = 9

class SubjectBase(BaseModel):
    code: str
    name: str
    department: str = "Computer Science & Engineering"
    regulation: str = "R2021"
    semester: str = "V"
    academic_year: str = "2025-2026"
    description: Optional[str] = ""

class SubjectCreate(SubjectBase):
    units: Optional[List[UnitSchema]] = []

class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None
    regulation: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    description: Optional[str] = None
    units: Optional[List[UnitSchema]] = None

class SyllabusGenerateRequest(BaseModel):
    code: str
    name: str
    department: Optional[str] = "Computer Science & Engineering"
    regulation: Optional[str] = "R2021"

class SectionConfig(BaseModel):
    name: str  # e.g., "Part A", "Part B", "Part C", "Part D"
    title: str = "Section Title"  # e.g., "Short Answer Questions", "Descriptive Analysis"
    questions_count: int = 5
    marks_per_question: int = 2
    choice_type: str = "COMPULSORY"  # "COMPULSORY", "INTERNAL_CHOICE", "OPEN_CHOICE"
    open_choice_count: Optional[int] = None  # e.g., Answer 5 out of 8
    unit_scope: Optional[List[int]] = None  # e.g. [1, 2, 3, 4, 5]

class SubjectResponse(SubjectBase):
    id: int
    user_id: int
    tenant_id: str
    created_at: datetime
    units: List[UnitSchema] = []
    document_count: Optional[int] = 0
    notes_count: Optional[int] = 0
    question_paper_count: Optional[int] = 0
    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    subject_id: int
    filename: str
    file_type: str
    file_size: int
    document_type: str
    status: str
    chunk_count: int
    created_at: datetime
    class Config:
        from_attributes = True

# Notes Schemas
class NoteGenerateRequest(BaseModel):
    subject_id: int
    unit_number: int
    topic: str
    learning_objectives: Optional[List[str]] = None
    tone: Optional[str] = "LECTURER_HUMANIZED"
    include_diagram: bool = True
    include_exam_points: bool = True
    include_common_mistakes: bool = True
    include_revision: bool = True
    focus_keywords: Optional[List[str]] = None

class NoteUpdateRequest(BaseModel):
    title: Optional[str] = None
    content_markdown: Optional[str] = None
    mermaid_diagram: Optional[str] = None
    status: Optional[str] = None

class NoteVersionResponse(BaseModel):
    id: int
    note_id: int
    version_number: int
    content_markdown: str
    mermaid_diagram: Optional[str] = ""
    created_at: datetime
    class Config:
        from_attributes = True

class NoteResponse(BaseModel):
    id: int
    subject_id: int
    unit_number: int
    topic: str
    title: str
    content_markdown: str
    mermaid_diagram: Optional[str] = ""
    status: str
    version: int
    learning_objectives: List[str] = []
    exam_points: List[str] = []
    common_mistakes: List[str] = []
    references: List[Dict[str, Any]] = []
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Question Paper Schemas
class QuestionItemSchema(BaseModel):
    id: Optional[int] = None
    section_name: str  # Part A, Part B, Part C
    question_number: int
    sub_division: Optional[str] = ""
    question_text: str
    marks: int
    difficulty: str  # EASY, MEDIUM, HARD
    bloom_level: str  # Remember, Understand, Apply, Analyze, Evaluate, Create
    unit_number: int
    internal_choice_group: Optional[str] = ""
    question_type: str = "DESCRIPTIVE"  # MCQ, FILL_IN_BLANKS, SHORT_ANSWER, LONG_ANSWER, CASE_STUDY, NUMERICAL, CODE_ANALYSIS, TRUE_FALSE, MATCHING
    co_mapped: Optional[str] = "CO1"
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = ""
    explanation: Optional[str] = ""
    scenario_text: Optional[str] = ""
    class Config:
        from_attributes = True

class QuestionPaperSetResponse(BaseModel):
    id: int
    set_code: str
    title: str
    items: List[QuestionItemSchema] = []
    validation: Dict[str, Any] = {}
    class Config:
        from_attributes = True

class QuestionPaperGenerateRequest(BaseModel):
    subject_id: int
    title: str = "Autonomous End Semester Examination"
    regulation: str = "R2021"
    semester: str = "V"
    academic_year: str = "2025-2026"
    exam_name: str = "End Semester Autonomous Examination"
    duration_minutes: int = 180
    total_marks: int = 100
    sets_count: int = 3  # 1 to 10
    difficulty_easy_pct: int = 30
    difficulty_med_pct: int = 50
    difficulty_hard_pct: int = 20
    format_type: str = "FORMAT_A"  # FORMAT_A, FORMAT_B, CUSTOM
    units_included: List[int] = [1, 2, 3, 4, 5]
    custom_sections: Optional[List[Dict[str, Any]]] = None
    faculty_prompt_instructions: Optional[str] = ""
    reference_doc_ids: Optional[List[int]] = []
    template_context: Optional[str] = ""

class QuestionPaperResponse(BaseModel):
    id: int
    subject_id: int
    title: str
    regulation: str
    semester: str
    academic_year: str
    exam_name: str
    duration_minutes: int
    total_marks: int
    difficulty_easy_pct: int
    difficulty_med_pct: int
    difficulty_hard_pct: int
    format_type: str
    sets_count: int
    validation_score: Dict[str, Any] = {}
    status: str
    created_at: datetime
    sets: List[QuestionPaperSetResponse] = []
    class Config:
        from_attributes = True

class TemplateExtractResponse(BaseModel):
    filename: str
    detected_title: str
    detected_regulation: str
    detected_duration_minutes: int
    detected_total_marks: int
    calculated_total_marks: int
    sections_count: int
    custom_sections: List[Dict[str, Any]] = []
    confidence_score: float = 0.98
    summary: str

class VerificationReportResponse(BaseModel):
    subject_id: int
    question_paper_id: Optional[int] = None
    verification_score: float = 96.5
    status: str = "VERIFIED_ACCREDITED"
    syllabus_alignment_pct: float = 100.0
    reference_coverage_pct: float = 95.0
    bloom_taxonomy_compliance: Dict[str, Any] = {}
    difficulty_rigor_check: Dict[str, Any] = {}
    verified_items_count: int = 0
    passed_audit_checks: List[str] = []
    recommendations: List[str] = []
    detailed_item_verifications: List[Dict[str, Any]] = []

# Answer Key Schemas
class AnswerKeyResponse(BaseModel):
    id: int
    question_paper_id: int
    set_code: str
    title: str
    content_markdown: str
    marking_rubric: List[Dict[str, Any]] = []
    created_at: datetime
    class Config:
        from_attributes = True

# Question Bank Schemas
class QuestionBankItemCreate(BaseModel):
    subject_id: int
    unit_number: int
    topic: str
    question_text: str
    expected_answer: Optional[str] = ""
    marks: int = 2
    difficulty: str = "MEDIUM"
    bloom_level: str = "Understand"
    question_type: str = "SHORT_ANSWER"
    tags: List[str] = []
    set_origin: Optional[str] = ""  # Set A, Set B, Set C, Extra Pool
    is_extra_pool: bool = False
    co_mapped: Optional[str] = "CO1"
    options: Optional[List[str]] = []
    correct_answer: Optional[str] = ""
    explanation: Optional[str] = ""
    scenario_text: Optional[str] = ""

class QuestionBankItemResponse(QuestionBankItemCreate):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

# Course Outcomes & Outcome-Based Education (OBE) Schemas
class CourseOutcomeSchema(BaseModel):
    id: Optional[int] = None
    subject_id: int
    co_code: str  # CO1, CO2, CO3, CO4, CO5
    description: str
    bloom_level: str = "Understand"
    unit_number: int = 1
    target_attainment_pct: float = 70.0
    po_mapping: Dict[str, int] = {}  # {"PO1": 3, "PO2": 2, ..., "PSO1": 3}
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True

class CourseOutcomeUpdateRequest(BaseModel):
    description: Optional[str] = None
    bloom_level: Optional[str] = None
    target_attainment_pct: Optional[float] = None
    po_mapping: Optional[Dict[str, int]] = None

class OBEMatrixResponse(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    course_outcomes: List[CourseOutcomeSchema]
    po_definitions: Dict[str, str]
    pso_definitions: Dict[str, str]
    articulation_matrix: Dict[str, Any]
    qp_co_distribution: Optional[Dict[str, Any]] = None

class CourseFrameworkResponse(BaseModel):
    subject_id: int
    subject_code: str
    subject_name: str
    department: str
    regulation: str
    semester: str
    prerequisites: List[str]
    course_objectives: List[str]
    course_outcomes: List[CourseOutcomeSchema]
    recommended_textbooks: List[Dict[str, str]]
    reference_books: List[Dict[str, str]]
    computing_requirements: List[Dict[str, str]]
    blooms_distribution: Dict[str, Any]
    articulation_matrix: Dict[str, Any]

# Research & Resources Schemas
class ReferenceItem(BaseModel):
    source: str
    title: str
    url: str
    access_date: str
    description: str

class BookRecommendation(BaseModel):
    title: str
    author: str
    edition: str
    publisher: str
    isbn: Optional[str] = None
    why_useful: str
    topic_coverage: str

class YouTubeTutorial(BaseModel):
    title: str
    channel: str
    duration: str
    topic: str
    url: str
    explanation: str

# Copilot / Chat Schemas
class CopilotChatRequest(BaseModel):
    subject_id: Optional[int] = None
    message: str
    history: List[Dict[str, str]] = []

class CopilotChatResponse(BaseModel):
    response: str
    agent_steps: List[str] = []
    suggested_actions: List[Dict[str, str]] = []

# Admin Schemas
class SystemHealthResponse(BaseModel):
    status: str
    api_uptime: str
    database_status: str
    vector_store_status: str
    queue_status: str
    total_users: int
    active_users: int
    total_subjects: int
    total_documents: int
    total_notes_generated: int
    total_question_papers: int
    active_ai_provider: str

class AIUsageMetricResponse(BaseModel):
    id: int
    agent_name: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    latency_ms: int
    created_at: datetime
    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any] = {}
    ip_address: str
    created_at: datetime
    class Config:
        from_attributes = True
