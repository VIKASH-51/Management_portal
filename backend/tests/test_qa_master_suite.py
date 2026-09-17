import io
import os
import zipfile
import json
import uuid
import pytest
import httpx
import asyncio
from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models.models import (
    User, Subject, Note, NoteVersion, QuestionPaper, 
    QuestionPaperSet, QuestionPaperItem, AnswerKey, QuestionBankItem, 
    CourseOutcome, Document, AgentMemory, AuditLog
)

def api_call(method: str, path: str, **kwargs):
    async def _do():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            fn = getattr(client, method.lower())
            return await fn(path, **kwargs)
    return asyncio.run(_do())

def create_user_and_login(role="FACULTY", dept="Computer Science"):
    unique_id = uuid.uuid4().hex[:8]
    email = f"qa_test_{unique_id}@autonomous.edu"
    password = "SecurePassword123!"
    full_name = f"Prof. QA Test {unique_id}"
    
    reg_res = api_call("POST", "/api/auth/register", json={
        "email": email,
        "password": password,
        "full_name": full_name,
        "role": role,
        "department": dept
    })
    assert reg_res.status_code == 200, f"Registration failed: {reg_res.text}"
    token = reg_res.json()["access_token"]
    user_info = reg_res.json()["user"]
    return {
        "email": email,
        "password": password,
        "full_name": full_name,
        "token": token,
        "user_id": user_info["id"],
        "headers": {"Authorization": f"Bearer {token}"}
    }

