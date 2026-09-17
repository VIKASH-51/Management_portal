from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import verify_password, get_password_hash, create_access_token, oauth2_scheme
from backend.app.core.config import settings
from backend.app.models.models import User, AuditLog
from backend.app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from jose import jwt, JWTError

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated")
    return user

def require_role(roles: list):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {roles}"
            )
        return current_user
    return role_checker

@router.post("/register")
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")
    
    # New registrations default to PENDING status and await Admin / Super Admin permit
    req_role = (user_in.role or "FACULTY").upper()
    if req_role not in ["FACULTY", "ADMIN"]:
        req_role = "FACULTY"

    user = User(
        email=user_in.email.strip().lower(),
        full_name=user_in.full_name.strip(),
        hashed_password=get_password_hash(user_in.password),
        role=req_role,
        department=user_in.department or "Department of Engineering",
        institution=user_in.institution or "Autonomous Institute of Technology",
        designation=user_in.designation or ("Academic Dean" if req_role == "ADMIN" else "Faculty Member"),
        approval_status="PENDING",
        is_active=False,
        tenant_id=user_in.tenant_id or f"tenant_{user_in.email.strip().lower().replace('@', '_').replace('.', '_')}"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Log registration audit
    log = AuditLog(
        user_id=user.id,
        tenant_id=user.tenant_id,
        user_email=user.email,
        action="USER_REGISTERED_PENDING",
        resource_type="AUTH",
        resource_id=str(user.id),
        details_json=json.dumps({"role": user.role, "full_name": user.full_name}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()

    return {
        "status": "pending_approval",
        "message": "Registration submitted successfully! Your account is currently pending administrator approval before you can sign in.",
        "approval_status": "PENDING",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
            "institution": user.institution,
            "designation": user.designation,
            "approval_status": user.approval_status,
            "is_active": user.is_active,
            "tenant_id": user.tenant_id,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.strip().lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials: The email address or password entered does not match our records."
        )
    
    if user.approval_status == "PENDING":
        raise HTTPException(
            status_code=403,
            detail="Account Pending Approval: Your account registration is awaiting authorization by the Super Administrator / Dean."
        )
    
    if user.approval_status == "REJECTED":
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Your registration request was rejected by the institutional administration."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account Suspended: Your login access is currently inactive. Please contact the administrator."
        )

    # Record Audit Log
    log = AuditLog(
        user_id=user.id,
        tenant_id=user.tenant_id,
        user_email=user.email,
        action="LOGIN",
        resource_type="AUTH",
        resource_id=str(user.id),
        details_json="{}",
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()

    token = create_access_token(subject=user.id, role=user.role, tenant_id=user.tenant_id)
    return {"access_token": token, "token_type": "bearer", "user": user}

from backend.app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token, UserProfileUpdate
import json

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
@router.put("/me", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
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
    if profile_in.password is not None and profile_in.password.strip():
        current_user.hashed_password = get_password_hash(profile_in.password.strip())
        
    db.commit()
    db.refresh(current_user)
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        user_email=current_user.email,
        action="PROFILE_UPDATED",
        resource_type="USER_PROFILE",
        resource_id=str(current_user.id),
        details_json=json.dumps({"full_name": current_user.full_name, "department": current_user.department}),
        ip_address="127.0.0.1"
    )
    db.add(log)
    db.commit()
    return current_user

@router.post("/switch-role/{role_name}")
def switch_demo_role(role_name: str, db: Session = Depends(get_db)):
    """
    Convenience endpoint for UI role switching (FACULTY, ADMIN, SUPER_ADMIN)
    """
    role_map = {
        "FACULTY": "faculty@autonomous.edu",
        "ADMIN": "admin@autonomous.edu",
        "SUPER_ADMIN": "superadmin@autonomous.edu"
    }
    email = role_map.get(role_name.upper(), "faculty@autonomous.edu")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    token = create_access_token(subject=user.id, role=user.role, tenant_id=user.tenant_id)
    return {"access_token": token, "token_type": "bearer", "user": user}
