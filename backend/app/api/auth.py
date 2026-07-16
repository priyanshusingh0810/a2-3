import datetime
import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
import httpx
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.schemas import auth as schemas
from app.services import security
from app.api import deps

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """Registers a new user."""
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )
    
    hashed_pwd = security.get_password_hash(user_in.password)
    user = models.User(
        email=user_in.email,
        hashed_password=hashed_pwd,
        role="user" # Default role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Write audit log
    audit_log = models.AuditLog(
        user_id=user.id,
        action="USER_REGISTER",
        target_type="user",
        target_id=str(user.id),
        details={"email": user.email}
    )
    db.add(audit_log)
    db.commit()
    
    return user

@router.post("/login", response_model=schemas.Token)
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT tokens."""
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not security.verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )
        
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.id)})
    
    # Audit log
    audit_log = models.AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        target_type="user",
        target_id=str(user.id)
    )
    db.add(audit_log)
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/login-form", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Standard OAuth2 form-compatible login endpoint."""
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password."
        )
    
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/google", response_model=schemas.Token)
def google_auth(req: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    """Verifies the Google access token and logs in/registers the user."""
    try:
        response = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {req.access_token}"},
            timeout=10.0
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Google access token."
            )
        user_info = response.json()
        email = user_info.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account does not provide email."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to authenticate with Google: {str(e)}"
        )

    # Check if user exists
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create user
        random_password = secrets.token_urlsafe(32)
        hashed_pwd = security.get_password_hash(random_password)
        user = models.User(
            email=email,
            hashed_password=hashed_pwd,
            role="user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Audit log for register
        audit_log = models.AuditLog(
            user_id=user.id,
            action="USER_REGISTER",
            target_type="user",
            target_id=str(user.id),
            details={"email": user.email, "method": "google"}
        )
        db.add(audit_log)
        db.commit()
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    # Issue JWT tokens
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.id)})

    # Audit log for login
    audit_log = models.AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        target_type="user",
        target_id=str(user.id),
        details={"method": "google"}
    )
    db.add(audit_log)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(req: schemas.TokenRefreshRequest, db: Session = Depends(get_db)):
    """Refreshes an access token using a valid refresh token."""
    try:
        payload = security.decode_token(req.refresh_token)
        user_id_str = payload.get("sub")
        token_type = payload.get("type")
        
        if user_id_str is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = db.query(models.User).filter(models.User.id == int(user_id_str)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
        
    access_token = security.create_access_token(data={"sub": str(user.id), "role": user.role})
    refresh_token = security.create_refresh_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

def mask_api_key(key: Optional[str]) -> Optional[str]:
    if not key:
        return None
    if len(key) <= 8:
        return "********"
    return f"{key[:4]}...{key[-4:]}"

def mask_llm_keys(keys: Optional[dict]) -> Optional[dict]:
    if not keys:
        return {}
    masked = {}
    for prov, k in keys.items():
        if k:
            masked[prov] = mask_api_key(k)
        else:
            masked[prov] = None
    return masked

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(deps.get_current_user)):
    """Returns the authenticated user details."""
    return schemas.UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        llm_provider=current_user.llm_provider,
        llm_model=current_user.llm_model,
        llm_api_key=mask_api_key(current_user.llm_api_key),
        llm_keys=mask_llm_keys(current_user.llm_keys),
        created_at=current_user.created_at
    )

@router.put("/llm-settings", response_model=schemas.UserResponse)
def update_llm_settings(
    settings_in: schemas.LLMSettingsUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the user's custom LLM settings."""
    current_user.llm_provider = settings_in.llm_provider
    current_user.llm_model = settings_in.llm_model
    
    if settings_in.llm_api_key is not None:
        val = settings_in.llm_api_key.strip()
        if val == "":
            current_user.llm_api_key = None
        elif "*" in val or "..." in val:
            pass
        else:
            current_user.llm_api_key = val
            
    if settings_in.llm_keys is not None:
        merged_keys = dict(current_user.llm_keys or {})
        for prov, val in settings_in.llm_keys.items():
            if val is not None:
                stripped = val.strip()
                if stripped == "":
                    merged_keys[prov] = None
                elif "*" in stripped or "..." in stripped:
                    pass
                else:
                    merged_keys[prov] = stripped
        current_user.llm_keys = merged_keys
            
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # Write audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="UPDATE_LLM_SETTINGS",
        target_type="user",
        target_id=str(current_user.id),
        details={
            "llm_provider": current_user.llm_provider,
            "llm_model": current_user.llm_model
        }
    )
    db.add(audit_log)
    db.commit()
    
    return schemas.UserResponse(
        id=current_user.id,
        email=current_user.email,
        role=current_user.role,
        is_active=current_user.is_active,
        llm_provider=current_user.llm_provider,
        llm_model=current_user.llm_model,
        llm_api_key=mask_api_key(current_user.llm_api_key),
        llm_keys=mask_llm_keys(current_user.llm_keys),
        created_at=current_user.created_at
    )

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    current_user: models.User = Depends(deps.get_current_user),
    token: str = Depends(deps.oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Logs out the user by revoking the current access token."""
    try:
        payload = security.decode_token(token)
        jti = payload.get("jti")
        exp = payload.get("exp")
        
        if jti:
            # Convert exp timestamp to datetime
            expires_at = datetime.datetime.utcfromtimestamp(exp) if exp else datetime.datetime.utcnow() + datetime.timedelta(hours=1)
            
            # Add token to blocklist
            blocked_token = models.TokenBlocklist(
                jti=jti,
                user_id=current_user.id,
                expires_at=expires_at
            )
            db.add(blocked_token)
        
        # Audit log
        audit_log = models.AuditLog(
            user_id=current_user.id,
            action="USER_LOGOUT",
            target_type="user",
            target_id=str(current_user.id)
        )
        db.add(audit_log)
        db.commit()
        
    except Exception:
        # Even if blocklist fails, still return success to let client clear state
        db.rollback()
    
    return {"detail": "Successfully logged out"}
