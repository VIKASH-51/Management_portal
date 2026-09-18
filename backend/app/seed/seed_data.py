from sqlalchemy.orm import Session
from backend.app.models.models import User, Tenant, SystemConfig, Subject, SyllabusUnit, CourseOutcome
from backend.app.core.security import get_password_hash
import json

def seed_database(db: Session):
    # Ensure default tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == "default_tenant").first()
    if not tenant:
        tenant = Tenant(id="default_tenant", name="Autonomous Institute of Technology")
        db.add(tenant)
        db.commit()

    # Pre-defined institutional users across all roles
    initial_users = [
        # 1. Super Administrators
        {
            "email": "superadmin@autonomous.edu",
            "full_name": "Institutional Super Administrator",
            "password": "SuperAdmin@2026",
            "role": "SUPER_ADMIN",
            "department": "Central IT & Institutional Governance",
            "institution": "Autonomous Institute of Technology",
            "designation": "Super Administrator"
        },
        {
            "email": "superadmin@univ.edu",
            "full_name": "University Super Administrator",
            "password": "SuperAdmin@2026",
            "role": "SUPER_ADMIN",
            "department": "University Administration",
            "institution": "Autonomous Institute of Technology",
            "designation": "Chief Governance Officer"
        },
        # 2. Dean / Administrative Office
        {
            "email": "dean@autonomous.edu",
            "full_name": "Dr. V. Ramanathan",
            "password": "Admin@123",
            "role": "ADMIN",
            "department": "Office of Academic Dean",
            "institution": "Autonomous Institute of Technology",
            "designation": "Academic Dean"
        },
        {
            "email": "dean.academics@autonomous.edu",
            "full_name": "Dr. V. Ramanathan",
            "password": "Admin@123",
            "role": "ADMIN",
            "department": "Academic Affairs",
            "institution": "Autonomous Institute of Technology",
            "designation": "Dean of Academics"
        },
        {
            "email": "admin@autonomous.edu",
            "full_name": "Controller of Examinations (CoE)",
            "password": "Admin@123",
            "role": "ADMIN",
            "department": "Autonomous Examination Cell",
            "institution": "Autonomous Institute of Technology",
            "designation": "Controller of Examinations"
        },
        {
            "email": "admin@univ.edu",
            "full_name": "Dr. S. K. Narayanan",
            "password": "Admin@123",
            "role": "ADMIN",
            "department": "Academic Office",
            "institution": "Autonomous Institute of Technology",
            "designation": "Academic Dean"
        },
        # 3. Faculty Members
        {
            "email": "faculty@autonomous.edu",
            "full_name": "Dr. K. Sharma",
            "password": "Faculty@123",
            "role": "FACULTY",
            "department": "Computer Science & Engineering",
            "institution": "Autonomous Institute of Technology",
            "designation": "Associate Professor"
        },
        {
            "email": "prof.sharma@autonomous.edu",
            "full_name": "Prof. Rajesh Sharma",
            "password": "Faculty@123",
            "role": "FACULTY",
            "department": "Computer Science & Engineering",
            "institution": "Autonomous Institute of Technology",
            "designation": "Professor & HOD"
        },
        {
            "email": "faculty@univ.edu",
            "full_name": "Dr. Ananya Iyer",
            "password": "Faculty@123",
            "role": "FACULTY",
            "department": "Information Technology",
            "institution": "Autonomous Institute of Technology",
            "designation": "Assistant Professor"
        }
    ]

    for u_data in initial_users:
        user = db.query(User).filter(User.email == u_data["email"]).first()
        if not user:
            user = User(
                email=u_data["email"],
                full_name=u_data["full_name"],
                hashed_password=get_password_hash(u_data["password"]),
                role=u_data["role"],
                department=u_data["department"],
                institution=u_data["institution"],
                designation=u_data["designation"],
                tenant_id="default_tenant",
                approval_status="APPROVED",
                is_active=True
            )
            db.add(user)
        else:
            user.full_name = u_data["full_name"]
            user.hashed_password = get_password_hash(u_data["password"])
            user.role = u_data["role"]
            user.approval_status = "APPROVED"
            user.is_active = True
    db.commit()

    # Seed Default Sample Subject for Faculty
    faculty_user = db.query(User).filter(User.email == "faculty@autonomous.edu").first()
    if faculty_user and not db.query(Subject).filter(Subject.user_id == faculty_user.id).first():
        sample_subject = Subject(
            code="CS8591",
            name="Computer Networks",
            department="Computer Science & Engineering",
            regulation="R2021",
            semester="V",
            academic_year="2025-2026",
            description="Fundamental concepts of computer networks, OSI reference model, TCP/IP protocol suite, routing protocols, flow control, transport layer congestion algorithms, and modern network security.",
            user_id=faculty_user.id,
            tenant_id="default_tenant"
        )
        db.add(sample_subject)
        db.commit()
        db.refresh(sample_subject)

        # 5 Units
        units = [
            SyllabusUnit(
                subject_id=sample_subject.id,
                unit_number=1,
                title="Introduction to Networks & Physical Layer",
                topics_json=json.dumps(["Network Topologies and Categories", "OSI 7-Layer Reference Model", "TCP/IP Protocol Suite", "Transmission Media and Physical Signals", "Performance Metrics: Throughput, Delay, Bandwidth-Delay Product"]),
                hours=9
            ),
            SyllabusUnit(
                subject_id=sample_subject.id,
                unit_number=2,
                title="Data Link Layer & Medium Access Sublayer",
                topics_json=json.dumps(["Error Detection and Correction (CRC, Hamming Code)", "Flow and Error Control Protocols (Stop-and-Wait, Go-Back-N, Selective Repeat)", "Multiple Access Protocols (CSMA/CD, CSMA/CA)", "Ethernet Standards (802.3, Fast Ethernet)", "Wireless LANs (IEEE 802.11)"]),
                hours=9
            ),
            SyllabusUnit(
                subject_id=sample_subject.id,
                unit_number=3,
                title="Network Layer & Routing Protocols",
                topics_json=json.dumps(["IPv4 and IPv6 Addressing and Subnetting", "Classless Inter-Domain Routing (CIDR)", "Distance Vector Routing (RIP)", "Link State Routing (OSPF)", "Border Gateway Protocol (BGP)", "NAT, ICMP, and ARP Protocols"]),
                hours=9
            ),
            SyllabusUnit(
                subject_id=sample_subject.id,
                unit_number=4,
                title="Transport Layer Protocols & Congestion Control",
                topics_json=json.dumps(["User Datagram Protocol (UDP) Service", "Transmission Control Protocol (TCP) Connection Management", "TCP Sliding Window and Flow Control", "TCP Congestion Control (Slow Start, Congestion Avoidance, Fast Retransmit)", "Quality of Service (QoS) Mechanisms"]),
                hours=9
            ),
            SyllabusUnit(
                subject_id=sample_subject.id,
                unit_number=5,
                title="Application Layer Protocols & Network Security",
                topics_json=json.dumps(["Domain Name System (DNS)", "HyperText Transfer Protocol (HTTP/1.1, HTTP/2, HTTP/3)", "Email Protocols (SMTP, POP3, IMAP)", "Cryptography Foundations (Symmetric & Asymmetric)", "Transport Layer Security (TLS/HTTPS) and Firewalls"]),
                hours=9
            )
        ]
        db.add_all(units)

        # Course Outcomes
        cos = [
            CourseOutcome(subject_id=sample_subject.id, co_code="CO1", description="Understand network architectures, OSI and TCP/IP protocol stacks.", bloom_level="Understand", unit_number=1, target_attainment_pct=75.0, po_mapping_json=json.dumps({"PO1": 3, "PO2": 2, "PO3": 1})),
            CourseOutcome(subject_id=sample_subject.id, co_code="CO2", description="Analyze data link layer error detection, flow control and MAC protocols.", bloom_level="Analyze", unit_number=2, target_attainment_pct=70.0, po_mapping_json=json.dumps({"PO1": 3, "PO2": 3, "PO3": 2})),
            CourseOutcome(subject_id=sample_subject.id, co_code="CO3", description="Implement IP addressing, subnetting and routing algorithm computations.", bloom_level="Apply", unit_number=3, target_attainment_pct=72.0, po_mapping_json=json.dumps({"PO1": 3, "PO2": 3, "PO3": 3})),
            CourseOutcome(subject_id=sample_subject.id, co_code="CO4", description="Evaluate TCP congestion control mechanisms and end-to-end transport reliability.", bloom_level="Evaluate", unit_number=4, target_attainment_pct=68.0, po_mapping_json=json.dumps({"PO1": 3, "PO2": 2, "PO3": 2})),
            CourseOutcome(subject_id=sample_subject.id, co_code="CO5", description="Design secure application layer interactions using cryptographic protocols.", bloom_level="Create", unit_number=5, target_attainment_pct=70.0, po_mapping_json=json.dumps({"PO1": 3, "PO2": 3, "PO3": 3, "PSO1": 2}))
        ]
        db.add_all(cos)
        db.commit()

    # System configurations
    if not db.query(SystemConfig).filter(SystemConfig.key == "active_ai_provider").first():
        configs = [
            SystemConfig(key="active_ai_provider", value_json=json.dumps({"provider": "gemini", "model": "gemini-1.5-pro"})),
            SystemConfig(key="security_policy", value_json=json.dumps({"mfa_enabled": False, "session_timeout_mins": 1440, "max_upload_mb": 50}))
        ]
        db.add_all(configs)
        db.commit()

    print("[SEED] Production database initialized with Super Admin, Dean, and Faculty institutional accounts.")

