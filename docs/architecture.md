# System Architecture: AI Academic Assistant

## 1. Overview
The **AI Academic Assistant** is designed specifically for autonomous college and university faculty. It operates as an agentic assistant that produces classroom-ready lecture notes, balanced multi-set examination question papers (with zero cross-set duplicate questions), step-marking answer keys, and historical exam trend analysis.

## 2. Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Frontend (React 18 + Vite)                 │
│  - Faculty Course Studio (Split Editor + Mermaid View)  │
│  - Multi-Set Question Paper Generator                   │
│  - Step-Marking Answer Key Studio                       │
│  - Question Bank Manager (Bloom L1-L6 Filter)           │
│  - Historical Exam Trend Analyzer                       │
│  - Research, Book & YouTube Resource Hub                │
│  - Admin & Super Admin Governance Console               │
│  - Subject AI Copilot Floating Drawer                   │
└────────────────────────────┬────────────────────────────┘
                             │ REST API (JWT Bearer)
┌────────────────────────────▼────────────────────────────┐
│               Backend (FastAPI + Python 3.12)           │
│  - Multi-Tenant RBAC Security Middleware                │
│  - Academic Assistant Orchestrator                      │
│    ├── Notes Generation Agent (Humanized Lecturer Tone) │
│    ├── Question Paper Agent (Multi-Set 0-Overlap)       │
│    ├── Answer Key Agent (Step Mark Schemes)             │
│    ├── Diagram Agent (Mermaid.js Flowcharts)            │
│    ├── Validation Engine (Marks & Bloom Checking)       │
│    ├── RAG Engine (Chunking + Token Semantic Retrieval) │
│    ├── Trend Analysis Agent (Historical Pattern Engine) │
│    ├── Research & Reference Agent (Verified Citations)  │
│    └── Document Export Service (PDF, DOCX, XLSX)        │
└────────────────────────────┬────────────────────────────┘
                             │ SQLAlchemy ORM
┌────────────────────────────▼────────────────────────────┐
│                    Storage & Vault                      │
│  - PostgreSQL / SQLite with Tenant Logical Isolation    │
│  - Vector/Document Chunk Index                          │
│  - Official Exam Cell PDF / DOCX Output Repository      │
│  - Audit Trail & AI Token Spend Telemetry               │
└─────────────────────────────────────────────────────────┘
```

## 3. Agentic Workflow
1. **Understand**: Parses course regulations (e.g., R2021), target marks, syllabus units, and Bloom's taxonomy spectrum.
2. **Research**: Gathers verified references from IEEE, MDN, RFCs, W3Schools, and standard textbooks without hallucinating fictitious sources.
3. **Retrieve**: Uses semantic keyword overlap and token embeddings to extract relevant paragraphs from uploaded syllabus and textbook PDFs.
4. **Generate**: Synthesizes the academic material.
5. **Validate**: Computes total marks, validates zero duplicate questions across multi-sets, and ensures balanced difficulty distribution.
6. **Humanize**: Formats content with lecturer pedagogical callouts (`[Exam Point]`, `[Important]`, `[Common Mistake]`, `[Quick Revision]`).
7. **Faculty Review**: Renders in the interactive split-pane editor for versioning and approval.
8. **Export**: Generates official autonomous exam cell PDF, DOCX, and XLSX files.
