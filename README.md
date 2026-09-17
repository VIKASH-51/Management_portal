# Management_portal — AI Academic Assistant & Faculty Examination Platform

> **Autonomous College & University Faculty Academic Management and Examination Suite**  
> Built with FastAPI, Python, React 18, Vite, Tailwind CSS, ReportLab, and Mermaid.js.

---

## 🌟 Key Features

### 1. 🎓 Humanized Lecture Notes Studio
- Structured classroom lecture notes written from the perspective of an experienced autonomous-college professor.
- Interactive split-screen Markdown editor with live preview and version comparison.
- Integrated Mermaid.js architecture flowcharts and diagrams.
- Callouts for **[Exam Point]**, **[Important]**, **[Remember]**, **[Common Student Mistake]**, and **5-minute Quick Revision** summaries.
- Export as DOCX, PDF, and Markdown.

### 2. 📝 Multi-Set Question Paper Generator (1 to 10 Sets)
- Generates 1 to 10 balanced question paper sets with **100% Zero Cross-Set Duplicate Questions**.
- Cognitive difficulty distribution sliders (Easy %, Medium %, Hard %) with live 100% validation.
- Complete Bloom's Taxonomy spectrum (Remember L1 to Create L6).
- Autonomous paper pattern templates:
  - **Part A:** 10 Questions × 2 Marks = 20 Marks (2 per Unit)
  - **Part B:** 5 Questions × 13 Marks = 65 Marks (with (a) OR (b) internal choice per Unit)
  - **Part C:** 1 Question × 15 Marks = 15 Marks (Comprehensive Case Study / Design)
- Official Autonomous College examination PDF generator with university headers.

### 3. ✅ Step-by-Step Marking Scheme & Answer Key Builder
- Point-by-point mark allocation rubrics (definition, labeled diagram, derivation, real-world examples).
- Acceptable alternative points for internal and external evaluators.

### 4. 🗄️ Question Bank & RAG Knowledge Base
- Multi-dimensional question search filtered by Unit (1–5), Marks (2, 10, 13, 15, 16), Difficulty, and Bloom's Level.
- Upload course syllabus, reference textbooks, and previous year papers (PDF/DOCX/TXT) with automated chunking and semantic retrieval.
- Export question bank as formatted Excel (`.xlsx`).

### 5. 📈 5-Year Historical Exam Trend Analyzer
- Retrospective pattern analysis of past examination papers.
- Unit weightage distributions and high-frequency recurring topic badges.

### 6. 📚 Verified Research & YouTube Video Hub
- Standard textbook recommendations with verified ISBNs, editions, and publishers.
- Curated university tutorial lectures from verified channels (Stanford Online, MIT OCW, NPTEL, Gate Smashers).
- Verified literature citations (IEEE, MDN, W3Schools, GeeksforGeeks).

### 7. 🛡️ System Governance & Multi-Tenant Security
- Strict user-level data isolation.
- Role-Based Access Control (Faculty, Admin, Super Admin).
- Real-time System Health Telemetry, AI Token & Spend Analytics, and Filterable Audit Trails.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Start the Backend API Server
```bash
# Navigate to project directory
cd c:\Users\a\Desktop\projectssss\Mam

# Install backend dependencies
pip install -r backend/requirements.txt

# Start FastAPI server on port 8000
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Documentation will be available at:* `http://localhost:8000/docs`

### 2. Start the Frontend Web App
```bash
# In a new terminal window
cd frontend

# Install npm packages (if not already installed)
npm install

# Start Vite dev server on port 5173
npm run dev
```
*Web App will be available at:* `http://localhost:5173`

---

## 🧪 Running Automated Tests
```bash
python -m pytest backend/tests -v
```

---

## 🏛️ Autonomous Regulation Compliance
- **Regulations Supported:** R2021, R2022, CBCS, Autonomous College Guidelines.
- **Accreditation Ready:** NAAC & NBA Bloom's Taxonomy course outcome mappings.
