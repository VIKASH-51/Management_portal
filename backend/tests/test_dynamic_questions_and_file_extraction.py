import asyncio
import io
import json
import pytest
import httpx
from backend.app.main import app
from backend.app.agents.document_extractor import DocumentExtractorAgent
from backend.app.agents.question_paper_agent import QuestionPaperAgent
from backend.app.agents.answer_key_agent import AnswerKeyAgent
from backend.app.agents.validation_engine import ValidationEngine

def api_call(method: str, path: str, **kwargs):
    async def _do():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            fn = getattr(client, method.lower())
            return await fn(path, **kwargs)
    return asyncio.run(_do())

def get_auth_token():
    res = api_call("POST", "/api/auth/login", json={"email": "superadmin@autonomous.edu", "password": "SuperAdmin@2026"})
    if res.status_code == 200:
        return res.json()["access_token"]
    res2 = api_call("POST", "/api/auth/login", json={"email": "faculty@autonomous.edu", "password": "faculty123"})
    if res2.status_code == 200:
        return res2.json()["access_token"]
    return ""

def test_01_document_extractor_universal_formats():
    """Test text extraction from txt, csv, and mock documents."""
    txt_bytes = b"Course: Distributed Computing Systems\nUnit 1: Foundations\nTopics: RPC, Message Queues, CAP Theorem"
    txt_extracted = DocumentExtractorAgent.extract_text_from_file_bytes(txt_bytes, "syllabus.txt")
    assert "Distributed Computing Systems" in txt_extracted
    assert "CAP Theorem" in txt_extracted

    # Test syllabus extraction
    syll_result = DocumentExtractorAgent.extract_structured_syllabus(txt_extracted, "syllabus.txt")
    assert syll_result["units_extracted"] >= 1

def test_02_template_blueprint_extraction():
    """Test automatic parsing of exam paper layout into actionable custom sections."""
    sample_paper = """
    AUTONOMOUS INSTITUTE OF TECHNOLOGY
    END SEMESTER EXAMINATIONS - NOVEMBER 2025
    REGULATION: R2021 | DURATION: 3 HOURS | MAX MARKS: 100
    
    PART A - (10 x 2 = 20 Marks)
    Answer ALL Questions (Short Answer & Concept definitions)
    1. Define RPC and state its advantages.
    2. What is CAP theorem?
    
    PART B - (5 x 13 = 65 Marks)
    Answer ALL Questions with Internal Choice (a OR b)
    11. (a) Explain Dijkstra Link State routing with a neat diagram.
    (OR)
    11. (b) Derive Bellman Ford distance vector convergence equations.
    
    PART C - (1 x 15 = 15 Marks)
    Case Study & System Design
    16. (a) Design an autonomous cloud healthcare telemetry pipeline handling 100k requests/sec.
    """
    blueprint = DocumentExtractorAgent.extract_template_blueprint(sample_paper, "sample_question_paper.txt")
    assert blueprint["sections_count"] >= 3
    assert blueprint["detected_marks"] == 100
    assert blueprint["calculated_total_marks"] == 100
    assert any(s["choice_type"] == "INTERNAL_CHOICE" for s in blueprint["custom_sections"])

