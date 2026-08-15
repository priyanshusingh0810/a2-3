from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

# Workflow Node Schemas
class WorkflowNodeBase(BaseModel):
    name: str
    action_type: str
    params: Dict[str, Any] = Field(default_factory=dict)
    depends_on: List[str] = Field(default_factory=list)

class WorkflowNodeCreate(WorkflowNodeBase):
    id: str # allow client to specify ID for node linkage

class WorkflowNodeOut(WorkflowNodeBase):
    id: str
    workflow_id: str

    class Config:
        from_attributes = True

# Workflow Definition Schemas
class WorkflowDefinitionBase(BaseModel):
    name: str
    description: Optional[str] = None

class WorkflowCreate(WorkflowDefinitionBase):
    nodes: List[WorkflowNodeCreate] = Field(default_factory=list)

class WorkflowUpdate(WorkflowDefinitionBase):
    pass

class WorkflowOut(WorkflowDefinitionBase):
    id: str
    owner_id: int
    created_at: datetime
    updated_at: datetime
    nodes: List[WorkflowNodeOut] = Field(default_factory=list)

    class Config:
        from_attributes = True

# Workflow Run Schemas
class WorkflowNodeRunOut(BaseModel):
    id: str
    workflow_run_id: str
    node_id: str
    status: str
    result_data: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class WorkflowRunOut(BaseModel):
    id: str
    workflow_id: str
    dataset_id: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    node_runs: List[WorkflowNodeRunOut] = Field(default_factory=list)

    class Config:
        from_attributes = True
