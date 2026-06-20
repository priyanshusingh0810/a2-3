from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class ColumnMetadata(BaseModel):
    name: str
    data_type: str
    is_numeric: bool
    is_datetime: bool
    null_count: int
    null_percentage: float
    unique_count: int
    mean: Optional[float] = None
    min: Optional[Any] = None
    max: Optional[Any] = None
    description: Optional[str] = None

class DatasetResponse(BaseModel):
    id: str
    name: str
    file_type: str
    row_count: int
    column_count: int
    file_size: int
    business_domain: Optional[str] = None
    summary: Optional[str] = None
    columns_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DatasetPreviewResponse(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int

class DatasetCleanRequest(BaseModel):
    impute_missing: bool = True
    remove_duplicates: bool = True
    handle_outliers: bool = False  # e.g., cap outliers
    drop_empty_columns: bool = False

class AnalysisJobResponse(BaseModel):
    id: int
    dataset_id: str
    status: str
    quality_score: Optional[float] = None
    quality_report: Optional[Dict[str, Any]] = None
    insights: Optional[Dict[str, Any]] = None
    anomalies: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