# ==========================================
# PHASE 1 & 2: HEALTH & AUTHENTICATION TESTS
# ==========================================
def test_phase01_and_02_auth_exhaustive():
    # 1. API Health / Root
    root_res = api_call("GET", "/")
    assert root_res.status_code == 200
    assert "status" in root_res.json()
    assert root_res.json()["status"] == "active"

    # 2. Registration Edge Cases
    # Empty email
    res_empty_email = api_call("POST", "/api/auth/register", json={
        "email": "", "password": "Password123!", "full_name": "No Email", "role": "FACULTY"
    })
    assert res_empty_email.status_code in [400, 422]

    # Invalid email format
    res_invalid_email = api_call("POST", "/api/auth/register", json={
        "email": "not-an-email", "password": "Password123!", "full_name": "Bad Email", "role": "FACULTY"
    })
    assert res_invalid_email.status_code in [400, 422]

    # Weak password
    res_weak_pass = api_call("POST", "/api/auth/register", json={
        "email": "weakpass@eng.edu", "password": "123", "full_name": "Weak Pass", "role": "FACULTY"
    })
    assert res_weak_pass.status_code in [400, 422]

    # Duplicate registration
    user1 = create_user_and_login()
    res_dup = api_call("POST", "/api/auth/register", json={
        "email": user1["email"], "password": "Password123!", "full_name": "Duplicate User", "role": "FACULTY"
    })
    assert res_dup.status_code == 400

    # 3. Login Edge Cases
    # Wrong password
    res_wrong_pw = api_call("POST", "/api/auth/login", json={
        "email": user1["email"], "password": "WrongPassword999!"
    })
    assert res_wrong_pw.status_code == 401

    # Nonexistent user
    res_non_user = api_call("POST", "/api/auth/login", json={
        "email": "nonexistent_ghost@eng.edu", "password": "Password123!"
    })
    assert res_non_user.status_code == 401

    # 4. Token Tampering & Protected Routes
    # Valid login
    res_valid_login = api_call("POST", "/api/auth/login", json={
        "email": user1["email"], "password": user1["password"]
    })
    assert res_valid_login.status_code == 200
    token = res_valid_login.json()["access_token"]

    # Tampered JWT
    tampered_token = token[:-5] + "XXXXX"
    res_tampered = api_call("GET", "/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res_tampered.status_code == 401

    # Protected route without auth header
    res_no_auth = api_call("GET", "/api/subjects")
    assert res_no_auth.status_code == 401

    res_no_auth_notes = api_call("GET", "/api/notes/subject/1")
    assert res_no_auth_notes.status_code == 401

    res_no_auth_qp = api_call("GET", "/api/question-papers/subject/1")
    assert res_no_auth_qp.status_code == 401

    res_no_auth_qb = api_call("GET", "/api/question-bank/1")
    assert res_no_auth_qb.status_code == 401

    res_no_auth_obe = api_call("GET", "/api/obe/subject/1")
    assert res_no_auth_obe.status_code == 401

# ==========================================
# PHASE 3: STRICT MULTI-TENANT ISOLATION
# ==========================================
def test_phase03_strict_multi_tenant_isolation():
    user_a = create_user_and_login(role="FACULTY", dept="CSE")
    user_b = create_user_and_login(role="FACULTY", dept="ECE")

    # User A creates a course
    create_subj_res = api_call("POST", "/api/subjects", json={
        "code": f"CS_{uuid.uuid4().hex[:4]}",
        "name": "Distributed Systems & Cloud Computing",
        "department": "Computer Science & Engineering",
        "regulation": "R2021",
        "semester": "VI",
        "units": [
            {"unit_number": 1, "title": "Fundamentals of Distributed Systems", "topics": ["Models", "Clock Sync", "RPC"]},
            {"unit_number": 2, "title": "Distributed Consensus", "topics": ["Paxos", "Raft", "Byzantine Faults"]},
            {"unit_number": 3, "title": "Cloud Storage & NoSQL", "topics": ["CAP Theorem", "DynamoDB", "BigTable"]},
            {"unit_number": 4, "title": "Serverless & Microservices", "topics": ["Containers", "Kubernetes", "gRPC"]},
            {"unit_number": 5, "title": "Security & Fault Tolerance", "topics": ["Replication", "SLA", "Zero Trust"]}
        ]
    }, headers=user_a["headers"])
    assert create_subj_res.status_code == 200
    subj_a = create_subj_res.json()
    subj_a_id = subj_a["id"]

    # User A generates Notes
    note_gen_res = api_call("POST", "/api/notes/generate", json={
        "subject_id": subj_a_id,
        "unit_number": 1,
        "topic": "Fundamentals of Distributed Systems",
        "detail_level": "comprehensive"
    }, headers=user_a["headers"])
    assert note_gen_res.status_code == 200
    note_a = note_gen_res.json()["note"]
    note_a_id = note_a["id"]

    # User A generates an Exam Paper (Set A & B)
    qp_gen_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subj_a_id,
        "title": "Continuous Assessment Test I",
        "exam_type": "INTERNAL_1",
        "total_marks": 50,
        "duration_minutes": 90,
        "sets_count": 2,
        "units_covered": [1, 2],
        "blueprint": {
            "part_a": {"questions_count": 5, "marks_per_question": 2, "bloom_levels": ["Remember", "Understand"]},
            "part_b": {"questions_count": 4, "marks_per_question": 10, "bloom_levels": ["Apply", "Analyze"]}
        }
    }, headers=user_a["headers"])
    assert qp_gen_res.status_code == 200
    qp_a = qp_gen_res.json()["question_paper"]
    qp_a_id = qp_a["id"]

    # User A creates a Question Bank item
    qb_item_res = api_call("POST", "/api/question-bank", json={
        "subject_id": subj_a_id,
        "unit_number": 1,
        "topic": "Clock Sync",
        "question_text": "Explain Lamport Logical Clocks with vector timestamp examples.",
        "expected_answer": "Lamport timestamps define a partial ordering of events in distributed systems.",
        "marks": 10,
        "difficulty": "HARD",
        "bloom_level": "Analyze",
        "question_type": "LONG_ANSWER"
    }, headers=user_a["headers"])
    assert qb_item_res.status_code == 200
    qb_a_id = qb_item_res.json()["id"]

    # User A auto-generates OBE framework
    obe_res = api_call("POST", f"/api/obe/subject/{subj_a_id}/auto-generate-framework", headers=user_a["headers"])
    assert obe_res.status_code == 200

    # User A records a memory insight
    mem_res = api_call("POST", "/api/learning/learn-from-web", json={
        "query": "TCP Congestion Control RFC 5681",
        "agent_name": "AcademicAgent"
    }, headers=user_a["headers"])
    assert mem_res.status_code == 200

    # User A uploads a document
    doc_res = api_call("POST", "/api/documents/upload", data={"subject_id": str(subj_a_id), "document_type": "SYLLABUS"}, files={"file": ("tenant_a_doc.txt", io.BytesIO(b"Tenant A Private Exam Content"), "text/plain")}, headers=user_a["headers"])
    assert doc_res.status_code == 200
    doc_a_id = doc_res.json()["id"]

    # --- USER B ATTEMPTS TO ACCESS USER A'S DATA ---

    # 1. Get Subject
    res_b_subj = api_call("GET", f"/api/subjects/{subj_a_id}", headers=user_b["headers"])
    assert res_b_subj.status_code in [403, 404], f"User B accessed User A's subject: {res_b_subj.status_code}"

    # 2. List Subjects (User B should see 0 subjects)
    res_b_subjs = api_call("GET", "/api/subjects", headers=user_b["headers"])
    assert res_b_subjs.status_code == 200
    assert not any(s["id"] == subj_a_id for s in res_b_subjs.json())

    # 3. Get Notes
    res_b_notes = api_call("GET", f"/api/notes/subject/{subj_a_id}", headers=user_b["headers"])
    assert res_b_notes.status_code in [403, 404]

    res_b_single_note = api_call("GET", f"/api/notes/{note_a_id}", headers=user_b["headers"])
    assert res_b_single_note.status_code in [403, 404]

    # 4. Get Question Papers
    res_b_qps = api_call("GET", f"/api/question-papers/subject/{subj_a_id}", headers=user_b["headers"])
    assert res_b_qps.status_code in [403, 404]

    res_b_single_qp = api_call("GET", f"/api/question-papers/{qp_a_id}", headers=user_b["headers"])
    assert res_b_single_qp.status_code in [403, 404]

    # 5. Get Question Bank
    res_b_qb = api_call("GET", f"/api/question-bank/{subj_a_id}", headers=user_b["headers"])
    assert res_b_qb.status_code in [403, 404]

    res_b_delete_qb = api_call("DELETE", f"/api/question-bank/item/{qb_a_id}", headers=user_b["headers"])
    assert res_b_delete_qb.status_code in [403, 404]

    # 6. Get OBE Matrix
    res_b_obe = api_call("GET", f"/api/obe/subject/{subj_a_id}", headers=user_b["headers"])
    assert res_b_obe.status_code in [403, 404]

    # 7. Get Documents
    res_b_docs = api_call("GET", f"/api/documents/subject/{subj_a_id}", headers=user_b["headers"])
    assert res_b_docs.status_code in [403, 404]

    res_b_del_doc = api_call("DELETE", f"/api/documents/{doc_a_id}", headers=user_b["headers"])
    assert res_b_del_doc.status_code in [403, 404]

    # 8. Get Answer Keys
    res_b_aks = api_call("GET", f"/api/answer-keys/question-paper/{qp_a_id}", headers=user_b["headers"])
    assert res_b_aks.status_code in [403, 404]

    # 9. Exports (User B cannot download User A's papers, answer keys, question bank, or dossiers)
    res_b_exp_qp = api_call("GET", f"/api/export/question-paper/{qp_a_id}/pdf", headers=user_b["headers"])
    assert res_b_exp_qp.status_code in [403, 404]

    res_b_exp_ak = api_call("GET", f"/api/export/answer-key/{qp_a_id}/docx", headers=user_b["headers"])
    assert res_b_exp_ak.status_code in [403, 404]

    res_b_exp_qb = api_call("GET", f"/api/export/question-bank/{subj_a_id}/excel", headers=user_b["headers"])
    assert res_b_exp_qb.status_code in [403, 404]

    res_b_exp_dossier = api_call("GET", f"/api/export/verified-dossier/{qp_a_id}", headers=user_b["headers"])
    assert res_b_exp_dossier.status_code in [403, 404]

    # 10. Co-pilot referencing User A's subject
    res_b_copilot = api_call("POST", "/api/copilot/chat", json={
        "subject_id": subj_a_id,
        "message": "Give me the questions for Set A."
    }, headers=user_b["headers"])
    assert res_b_copilot.status_code in [403, 404]

