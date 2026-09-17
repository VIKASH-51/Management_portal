import asyncio
import pytest
import httpx
import uuid
from backend.app.main import app

def api_call(method: str, path: str, **kwargs):
    async def _do():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            fn = getattr(client, method.lower())
            return await fn(path, **kwargs)
    return asyncio.run(_do())

def get_auth_token(email="superadmin@autonomous.edu", password="SuperAdmin@2026"):
    res = api_call("POST", "/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]

def get_auth_headers():
    token = get_auth_token("superadmin@autonomous.edu", "SuperAdmin@2026")
    return {"Authorization": f"Bearer {token}"}

def get_admin_headers():
    token = get_auth_token("superadmin@autonomous.edu", "SuperAdmin@2026")
    return {"Authorization": f"Bearer {token}"}

def test_01_auth_flow():
    # 1. Login with super admin
    login_res = api_call("POST", "/api/auth/login", json={
        "email": "superadmin@autonomous.edu",
        "password": "SuperAdmin@2026"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
    assert login_res.json()["user"]["role"] == "SUPER_ADMIN"

    # 2. Register new faculty
    reg_email = "prof_e2e_test@autonomous.edu"
    reg_res = api_call("POST", "/api/auth/register", json={
        "email": reg_email,
        "password": "securepassword123",
        "full_name": "Dr. End-to-End Tester",
        "department": "Computer Science & Engineering",
        "institution": "Autonomous Institute of Technology",
        "role": "FACULTY",
        "tenant_id": "default_tenant"
    })
    assert reg_res.status_code in [200, 400]  # 400 if already created in previous run

def test_02_subject_crud_and_ai_syllabus():
    headers = get_auth_headers()
    code = f"CS_{uuid.uuid4().hex[:4]}"

    # 1. AI Syllabus generation
    ai_gen_res = api_call("POST", "/api/subjects/generate-syllabus-ai", json={
        "code": code,
        "name": "Distributed Systems & Cloud Architecture",
        "department": "Computer Science & Engineering",
        "regulation": "R2021"
    }, headers=headers)
    assert ai_gen_res.status_code == 200
    units = ai_gen_res.json()
    assert len(units) == 5

    # 2. Create Subject
    create_res = api_call("POST", "/api/subjects", json={
        "code": code,
        "name": "Distributed Systems & Cloud Architecture",
        "department": "Computer Science & Engineering",
        "regulation": "R2021",
        "semester": "VI",
        "academic_year": "2025-2026",
        "description": "Comprehensive course on distributed consensus and cloud architecture.",
        "units": units
    }, headers=headers)
    assert create_res.status_code == 200
    subj = create_res.json()
    assert subj["code"] == code
    subj_id = subj["id"]

    # 3. Get Subject by ID
    get_res = api_call("GET", f"/api/subjects/{subj_id}", headers=headers)
    assert get_res.status_code == 200
    assert len(get_res.json()["units"]) == 5

def test_03_notes_generation():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    assert subjects_res.status_code == 200
    subjects = subjects_res.json()
    assert len(subjects) > 0
    subject_id = subjects[0]["id"]

    # Generate Lecture Notes
    notes_res = api_call("POST", "/api/notes/generate", json={
        "subject_id": subject_id,
        "unit_number": 1,
        "topic": "Core Fundamentals and Architecture"
    }, headers=headers)
    assert notes_res.status_code == 200
    notes_data = notes_res.json()
    assert "note" in notes_data
    assert "graph" in notes_data["note"]["mermaid_diagram"]

def test_04_question_paper_multi_set_generation():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    subject_id = subjects_res.json()[0]["id"]

    # Generate 3-set Question Paper
    qp_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subject_id,
        "title": "Semester Autonomous End Examination",
        "regulation": "R2021",
        "semester": "V",
        "academic_year": "2025-2026",
        "exam_name": "Autonomous End Examination",
        "duration_minutes": 180,
        "total_marks": 100,
        "difficulty_easy_pct": 30,
        "difficulty_med_pct": 50,
        "difficulty_hard_pct": 20,
        "format_type": "FORMAT_A",
        "sets_count": 3
    }, headers=headers)
    assert qp_res.status_code == 200
    qp_data = qp_res.json()
    assert "question_paper" in qp_data
    qp = qp_data["question_paper"]
    assert len(qp["sets"]) == 3
    qp_id = qp["id"]

    # Verify Answer Keys generated
    ak_res = api_call("GET", f"/api/answer-keys/question-paper/{qp_id}", headers=headers)
    assert ak_res.status_code == 200
    assert len(ak_res.json()) >= 3

def test_05_question_bank_and_extra_pool():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    subject_id = subjects_res.json()[0]["id"]

    # Generate Extra Auxiliary Question Pool
    extra_res = api_call("POST", f"/api/question-bank/generate-extra-pool/{subject_id}?count=15", headers=headers)
    assert extra_res.status_code == 200
    assert extra_res.json()["status"] == "success"

    # Get question bank items
    qb_res = api_call("GET", f"/api/question-bank/subject/{subject_id}", headers=headers)
    assert qb_res.status_code == 200
    qb_items = qb_res.json()
    assert len(qb_items) > 0
    assert any(it["is_extra_pool"] is True for it in qb_items)

def test_06_obe_matrix_and_nba_accreditation():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    subject_id = subjects_res.json()[0]["id"]

    # Get OBE Matrix
    obe_res = api_call("GET", f"/api/obe/subject/{subject_id}", headers=headers)
    assert obe_res.status_code == 200
    obe_data = obe_res.json()
    assert len(obe_data["course_outcomes"]) == 5
    assert "matrix_rows" in obe_data["articulation_matrix"]
    assert "averages" in obe_data["articulation_matrix"]

    # Update a Course Outcome rating
    co_id = obe_data["course_outcomes"][0]["id"]
    update_res = api_call("PUT", f"/api/obe/subject/{subject_id}/co/{co_id}", json={
        "description": "Updated CO1: Master foundation concepts and architecture.",
        "bloom_level": "Understand",
        "target_attainment_pct": 80.0,
        "po_mapping": {"PO1": 3, "PO2": 2, "PO3": 3, "PO4": 2, "PO5": 1, "PSO1": 3}
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["co"]["target_attainment_pct"] == 80.0

    # Test NBA Excel export endpoint
    excel_res = api_call("GET", f"/api/export/obe/{subject_id}/excel", headers=headers)
    assert excel_res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in excel_res.headers["content-type"]

    # Test NBA PDF export endpoint
    pdf_res = api_call("GET", f"/api/export/obe/{subject_id}/pdf", headers=headers)
    assert pdf_res.status_code == 200
    assert "application/pdf" in pdf_res.headers["content-type"]

    # Test Auto-Generate Course Framework (COs, PO matrix, prerequisites, textbooks)
    auto_framework_res = api_call("POST", f"/api/obe/subject/{subject_id}/auto-generate-framework", headers=headers)
    assert auto_framework_res.status_code == 200
    framework_data = auto_framework_res.json()
    assert len(framework_data["course_outcomes"]) == 5
    assert len(framework_data["recommended_textbooks"]) > 0
    assert len(framework_data["computing_requirements"]) > 0

    # Test Course Requirements Endpoint
    req_res = api_call("GET", f"/api/obe/subject/{subject_id}/requirements", headers=headers)
    assert req_res.status_code == 200
    req_data = req_res.json()
    assert "prerequisites" in req_data
    assert "recommended_textbooks" in req_data
    assert "reference_books" in req_data

def test_07_export_all_formats():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    subject_id = subjects_res.json()[0]["id"]
    qps_res = api_call("GET", f"/api/question-papers/subject/{subject_id}", headers=headers)
    assert qps_res.status_code == 200
    qps = qps_res.json()
    assert len(qps) > 0
    qp_id = qps[0]["id"]

    # Question Paper formats
    for fmt in ["pdf", "docx", "latex", "markdown", "text"]:
        res = api_call("GET", f"/api/export/question-paper/{qp_id}/{fmt}?set_code=Set%20A", headers=headers)
        assert res.status_code == 200, f"Export failed for format {fmt}: {res.text}"

    # Question Paper ZIP pack
    zip_res = api_call("GET", f"/api/export/question-paper/{qp_id}/zip-pack", headers=headers)
    assert zip_res.status_code == 200
    assert "application/zip" in zip_res.headers["content-type"]

    # Answer Key set-wise exports (DOCX, TXT, ZIP)
    ak_docx = api_call("GET", f"/api/export/answer-key/{qp_id}/docx?set_code=Set%20A", headers=headers)
    assert ak_docx.status_code == 200
    assert "wordprocessingml" in ak_docx.headers["content-type"]

    ak_txt = api_call("GET", f"/api/export/answer-key/{qp_id}/text?set_code=Set%20A", headers=headers)
    assert ak_txt.status_code == 200

    ak_zip = api_call("GET", f"/api/export/answer-key/{qp_id}/zip-pack", headers=headers)
    assert ak_zip.status_code == 200
    assert "application/zip" in ak_zip.headers["content-type"]

    # Question Bank exports (Excel, DOCX, PDF)
    qb_excel = api_call("GET", f"/api/export/question-bank/{subject_id}/excel", headers=headers)
    assert qb_excel.status_code == 200

    qb_docx = api_call("GET", f"/api/export/question-bank/{subject_id}/docx", headers=headers)
    assert qb_docx.status_code == 200

    qb_pdf = api_call("GET", f"/api/export/question-bank/{subject_id}/pdf", headers=headers)
    assert qb_pdf.status_code == 200

    # Verified Accreditation Dossier Export
    dossier_res = api_call("GET", f"/api/export/verified-dossier/{qp_id}", headers=headers)
    assert dossier_res.status_code == 200
    assert "application/zip" in dossier_res.headers["content-type"]

def test_08_copilot_chat():
    headers = get_auth_headers()
    subjects_res = api_call("GET", "/api/subjects", headers=headers)
    subject_id = subjects_res.json()[0]["id"]

    chat_res = api_call("POST", "/api/copilot/chat", json={
        "subject_id": subject_id,
        "message": "Explain how Bloom taxonomy is balanced across Set A and Set B."
    }, headers=headers)
    assert chat_res.status_code == 200
    assert "response" in chat_res.json()

def test_09_admin_portal_governance():
    headers = get_admin_headers()
    # Get all users
    users_res = api_call("GET", "/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 2

    # Toggle status of first faculty user
    target_user = next((u for u in users if u["role"] == "FACULTY"), None)
    if target_user:
        toggle_res = api_call("PATCH", f"/api/admin/users/{target_user['id']}/toggle-status", headers=headers)
        assert toggle_res.status_code == 200
        # Toggle back
        api_call("PATCH", f"/api/admin/users/{target_user['id']}/toggle-status", headers=headers)

def test_10_multi_user_isolation():
    # Register a new individual user
    user_b_email = f"faculty_b_{uuid.uuid4().hex[:6]}@engineering.edu"
    reg_res = api_call("POST", "/api/auth/register", json={
        "email": user_b_email,
        "password": "Password123!",
        "full_name": "Prof. User B",
        "role": "FACULTY",
        "department": "Mechanical Engineering"
    })
    assert reg_res.status_code == 200
    user_b_id = reg_res.json()["user"]["id"]

    # Super Admin approves user B
    sa_headers = get_admin_headers()
    approve_res = api_call("PATCH", f"/api/admin/users/{user_b_id}/approval?status=APPROVED", headers=sa_headers)
    assert approve_res.status_code == 200

    # User B logs in
    login_b = api_call("POST", "/api/auth/login", json={
        "email": user_b_email,
        "password": "Password123!"
    })
    assert login_b.status_code == 200
    token_b = login_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B should see 0 subjects initially (isolated)
    subjects_b = api_call("GET", "/api/subjects", headers=headers_b)
    assert subjects_b.status_code == 200
    assert len(subjects_b.json()) == 0

    # User B cannot access User A's subject
    headers_a = get_auth_headers()
    subj_a_id = api_call("GET", "/api/subjects", headers=headers_a).json()[0]["id"]
    forbidden_res = api_call("GET", f"/api/subjects/{subj_a_id}", headers=headers_b)
    assert forbidden_res.status_code == 403