def test_03_multi_type_question_generation():
    """Test dynamic generation of MCQs, Fill in Blanks, Short Answers, Long Answers, and Case Studies."""
    custom_sections = [
        {"name": "Part A", "title": "Multiple Choice Questions", "questions_count": 5, "marks_per_question": 1, "choice_type": "COMPULSORY", "question_type": "MCQ"},
        {"name": "Part B", "title": "Fill in the Blanks", "questions_count": 5, "marks_per_question": 1, "choice_type": "COMPULSORY", "question_type": "FILL_IN_BLANKS"},
        {"name": "Part C", "title": "Short Answer & Concepts", "questions_count": 5, "marks_per_question": 2, "choice_type": "COMPULSORY", "question_type": "SHORT_ANSWER"},
        {"name": "Part D", "title": "Descriptive & Derivations", "questions_count": 3, "marks_per_question": 10, "choice_type": "INTERNAL_CHOICE", "question_type": "LONG_ANSWER"},
        {"name": "Part E", "title": "Comprehensive Autonomous Case Study", "questions_count": 1, "marks_per_question": 15, "choice_type": "INTERNAL_CHOICE", "question_type": "CASE_STUDY"}
    ]

    units_data = [
        {"unit_number": 1, "title": "Unit 1: Distributed Architectures", "topics": ["RPC Mechanisms", "State Synchronization", "Clock Drift"]},
        {"unit_number": 2, "title": "Unit 2: Consensus Protocols", "topics": ["Paxos", "Raft", "Byzantine Fault Tolerance"]},
        {"unit_number": 3, "title": "Unit 3: Distributed Storage", "topics": ["Consistent Hashing", "Replication", "Quorum Protocols"]},
        {"unit_number": 4, "title": "Unit 4: Real-time Streaming", "topics": ["Kafka Architecture", "Backpressure Control", "Windowing"]},
        {"unit_number": 5, "title": "Unit 5: Fault Recovery & Security", "topics": ["Failure Detectors", "TLS Cryptography", "Telemetry SLAs"]}
    ]

    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8999",
        subject_name="Cloud & Distributed Systems",
        sets_count=3,
        total_marks=60,
        custom_sections=custom_sections,
        units_data=units_data,
        faculty_prompt_instructions="Focus on Raft and Kafka streaming"
    )

    assert len(result["sets"]) == 3
    assert result["uniqueness_report"]["zero_duplicate_guarantee"] is True

    # Inspect Set A items
    set_a = result["sets"][0]
    items = set_a["items"]
    
    # Verify MCQs have 4 options and correct answer
    mcqs = [i for i in items if i["question_type"] == "MCQ" or i.get("options")]
    assert len(mcqs) >= 5
    for mcq in mcqs:
        assert len(mcq["options"]) == 4
        assert mcq["correct_answer"].startswith("Option")

    # Verify Fill in blanks
    fibs = [i for i in items if i["question_type"] == "FILL_IN_BLANKS"]
    assert len(fibs) >= 5
    for fib in fibs:
        assert "________" in fib["question_text"]
        assert len(fib["correct_answer"]) > 0

    # Verify Case Study
    case_studies = [i for i in items if i["question_type"] == "CASE_STUDY"]
    assert len(case_studies) >= 1
    for cs in case_studies:
        assert cs["marks"] == 15
        assert "Case" in cs["question_text"] or "Context" in cs["question_text"]

def test_04_answer_key_generation_for_multi_types():
    """Test answer key generation for diverse question types."""
    items = [
        {
            "section_name": "Part A",
            "question_number": 1,
            "sub_division": "",
            "question_text": "Which layer handles end-to-end reliability in TCP/IP?",
            "marks": 1,
            "difficulty": "EASY",
            "bloom_level": "Remember",
            "question_type": "MCQ",
            "options": ["A) Network", "B) Transport", "C) Data Link", "D) Physical"],
            "correct_answer": "Option B",
            "explanation": "Transport layer provides end-to-end byte stream reliability."
        },
        {
            "section_name": "Part B",
            "question_number": 2,
            "sub_division": "",
            "question_text": "In Raft consensus, heartbeat messages are periodically transmitted by ________.",
            "marks": 1,
            "difficulty": "EASY",
            "bloom_level": "Remember",
            "question_type": "FILL_IN_BLANKS",
            "correct_answer": "the elected Leader node"
        }
    ]

    ak = AnswerKeyAgent.generate_answer_key("CS8999", "Distributed Systems", "Set A", items)
    assert "Option B" in ak["content_markdown"]
    assert "elected Leader node" in ak["content_markdown"]
    assert len(ak["marking_rubrics"]) == 2