# ==========================================
# PHASE 4: COURSE & SYLLABUS TESTING
# ==========================================
def test_phase04_course_and_syllabus_lifecycle():
    user = create_user_and_login()
    code = f"EC_{uuid.uuid4().hex[:4]}"
    
    # 1. Create Course with valid data
    res_create = api_call("POST", "/api/subjects", json={
        "code": code,
        "name": "VLSI Design & Embedded Systems",
        "department": "Electronics and Communication Engineering",
        "regulation": "R2021",
        "semester": "V",
        "units": [
            {"unit_number": 1, "title": "MOS Transistor Principles", "topics": ["nMOS", "pMOS", "CMOS Inverter"]},
            {"unit_number": 2, "title": "Combinational Logic Circuits", "topics": ["Pass Transistor", "Transmission Gates"]},
            {"unit_number": 3, "title": "Sequential Logic Circuits", "topics": ["Latches", "Flip-Flops", "Pipelining"]},
            {"unit_number": 4, "title": "Verilog HDL Modeling", "topics": ["Gate Level", "Behavioral", "Structural"]},
            {"unit_number": 5, "title": "FPGA Architecture & Testing", "topics": ["LUTs", "BIST", "Boundary Scan"]}
        ]
    }, headers=user["headers"])
    assert res_create.status_code == 200
    subj_data = res_create.json()
    subj_id = subj_data["id"]

    # 2. Duplicate course code should fail
    res_dup = api_call("POST", "/api/subjects", json={
        "code": code,
        "name": "Duplicate VLSI",
        "department": "ECE",
        "regulation": "R2021",
        "semester": "V",
        "units": []
    }, headers=user["headers"])
    assert res_dup.status_code == 400

    # 3. Update Course
    res_update = api_call("PUT", f"/api/subjects/{subj_id}", json={
        "code": code,
        "name": "Advanced VLSI Design & Embedded Systems",
        "department": "Electronics and Communication Engineering",
        "regulation": "R2021",
        "semester": "VI",
        "units": subj_data["units"]
    }, headers=user["headers"])
    assert res_update.status_code == 200
    assert "Advanced" in res_update.json()["name"]

    # 4. AI Syllabus Generation Endpoint
    res_ai_syl = api_call("POST", "/api/subjects/ai-generate-syllabus", json={
        "code": "QC801",
        "name": "Quantum Computing & Cryptography",
        "department": "CSE",
        "regulation": "R2021"
    }, headers=user["headers"])
    assert res_ai_syl.status_code == 200
    ai_syl = res_ai_syl.json()
    assert len(ai_syl) == 5
    assert all("title" in u and "topics" in u for u in ai_syl)
    assert all(len(u["topics"]) >= 3 for u in ai_syl)

