import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token, oauth2_scheme
from backend.app.core.config import settings
from backend.app.models.models import (
    User, AuditLog, LoginLog, Role, Permission, RolePermission, UserPermission
)
from backend.app.schemas.schemas import (
    UserCreate, UserLogin, UserResponse, Token, UserProfileUpdate, PublicRosterUserResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])

def get_user_effective_permissions(user: User, db: Session) -> List[str]:
    """Returns the set of permission codes for a user based on their role and custom permissions."""
    if user.role == "SUPER_ADMIN":
        # Super admin has all permissions
        all_perms = db.query(Permission).all()
        return [p.code for p in all_perms]
    
    perms = set()
    # 1. Role permissions
    if user.role_id:
        role_perms = (
            db.query(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id == user.role_id)
            .all()
        )
        for (code,) in role_perms:
            perms.add(code)
    else:
        # Fallback by role string if role_id is unset
        role_obj = db.query(Role).filter(Role.name == user.role).first()
        if role_obj:
            role_perms = (
                db.query(Permission.code)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .filter(RolePermission.role_id == role_obj.id)
                .all()
            )
            for (code,) in role_perms:
                perms.add(code)

    # 2. Custom User permissions
    user_perms = (
        db.query(Permission.code)
        .join(UserPermission, UserPermission.permission_id == Permission.id)
        .filter(UserPermission.user_id == user.id)
        .all()
    )
    for (code,) in user_perms:
        perms.add(code)

    return sorted(list(perms))

def serialize_user_response(user: User, db: Session) -> UserResponse:
    perms = get_user_effective_permissions(user, db)
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department or "",
        institution=user.institution or "",
        designation=user.designation or "",
        contact=user.contact or "",
        is_active=user.is_active,
        account_status=user.account_status or "ACTIVE",
        approval_status=user.approval_status or "APPROVED",
        deleted_at=user.deleted_at,
        tenant_id=user.tenant_id or "default_tenant",
        created_at=user.created_at,
        permissions=perms
    )

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session token")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")

    # Active-account validation:
    # 1. is_active == True
    # 2. deleted_at IS NULL
    # 3. account_status == ACTIVE
    if not user.is_active or user.deleted_at is not None or (user.account_status and user.account_status != "ACTIVE"):
        status_msg = "User account is deactivated or inactive."
        if user.account_status == "PENDING" or user.approval_status == "PENDING":
            status_msg = "Account registration is pending Super Admin authorization."
        elif user.account_status == "REJECTED":
            status_msg = "Account registration was rejected."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=status_msg
        )

    return user

def require_role(roles: list):
    """Enforces role membership on the backend."""
    # Normalize roles (e.g. FACULTY -> STAFF, ADMIN -> DEAN)
    normalized_allowed = set()
    for r in roles:
        r_up = r.upper()
        if r_up == "FACULTY":
            normalized_allowed.add("STAFF")
        elif r_up == "ADMIN":
            normalized_allowed.add("DEAN")
        else:
            normalized_allowed.add(r_up)

    def role_checker(current_user: User = Depends(get_current_user)):
        user_role = current_user.role.upper()
        if user_role == "FACULTY":
            user_role = "STAFF"
        elif user_role == "ADMIN":
            user_role = "DEAN"

        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {sorted(list(normalized_allowed))}"
            )
        return current_user
    return role_checker

def require_permission(permission_code: str):
    """Enforces specific RBAC permission on the backend."""
    def permission_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        if current_user.role == "SUPER_ADMIN":
            return current_user
        perms = get_user_effective_permissions(current_user, db)
        if permission_code not in perms:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Missing required permission: {permission_code}"
            )
        return current_user
    return permission_checker

