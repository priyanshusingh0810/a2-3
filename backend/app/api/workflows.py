import uuid
from typing import List, Any, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.db.models import User, WorkflowDefinition, WorkflowNode, WorkflowRun, WorkflowNodeRun, Dataset
from app.schemas.workflow import WorkflowCreate, WorkflowOut, WorkflowRunOut, WorkflowUpdate
from app.workflow.runner import EnterpriseWorkflowRunner
from app.workflow.engine import WorkflowStep
from pydantic import BaseModel

class TemplateRequest(BaseModel):
    template_title: str
    dataset_id: str

router = APIRouter()
runner = EnterpriseWorkflowRunner()

@router.post("/", response_model=WorkflowOut)
def create_workflow(workflow_in: WorkflowCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workflow_id = str(uuid.uuid4())
    workflow = WorkflowDefinition(
        id=workflow_id,
        name=workflow_in.name,
        description=workflow_in.description,
        owner_id=current_user.id
    )
    db.add(workflow)
    db.commit()

    for node_in in workflow_in.nodes:
        node = WorkflowNode(
            id=node_in.id or str(uuid.uuid4()),
            workflow_id=workflow_id,
            name=node_in.name,
            action_type=node_in.action_type,
            params=node_in.params,
            depends_on=node_in.depends_on
        )
        db.add(node)
    
    db.commit()
    db.refresh(workflow)
    return workflow

@router.get("/", response_model=List[WorkflowOut])
def list_workflows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(WorkflowDefinition).filter(WorkflowDefinition.owner_id == current_user.id).all()

@router.get("/{workflow_id}", response_model=WorkflowOut)
def get_workflow(workflow_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id, WorkflowDefinition.owner_id == current_user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

def execute_workflow_bg(workflow_id: str, dataset_id: str, run_id: str, db: Session):
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id).first()
    if not workflow:
        return
    
    # Create workflow steps
    steps = []
    for node in workflow.nodes:
        steps.append(WorkflowStep(
            id=node.id,
            name=node.name,
            action_type=node.action_type,
            params=node.params,
            depends_on=node.depends_on
        ))
    
    def progress_callback(node_id: str, status: str, result_data: Any, error_msg: str):
        node_run = db.query(WorkflowNodeRun).filter(WorkflowNodeRun.workflow_run_id == run_id, WorkflowNodeRun.node_id == node_id).first()
        if not node_run:
            node_run = WorkflowNodeRun(
                id=str(uuid.uuid4()),
                workflow_run_id=run_id,
                node_id=node_id,
                status=status,
                started_at=datetime.utcnow() if status == "running" else None
            )
            db.add(node_run)
        
        node_run.status = status
        if status in ["completed", "failed"]:
            node_run.completed_at = datetime.utcnow()
            node_run.result_data = result_data
            node_run.error_message = error_msg
        
        db.commit()

    try:
        run_record = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
        run_record.status = "running"
        run_record.started_at = datetime.utcnow()
        db.commit()

        initial_context = {"dataset_id": dataset_id}
        result = runner.run(workflow_id, steps, initial_context, progress_callback=progress_callback)

        run_record = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
        run_record.status = "completed" if result.success else "failed"
        run_record.completed_at = datetime.utcnow()
        run_record.error_message = result.error
        db.commit()
    except Exception as e:
        run_record = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
        if run_record:
            run_record.status = "failed"
            run_record.completed_at = datetime.utcnow()
            run_record.error_message = str(e)
            db.commit()


@router.post("/{workflow_id}/run", response_model=WorkflowRunOut)
def run_workflow(workflow_id: str, dataset_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id, WorkflowDefinition.owner_id == current_user.id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
        
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    run_id = str(uuid.uuid4())
    run = WorkflowRun(
        id=run_id,
        workflow_id=workflow.id,
        dataset_id=dataset.id,
        status="pending"
    )
    db.add(run)
    
    # Initialize node runs as pending
    for node in workflow.nodes:
        node_run = WorkflowNodeRun(
            id=str(uuid.uuid4()),
            workflow_run_id=run_id,
            node_id=node.id,
            status="pending"
        )
        db.add(node_run)

    db.commit()
    db.refresh(run)

    background_tasks.add_task(execute_workflow_bg, workflow_id, dataset_id, run_id, db)
    
    return run

@router.get("/runs/{run_id}", response_model=WorkflowRunOut)
def get_workflow_run(run_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(WorkflowRun).filter(WorkflowRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Workflow run not found")
        
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == run.workflow_id).first()
    if workflow.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return run

@router.post("/template", response_model=WorkflowRunOut)
def run_template(req: TemplateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.owner_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    workflow_id = str(uuid.uuid4())
    
    # Template logic
    nodes = []
    if req.template_title == "Retail Margins Audit":
        nodes = [
            {"id": "n1", "name": "Audit Sales Logs", "action": "clean_data", "depends": []},
            {"id": "n2", "name": "Detect Margin Outliers", "action": "analyze_outliers", "depends": ["n1"]},
            {"id": "n3", "name": "Compile Conversion Tracking", "action": "generate_report", "depends": ["n2"]}
        ]
    elif req.template_title == "Financial Transactions Ledger":
        nodes = [
            {"id": "n1", "name": "Check Corporate Indices", "action": "profiling", "depends": []},
            {"id": "n2", "name": "Review Cash Flows", "action": "financial_analysis", "depends": ["n1"]},
            {"id": "n3", "name": "Portfolio Audit", "action": "generate_report", "depends": ["n2"]}
        ]
    elif req.template_title == "Patient Log Wait Times":
        nodes = [
            {"id": "n1", "name": "Inspect Wait Boundaries", "action": "clean_data", "depends": []},
            {"id": "n2", "name": "Admission Rate Forecast", "action": "predictive_modeling", "depends": ["n1"]},
            {"id": "n3", "name": "Resource Suggestions", "action": "generate_report", "depends": ["n2"]}
        ]
    elif req.template_title == "SaaS Subscriber Churn Model":
        nodes = [
            {"id": "n1", "name": "K-Means Cohort Grouping", "action": "clustering", "depends": []},
            {"id": "n2", "name": "Usage Rate Audit", "action": "profiling", "depends": ["n1"]},
            {"id": "n3", "name": "Churn Indication Report", "action": "generate_report", "depends": ["n2"]}
        ]
    elif req.template_title == "HR Task Speed Scorecard":
        nodes = [
            {"id": "n1", "name": "Speed Milestones", "action": "profiling", "depends": []},
            {"id": "n2", "name": "Workflow Locks Detection", "action": "analyze_outliers", "depends": ["n1"]},
            {"id": "n3", "name": "Hiring Plan Details", "action": "generate_report", "depends": ["n2"]}
        ]
    else:
        # Generic Template
        nodes = [
            {"id": "n1", "name": f"{req.template_title} Init", "action": "profiling", "depends": []},
            {"id": "n2", "name": "Core Analysis", "action": "statistical_analysis", "depends": ["n1"]},
            {"id": "n3", "name": "Final Briefing", "action": "generate_report", "depends": ["n2"]}
        ]

    workflow = WorkflowDefinition(
        id=workflow_id,
        name=req.template_title,
        description=f"Auto-generated workflow for {req.template_title}",
        owner_id=current_user.id
    )
    db.add(workflow)
    db.commit()

    for n in nodes:
        node = WorkflowNode(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            name=n["name"],
            action_type=n["action"],
            params={},
            depends_on=n["depends"]
        )
        db.add(node)
    
    db.commit()
    db.refresh(workflow)

    # Now run it
    run_id = str(uuid.uuid4())
    run = WorkflowRun(
        id=run_id,
        workflow_id=workflow.id,
        dataset_id=dataset.id,
        status="pending"
    )
    db.add(run)
    
    for node in workflow.nodes:
        node_run = WorkflowNodeRun(
            id=str(uuid.uuid4()),
            workflow_run_id=run_id,
            node_id=node.id,
            status="pending"
        )
        db.add(node_run)

    db.commit()
    db.refresh(run)

    background_tasks.add_task(execute_workflow_bg, workflow_id, req.dataset_id, run_id, db)
    
    return run

