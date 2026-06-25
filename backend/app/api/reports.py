import os
import logging
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db import models
from app.db.session import get_db
from app.api import deps
from app.config import settings
from app.agents.reporting import ReportingAgent

router = APIRouter()
logger = logging.getLogger("a3.api.reports")

@router.post("/generate", status_code=status.HTTP_201_CREATED)
def generate_report(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Compiles metadata, quality indices, and AI insights to build a downloadable PDF report."""
    # 1. Validate dataset
    dataset = db.query(models.Dataset).filter(
        models.Dataset.id == dataset_id, 
        models.Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # 2. Retrieve completed analysis job
    job = db.query(models.AnalysisJob).filter(
        models.AnalysisJob.dataset_id == dataset_id,
        models.AnalysisJob.status == "completed"
    ).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analytics job is not completed yet. Please wait for profiling to finish."
        )

    # 3. Formulate output path
    report_id = str(uuid.uuid4())
    filename = f"report_{dataset.name.split('.')[0]}_{report_id[:8]}.pdf"
    user_report_dir = os.path.join(settings.REPORT_FOLDER, str(current_user.id))
    os.makedirs(user_report_dir, exist_ok=True)
    report_path = os.path.join(user_report_dir, filename)

    # 4. Extract inputs
    metadata = {
        "business_domain": dataset.business_domain,
        "file_type": dataset.file_type,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "file_size": dataset.file_size,
        "summary": dataset.summary
    }

    # Generate PDF via ReportingAgent
    try:
        ReportingAgent.generate_pdf_report(
            dataset_name=dataset.name,
            metadata=metadata,
            quality_report=job.quality_report or {},
            insights=job.insights or {},
            forecast_commentary=job.insights.get("forecast_commentary") if job.insights else None,
            output_path=report_path
        )
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to compile PDF: {e}")

    # Read compiled PDF file content
    try:
        with open(report_path, "rb") as f:
            report_content = f.read()
    except Exception as e:
        logger.error(f"Failed to read report PDF file: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve compiled PDF report.")

    # 5. Save Report record
    report = models.Report(
        id=report_id,
        dataset_id=dataset_id,
        title=f"Executive Insights Report - {dataset.name}",
        file_path=report_path,
        file_content=report_content,
        format="pdf"
    )
    db.add(report)
    
    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        action="GENERATE_REPORT",
        target_type="report",
        target_id=report_id,
        details={"filename": filename}
    )
    db.add(audit)
    db.commit()
    db.refresh(report)

    return {"report_id": report.id, "title": report.title, "created_at": report.created_at}

@router.get("/list", response_model=List[dict])
def list_reports(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Lists generated reports for a dataset."""
    # Validate dataset
    dataset = db.query(models.Dataset).filter(
        models.Dataset.id == dataset_id, 
        models.Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    reports = db.query(models.Report).filter(models.Report.dataset_id == dataset_id).order_by(models.Report.created_at.desc()).all()
    return [{"id": r.id, "title": r.title, "created_at": r.created_at, "format": r.format} for r in reports]

@router.get("/download/{report_id}")
def download_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """Downloads a compiled report PDF."""
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    # Verify dataset ownership
    dataset = db.query(models.Dataset).filter(
        models.Dataset.id == report.dataset_id, 
        models.Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=403, detail="Access denied")

    from app.services.data_service import DataService
    DataService.ensure_local_file(report.file_path, report.file_content)

    if not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
        
    # Log audit
    audit = models.AuditLog(
        user_id=current_user.id,
        action="DOWNLOAD_REPORT",
        target_type="report",
        target_id=report_id
    )
    db.add(audit)
    db.commit()

    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path)
    )
