import json
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.app.models.models import (
    User, Tenant, SystemConfig, Role, Permission, RolePermission
)
from backend.app.core.security import get_password_hash
from backend.app.core.config import settings

def seed_database(db: Session):
    """
    Non-destructive initialization and migration:
    1. Ensures default tenant exists.
    2. Migrates legacy roles (FACULTY -> STAFF, ADMIN -> DEAN).
    3. Seeds RBAC roles and permissions.
    4. Creates initial Super Admin from environment variables only if no Super Admin exists.
    5. Preserves all existing users, academic records, and audit history.
    """
    # 1. Ensure default tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == "default_tenant").first()
    if not tenant:
        tenant = Tenant(id="default_tenant", name="Autonomous Institute of Technology")
        db.add(tenant)
        db.commit()

    # 2. Seed RBAC Roles
    roles_def = {
        "SUPER_ADMIN": "Super Administrator with complete system governance and authority",
        "DEAN": "Academic Dean & Controller of Examinations with academic governance",
        "STAFF": "Faculty member and academic staff with courseware access"
    }
    roles_map = {}
    for r_name, r_desc in roles_def.items():
        role_obj = db.query(Role).filter(Role.name == r_name).first()
        if not role_obj:
            role_obj = Role(name=r_name, description=r_desc)
            db.add(role_obj)
            db.commit()
            db.refresh(role_obj)
        roles_map[r_name] = role_obj

    # 3. Seed Permissions
    permissions_def = {
        "manage_users": "Full user management and account control",
        "view_users": "View user listings and institutional directory",
        "request_user_deletion": "Submit staff user deletion requests for review",
        "delete_user": "Authorize deletion requests and perform permanent deletion",
        "approve_dean": "Authorize pending Dean registrations",
        "approve_staff": "Authorize pending Staff registrations",
        "view_audit_logs": "Inspect system and security audit logs",
        "manage_curriculum": "Create, edit, and organize academic courses and syllabi",
        "generate_ai_content": "Generate question papers, lecture notes, and answer keys using AI",
        "view_academic_data": "Access subject materials, question banks, and learning analytics"
    }
    perm_map = {}
    for p_code, p_desc in permissions_def.items():
        perm_obj = db.query(Permission).filter(Permission.code == p_code).first()
        if not perm_obj:
            perm_obj = Permission(code=p_code, description=p_desc)
            db.add(perm_obj)
            db.commit()
            db.refresh(perm_obj)
        perm_map[p_code] = perm_obj

    # 4. Map Default Role Permissions
    role_perm_matrix = {
        "SUPER_ADMIN": list(permissions_def.keys()),
        "DEAN": [
            "view_users",
            "request_user_deletion",
            "approve_staff",
            "manage_curriculum",
            "generate_ai_content",
            "view_academic_data"
        ],
        "STAFF": [
            "manage_curriculum",
            "generate_ai_content",
            "view_academic_data"
        ]
    }

    for r_name, p_codes in role_perm_matrix.items():
        role_obj = roles_map[r_name]
        for p_code in p_codes:
            perm_obj = perm_map[p_code]
            rp = db.query(RolePermission).filter(
                RolePermission.role_id == role_obj.id,
                RolePermission.permission_id == perm_obj.id
            ).first()
            if not rp:
                rp = RolePermission(role_id=role_obj.id, permission_id=perm_obj.id)
                db.add(rp)
    db.commit()

    # 5. Non-destructive Migration of Legacy User Roles & Statuses
    # FACULTY -> STAFF, ADMIN -> DEAN
    legacy_users = db.query(User).all()
    for u in legacy_users:
        changed = False
        if u.role == "FACULTY":
            u.role = "STAFF"
            changed = True
        elif u.role == "ADMIN":
            u.role = "DEAN"
            changed = True
        
        # Ensure account_status is populated
        if not getattr(u, "account_status", None):
            u.account_status = "ACTIVE" if u.is_active else "DEACTIVATED"
            changed = True
            
        if not getattr(u, "approval_status", None):
            u.approval_status = "APPROVED" if u.is_active else "PENDING"
            changed = True

        # Link role_id if not linked
        target_role = roles_map.get(u.role)
        if target_role and u.role_id != target_role.id:
            u.role_id = target_role.id
            changed = True

        if changed:
            db.add(u)
    db.commit()

    # 6. Initial Super Admin check: Create ONLY IF no Super Admin exists in the database
    existing_super_admin = db.query(User).filter(User.role == "SUPER_ADMIN").first()
    if not existing_super_admin:
        admin_email = (settings.SUPER_ADMIN_EMAIL or "superadmin@autonomous.edu").strip().lower()
        admin_pwd = settings.SUPER_ADMIN_PASSWORD or "SuperAdmin@2026"
        
        super_admin_role = roles_map["SUPER_ADMIN"]
        initial_admin = User(
            email=admin_email,
            full_name="Super Administrator",
            hashed_password=get_password_hash(admin_pwd),
            role="SUPER_ADMIN",
            role_id=super_admin_role.id,
            department="Central IT & Institutional Governance",
            institution="Autonomous Institute of Technology",
            designation="Super Administrator",
            contact="",
            is_active=True,
            account_status="ACTIVE",
            approval_status="APPROVED",
            tenant_id="default_tenant"
        )
        db.add(initial_admin)
        db.commit()
        print(f"[SEED] Initial Super Admin account initialized for {admin_email}.")

    # 7. System configurations
    if not db.query(SystemConfig).filter(SystemConfig.key == "active_ai_provider").first():
        configs = [
            SystemConfig(key="active_ai_provider", value_json=json.dumps({"provider": "gemini", "model": "gemini-1.5-pro"})),
            SystemConfig(key="security_policy", value_json=json.dumps({"mfa_enabled": False, "session_timeout_mins": 1440, "max_upload_mb": 50}))
        ]
        db.add_all(configs)
        db.commit()

    print("[SEED] Database schema and RBAC roles verified successfully.")
