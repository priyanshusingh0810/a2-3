from typing import List, Dict, Any
from app.workflow.engine import WorkflowStep

class WorkflowTemplateLibrary:
    """
    Standard reusable workflow templates for automated local data pipelines.
    """

    @staticmethod
    def get_full_analysis_workflow() -> List[WorkflowStep]:
        return [
            WorkflowStep(id="step_ingest", name="Ingest CSV Dataset", action_type="ingest_data"),
            WorkflowStep(id="step_clean", name="Clean Missing & Duplicates", action_type="clean_data", depends_on=["step_ingest"]),
            WorkflowStep(id="step_stats", name="Calculate Statistics & Correlations", action_type="run_stats", depends_on=["step_clean"]),
            WorkflowStep(id="step_charts", name="Generate Plotly Visualizations", action_type="generate_charts", depends_on=["step_stats"]),
            WorkflowStep(id="step_pdf", name="Generate Executive PDF Report", action_type="generate_pdf", depends_on=["step_charts"]),
            WorkflowStep(id="step_export", name="Export Local Package", action_type="export_package", depends_on=["step_pdf"]),
        ]

    @staticmethod
    def get_automl_workflow() -> List[WorkflowStep]:
        return [
            WorkflowStep(id="step_ingest", name="Ingest Dataset", action_type="ingest_data"),
            WorkflowStep(id="step_ml", name="Train AutoML Models", action_type="run_ml", depends_on=["step_ingest"]),
            WorkflowStep(id="step_review", name="QA Compliance Review", action_type="run_review", depends_on=["step_ml"]),
        ]