# ==========================================
# PHASE 5 & 6: DOCUMENT UPLOAD, OCR & RAG
# ==========================================
def test_phase05_and_06_document_vault_and_rag():
    user = create_user_and_login()
    
    # Create Subject
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"ME_{uuid.uuid4().hex[:4]}",
        "name": "Applied Thermodynamics & Cryogenics",
        "department": "Mechanical Engineering",
        "regulation": "R2021",
        "semester": "IV",
        "units": [
            {"unit_number": 1, "title": "Gas Power Cycles", "topics": ["Otto", "Diesel", "Brayton"]},
            {"unit_number": 2, "title": "Vapour Power Cycles", "topics": ["Rankine", "Reheat", "Regenerative"]},
            {"unit_number": 3, "title": "Refrigeration Systems", "topics": ["VCR", "VAR", "COP"]},
            {"unit_number": 4, "title": "Psychrometry", "topics": ["DBT", "WBT", "Enthalpy"]},
            {"unit_number": 5, "title": "Cryogenic Engineering", "topics": ["Linde-Hampson", "Claude Cycle", "Insulation"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # Controlled Unique Canary Fact
    canary_token = "CANARY_CRYOGENIC_LAB_FACT_88392"
    canary_text = f"According to university laboratory protocol {canary_token}, liquid nitrogen boils at exactly 77.36 Kelvin at atmospheric pressure."

    # Upload test document
    files = {"file": ("cryogenic_protocol.txt", io.BytesIO(canary_text.encode("utf-8")), "text/plain")}
    data = {"subject_id": str(subj_id), "document_type": "SYLLABUS"}
    
    upload_res = api_call("POST", "/api/documents/upload", data=data, files=files, headers=user["headers"])
    assert upload_res.status_code == 200
    doc_info = upload_res.json()
    assert "id" in doc_info
    assert doc_info["filename"] == "cryogenic_protocol.txt"
    assert doc_info["status"] == "PROCESSED"
    assert doc_info["chunk_count"] >= 1

    # List documents for subject
    list_docs_res = api_call("GET", f"/api/documents/subject/{subj_id}", headers=user["headers"])
    assert list_docs_res.status_code == 200
    assert len(list_docs_res.json()) >= 1

    # Test RAG Engine Chunking and Retrieval mathematically
    from backend.app.agents.rag_engine import RAGEngine
    doc_payloads = [{
        "filename": "cryogenic_protocol.txt",
        "chunks": [{"content": canary_text, "metadata": {"unit": 5}}]
    }]
    retrieved = RAGEngine.retrieve_relevant_chunks(
        query=f"What is boiling point in {canary_token}?",
        subject_docs=doc_payloads,
        top_k=2
    )
    assert len(retrieved) >= 1
    assert "77.36 Kelvin" in retrieved[0]["content"]
    assert retrieved[0]["score"] > 0.0

    # Test Delete Document
    doc_id = doc_info["id"]
    del_doc = api_call("DELETE", f"/api/documents/{doc_id}", headers=user["headers"])
    assert del_doc.status_code == 200

# ==========================================
# PHASE 7: LECTURE NOTES STUDIO & VERSIONS
# ==========================================
def test_phase07_lecture_notes_and_versioning():
    user = create_user_and_login()
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"IT_{uuid.uuid4().hex[:4]}",
        "name": "Database Management Systems",
        "department": "Information Technology",
        "regulation": "R2021",
        "semester": "III",
        "units": [
            {"unit_number": 1, "title": "Relational Model & SQL", "topics": ["ER Diagrams", "Relational Algebra", "SQL"]},
            {"unit_number": 2, "title": "Database Design & Normalization", "topics": ["1NF", "2NF", "3NF", "BCNF"]},
            {"unit_number": 3, "title": "Transaction Management", "topics": ["ACID", "Serializability", "2PL"]},
            {"unit_number": 4, "title": "Storage & Indexing", "topics": ["B+ Trees", "Hashing", "Query Optimization"]},
            {"unit_number": 5, "title": "NoSQL & Distributed DB", "topics": ["CAP Theorem", "Document Stores", "Graph DB"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # 1. Generate Notes for Unit 2
    gen_res = api_call("POST", "/api/notes/generate", json={
        "subject_id": subj_id,
        "unit_number": 2,
        "topic": "Database Design & Normalization",
        "detail_level": "comprehensive"
    }, headers=user["headers"])
    assert gen_res.status_code == 200
    note = gen_res.json()["note"]
    note_id = note["id"]
    assert "content_markdown" in note
    assert len(note["content_markdown"]) > 100

    # 2. Update Notes content (creates a version)
    updated_md = note["content_markdown"] + r"\n\n### Faculty Addition: Lossless Join Decomposition Proof\n$$ R_1 \cap R_2 \rightarrow R_1 \text{ or } R_1 \cap R_2 \rightarrow R_2 $$"
    update_res = api_call("PUT", f"/api/notes/{note_id}", json={
        "content_markdown": updated_md
    }, headers=user["headers"])
    assert update_res.status_code == 200
    assert "Lossless Join Decomposition" in update_res.json()["content_markdown"]

    # 3. Fetch Version Snapshots
    vers_res = api_call("GET", f"/api/notes/{note_id}/versions", headers=user["headers"])
    assert vers_res.status_code == 200
    assert len(vers_res.json()) >= 1

    # 4. Export Notes as PDF & DOCX
    pdf_note = api_call("GET", f"/api/export/notes/{note_id}/pdf", headers=user["headers"])
    assert pdf_note.status_code == 200
    assert "application/pdf" in pdf_note.headers["content-type"]

    docx_note = api_call("GET", f"/api/export/notes/{note_id}/docx", headers=user["headers"])
    assert docx_note.status_code == 200
    assert "wordprocessingml" in docx_note.headers["content-type"]

# ==========================================
# PHASE 8, 9, 10: EXAM GENERATION, ZERO DUPLICATES, BLOOM TAXONOMY
# ==========================================
def test_phase08_09_10_exam_generation_deduplication_and_bloom():
    user = create_user_and_login()
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"AI_{uuid.uuid4().hex[:4]}",
        "name": "Artificial Intelligence & Expert Systems",
        "department": "Artificial Intelligence & Data Science",
        "regulation": "R2021",
        "semester": "V",
        "units": [
            {"unit_number": 1, "title": "Problem Solving & Search", "topics": ["A* Search", "Minimax", "Alpha-Beta"]},
            {"unit_number": 2, "title": "Knowledge Representation", "topics": ["First Order Logic", "Ontologies", "Frames"]},
            {"unit_number": 3, "title": "Probabilistic Reasoning", "topics": ["Bayesian Networks", "Markov Chains", "HMM"]},
            {"unit_number": 4, "title": "Machine Learning Fundamentals", "topics": ["Decision Trees", "SVM", "Clustering"]},
            {"unit_number": 5, "title": "Expert Systems & NLP", "topics": ["Rule Engines", "Parsing", "Chatbots"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # Generate 3-Set Exam (Set A, Set B, Set C)
    exam_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subj_id,
        "title": "Semester End Examination",
        "exam_type": "SEMESTER",
        "total_marks": 100,
        "duration_minutes": 180,
        "sets_count": 3,
        "units_covered": [1, 2, 3, 4, 5],
        "blueprint": {
            "part_a": {"questions_count": 10, "marks_per_question": 2, "bloom_levels": ["Remember", "Understand"]},
            "part_b": {"questions_count": 5, "marks_per_question": 13, "bloom_levels": ["Apply", "Analyze"]},
            "part_c": {"questions_count": 1, "marks_per_question": 15, "bloom_levels": ["Evaluate", "Create"]}
        }
    }, headers=user["headers"])
    assert exam_res.status_code == 200
    exam = exam_res.json()["question_paper"]
    assert len(exam["sets"]) == 3
    assert [s["set_code"] for s in exam["sets"]] == ["Set A", "Set B", "Set C"]

    # Extract questions for each set
    set_a_texts = [it["question_text"].strip().lower() for it in exam["sets"][0]["items"]]
    set_b_texts = [it["question_text"].strip().lower() for it in exam["sets"][1]["items"]]
    set_c_texts = [it["question_text"].strip().lower() for it in exam["sets"][2]["items"]]

    assert len(set_a_texts) > 0
    assert len(set_b_texts) > 0
    assert len(set_c_texts) > 0

    # Calculate exact and normalized Jaccard overlap between sets
    def jaccard_overlap(list1, list2):
        set1 = set(list1)
        set2 = set(list2)
        intersection = set1.intersection(set2)
        return len(intersection) / max(1, len(set1.union(set2)))

    overlap_ab = jaccard_overlap(set_a_texts, set_b_texts)
    overlap_ac = jaccard_overlap(set_a_texts, set_c_texts)
    overlap_bc = jaccard_overlap(set_b_texts, set_c_texts)

    # STRICT REQUIREMENT: ZERO DUPLICATE QUESTIONS BETWEEN SETS
    assert overlap_ab == 0.0, f"Detected duplicate questions between Set A and Set B! Overlap: {overlap_ab}"
    assert overlap_ac == 0.0, f"Detected duplicate questions between Set A and Set C! Overlap: {overlap_ac}"
    assert overlap_bc == 0.0, f"Detected duplicate questions between Set B and Set C! Overlap: {overlap_bc}"

    # Verify Bloom's taxonomy tags match blueprint
    for s in exam["sets"]:
        part_a_items = [it for it in s["items"] if "Part A" in (it.get("section_name") or "")]
        part_b_items = [it for it in s["items"] if "Part B" in (it.get("section_name") or "")]
        part_c_items = [it for it in s["items"] if "Part C" in (it.get("section_name") or "")]

        if part_a_items:
            assert all(it["bloom_level"] in ["Remember", "Understand", "Apply"] for it in part_a_items)
        if part_b_items:
            assert all(it["bloom_level"] in ["Apply", "Analyze", "Evaluate", "Understand"] for it in part_b_items)
        if part_c_items:
            assert all(it["bloom_level"] in ["Analyze", "Evaluate", "Create"] for it in part_c_items)

# ==========================================
# PHASE 11 & 12: ANSWER KEYS, QUESTION BANK & EXTRA POOL
# ==========================================
def test_phase11_and_12_answer_keys_and_question_bank_extra_pool():
    user = create_user_and_login()
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"CY_{uuid.uuid4().hex[:4]}",
        "name": "Cryptography & Network Security",
        "department": "Information Security",
        "regulation": "R2021",
        "semester": "VI",
        "units": [
            {"unit_number": 1, "title": "Classical Ciphers", "topics": ["Caesar", "Playfair", "DES"]},
            {"unit_number": 2, "title": "Public Key Cryptography", "topics": ["RSA", "ECC", "Diffie-Hellman"]},
            {"unit_number": 3, "title": "Hash Functions & Signatures", "topics": ["SHA-256", "HMAC", "Digital Signatures"]},
            {"unit_number": 4, "title": "Network Security Protocols", "topics": ["IPSec", "TLS", "PGP"]},
            {"unit_number": 5, "title": "System Security & Firewalls", "topics": ["Intrusion Detection", "Firewalls", "Malware"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # 1. Generate Exam with 2 sets
    exam_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subj_id,
        "title": "Model Exam",
        "exam_type": "MODEL",
        "total_marks": 50,
        "duration_minutes": 90,
        "sets_count": 2,
        "units_covered": [1, 2, 3],
        "blueprint": {
            "part_a": {"questions_count": 5, "marks_per_question": 2, "bloom_levels": ["Remember", "Understand"]},
            "part_b": {"questions_count": 3, "marks_per_question": 10, "bloom_levels": ["Apply", "Analyze"]}
        }
    }, headers=user["headers"])
    assert exam_res.status_code == 200
    qp = exam_res.json()["question_paper"]
    qp_id = qp["id"]

    # 2. Verify Answer Keys
    ak_res = api_call("GET", f"/api/answer-keys/question-paper/{qp_id}", headers=user["headers"])
    assert ak_res.status_code == 200
    aks = ak_res.json()
    assert len(aks) >= 2
    assert {ak["set_code"] for ak in aks} == {"Set A", "Set B"}
    
    # Check step rubrics exist in answer key
    for ak in aks:
        assert len(ak["content_markdown"]) > 50
        assert "Evaluation Scheme" in ak["content_markdown"] or "Model Answer" in ak["content_markdown"] or "Rubric" in ak["content_markdown"]

    # 3. Verify Question Bank Extra Reserve Pool
    qb_res = api_call("GET", f"/api/question-bank/{subj_id}", headers=user["headers"])
    assert qb_res.status_code == 200
    qb_items = qb_res.json()
    assert len(qb_items) >= 15
    
    extra_items = [it for it in qb_items if it.get("is_extra_pool") is True]
    assert len(extra_items) >= 15, f"Expected 15 extra pool questions, found {len(extra_items)}"
    assert all(it["set_origin"] == "EXTRA_POOL" for it in extra_items)

    # 4. Question Bank Filters
    qb_unit1 = api_call("GET", f"/api/question-bank/{subj_id}?unit=1", headers=user["headers"])
    assert qb_unit1.status_code == 200
    assert all(it["unit_number"] == 1 for it in qb_unit1.json())

    qb_extra_filter = api_call("GET", f"/api/question-bank/{subj_id}?is_extra_pool=true", headers=user["headers"])
    assert qb_extra_filter.status_code == 200
    assert all(it["is_extra_pool"] is True for it in qb_extra_filter.json())

# ==========================================
# PHASE 13: OBE / NBA / NAAC TESTING
# ==========================================
def test_phase13_obe_course_outcomes_and_articulation_matrix():
    user = create_user_and_login()
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"CS_{uuid.uuid4().hex[:4]}",
        "name": "Object Oriented Analysis and Design",
        "department": "Computer Science & Engineering",
        "regulation": "R2021",
        "semester": "IV",
        "units": [
            {"unit_number": 1, "title": "UML & Use Cases", "topics": ["Use Case Modeling", "Actor", "Include/Extend"]},
            {"unit_number": 2, "title": "Static Modeling", "topics": ["Class Diagrams", "Associations", "Generalization"]},
            {"unit_number": 3, "title": "Dynamic Modeling", "topics": ["Sequence Diagrams", "State Machines", "Activity"]},
            {"unit_number": 4, "title": "Design Patterns", "topics": ["GRASP", "GoF Creational", "Structural Patterns"]},
            {"unit_number": 5, "title": "Implementation & Testing", "topics": ["Mapping Design to Code", "Unit Testing"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # 1. Synthesize Course Framework
    framework_res = api_call("POST", f"/api/obe/subject/{subj_id}/auto-generate-framework", headers=user["headers"])
    assert framework_res.status_code == 200
    fw = framework_res.json()

    # Verify 5 Course Outcomes (CO1-CO5)
    assert len(fw["course_outcomes"]) == 5
    assert [co["co_code"] for co in fw["course_outcomes"]] == ["CO1", "CO2", "CO3", "CO4", "CO5"]
    assert all(co["target_attainment_pct"] >= 65 for co in fw["course_outcomes"])

    # Verify 5x15 PO/PSO matrix
    mat = fw["articulation_matrix"]
    assert "matrix_rows" in mat
    assert len(mat["matrix_rows"]) == 5
    for row in mat["matrix_rows"]:
        assert "ratings" in row
        # All correlations must be 1, 2, 3 or 0 (blank)
        for po_key, val in row["ratings"].items():
            assert val in [0, 1, 2, 3], f"Invalid correlation {val} for {po_key}"

    # Verify Prerequisites, Textbooks, and Computing Tools
    assert len(fw["prerequisites"]) >= 1
    assert len(fw["recommended_textbooks"]) >= 1
    assert any("title" in tb and "author" in tb for tb in fw["recommended_textbooks"])
    assert len(fw["computing_requirements"]) >= 1

    # Verify Excel and PDF NBA exports
    excel_obe = api_call("GET", f"/api/export/obe/{subj_id}/excel", headers=user["headers"])
    assert excel_obe.status_code == 200
    assert "spreadsheetml" in excel_obe.headers["content-type"]

    pdf_obe = api_call("GET", f"/api/export/obe/{subj_id}/pdf", headers=user["headers"])
    assert pdf_obe.status_code == 200
    assert "application/pdf" in pdf_obe.headers["content-type"]

# ==========================================
# PHASE 14 & 15: REAL EXPORTS & CERTIFIED DOSSIER ZIP
# ==========================================
def test_phase14_and_15_all_exports_and_certified_dossier():
    user = create_user_and_login()
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"AE_{uuid.uuid4().hex[:4]}",
        "name": "Aerodynamics & Propulsion",
        "department": "Aeronautical Engineering",
        "regulation": "R2021",
        "semester": "V",
        "units": [
            {"unit_number": 1, "title": "Inviscid Incompressible Flow", "topics": ["Bernoulli", "Stream Function", "Vorticity"]},
            {"unit_number": 2, "title": "Airfoil Theory", "topics": ["Thin Airfoil", "Kutta Condition", "Camber"]},
            {"unit_number": 3, "title": "Finite Wing Theory", "topics": ["Prandtl Lifting Line", "Induced Drag", "Aspect Ratio"]},
            {"unit_number": 4, "title": "Compressible Flow", "topics": ["Normal Shock", "Oblique Shock", "Prandtl-Meyer"]},
            {"unit_number": 5, "title": "Aircraft Propulsion", "topics": ["Turbojet", "Turbofan", "Rocket Nozzle"]}
        ]
    }, headers=user["headers"])
    subj_id = subj_res.json()["id"]

    # Generate Exam
    exam_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subj_id,
        "title": "Semester Assessment",
        "exam_type": "SEMESTER",
        "total_marks": 100,
        "duration_minutes": 180,
        "sets_count": 2,
        "units_covered": [1, 2, 3, 4, 5],
        "blueprint": {
            "part_a": {"questions_count": 5, "marks_per_question": 2, "bloom_levels": ["Remember", "Understand"]},
            "part_b": {"questions_count": 4, "marks_per_question": 10, "bloom_levels": ["Apply", "Analyze"]}
        }
    }, headers=user["headers"])
    assert exam_res.status_code == 200
    qp_id = exam_res.json()["question_paper"]["id"]

    # 1. Question Paper Exports
    for fmt in ["pdf", "docx", "latex", "markdown", "text"]:
        res_fmt = api_call("GET", f"/api/export/question-paper/{qp_id}/{fmt}?set_code=Set%20A", headers=user["headers"])
        assert res_fmt.status_code == 200
        assert len(res_fmt.content) > 0, f"Export for format {fmt} was empty"

    # QP ZIP Pack
    res_qp_zip = api_call("GET", f"/api/export/question-paper/{qp_id}/zip-pack", headers=user["headers"])
    assert res_qp_zip.status_code == 200
    assert len(res_qp_zip.content) > 0
    with zipfile.ZipFile(io.BytesIO(res_qp_zip.content)) as zf:
        namelist = zf.namelist()
        assert any("Set_A" in n for n in namelist)
        assert any("Set_B" in n for n in namelist)

    # 2. Answer Key Exports
    res_ak_docx = api_call("GET", f"/api/export/answer-key/{qp_id}/docx?set_code=Set%20A", headers=user["headers"])
    assert res_ak_docx.status_code == 200
    assert len(res_ak_docx.content) > 0

    res_ak_zip = api_call("GET", f"/api/export/answer-key/{qp_id}/zip-pack", headers=user["headers"])
    assert res_ak_zip.status_code == 200
    with zipfile.ZipFile(io.BytesIO(res_ak_zip.content)) as zf:
        namelist = zf.namelist()
        assert len(namelist) >= 2

    # 3. Question Bank Exports
    res_qb_excel = api_call("GET", f"/api/export/question-bank/{subj_id}/excel", headers=user["headers"])
    assert res_qb_excel.status_code == 200
    assert len(res_qb_excel.content) > 0

    res_qb_docx = api_call("GET", f"/api/export/question-bank/{subj_id}/docx", headers=user["headers"])
    assert res_qb_docx.status_code == 200
    assert len(res_qb_docx.content) > 0

    res_qb_pdf = api_call("GET", f"/api/export/question-bank/{subj_id}/pdf", headers=user["headers"])
    assert res_qb_pdf.status_code == 200
    assert len(res_qb_pdf.content) > 0

    # 4. Exam Verification Workflow
    verify_res = api_call("POST", f"/api/question-papers/{qp_id}/verify", json={
        "status": "VERIFIED",
        "verifier_notes": "All questions verified for Bloom taxonomy and syllabus coverage."
    }, headers=user["headers"])
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"

    # 5. Certified Accreditation Dossier ZIP
    dossier_res = api_call("GET", f"/api/export/verified-dossier/{qp_id}", headers=user["headers"])
    assert dossier_res.status_code == 200
    assert "application/zip" in dossier_res.headers["content-type"]
    
    with zipfile.ZipFile(io.BytesIO(dossier_res.content)) as zf:
        dossier_files = zf.namelist()
        # Verify required structural components in certified dossier
        assert any(f.startswith("1_Question_Papers/") for f in dossier_files), "Missing 1_Question_Papers/"
        assert any(f.startswith("2_Answer_Keys/") for f in dossier_files), "Missing 2_Answer_Keys/"
        assert any(f.startswith("3_OBE_Accreditation/") for f in dossier_files), "Missing 3_OBE_Accreditation/"
        assert any("Audit_Certificate" in f or "Verification_Certificate" in f for f in dossier_files), "Missing Audit Certificate"

# ==========================================
# PHASE 16, 17, 18, 19: AI FALLBACK, ADMIN & DB
# ==========================================
def test_phase16_to_19_admin_governance_and_db_integrity():
    admin = create_user_and_login(role="ADMIN", dept="Administration")
    faculty = create_user_and_login(role="FACULTY", dept="Civil Engineering")

    # 1. Admin endpoints access control
    # Non-admin attempting admin user listing -> 403 Forbidden
    res_unauth_admin = api_call("GET", "/api/admin/users", headers=faculty["headers"])
    assert res_unauth_admin.status_code == 403

    # Admin user listing
    res_admin_users = api_call("GET", "/api/admin/users", headers=admin["headers"])
    assert res_admin_users.status_code == 200
    users_list = res_admin_users.json()
    assert len(users_list) >= 2

    # Admin audit logs
    res_audit = api_call("GET", "/api/admin/audit-logs", headers=admin["headers"])
    assert res_audit.status_code == 200

    # Admin AI Usage metrics
    res_metrics = api_call("GET", "/api/admin/ai-usage", headers=admin["headers"])
    assert res_metrics.status_code == 200

    # 2. Database Cascade Deletion Test
    # Create Subject under faculty
    subj_res = api_call("POST", "/api/subjects", json={
        "code": f"CE_{uuid.uuid4().hex[:4]}",
        "name": "Structural Analysis",
        "department": "Civil Engineering",
        "regulation": "R2021",
        "semester": "IV",
        "units": [
            {"unit_number": 1, "title": "Energy Methods", "topics": ["Strain Energy", "Castigliano"]},
            {"unit_number": 2, "title": "Indeterminate Structures", "topics": ["Slope Deflection", "Moment Distribution"]},
            {"unit_number": 3, "title": "Matrix Flexibility", "topics": ["Flexibility Matrix", "Primary Structure"]},
            {"unit_number": 4, "title": "Matrix Stiffness", "topics": ["Stiffness Matrix", "Kinematic Indeterminacy"]},
            {"unit_number": 5, "title": "Plastic Analysis", "topics": ["Plastic Hinge", "Collapse Mechanism"]}
        ]
    }, headers=faculty["headers"])
    subj_id = subj_res.json()["id"]

    # Delete Subject -> verify cascade
    del_res = api_call("DELETE", f"/api/subjects/{subj_id}", headers=faculty["headers"])
    assert del_res.status_code == 200

    # Verify subject no longer exists
    check_subj = api_call("GET", f"/api/subjects/{subj_id}", headers=faculty["headers"])
    assert check_subj.status_code == 404
