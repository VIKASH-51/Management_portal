import requests

def main():
    base_url = "http://127.0.0.1:8000/api"
    
    # 1. Login as Super Admin
    login_res = requests.post(f"{base_url}/auth/login", json={
        "email": "superadmin@autonomous.edu",
        "password": "SuperAdmin@2026"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[1] Logged in successfully.")

    # 2. Fetch or Create Subject
    subjects_res = requests.get(f"{base_url}/subjects", headers=headers)
    assert subjects_res.status_code == 200
    subjects = subjects_res.json()
    if not subjects:
        # Create test subject with 5 units
        sub_create = requests.post(f"{base_url}/subjects", headers=headers, json={
            "code": "CS8591",
            "name": "Computer Networks & Distributed Architectures",
            "department": "Computer Science & Engineering",
            "regulation": "R2021",
            "semester": "V",
            "academic_year": "2025-2026",
            "description": "Core computer networking and cloud communications",
            "units": [
                {"unit_number": 1, "title": "Unit 1: Foundations & Physical Layer", "topics": ["OSI Model", "Topologies", "Transmission Media"], "learning_outcomes": ["Understand foundations"], "hours": 9},
                {"unit_number": 2, "title": "Unit 2: Data Link Layer & MAC", "topics": ["Framing", "CRC Error Detection", "Sliding Window Protocols"], "learning_outcomes": ["Formulate link protocols"], "hours": 9},
                {"unit_number": 3, "title": "Unit 3: Network Layer & Routing", "topics": ["IP Addressing", "OSPF Routing", "BGP Protocol"], "learning_outcomes": ["Design network topologies"], "hours": 9},
                {"unit_number": 4, "title": "Unit 4: Transport Layer Protocols", "topics": ["TCP Sockets", "Flow Control", "Congestion Control"], "learning_outcomes": ["Evaluate transport performance"], "hours": 9},
                {"unit_number": 5, "title": "Unit 5: Application Layer & Security", "topics": ["DNS", "HTTP/3", "TLS Cryptography", "Firewalls"], "learning_outcomes": ["Implement application security"], "hours": 9}
            ]
        })
        subject = sub_create.json()
    else:
        subject = subjects[0]

    subject_id = subject["id"]
    print(f"[2] Using Subject: {subject['code']} - {subject['name']} (ID: {subject_id})")

    # 3. Test Generating Continuous Internal Assessment 1 (CIA 1) covering ONLY Unit 1 and Unit 2
    print("\n[3] Generating Question Paper covering Units 1 & 2 (CIA 1)...")
    payload_cia1 = {
        "subject_id": subject_id,
        "title": "Continuous Internal Assessment 1 (Units 1 & 2)",
        "exam_name": "Continuous Internal Assessment - I",
        "duration_minutes": 90,
        "sets_count": 3,
        "total_marks": 50,
        "difficulty_easy_pct": 30,
        "difficulty_med_pct": 50,
        "difficulty_hard_pct": 20,
        "format_type": "CUSTOM",
        "units_included": [1, 2],
        "custom_sections": [
            {"name": "Part A", "title": "Short Concepts", "questions_count": 5, "marks_per_question": 2, "choice_type": "COMPULSORY", "question_type": "SHORT_ANSWER"},
            {"name": "Part B", "title": "Descriptive Questions", "questions_count": 2, "marks_per_question": 15, "choice_type": "INTERNAL_CHOICE", "question_type": "LONG_ANSWER"},
            {"name": "Part C", "title": "Case Analysis", "questions_count": 1, "marks_per_question": 10, "choice_type": "INTERNAL_CHOICE", "question_type": "CASE_STUDY"}
        ],
        "faculty_prompt_instructions": "Focus strictly on Unit 1 and Unit 2 foundational concepts."
    }

    gen_res = requests.post(f"{base_url}/question-papers/generate", json=payload_cia1, headers=headers)
    assert gen_res.status_code == 200, f"Generation failed: {gen_res.text}"
    data = gen_res.json()
    qp = data["question_paper"]
    print(f"  -> Generated QP ID: {qp['id']}")
    print(f"  -> Units Included in QP Metadata: {qp.get('units_included')}")
    assert qp.get("units_included") == [1, 2], f"Expected units [1, 2], got {qp.get('units_included')}"

    for s in qp["sets"]:
        units_in_set = set(item["unit_number"] for item in s["items"])
        cos_in_set = set(item["co_mapped"] for item in s["items"])
        print(f"  -> Set {s['set_code']}: {len(s['items'])} items | Units covered: {units_in_set} | COs mapped: {cos_in_set}")
        assert units_in_set.issubset({1, 2}), f"Violation: Found questions outside Units 1 & 2: {units_in_set}"
        assert cos_in_set.issubset({"CO1", "CO2"}), f"Violation: Found CO mappings outside CO1 & CO2: {cos_in_set}"

    # 4. Test Generating Single Unit Assessment covering ONLY Unit 5 (CIA 3)
    print("\n[4] Generating Question Paper covering ONLY Unit 5 (CIA 3)...")
    payload_cia3 = {
        "subject_id": subject_id,
        "title": "Continuous Internal Assessment 3 (Unit 5 Security)",
        "exam_name": "Continuous Internal Assessment - III",
        "duration_minutes": 60,
        "sets_count": 2,
        "total_marks": 50,
        "format_type": "CUSTOM",
        "units_included": [5],
        "custom_sections": [
            {"name": "Part A", "title": "Security MCQs", "questions_count": 5, "marks_per_question": 2, "choice_type": "COMPULSORY", "question_type": "MCQ"},
            {"name": "Part B", "title": "Security Architectures", "questions_count": 2, "marks_per_question": 20, "choice_type": "INTERNAL_CHOICE", "question_type": "LONG_ANSWER"}
        ]
    }

    gen_res3 = requests.post(f"{base_url}/question-papers/generate", json=payload_cia3, headers=headers)
    assert gen_res3.status_code == 200, f"Unit 5 QP Generation failed: {gen_res3.text}"
    qp3 = gen_res3.json()["question_paper"]
    print(f"  -> Generated QP ID: {qp3['id']}")
    print(f"  -> Units Included in QP Metadata: {qp3.get('units_included')}")
    assert qp3.get("units_included") == [5]

    for s in qp3["sets"]:
        units_in_set = set(item["unit_number"] for item in s["items"])
        cos_in_set = set(item["co_mapped"] for item in s["items"])
        print(f"  -> Set {s['set_code']}: {len(s['items'])} items | Units covered: {units_in_set} | COs mapped: {cos_in_set}")
        assert units_in_set == {5}, f"Violation: Expected only Unit 5, got {units_in_set}"
        assert cos_in_set == {"CO5"}, f"Violation: Expected only CO5, got {cos_in_set}"

    print("\nALL UNIT SELECTION AND COVERAGE CHECKS PASSED WITH 100% PRECISION!")

if __name__ == "__main__":
    main()