@router.post("/register")
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    clean_email = user_in.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    
    # Check requested role: Public registration must NEVER create SUPER_ADMIN
    req_role = (user_in.role or "STAFF").upper()
    if req_role in ["SUPER_ADMIN", "SUPERADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public registration cannot create Super Admin accounts."
        )

    # Resolve role entity
    if req_role in ["ADMIN", "DEAN"]:
        target_role_name = "DEAN"
        # DEAN registration must remain PENDING until explicitly approved by SUPER_ADMIN
        account_status = "PENDING"
        approval_status = "PENDING"
        is_active = False
        default_designation = "Academic Dean (Pending Approval)"
    else:
        target_role_name = "STAFF"
        # Normal registration creates active STAFF
        account_status = "ACTIVE"
        approval_status = "APPROVED"
        is_active = True
        default_designation = "Faculty Member"

    role_entity = db.query(Role).filter(Role.name == target_role_name).first()

    user = User(
        email=clean_email,
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=target_role_name,
        role_id=role_entity.id if role_entity else None,
        department=user_in.department.strip() if user_in.department else "Computer Science & Engineering",
        institution=user_in.institution.strip() if user_in.institution else "Autonomous Institute of Technology",
        designation=user_in.designation.strip() if user_in.designation else default_designation,
        contact=user_in.contact.strip() if user_in.contact else "",
        account_status=account_status,
        approval_status=approval_status,
        is_active=is_active,
        tenant_id=user_in.tenant_id or "default_tenant"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log registration audit event
    client_ip = request.client.host if request.client else "127.0.0.1"
    audit_action = "USER_REGISTERED_PENDING_DEAN" if target_role_name == "DEAN" else "USER_REGISTERED_STAFF"
    log = AuditLog(
        user_id=user.id,
        tenant_id=user.tenant_id,
        user_email=user.email,
        action=audit_action,
        resource_type="AUTH",
        resource_id=str(user.id),
        details_json=json.dumps({"role": user.role, "full_name": user.full_name, "account_status": user.account_status}),
        ip_address=client_ip
    )
    db.add(log)
    db.commit()

    if target_role_name == "DEAN":
        return {
            "status": "pending_approval",
            "message": "Dean registration submitted successfully. Your account is pending authorization by the Super Administrator before you can sign in.",
            "approval_status": "PENDING",
            "account_status": "PENDING",
            "user": serialize_user_response(user, db)
        }
    else:
        return {
            "status": "active",
            "message": "Staff registration successful. You may now log in to the portal.",
            "approval_status": "APPROVED",
            "account_status": "ACTIVE",
            "user": serialize_user_response(user, db)
        }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    clean_email = login_data.email.strip().lower()
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")

    user = db.query(User).filter(User.email == clean_email).first()

    if not user or not verify_password(login_data.password, user.hashed_password):
        # Record failed login log
        fail_log = LoginLog(
            user_id=user.id if user else None,
            user_email=clean_email,
            action="LOGIN_FAILED",
            ip_address=client_ip,
            user_agent=user_agent[:255],
            details_json=json.dumps({"reason": "Invalid email or password"})
        )
        db.add(fail_log)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: The email address or password entered does not match our records."
        )

    # Active-account validation
    if user.account_status == "PENDING" or user.approval_status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account Pending Approval: Your account registration is awaiting authorization by the Super Administrator."
        )

    if user.account_status == "REJECTED" or user.approval_status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your registration request was rejected by institutional administration."
        )

    if not user.is_active or user.deleted_at is not None or user.account_status == "DEACTIVATED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account Deactivated: Your login access has been deactivated. Please contact the Super Administrator."
        )

    # Record successful LoginLog & AuditLog
    success_log = LoginLog(
        user_id=user.id,
        user_email=user.email,
        action="LOGIN_SUCCESS",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        details_json=json.dumps({"role": user.role})
    )
    audit = AuditLog(
        user_id=user.id,
        tenant_id=user.tenant_id,
        user_email=user.email,
        action="LOGIN",
        resource_type="AUTH",
        resource_id=str(user.id),
        details_json="{}",
        ip_address=client_ip
    )
    db.add(success_log)
    db.add(audit)
    db.commit()

    token = create_access_token(subject=user.id, role=user.role, tenant_id=user.tenant_id)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": serialize_user_response(user, db)
    }

@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "")

    # Record logout in LoginLog & AuditLog
    logout_log = LoginLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="LOGOUT",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        details_json="{}"
    )
    audit = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="LOGOUT",
        resource_type="AUTH",
        resource_id=str(current_user.id),
        details_json="{}",
        ip_address=client_ip
    )
    db.add(logout_log)
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return serialize_user_response(current_user, db)

@router.put("/profile", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_in.full_name is not None and profile_in.full_name.strip():
        current_user.full_name = profile_in.full_name.strip()
    if profile_in.department is not None:
        current_user.department = profile_in.department.strip()
    if profile_in.institution is not None:
        current_user.institution = profile_in.institution.strip()
    if profile_in.designation is not None:
        current_user.designation = profile_in.designation.strip()
    if profile_in.contact is not None:
        current_user.contact = profile_in.contact.strip()
    if profile_in.password is not None and profile_in.password.strip():
        current_user.hashed_password = get_password_hash(profile_in.password.strip())
        
    db.commit()
    db.refresh(current_user)
    
    # Audit log
    client_ip = request.client.host if request.client else "127.0.0.1"
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="PROFILE_UPDATED",
        resource_type="USER_PROFILE",
        resource_id=str(current_user.id),
        details_json=json.dumps({"full_name": current_user.full_name, "department": current_user.department}),
        ip_address=client_ip
    )
    db.add(log)
    db.commit()
    return serialize_user_response(current_user, db)

@router.get("/roster", response_model=List[PublicRosterUserResponse])
def get_public_roster(db: Session = Depends(get_db)):
    """
    Returns field-restricted directory (Name, Contact, Job Role, Department only)
    for active non-deleted users.
    """
    users = (
        db.query(User)
        .filter(User.is_active == True, User.deleted_at.is_(None), User.account_status == "ACTIVE")
        .order_by(User.full_name.asc())
        .all()
    )
    return [
        PublicRosterUserResponse(
            id=u.id,
            full_name=u.full_name,
            contact=u.contact or "",
            role=u.role,
            designation=u.designation or "",
            department=u.department or ""
        )
        for u in users
    ]
