import urllib.request
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)

def run_verification():
    print("==================================================")
    print("STARTING END-TO-END VERIFICATION OF ALL FEATURES")
    print("==================================================")

    # 1. Test backend health
    req = urllib.request.urlopen('http://localhost:8000/api/admin/health')
    health = json.loads(req.read().decode('utf-8'))
    print('1. Backend Health:', health['status'], '| API Uptime:', health['api_uptime'])

    # 2. Test Login
    data = json.dumps({'email': 'faculty@autonomous.edu', 'password': 'faculty123'}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    login_res = json.loads(res.read().decode('utf-8'))
    token = login_res['access_token']
    print('2. Login Success for User:', login_res['user']['full_name'], '| Role:', login_res['user']['role'])

    # 3. Create course if empty
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    req = urllib.request.Request('http://localhost:8000/api/subjects', headers=headers)
    subjects = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    if not subjects:
        course_payload = {
            'code': 'CS8591',
            'name': 'Computer Networks & Distributed Systems',
            'department': 'CSE',
            'regulation': 'R2021',
            'semester': '5',
            'academic_year': '2025-2026',
            'description': 'Core Autonomous Computer Networks Course with Lab',
            'units': [
                {'unit_number': 1, 'title': 'Unit 1: Network Fundamentals & Physical Layer', 'topics': ['OSI 7-Layer Model', 'TCP/IP Architecture', 'Packet vs Circuit Switching']},
                {'unit_number': 2, 'title': 'Unit 2: Data Link Layer & MAC Protocols', 'topics': ['Framing & Error Detection (CRC)', 'Sliding Window Protocols', 'CSMA/CD & Ethernet']},
                {'unit_number': 3, 'title': 'Unit 3: Network Layer & Routing Protocols', 'topics': ['IPv4 vs IPv6 Addressing', 'Subnetting & CIDR', 'Dijkstra & Distance Vector Routing (OSPF, BGP)']},
                {'unit_number': 4, 'title': 'Unit 4: Transport Layer & Flow Control', 'topics': ['TCP vs UDP Socket Programming', 'TCP 3-Way Handshake & Connection Teardown', 'TCP Congestion Control (Slow Start, AIMD, Fast Recovery)']},
                {'unit_number': 5, 'title': 'Unit 5: Application Layer & Network Security', 'topics': ['DNS Resolution Architecture', 'HTTP/1.1 vs HTTP/2 vs HTTP/3', 'TLS/SSL Cryptographic Handshake & RSA']}
            ]
        }
        req = urllib.request.Request('http://localhost:8000/api/subjects', data=json.dumps(course_payload).encode('utf-8'), headers=headers)
        subj = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        print('3. Created Autonomous Course:', subj['code'], '-', subj['name'])
        subj_id = subj['id']
    else:
        subj_id = subjects[0]['id']
        print('3. Found Existing Autonomous Course:', subjects[0]['code'])

    # 4. Generate Multi-Set Exam (3 Sets)
    qp_payload = {
        'subject_id': subj_id,
        'title': 'CS8591 End Semester Autonomous Examination',
        'exam_name': 'End Semester Autonomous Examination',
        'duration_minutes': 180,
        'sets_count': 3,
        'total_marks': 100,
        'difficulty_easy_pct': 30,
        'difficulty_med_pct': 50,
        'difficulty_hard_pct': 20,
        'format_type': 'FORMAT_A'
    }
    req = urllib.request.Request('http://localhost:8000/api/question-papers/generate', data=json.dumps(qp_payload).encode('utf-8'), headers=headers)
    qp_res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    qp = qp_res['question_paper']
    qp_id = qp['id']
    print('4. Generated Question Paper Sets:', len(qp['sets']), '| Zero Duplicate Guarantee:', qp_res['uniqueness_report']['zero_duplicate_guarantee'])

    # 5. Fetch Answer Keys
    req = urllib.request.Request(f'http://localhost:8000/api/answer-keys/question-paper/{qp_id}', headers=headers)
    aks = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print('5. Generated Answer Key Sets:', len(aks), '| Rubrics in Set A:', len(aks[0]['marking_rubrics']) if aks else 0)

    # 6. Generate Extra Auxiliary Question Pool (15+ items)
    req = urllib.request.Request(f'http://localhost:8000/api/question-bank/generate-extra-pool/{subj_id}?count=15', data=b'', headers=headers)
    extra_res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print('6. Extra Auxiliary Pool Synthesis:', extra_res['status'], '| Items Added:', len(extra_res['items']))

    # 7. Check Question Bank Segregation
    req = urllib.request.Request(f'http://localhost:8000/api/question-bank/subject/{subj_id}?set_origin=Set%20A', headers=headers)
    set_a_pool = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    req = urllib.request.Request(f'http://localhost:8000/api/question-bank/subject/{subj_id}?is_extra_pool=true', headers=headers)
    extra_pool = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print('7. Question Bank Segregation: Set A Pool =', len(set_a_pool), 'items | Extra Auxiliary Pool =', len(extra_pool), 'items')

    # 8. Test Export Endpoints (PDF, Word, LaTeX, Markdown, TXT, ZIP)
    for fmt, ext in [('pdf', 'pdf'), ('docx', 'docx'), ('latex', 'tex'), ('markdown', 'md'), ('text', 'txt')]:
        url = f'http://localhost:8000/api/export/question-paper/{qp_id}/{fmt}?set_code=Set%20A'
        req = urllib.request.Request(url, headers=headers)
        resp = urllib.request.urlopen(req)
        print(f'8.{fmt.upper()} Export Status:', resp.status, '| Content-Length:', len(resp.read()), 'bytes')

    # Test ZIP Pack Export
    req = urllib.request.Request(f'http://localhost:8000/api/export/question-paper/{qp_id}/zip-pack', headers=headers)
    resp = urllib.request.urlopen(req)
    print('8.ZIP Pack Export Status:', resp.status, '| ZIP Size:', len(resp.read()), 'bytes')

    # 9. Admin Staff Approval Flow
    admin_data = json.dumps({'email': 'admin@autonomous.edu', 'password': 'admin123'}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/auth/login', data=admin_data, headers={'Content-Type': 'application/json'})
    admin_token = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}', 'Content-Type': 'application/json'}

    import time
    staff_email = f"staff_{int(time.time())}@autonomous.edu"
    # Register a test new staff member
    new_staff_data = {
        'email': staff_email,
        'password': 'password123',
        'full_name': 'Prof. Ananya Sen',
        'department': 'Information Technology',
        'institution': 'Autonomous Institute of Technology',
        'designation': 'Assistant Professor'
    }
    req = urllib.request.Request('http://localhost:8000/api/auth/register', data=json.dumps(new_staff_data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    reg_user = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    user_obj = reg_user.get('user', reg_user)
    user_id = user_obj['id']
    print('9. Registered New Staff:', user_obj['full_name'], '| Initial Approval Status:', user_obj['approval_status'])

    # Admin approves the staff member
    req = urllib.request.Request(f'http://localhost:8000/api/admin/users/{user_id}/approval?status=APPROVED', data=b'', headers=admin_headers, method='PATCH')
    approval_res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print('10. Admin Staff Approval Result:', approval_res['approval_status'], '| is_active:', approval_res['is_active'])

    # Admin toggles login status
    req = urllib.request.Request(f'http://localhost:8000/api/admin/users/{user_id}/toggle-status', data=b'', headers=admin_headers, method='PATCH')
    toggle_res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    print('11. Admin Toggle Login Status:', toggle_res['is_active'])

    print("==================================================")
    print("ALL 11 VERIFICATION STAGES PASSED PERFECTLY!")
    print("==================================================")

if __name__ == '__main__':
    run_verification()
