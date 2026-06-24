import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
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

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(deps.get_current_user)):
    """Returns the authenticated user details."""
    return current_user

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
