import asyncio
import uuid
import io
import pytest
import httpx
from backend.app.main import app

def api_call(method: str, path: str, **kwargs):
    async def _do():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            fn = getattr(client, method.lower())
            return await fn(path, **kwargs)
    return asyncio.run(_do())

def test_superadmin_auth_and_registration_approval_hierarchy():
    uid = uuid.uuid4().hex[:6]
    # 1. Super Admin logs in with canonical credentials
    sa_login = api_call("POST", "/api/auth/login", json={
        "email": "superadmin@autonomous.edu",
        "password": "SuperAdmin@2026"
    })
    assert sa_login.status_code == 200, f"Super Admin login failed: {sa_login.text}"
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}
    sa_user = sa_login.json()["user"]
    assert sa_user["role"] == "SUPER_ADMIN"
    assert "Super Admin" in sa_user["full_name"]

    # 2. Register a new Faculty/Staff user (normal registration creates active STAFF)
    fac_email = f"prof.sharma.{uid}@autonomous.edu"
    reg_fac = api_call("POST", "/api/auth/register", json={
        "email": fac_email,
        "password": "SharmaPassword123",
        "full_name": "Dr. R. Sharma",
        "department": "Computer Science & Engineering",
        "institution": "Autonomous Institute of Technology",
        "role": "FACULTY"
    })
    assert reg_fac.status_code == 200
    assert reg_fac.json()["approval_status"] == "APPROVED"
    fac_id = reg_fac.json()["user"]["id"]

    # 3. Active Staff can login directly
    fac_login = api_call("POST", "/api/auth/login", json={
        "email": fac_email,
        "password": "SharmaPassword123"
    })
    assert fac_login.status_code == 200
    fac_token = fac_login.json()["access_token"]
    fac_headers = {"Authorization": f"Bearer {fac_token}"}

    # 6. Faculty edits their own individual profile and updates password
    update_prof = api_call("PUT", "/api/auth/profile", headers=fac_headers, json={
        "full_name": "Dr. R. Sharma, Senior Professor",
        "designation": "Head of Department - AI & DS",
        "password": "NewSharmaPassword456"
    })
    assert update_prof.status_code == 200
    assert update_prof.json()["full_name"] == "Dr. R. Sharma, Senior Professor"
    assert update_prof.json()["designation"] == "Head of Department - AI & DS"

    # 7. Old password fails, new password succeeds
    old_pw_res = api_call("POST", "/api/auth/login", json={
        "email": fac_email,
        "password": "SharmaPassword123"
    })
    assert old_pw_res.status_code == 401

    new_pw_res = api_call("POST", "/api/auth/login", json={
        "email": fac_email,
        "password": "NewSharmaPassword456"
    })
    assert new_pw_res.status_code == 200

    # 8. Register a new Dean / Academic Admin user (DEAN remains PENDING)
    dean_email = f"dean.academics.{uid}@autonomous.edu"
    reg_dean = api_call("POST", "/api/auth/register", json={
        "email": dean_email,
        "password": "DeanPassword123",
        "full_name": "Dr. V. Ramanathan",
        "department": "Academic Administration",
        "institution": "Autonomous Institute of Technology",
        "role": "ADMIN"
    })
    assert reg_dean.status_code == 200
    assert reg_dean.json()["approval_status"] == "PENDING"
    dean_id = reg_dean.json()["user"]["id"]

    # 9. Pending Dean cannot login before approval (403 Pending Approval)
    dean_premature_login = api_call("POST", "/api/auth/login", json={
        "email": dean_email,
        "password": "DeanPassword123"
    })
    assert dean_premature_login.status_code == 403
    assert "Pending Approval" in dean_premature_login.json()["detail"]

    # 10. Faculty cannot access admin routes (403)
    fac_admin_attempt = api_call("GET", "/api/admin/users", headers=fac_headers)
    assert fac_admin_attempt.status_code == 403

    # 11. Super Admin alone approves the Dean user
    approve_dean = api_call("PATCH", f"/api/admin/users/{dean_id}/approval?status=APPROVED", headers=sa_headers)
    assert approve_dean.status_code == 200

    # 11. Approved Dean logs in
    dean_login = api_call("POST", "/api/auth/login", json={
        "email": dean_email,
        "password": "DeanPassword123"
    })
    assert dean_login.status_code == 200
    dean_token = dean_login.json()["access_token"]
    dean_headers = {"Authorization": f"Bearer {dean_token}"}

    # 12. Dean tries to approve another Dean -> blocked (403)
    reg_dean2 = api_call("POST", "/api/auth/register", json={
        "email": f"dean.coe.{uid}@autonomous.edu",
        "password": "CoePassword123",
        "full_name": "Dr. M. Swaminathan",
        "role": "ADMIN"
    })
    dean2_id = reg_dean2.json()["user"]["id"]

    dean_cross_approval = api_call("PATCH", f"/api/admin/users/{dean2_id}/approval?status=APPROVED", headers=dean_headers)
    assert dean_cross_approval.status_code == 403
    assert "Only Super Admin" in dean_cross_approval.json()["detail"]

