import logging
import time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("a3.workflow.engine")

class WorkflowStep(BaseModel):
    id: str
    name: str
    action_type: str  # e.g., "clean_data", "run_ml", "generate_chart", "export_pdf"
    params: Dict[str, Any] = Field(default_factory=dict)
    depends_on: List[str] = Field(default_factory=list)

class WorkflowExecutionResult(BaseModel):
    workflow_id: str
    success: bool
    step_results: Dict[str, Any] = Field(default_factory=dict)
    execution_time_seconds: float = 0.0
    error: Optional[str] = None

class WorkflowEngine:
    """DAG Engine to execute reusable data processing workflows."""

    def __init__(self):
        self.step_handlers = {}

    def register_step_handler(self, action_type: str, handler_func):
        self.step_handlers[action_type] = handler_func

    def execute_workflow(self, workflow_id: str, steps: List[WorkflowStep], initial_context: Dict[str, Any], progress_callback=None) -> WorkflowExecutionResult:
        start_time = time.time()
        context = dict(initial_context)
        results = {}

        for step in steps:
            logger.info(f"Executing workflow step: {step.name} ({step.action_type})")
            if progress_callback:
                progress_callback(step.id, "running", None, None)
            
            handler = self.step_handlers.get(step.action_type)
            if not handler:
                err = f"No handler registered for action type: {step.action_type}"
                if progress_callback:
                    progress_callback(step.id, "failed", None, err)
                return WorkflowExecutionResult(
                    workflow_id=workflow_id,
                    success=False,
                    step_results=results,
                    execution_time_seconds=time.time() - start_time,
                    error=err
                )
            try:
                step_res = handler(context=context, params=step.params)
                results[step.id] = step_res
                context[step.id] = step_res
                if progress_callback:
                    progress_callback(step.id, "completed", step_res, None)
            except Exception as e:
                logger.error(f"Error in step {step.name}: {e}")
                if progress_callback:
                    progress_callback(step.id, "failed", None, str(e))
                return WorkflowExecutionResult(
                    workflow_id=workflow_id,
                    success=False,
                    step_results=results,
                    execution_time_seconds=time.time() - start_time,
                    error=str(e)
                )

        return WorkflowExecutionResult(
            workflow_id=workflow_id,
            success=True,
            step_results=results,
            execution_time_seconds=time.time() - start_time
        )
