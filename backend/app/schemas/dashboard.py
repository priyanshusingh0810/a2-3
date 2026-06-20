from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class DashboardWidget(BaseModel):
    id: str
    type: str # 'kpi' or 'chart'
    title: str
    w: int = 4 # grid width
    h: int = 3 # grid height
    x: int = 0
    y: int = 0
    config: Dict[str, Any] # For KPI: value, trend. For Chart: plotly fig JSON

class DashboardCreate(BaseModel):
    title: str
    layout: List[DashboardWidget]

class DashboardResponse(BaseModel):
    id: str
    dataset_id: str
    title: str
    layout: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True