def test_05_validation_engine_reference_audit():
    """Test reference verification and accreditation audit."""
    items = [
        {"question_number": 1, "question_text": "Explain Paxos consensus and quorum replication.", "unit_number": 2, "marks": 13, "bloom_level": "Analyze", "question_type": "LONG_ANSWER"},
        {"question_number": 2, "question_text": "Calculate Bandwidth Delay Product for 10Gbps link.", "unit_number": 1, "marks": 8, "bloom_level": "Apply", "question_type": "NUMERICAL"}
    ]
    ref_text = "Paxos is a family of protocols for solving consensus in a network of unreliable or fallible processors. Bandwidth Delay Product calculates capacity."
    
    audit = ValidationEngine.verify_question_paper_against_reference(items, ref_text)
    assert audit["verification_score"] >= 90.0
    assert audit["status"] == "VERIFIED_ACCREDITED"
    assert audit["syllabus_alignment_pct"] == 100.0

import uuid

def test_06_api_endpoints_integration():
    """Test full API integration for extract-template and verify-against-reference."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a test subject
    sub_res = api_call("POST", "/api/subjects", json={
        "code": f"CS_{uuid.uuid4().hex[:4]}",
        "name": "Autonomous Intelligent Systems",
        "department": "CSE",
        "regulation": "R2021",
        "semester": "VII",
        "academic_year": "2025-2026",
        "description": "Autonomous edge intelligent systems and robotics."
    }, headers=headers)
    assert sub_res.status_code == 200
    subject_id = sub_res.json()["id"]

    # 2. Test extract template endpoint
    sample_file_content = b"AUTONOMOUS EXAM\nPART A (5x2=10)\n1. Define agent.\nPART B (2x15=30)\n11(a) Explain perception pipeline."
    files = {"file": ("exam_template.txt", io.BytesIO(sample_file_content), "text/plain")}
    tpl_res = api_call("POST", "/api/question-papers/extract-template", files=files, headers=headers)
    assert tpl_res.status_code == 200
    tpl_data = tpl_res.json()
    assert tpl_data["sections_count"] >= 2

    # 3. Generate Question Paper with custom sections & prompt
    gen_res = api_call("POST", "/api/question-papers/generate", json={
        "subject_id": subject_id,
        "title": "Autonomous Robotics End Semester",
        "sets_count": 2,
        "total_marks": 40,
        "difficulty_easy_pct": 30,
        "difficulty_med_pct": 50,
        "difficulty_hard_pct": 20,
        "format_type": "CUSTOM",
        "custom_sections": [
            {"name": "Part A", "title": "MCQs", "questions_count": 5, "marks_per_question": 1, "choice_type": "COMPULSORY", "question_type": "MCQ"},
            {"name": "Part B", "title": "Short Concepts", "questions_count": 5, "marks_per_question": 2, "choice_type": "COMPULSORY", "question_type": "SHORT_ANSWER"},
            {"name": "Part C", "title": "Case Study", "questions_count": 1, "marks_per_question": 25, "choice_type": "INTERNAL_CHOICE", "question_type": "CASE_STUDY"}
        ],
        "faculty_prompt_instructions": "Focus on SLAM and LiDAR sensor fusion"
    }, headers=headers)
    assert gen_res.status_code == 200
    qp_response = gen_res.json()["question_paper"]
    assert len(qp_response["sets"]) == 2
    qp_id = qp_response["id"]

    # 4. Test verify against reference endpoint
    verify_res = api_call("POST", "/api/question-papers/verify-against-reference", data={
        "subject_id": subject_id,
        "question_paper_id": qp_id,
        "reference_text_input": "SLAM and LiDAR sensor fusion algorithms allow mobile robots to map environments and localize simultaneously."
    }, headers=headers)
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["verification_score"] >= 90.0
    assert verify_data["status"] == "VERIFIED_ACCREDITED"
