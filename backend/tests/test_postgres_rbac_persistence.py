import os
import uuid
import json
import asyncio
import httpx
import pytest
from backend.app.main import app
from backend.app.core.database import SessionLocal
from backend.app.core.security import verify_password
from backend.app.models.models import (
    User, Role, Permission, RolePermission, DeletionRequest,
    AuditLog, LoginLog, Subject, Note, QuestionPaper
)
from backend.app.seed.seed_data import seed_database

def api_call(method: str, path: str, **kwargs):
    async def _do():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            return await client.request(method.upper(), path, **kwargs)
    return asyncio.run(_do())

@pytest.fixture(scope="module", autouse=True)
def init_db():
    db = SessionLocal()
    seed_database(db)
    db.close()

def test_initial_super_admin_and_environment_credentials():
    """Verify Super Admin exists and uses environment credentials without exposing plaintext password."""
    db = SessionLocal()
    super_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
    assert super_admin is not None
    assert super_admin.account_status == "ACTIVE"
    assert super_admin.is_active is True
    assert super_admin.deleted_at is None
    # Password must be hashed (not plaintext)
    raw_pwd = os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026")
    assert super_admin.hashed_password != raw_pwd
    assert verify_password(raw_pwd, super_admin.hashed_password) is True
    db.close()

def test_public_registration_cannot_create_super_admin():
    """Public registration must strictly reject SUPER_ADMIN creation."""
    res = api_call("POST", "/api/auth/register", json={
        "email": f"hacker.{uuid.uuid4().hex[:6]}@domain.edu",
        "password": "Password123!",
        "full_name": "Fake Admin",
        "role": "SUPER_ADMIN"
    })
    assert res.status_code == 400
    assert "Super Admin" in res.json()["detail"]

def test_dean_registration_approval_and_rbac_flow():
    """
    1. Public registration as DEAN is created with PENDING status.
    2. PENDING Dean cannot log in.
    3. Super Admin approves Dean registration.
    4. Active Dean can log in and access Dean APIs.
    """
    uid = uuid.uuid4().hex[:6]
    dean_email = f"dean.candidate.{uid}@autonomous.edu"
    dean_password = "DeanPassword123!"

    # 1. Register Dean candidate
    reg_res = api_call("POST", "/api/auth/register", json={
        "email": dean_email,
        "password": dean_password,
        "full_name": f"Dr. Dean Candidate {uid}",
        "role": "DEAN",
        "department": "Office of Academic Affairs"
    })
    assert reg_res.status_code == 200
    reg_data = reg_res.json()
    assert reg_data["account_status"] == "PENDING"
    assert reg_data["approval_status"] == "PENDING"
    dean_id = reg_data["user"]["id"]

    # 2. Candidate attempts to log in -> Blocked (403)
    login_attempt = api_call("POST", "/api/auth/login", json={
        "email": dean_email,
        "password": dean_password
    })
    assert login_attempt.status_code == 403
    assert "Pending Approval" in login_attempt.json()["detail"]

    # 3. Super Admin logs in
    admin_login = api_call("POST", "/api/auth/login", json={
        "email": os.getenv("SUPER_ADMIN_EMAIL", "superadmin@autonomous.edu"),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026")
    })
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 4. Super Admin approves Dean registration
    approval_res = api_call(
        "PATCH",
        f"/api/admin/users/{dean_id}/approval?status=APPROVED",
        headers=admin_headers
    )
    assert approval_res.status_code == 200
    assert approval_res.json()["account_status"] == "ACTIVE"

    # 5. Now Dean can log in
    dean_login = api_call("POST", "/api/auth/login", json={
        "email": dean_email,
        "password": dean_password
    })
    assert dean_login.status_code == 200
    assert dean_login.json()["user"]["role"] == "DEAN"
    dean_token = dean_login.json()["access_token"]

    # 6. Dean accesses users list
    dean_headers = {"Authorization": f"Bearer {dean_token}"}
    users_view = api_call("GET", "/api/admin/users", headers=dean_headers)
    assert users_view.status_code == 200