def test_syllabus_file_and_text_extraction():
    # 1. Login as Super Admin
    sa_login = api_call("POST", "/api/auth/login", json={
        "email": "superadmin@autonomous.edu",
        "password": "SuperAdmin@2026"
    })
    sa_token = sa_login.json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # 2. Test raw syllabus text parsing
    syllabus_sample = """
    ANNA UNIVERSITY :: CHENNAI - 600 025
    AFFILIATED INSTITUTIONS
    R-2021 B.E. COMPUTER SCIENCE AND ENGINEERING
    CS3491 CRYPTOGRAPHY AND NETWORK SECURITY
    SEMESTER V
    ACADEMIC YEAR 2025-2026
    
    COURSE OBJECTIVES:
    To understand the mathematical foundations of security, symmetric and asymmetric cryptography, and network defense protocols.

    UNIT I INTRODUCTION TO SECURITY & SYMMETRIC CIPHERS
    Security Trends - OSI Security Architecture - Attacks, Services and Mechanisms - Classical Encryption Techniques (Substitution & Transposition) - Block Ciphers - Data Encryption Standard (DES) - Advanced Encryption Standard (AES).

    UNIT II ASYMMETRIC CRYPTOGRAPHY & KEY EXCHANGE
    Number Theory Basics - Fermat's and Euler's Theorems - RSA Algorithm - Diffie-Hellman Key Exchange - Elliptic Curve Cryptography (ECC).

    UNIT III AUTHENTICATION & HASH FUNCTIONS
    Authentication Requirements & Functions - Message Authentication Codes (MAC) - Secure Hash Algorithm (SHA-512) - Digital Signatures - DSS - Kerberos.

    UNIT IV NETWORK SECURITY PROTOCOLS
    IPsec Architecture - AH and ESP - Transport Layer Security (TLS 1.3) - Pretty Good Privacy (PGP) - S/MIME.

    UNIT V SYSTEM SECURITY & FIREWALLS
    Intrusion Detection Systems (IDS) - Malicious Software - Firewalls Types and Configurations - Zero Trust Architecture.
    """

    res_parse = api_call("POST", "/api/subjects/parse-syllabus-text", headers=sa_headers, json={"raw_text": syllabus_sample})
    assert res_parse.status_code == 200
    data = res_parse.json()
    assert data["code"] == "CS3491"
    assert "CRYPTOGRAPHY AND NETWORK SECURITY" in data["name"]
    assert data["regulation"] == "R2021"
    assert data["semester"] == "V"
    assert len(data["units"]) == 5
    assert "code" in data["found_fields"]
    assert "name" in data["found_fields"]
    assert "units" in data["found_fields"]

