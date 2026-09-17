import json
import pytest
from backend.app.agents.question_paper_agent import QuestionPaperAgent
from backend.app.agents.orchestrator import AcademicOrchestrator

def test_question_paper_unit_filtering_two_units():
    """Test generating question paper covering only Unit 1 and Unit 2 (e.g. CIA 1)."""
    units_data = [
        {
            "unit_number": 1,
            "title": "Unit 1: Foundations of Computer Networks",
            "topics": ["OSI Model", "TCP/IP Protocol Suite", "Network Topologies", "Physical Layer"],
            "learning_outcomes": ["Understand layer architecture"],
            "hours": 9
        },
        {
            "unit_number": 2,
            "title": "Unit 2: Data Link Layer & Medium Access",
            "topics": ["Framing Protocols", "Error Detection CRC", "Flow Control Sliding Window", "CSMA/CD"],
            "learning_outcomes": ["Formulate data link solutions"],
            "hours": 9
        }
    ]

    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8591",
        subject_name="Computer Networks",
        sets_count=2,
        total_marks=100,
        difficulty_easy_pct=30,
        difficulty_med_pct=50,
        difficulty_hard_pct=20,
        format_type="FORMAT_A",
        units_data=units_data
    )

    assert "sets" in result
    assert len(result["sets"]) == 2

    for s in result["sets"]:
        assert len(s["items"]) > 0
        units_found = set(item["unit_number"] for item in s["items"])
        # All items must strictly belong to either Unit 1 or Unit 2
        assert units_found.issubset({1, 2}), f"Unexpected unit numbers found: {units_found}"
        assert 1 in units_found
        assert 2 in units_found

def test_question_paper_unit_filtering_single_unit():
    """Test generating question paper covering only Unit 5 (e.g. CIA 3 / Specialized Unit Test)."""
    units_data = [
        {
            "unit_number": 5,
            "title": "Unit 5: Network Security & Emerging Architectures",
            "topics": ["Cryptography & RSA", "Firewalls & VPNs", "Software Defined Networking", "Zero Trust Architecture"],
            "learning_outcomes": ["Evaluate enterprise security posture"],
            "hours": 9
        }
    ]

    result = QuestionPaperAgent.generate_multi_sets(
        subject_code="CS8591",
        subject_name="Computer Networks",
        sets_count=1,
        total_marks=50,
        units_data=units_data
    )

    assert len(result["sets"]) == 1
    items = result["sets"][0]["items"]
    for item in items:
        assert item["unit_number"] == 5, f"Expected Unit 5, got Unit {item['unit_number']}"
        assert item["co_mapped"] == "CO5"

def test_orchestrator_unit_coverage_workflow():
    """Test orchestrator workflow with specific unit coverage."""
    units_data = [
        {
            "unit_number": 3,
            "title": "Unit 3: Network Layer & Routing",
            "topics": ["IP Addressing", "Distance Vector Routing", "Link State OSPF", "BGP Protocol"],
            "learning_outcomes": ["Configure enterprise routing"],
            "hours": 9
        },
        {
            "unit_number": 4,
            "title": "Unit 4: Transport Layer & Congestion Control",
            "topics": ["TCP Connection Management", "TCP Reno Congestion Control", "UDP Sockets", "QUIC Protocol"],
            "learning_outcomes": ["Analyze transport throughput"],
            "hours": 9
        }
    ]

    orch = AcademicOrchestrator.run_question_paper_workflow(
        subject_code="CS8591",
        subject_name="Computer Networks",
        sets_count=2,
        total_marks=100,
        units_data=units_data
    )

    qp = orch["question_paper"]
    assert len(qp["sets"]) == 2
    for s in qp["sets"]:
        for it in s["items"]:
            assert it["unit_number"] in [3, 4], f"Unexpected unit {it['unit_number']} in 2-unit CIA 2 exam"