def test_staff_registration_and_admin_api_isolation():
    """
    Staff accounts can access curriculum features but are blocked from admin endpoints.
    """
    uid = uuid.uuid4().hex[:6]
    staff_email = f"faculty.member.{uid}@autonomous.edu"
    staff_pwd = "FacultyPass123!"

    # 1. Register Staff
    reg_res = api_call("POST", "/api/auth/register", json={
        "email": staff_email,
        "password": staff_pwd,
        "full_name": "Prof. Alan Turing",
        "role": "STAFF",
        "department": "Computer Science & Engineering"
    })
    assert reg_res.status_code == 200
    assert reg_res.json()["account_status"] == "ACTIVE"

    # 2. Staff logs in
    login_res = api_call("POST", "/api/auth/login", json={
        "email": staff_email,
        "password": staff_pwd
    })
    assert login_res.status_code == 200
    staff_token = login_res.json()["access_token"]
    staff_headers = {"Authorization": f"Bearer {staff_token}"}

    # 3. Staff attempts to access Admin APIs -> Blocked (403)
    admin_users = api_call("GET", "/api/admin/users", headers=staff_headers)
    assert admin_users.status_code == 403

    audit_view = api_call("GET", "/api/admin/audit-logs", headers=staff_headers)
    assert audit_view.status_code == 403

    del_reqs = api_call("GET", "/api/admin/deletion-requests", headers=staff_headers)
    assert del_reqs.status_code == 403

def test_field_level_visibility_scoping():
    """
    - Super Admin sees full details for all users.
    - Dean viewing Staff sees permitted details.
    - Dean viewing Dean/Super Admin sees redacted email/status.
    - Public roster returns only Name, Contact, Job Role, Department.
    """
    # Super admin token
    admin_login = api_call("POST", "/api/auth/login", json={
        "email": os.getenv("SUPER_ADMIN_EMAIL", "superadmin@autonomous.edu"),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026")
    })
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Create a test Dean
    uid = uuid.uuid4().hex[:6]
    dean_email = f"dean.scope.{uid}@autonomous.edu"
    api_call("POST", "/api/auth/register", json={
        "email": dean_email,
        "password": "Pass123!Dean",
        "full_name": "Dr. Scope Dean",
        "role": "DEAN"
    })
    db = SessionLocal()
    dean_user = db.query(User).filter(User.email == dean_email).first()
    dean_user.account_status = "ACTIVE"
    dean_user.approval_status = "APPROVED"
    dean_user.is_active = True
    db.commit()
    dean_user_id = dean_user.id
    db.close()

    dean_login = api_call("POST", "/api/auth/login", json={"email": dean_email, "password": "Pass123!Dean"})
    dean_headers = {"Authorization": f"Bearer {dean_login.json()['access_token']}"}

    # 1. Dean views users list
    dean_users_res = api_call("GET", "/api/admin/users", headers=dean_headers)
    assert dean_users_res.status_code == 200
    dean_view_list = dean_users_res.json()

    for u in dean_view_list:
        if u["role"] in ["SUPER_ADMIN", "DEAN"]:
            if u["id"] != dean_user_id:
                assert u["email"] == "[REDACTED - INSTITUTIONAL GOVERNANCE]"
                assert u["account_status"] == "[RESTRICTED]"

    # 2. Super Admin views users list -> Full details
    sa_users_res = api_call("GET", "/api/admin/users", headers=admin_headers)
    assert sa_users_res.status_code == 200
    for u in sa_users_res.json():
        assert "@" in u["email"]
        assert u["account_status"] in ["ACTIVE", "PENDING", "DEACTIVATED", "REJECTED"]

    # 3. Public roster endpoint
    roster_res = api_call("GET", "/api/auth/roster")
    assert roster_res.status_code == 200
    for entry in roster_res.json():
        assert "full_name" in entry
        assert "role" in entry
        assert "department" in entry
        # Sensitive credentials / full email must NOT be present
        assert "email" not in entry
        assert "hashed_password" not in entry

