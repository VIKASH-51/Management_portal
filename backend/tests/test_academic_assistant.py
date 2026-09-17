import os
import pytest
from backend.app.agents.question_paper_agent import QuestionPaperAgent
from backend.app.agents.notes_agent import NotesAgent
from backend.app.agents.validation_engine import ValidationEngine
from backend.app.agents.rag_engine import RAGEngine
from backend.app.agents.export_service import ExportService

def test_question_paper_multi_set_zero_duplicates():
    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8591",
        subject_name="Computer Networks",
        sets_count=3,
        total_marks=100
    )
    sets = result["sets"]
    assert len(sets) == 3
    
    uniqueness = result["uniqueness_report"]
    assert uniqueness["zero_duplicate_guarantee"] is True
    assert uniqueness["duplicate_count"] == 0

def test_question_paper_marks_and_sections():
    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8591",
        subject_name="Computer Networks",
        sets_count=2,
        total_marks=100
    )
    set_a = result["sets"][0]
    validation = set_a["validation"]
    
    assert validation["marks_valid"] is True
    assert validation["total_marks"] == 100
    assert validation["syllabus_coverage_pct"] == 100

def test_notes_pedagogical_humanization():
    notes = NotesAgent.generate_lecture_notes(
        subject_name="Computer Networks",
        subject_code="CS8591",
        unit_number=4,
        unit_title="Transport Layer Protocols",
        topic="TCP Congestion Control (Slow Start, Congestion Avoidance, Fast Retransmit)"
    )
    
    assert "Learning Objectives" in notes["content_markdown"]
    assert "graph" in notes["mermaid_diagram"]
    assert len(notes["exam_points"]) > 0
    assert len(notes["common_mistakes"]) > 0
    
    quality = notes["quality_evaluation"]
    assert quality["humanization_score"] >= 85
    assert quality["is_pedagogically_sound"] is True

def test_rag_chunking_and_retrieval():
    sample_text = "TCP Slow start is a rate-based congestion control mechanism. During slow start, cwnd doubles each RTT."
    chunks = RAGEngine.chunk_text(sample_text, chunk_size=10, overlap=2)
    assert len(chunks) >= 1
    
    subject_docs = [{
        "filename": "CourseNotes.pdf",
        "chunks": [{"content": sample_text, "metadata": {"unit": 4}}]
    }]
    results = RAGEngine.retrieve_relevant_chunks("slow start cwnd", subject_docs, top_k=1)
    assert len(results) == 1
    assert "Slow start" in results[0]["content"]

def test_export_all_formats_generation():
    qp_data = {
        "subject_code": "CS8591",
        "subject_name": "Computer Networks",
        "exam_name": "End Semester Autonomous Examination",
        "academic_year": "2025-2026",
        "regulation": "R2021",
        "duration_minutes": 180,
        "total_marks": 100,
        "sets": [
            {
                "set_code": "Set A",
                "items": [
                    {"section_name": "Part A", "question_number": 1, "sub_division": "", "question_text": "What is RTT?", "marks": 2, "bloom_level": "Remember", "difficulty": "EASY"}
                ]
            }
        ]
    }
    set_data = qp_data["sets"][0]
    
    # 1. PDF
    pdf_path = ExportService.generate_question_paper_pdf(qp_data, set_data)
    assert os.path.exists(pdf_path)
    
    # 2. DOCX
    docx_path = ExportService.generate_question_paper_docx(qp_data, set_data)
    assert os.path.exists(docx_path)
    
    # 3. LaTeX
    latex_path = ExportService.generate_question_paper_latex(qp_data, set_data)
    assert os.path.exists(latex_path)
    
    # 4. Markdown
    md_path = ExportService.generate_question_paper_markdown(qp_data, set_data)
    assert os.path.exists(md_path)
    
    # 5. TXT
    txt_path = ExportService.generate_question_paper_txt(qp_data, set_data)
    assert os.path.exists(txt_path)
    
    # 6. ZIP Pack
    zip_path = ExportService.generate_question_paper_zip_pack(qp_data, qp_data["sets"], answer_keys=[])
    assert os.path.exists(zip_path)
    
    note_data = {
        "title": "Unit 4: TCP Congestion Control",
        "topic": "TCP Congestion Control",
        "unit_number": 4,
        "content_markdown": "# Unit 4: TCP Congestion Control\n## Learning Objectives\n* Understand AIMD"
    }
    note_docx = ExportService.generate_notes_docx(note_data)
    assert os.path.exists(note_docx)

