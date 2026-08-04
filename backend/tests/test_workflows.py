from app.workflow.engine import WorkflowEngine, WorkflowStep
from app.workflow.templates import WorkflowTemplateLibrary
from app.workflow.runner import EnterpriseWorkflowRunner

def test_workflow_template_library():
    steps = WorkflowTemplateLibrary.get_full_analysis_workflow()
    assert len(steps) == 6
    assert steps[0].action_type == "ingest_data"

def test_enterprise_workflow_runner():
    runner = EnterpriseWorkflowRunner()
    steps = WorkflowTemplateLibrary.get_full_analysis_workflow()

    res = runner.run(
        workflow_id="wf_test_001",
        steps=steps,
        initial_context={"dataset_id": "test_dataset_1"}
    )
    assert res.success is True
    assert len(res.step_results) == 6
    assert res.step_results["step_clean"]["quality_score"] == 98.5
