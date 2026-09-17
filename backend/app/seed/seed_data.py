from sqlalchemy.orm import Session
from backend.app.models.models import User, Tenant, SystemConfig
from backend.app.core.security import get_password_hash
import json

def seed_database(db: Session):
    # Ensure default tenant exists
    tenant = db.query(Tenant).filter(Tenant.id == "default_tenant").first()
    if not tenant:
        tenant = Tenant(id="default_tenant", name="Autonomous Institute of Technology")
        db.add(tenant)
        db.commit()

    # Create ONLY ONE Super Admin:
    # Name: "Super Admin", Email: "superadmin@autonomous.edu", Password: "SuperAdmin@2026"
    super_admin = db.query(User).filter(User.email == "superadmin@autonomous.edu").first()
    if not super_admin:
        super_admin = User(
            email="superadmin@autonomous.edu",
            full_name="Super Admin",
            hashed_password=get_password_hash("SuperAdmin@2026"),
            role="SUPER_ADMIN",
            department="Central IT & Institutional Administration",
            institution="Autonomous Institute of Technology",
            designation="Super Administrator",
            tenant_id="default_tenant",
            approval_status="APPROVED",
            is_active=True
        )
        db.add(super_admin)
        db.commit()
    else:
        super_admin.full_name = "Super Admin"
        super_admin.hashed_password = get_password_hash("SuperAdmin@2026")
        super_admin.role = "SUPER_ADMIN"
        super_admin.approval_status = "APPROVED"
        super_admin.is_active = True
        db.commit()

    # System configurations
    if not db.query(SystemConfig).filter(SystemConfig.key == "active_ai_provider").first():
        configs = [
            SystemConfig(key="active_ai_provider", value_json=json.dumps({"provider": "gemini", "model": "gemini-1.5-pro"})),
            SystemConfig(key="security_policy", value_json=json.dumps({"mfa_enabled": False, "session_timeout_mins": 1440, "max_upload_mb": 50}))
        ]
        db.add_all(configs)
        db.commit()

    print("[SEED] Clean database initialized with single Super Admin account ('superadmin@autonomous.edu' / 'SuperAdmin@2026').")
