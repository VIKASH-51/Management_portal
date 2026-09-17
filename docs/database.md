# Database Schema: AI Academic Assistant

## Database Entities & Relationships

### 1. `tenants` & `users`
- `tenants`: Multi-tenant boundary isolating departments or institutions.
- `users`: Stores faculty credentials (hashed with bcrypt), designation, institution, and role (`FACULTY`, `ADMIN`, `SUPER_ADMIN`).

### 2. `subjects` & `syllabus_units`
- `subjects`: Course metadata (Code, Name, Regulation, Semester, Academic Year, User/Tenant foreign keys).
- `syllabus_units`: Unit 1 to Unit 5 curriculum modules with JSON topics and hours.

### 3. `documents` & `document_chunks`
- `documents`: Uploaded course PDF/DOCX/TXT files with file size, document type, and processing status.
- `document_chunks`: Extracted text chunks with semantic keyword indices and metadata for RAG retrieval.

### 4. `notes` & `note_versions`
- `notes`: Generated lecture notes with Markdown content, Mermaid diagram code, approval status (`DRAFT`, `AI_GENERATED`, `UNDER_REVIEW`, `APPROVED`), and version counter.
- `note_versions`: Complete version control snapshot history for every faculty edit.

### 5. `question_papers`, `question_paper_sets` & `question_paper_items`
- `question_papers`: Parent exam configuration (Exam Name, Regulation, Duration, Total Marks, Difficulty %, Format).
- `question_paper_sets`: Individual generated sets (Set A, Set B, Set C, Set D) with set-level validation metrics.
- `question_paper_items`: Individual questions with section (Part A, Part B, Part C), question number, sub-division (a/b), marks, difficulty, Bloom's level, unit, and internal choice group.

### 6. `answer_keys` & `question_bank_items`
- `answer_keys`: Step-by-step marking rubrics and expected points mapped to question paper sets.
- `question_bank_items`: Searchable repository with Bloom's taxonomy level (L1–L6), difficulty, and tags.

### 7. `audit_logs` & `ai_usage_metrics`
- `audit_logs`: Immutable security and operation audit trails (Login, Upload, QP Generation, Note Export).
- `ai_usage_metrics`: Token consumption telemetry, latency, and estimated cost tracking per agent invocation.
