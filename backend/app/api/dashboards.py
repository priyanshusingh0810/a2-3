import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.schemas import dashboard as schemas
from app.api import deps

router = APIRouter()
logger = logging.getLogger("a3.api.dashboards")

@router.get("/{dataset_id}", response_model=schemas.DashboardResponse)
def get_dashboard(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Fetches the generated dashboard layout for a dataset."""
    # Validate dataset ownership
    dataset = db.query(models.Dataset).filter(
        models.Dataset.id == dataset_id, 
        models.Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dashboard = db.query(models.Dashboard).filter(models.Dashboard.dataset_id == dataset_id).first()
    if not dashboard:
        raise HTTPException(
            status_code=404, 
            detail="Dashboard not generated yet. Please wait for profiling to complete."
        )
    return dashboard

@router.put("/{dataset_id}", response_model=schemas.DashboardResponse)
def update_dashboard(
    dataset_id: str,
    req: schemas.DashboardCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Updates the grid layout configuration of a dashboard."""
    dataset = db.query(models.Dataset).filter(
        models.Dataset.id == dataset_id, 
        models.Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dashboard = db.query(models.Dashboard).filter(models.Dashboard.dataset_id == dataset_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    # Update layout (extract dict from widgets list)
    dashboard.title = req.title
    dashboard.layout = [w.model_dump() for w in req.layout]
    db.commit()
    db.refresh(dashboard)
    
    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        action="UPDATE_DASHBOARD",
        target_type="dashboard",
        target_id=dataset_id
    )
    db.add(audit)
    db.commit()

    return dashboard