def test_custom_section_question_paper_generation():
    custom_sections = [
        {"name": "Section A", "title": "Objective Concepts", "questions_count": 5, "marks_per_question": 2, "choice_type": "COMPULSORY"},
        {"name": "Section B", "title": "Analytical Problems", "questions_count": 3, "marks_per_question": 10, "choice_type": "INTERNAL_CHOICE"},
        {"name": "Section C", "title": "Design Challenge", "questions_count": 1, "marks_per_question": 20, "choice_type": "INTERNAL_CHOICE"}
    ]
    syllabus_units = [
        {"unit_number": 1, "title": "Unit 1: Supervised Learning", "topics": ["Linear Regression", "Gradient Descent"]},
        {"unit_number": 2, "title": "Unit 2: Deep Networks", "topics": ["Backpropagation", "CNNs"]}
    ]
    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8001",
        subject_name="Machine Learning & Deep Neural Networks",
        sets_count=2,
        total_marks=60,
        units_data=syllabus_units,
        custom_sections=custom_sections
    )
    assert len(result["sets"]) == 2
    items = result["sets"][0]["items"]
    assert any(i["section_name"] == "Section A" for i in items)
    assert any(i["section_name"] == "Section B" for i in items)
    assert any(i["section_name"] == "Section C" for i in items)
    assert result["uniqueness_report"]["zero_duplicate_guarantee"] is True

def test_obe_engine_and_export_generation():
    from backend.app.agents.obe_engine import OBEEngine
    
    subject_units = [
        {"unit_number": 1, "title": "Unit 1: Fundamentals of Network Architecture", "topics": ["OSI Model", "TCP/IP"]},
        {"unit_number": 2, "title": "Unit 2: Data Link Layer & Medium Access", "topics": ["Framing", "Error Control"]},
        {"unit_number": 3, "title": "Unit 3: Network Layer & Routing", "topics": ["IP Addressing", "Dijkstra Routing"]},
        {"unit_number": 4, "title": "Unit 4: Transport Layer Protocols", "topics": ["TCP", "UDP", "Congestion Control"]},
        {"unit_number": 5, "title": "Unit 5: Application Layer & Security", "topics": ["DNS", "HTTP", "SSL/TLS"]}
    ]
    
    # 1. Generate default COs
    cos = OBEEngine.generate_default_course_outcomes("Computer Networks", "CS8591", subject_units)
    assert len(cos) == 5
    assert cos[0]["co_code"] == "CO1"
    assert cos[0]["unit_number"] == 1
    assert "PO1" in cos[0]["po_mapping"]
    assert "PSO1" in cos[0]["po_mapping"]
    
    # 2. Compute Articulation Matrix
    matrix = OBEEngine.compute_articulation_matrix(cos)
    assert "averages" in matrix
    assert "matrix_rows" in matrix
    assert len(matrix["matrix_rows"]) == 5
    assert matrix["averages"]["PO1"] > 0
    
    # 3. Compute Question Paper CO distribution
    sample_sets = [
        {
            "set_code": "Set A",
            "items": [
                {"co_mapped": "CO1", "marks": 2},
                {"co_mapped": "CO2", "marks": 2},
                {"co_mapped": "CO3", "marks": 13},
                {"co_mapped": "CO4", "marks": 13},
                {"co_mapped": "CO5", "marks": 15}
            ]
        }
    ]
    co_dist = OBEEngine.compute_question_paper_co_distribution(sample_sets)
    assert "Set A" in co_dist
    assert co_dist["Set A"]["co_marks"]["CO1"] == 2
    assert co_dist["Set A"]["co_marks"]["CO5"] == 15
    assert co_dist["Set A"]["total_marks"] == 45
    
    # 4. Generate NBA Accreditation Excel
    subject_info = {"code": "CS8591", "name": "Computer Networks", "regulation": "R2021", "academic_year": "2025-2026"}
    excel_path = ExportService.generate_obe_matrix_excel(subject_info, cos, matrix, co_dist)
    assert os.path.exists(excel_path)
    assert excel_path.endswith(".xlsx")
    
    # 5. Generate NBA Accreditation PDF
    pdf_path = ExportService.generate_obe_report_pdf(subject_info, cos, matrix, co_dist)
    assert os.path.exists(pdf_path)
    assert pdf_path.endswith(".pdf")

