import os
import uuid
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.schemas import dataset as schemas
from app.api import deps
from app.config import settings
from app.services.data_service import DataService
from app.agents.orchestrator import AgentOrchestrator

router = APIRouter()
logger = logging.getLogger("a3.api.datasets")

@router.post("/upload", response_model=schemas.DatasetResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Uploads a dataset file (CSV/XLSX/JSON) and schedules background AI profiling."""
    filename = file.filename
    ext = filename.split(".")[-1].lower()
    
    if ext not in ["csv", "xlsx", "xls", "json"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload CSV, Excel, or JSON."
        )

    # Isolated secure path
    dataset_id = str(uuid.uuid4())
    save_filename = f"{dataset_id}.{ext}"
    user_upload_dir = os.path.join(settings.UPLOAD_FOLDER, str(current_user.id))
    os.makedirs(user_upload_dir, exist_ok=True)
    file_path = os.path.join(user_upload_dir, save_filename)

    # Stream write to prevent high memory usage
    try:
        file_size = 0
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024): # 1MB chunks
                file_size += len(chunk)
                buffer.write(chunk)
    except Exception as e:
        logger.error(f"Failed to write file stream: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.")

    # Read file content for persistent storage in DB
    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
    except Exception as e:
        logger.error(f"Failed to read file for storage: {e}")
        raise HTTPException(status_code=500, detail="Failed to process uploaded file.")

    # 2. Get quick initial counts
    try:
        df_sample = DataService.load_df(file_path, ext, limit=10)
        row_count = len(DataService.load_df(file_path, ext))
        col_count = len(df_sample.columns)
    except Exception as e:
        # Cleanup file if invalid
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Uploaded file is corrupt or unparseable. Error: {str(e)}"
        )

    # 3. Create Dataset Record
    dataset = models.Dataset(
        id=dataset_id,
        name=filename,
        file_path=file_path,
        file_type=ext,
        file_content=file_content,
        row_count=row_count,
        column_count=col_count,
        file_size=file_size,
        owner_id=current_user.id
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # 4. Create Profiling Job
    job = models.AnalysisJob(
        dataset_id=dataset_id,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # 5. Write audit log
    audit_log = models.AuditLog(
        user_id=current_user.id,
        action="UPLOAD_DATASET",
        target_type="dataset",
        target_id=dataset_id,
        details={"name": filename, "size": file_size}
    )
    db.add(audit_log)
    db.commit()

    # 6. Schedule Background task
    background_tasks.add_task(
        AgentOrchestrator.run_full_profiling,
        db=db,
        dataset_id=dataset_id,
        job_id=job.id
    )

    return dataset

@router.get("/", response_model=List[schemas.DatasetResponse])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists all datasets owned by the current user."""
    return db.query(models.Dataset).filter(models.Dataset.owner_id == current_user.id).order_by(models.Dataset.created_at.desc()).all()

@router.get("/{id}", response_model=schemas.DatasetResponse)
def get_dataset(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Fetches details of a specific dataset."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@router.get("/{id}/preview", response_model=schemas.DatasetPreviewResponse)
def get_dataset_preview(
    id: str,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Retrieves preview rows for rendering data grids."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        DataService.ensure_local_file(dataset.file_path, dataset.file_content)
        cols, rows, total = DataService.get_preview(dataset.file_path, dataset.file_type, limit=limit)
        return {
            "columns": cols,
            "rows": rows,
            "total_rows": total
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load preview data: {str(e)}")

@router.get("/{id}/job", response_model=schemas.AnalysisJobResponse)
def get_dataset_job(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Retrieves current profiling job status and reports."""
    # Ensure dataset owned by user
    dataset = db.query(models.Dataset).filter(models.Dataset.id == id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    job = db.query(models.AnalysisJob).filter(models.AnalysisJob.dataset_id == id).order_by(models.AnalysisJob.created_at.desc()).first()
    if not job:
        raise HTTPException(status_code=404, detail="Analysis job not found")
    return job

@router.post("/{id}/clean", response_model=schemas.DatasetResponse)
def clean_dataset(
    id: str,
    clean_params: schemas.DatasetCleanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Applies specific cleaning operations and overwrites or saves a cleaned dataset copy."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        # Create a cleaned version path
        cleaned_id = str(uuid.uuid4())
        cleaned_filename = f"cleaned_{dataset.name}"
        save_filename = f"{cleaned_id}.{dataset.file_type}"
        user_upload_dir = os.path.join(settings.UPLOAD_FOLDER, str(current_user.id))
        cleaned_file_path = os.path.join(user_upload_dir, save_filename)

        DataService.ensure_local_file(dataset.file_path, dataset.file_content)
        new_rows, new_cols = DataService.clean_dataset(
            file_path=dataset.file_path,
            file_type=dataset.file_type,
            params=clean_params.model_dump(),
            output_path=cleaned_file_path
        )

        with open(cleaned_file_path, "rb") as f:
            cleaned_content = f.read()

        # Create new dataset entry
        cleaned_dataset = models.Dataset(
            id=cleaned_id,
            name=cleaned_filename,
            file_path=cleaned_file_path,
            file_type=dataset.file_type,
            file_content=cleaned_content,
            row_count=new_rows,
            column_count=new_cols,
            file_size=os.path.getsize(cleaned_file_path),
            owner_id=current_user.id,
            business_domain=dataset.business_domain,
            summary=f"Cleaned version of dataset: {dataset.name}"
        )
        db.add(cleaned_dataset)
        db.commit()
        db.refresh(cleaned_dataset)

        # Create instant analysis job for cleaned dataset
        job = models.AnalysisJob(
            dataset_id=cleaned_id,
            status="completed",
            quality_score=100.0, # Cleaned
            quality_report={"score": 100.0, "issues": [], "recommendations": []},
            insights={"key_findings": ["This dataset is cleaned and ready. Run conversational analysis or forecasts."], "business_opportunities": [], "risks": []}
        )
        db.add(job)

        # Audit log
        audit = models.AuditLog(
            user_id=current_user.id,
            action="CLEAN_DATASET",
            target_type="dataset",
            target_id=id,
            details=clean_params.model_dump()
        )
        db.add(audit)
        db.commit()

        return cleaned_dataset

    except Exception as e:
        logger.error(f"Data cleaning failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute data cleaning: {str(e)}")

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_dataset(
    id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Deletes dataset entry and cleans up files from disk."""
    dataset = db.query(models.Dataset).filter(models.Dataset.id == id, models.Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        # File deletion
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
    except Exception as e:
        logger.warning(f"Could not delete file at {dataset.file_path}: {e}")

    # Delete dashboard, report files if exist
    dashboard = db.query(models.Dashboard).filter(models.Dashboard.dataset_id == id).first()
    if dashboard:
        db.delete(dashboard)
        
    reports = db.query(models.Report).filter(models.Report.dataset_id == id).all()
    for report in reports:
        try:
            if os.path.exists(report.file_path):
                os.remove(report.file_path)
        except Exception:
            pass
        db.delete(report)

    db.delete(dataset)
    db.commit()
    return None
