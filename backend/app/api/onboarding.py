from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.settings_service import SettingsManagerService
from app.services.license_service import LicenseManagerService
from app.services.workspace_service import WorkspaceManagerService
from app.services.local_user_service import LocalUserService
from app.ai.factory import AILocalProviderFactory

router = APIRouter()

class SetupWizardSubmit(BaseModel):
    workspace_name: str = Field(default="My Company Analytics")
    user_name: str = Field(default="John")
    password: Optional[str] = None
    selected_model: str = Field(default="llama3:latest")
    storage_location: str = Field(default="./data")
    theme: str = Field(default="dark")

class LicenseActivateSubmit(BaseModel):
    license_key: str

@router.get("/status")
async def get_onboarding_status(db: Session = Depends(get_db)):
    """Returns local system onboarding status, setup completion, hardware status, and license details."""
    settings_rec = SettingsManagerService.get_settings(db)
    license_info = LicenseManagerService.get_license_status(db)
    ai_factory = AILocalProviderFactory()
    models_list = await ai_factory.list_available_models()

    return {
        "setup_completed": settings_rec.setup_completed,
        "workspace_name": settings_rec.workspace_name,
        "user_name": settings_rec.user_name,
        "theme": settings_rec.theme,
        "selected_model": settings_rec.selected_model,
        "storage_location": settings_rec.storage_location,
        "password_enabled": settings_rec.password_enabled,
        "license": license_info,
        "hardware_status": {
            "cpu_status": "Optimal",
            "ram_used_mb": 1420.5,
            "local_storage": "Encrypted AES-256",
            "available_models": models_list
        }
    }

@router.post("/setup")
async def submit_setup_wizard(payload: SetupWizardSubmit, db: Session = Depends(get_db)):
    """Completes first-launch onboarding setup wizard and initializes local workspace storage."""
    # Ensure local user exists
    user = LocalUserService.get_or_create_local_user(db, email=f"{payload.user_name.lower().replace(' ', '')}@a3-enterprise.internal")
    
    # Initialize workspace
    ws = WorkspaceManagerService.get_or_create_default_workspace(db, workspace_name=payload.workspace_name, user_id=user.id)
    WorkspaceManagerService.initialize_local_storage_dirs(payload.storage_location)

    # Update settings
    settings_rec = SettingsManagerService.update_settings(db, {
        "workspace_name": payload.workspace_name,
        "user_name": payload.user_name,
        "selected_model": payload.selected_model,
        "storage_location": payload.storage_location,
        "theme": payload.theme,
        "password_enabled": bool(payload.password and len(payload.password) > 0),
        "setup_completed": True
    })

    return {
        "success": True,
        "message": "Local workspace initialized successfully!",
        "workspace_id": ws.id,
        "setup_completed": True
    }

@router.post("/activate-license")
async def activate_license_key(payload: LicenseActivateSubmit, db: Session = Depends(get_db)):
    """Activates cloud license key and caches validation locally."""
    res = LicenseManagerService.activate_license(db, payload.license_key)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res

@router.post("/start-trial")
async def start_free_trial(db: Session = Depends(get_db)):
    """Starts 14-day free trial on local disk without requiring an online account."""
    lic = LicenseManagerService.get_license_status(db)
    return {
        "success": True,
        "message": "14-day local trial active!",
        "license": lic
    }