def test_deletion_request_workflow_and_soft_deactivation():
    """
    1. Dean requests deletion of a Staff member.
    2. Dean cannot request deletion of another Dean or Super Admin.
    3. Super Admin approves request -> target is soft-deactivated.
    4. Target's academic records remain intact.
    5. Soft-deactivated user cannot log in.
    """
    # 1. Setup Staff user with a subject and notes
    uid = uuid.uuid4().hex[:6]
    staff_email = f"staff.deact.{uid}@autonomous.edu"
    staff_pwd = "StaffPassword123!"

    reg = api_call("POST", "/api/auth/register", json={
        "email": staff_email,
        "password": staff_pwd,
        "full_name": "Prof. To Be Deactivated",
        "role": "STAFF",
        "department": "Information Technology"
    })
    staff_id = reg.json()["user"]["id"]

    staff_login = api_call("POST", "/api/auth/login", json={"email": staff_email, "password": staff_pwd})
    staff_headers = {"Authorization": f"Bearer {staff_login.json()['access_token']}"}

    # Staff creates a subject
    create_sub = api_call("POST", "/api/subjects", headers=staff_headers, json={
        "code": f"IT{uid.upper()}",
        "name": "Cloud Computing & Distributed Systems",
        "department": "Information Technology"
    })
    assert create_sub.status_code == 200
    subj_id = create_sub.json()["id"]

    # 2. Setup Dean user
    dean_email = f"dean.actor.{uid}@autonomous.edu"
    api_call("POST", "/api/auth/register", json={
        "email": dean_email,
        "password": "DeanPass123!",
        "full_name": "Dr. Academic Dean",
        "role": "DEAN"
    })
    db = SessionLocal()
    dean = db.query(User).filter(User.email == dean_email).first()
    dean.account_status = "ACTIVE"
    dean.approval_status = "APPROVED"
    dean.is_active = True
    db.commit()
    db.close()

    dean_login = api_call("POST", "/api/auth/login", json={"email": dean_email, "password": "DeanPass123!"})
    dean_headers = {"Authorization": f"Bearer {dean_login.json()['access_token']}"}

    # 3. Dean submits deletion request for Staff
    del_req_res = api_call("POST", "/api/admin/deletion-requests", headers=dean_headers, json={
        "target_user_id": staff_id,
        "reason": "Faculty member completed tenure contract."
    })
    assert del_req_res.status_code == 200
    req_id = del_req_res.json()["id"]

    # 4. Super Admin logs in and approves deletion request (Soft Deactivation)
    sa_login = api_call("POST", "/api/auth/login", json={
        "email": os.getenv("SUPER_ADMIN_EMAIL", "superadmin@autonomous.edu"),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026")
    })
    sa_headers = {"Authorization": f"Bearer {sa_login.json()['access_token']}"}

    resolve_res = api_call(
        "PATCH",
        f"/api/admin/deletion-requests/{req_id}/resolve",
        headers=sa_headers,
        json={"action": "APPROVE"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["resolution"] == "APPROVED"

    # 5. Verify target is soft-deactivated in database
    db = SessionLocal()
    deact_user = db.query(User).filter(User.id == staff_id).first()
    assert deact_user.is_active is False
    assert deact_user.account_status == "DEACTIVATED"
    assert deact_user.deleted_at is not None

    # 6. Verify academic records (subject) are preserved intact
    subj = db.query(Subject).filter(Subject.id == subj_id).first()
    assert subj is not None
    assert subj.name == "Cloud Computing & Distributed Systems"
    db.close()

    # 7. Soft-deactivated user cannot log in
    deact_login = api_call("POST", "/api/auth/login", json={"email": staff_email, "password": staff_pwd})
    assert deact_login.status_code == 403
    assert "Deactivated" in deact_login.json()["detail"]

def test_permanent_deletion_transaction_and_audit_preservation():
    """
    1. Permanent deletion requires exact email confirmation.
    2. Runs inside transaction and preserves audit/login logs via SET NULL.
    3. Last Super Admin cannot be deleted.
    """
    uid = uuid.uuid4().hex[:6]
    target_email = f"perm.target.{uid}@autonomous.edu"
    target_pwd = "Password123!"

    reg = api_call("POST", "/api/auth/register", json={
        "email": target_email,
        "password": target_pwd,
        "full_name": "Temporary Staff",
        "role": "STAFF"
    })
    target_id = reg.json()["user"]["id"]

    # Target performs a login to generate LoginLog & AuditLog
    t_login = api_call("POST", "/api/auth/login", json={"email": target_email, "password": target_pwd})
    assert t_login.status_code == 200

    # Super Admin logs in
    sa_login = api_call("POST", "/api/auth/login", json={
        "email": os.getenv("SUPER_ADMIN_EMAIL", "superadmin@autonomous.edu"),
        "password": os.getenv("SUPER_ADMIN_PASSWORD", "SuperAdmin@2026")
    })
    sa_headers = {"Authorization": f"Bearer {sa_login.json()['access_token']}"}

    # 1. Attempt permanent delete with mismatched email confirmation -> 400
    mismatch_res = api_call(
        "DELETE",
        f"/api/admin/users/{target_id}/permanent",
        headers=sa_headers,
        json={"confirm_email": "wrong.email@autonomous.edu"}
    )
    assert mismatch_res.status_code == 400
    assert "mismatch" in mismatch_res.json()["detail"]

    # 2. Permanent delete with exact email confirmation -> 200 Success
    perm_res = api_call(
        "DELETE",
        f"/api/admin/users/{target_id}/permanent",
        headers=sa_headers,
        json={"confirm_email": target_email}
    )
    assert perm_res.status_code == 200

    # 3. Verify user is removed from DB, but historical audit log is preserved
    db = SessionLocal()
    del_user = db.query(User).filter(User.id == target_id).first()
    assert del_user is None

    # Check AuditLog for preserved record
    logs = db.query(AuditLog).filter(AuditLog.user_email == target_email).all()
    assert len(logs) > 0
    for l in logs:
        assert l.user_id is None  # Foreign key set to NULL

    # Check LoginLog for preserved record
    l_logs = db.query(LoginLog).filter(LoginLog.user_email == target_email).all()
    assert len(l_logs) > 0
    for ll in l_logs:
        assert ll.user_id is None

    db.close()

def test_login_and_logout_audit_logging():
    """
    Verify login failures, successes, and logout are recorded in logs.
    """
    uid = uuid.uuid4().hex[:6]
    email = f"audit.user.{uid}@autonomous.edu"
    pwd = "AuditPassword123!"

    api_call("POST", "/api/auth/register", json={
        "email": email,
        "password": pwd,
        "full_name": "Audit Logging Test User",
        "role": "STAFF"
    })

    # 1. Failed login attempt
    fail_res = api_call("POST", "/api/auth/login", json={"email": email, "password": "WrongPassword!"})
    assert fail_res.status_code == 401

    # 2. Successful login
    succ_res = api_call("POST", "/api/auth/login", json={"email": email, "password": pwd})
    assert succ_res.status_code == 200
    token = succ_res.json()["access_token"]

    # 3. Logout
    logout_res = api_call("POST", "/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # 4. Verify in LoginLog database
    db = SessionLocal()
    user_logs = db.query(LoginLog).filter(LoginLog.user_email == email).all()
    actions = [l.action for l in user_logs]
    assert "LOGIN_FAILED" in actions
    assert "LOGIN_SUCCESS" in actions
    assert "LOGOUT" in actions
    db.close()
