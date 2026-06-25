import logging
import datetime
from sqlalchemy.orm import Session
from app.db import models
from app.services.data_service import DataService
from app.agents.understanding import DataUnderstandingAgent
from app.agents.cleaning import DataCleaningAgent
from app.agents.visualization import VisualizationAgent
from app.agents.insights import InsightsAgent
from app.agents.forecasting import ForecastingAgent

logger = logging.getLogger("a3.agents.orchestrator")

class AgentOrchestrator:
    @staticmethod
    async def run_full_profiling(
        db: Session, 
        dataset_id: str, 
        job_id: int
    ) -> None:
        """Runs the complete agent analysis pipeline asynchronously."""
        # 1. Fetch job and dataset details
        job = db.query(models.AnalysisJob).filter(models.AnalysisJob.id == job_id).first()
        dataset = db.query(models.Dataset).filter(models.Dataset.id == dataset_id).first()
        
        if not job or not dataset:
            logger.error(f"Job {job_id} or Dataset {dataset_id} not found in database.")
            return

        try:
            # Update status to running
            job.status = "running"
            db.commit()
            
            # 2. Load dataset
            DataService.ensure_local_file(dataset.file_path, dataset.file_content)
            df = DataService.load_df(dataset.file_path, dataset.file_type)
            
            # Create a preview
            columns, rows, total_rows = DataService.get_preview(dataset.file_path, dataset.file_type, limit=20)
            
            # Compute base statistics
            columns_meta = DataService.analyze_metadata(df)
            
            # 3. Trigger Data Understanding Agent
            logger.info("Running Data Understanding Agent...")
            understanding = await DataUnderstandingAgent.analyze(
                dataset_name=dataset.name,
                columns_meta=columns_meta,
                sample_rows=rows
            )
            
            # Update dataset record with domain, summary, and explanations
            dataset.business_domain = understanding.get("business_domain", "General Analytics")
            dataset.summary = understanding.get("summary", "")
            
            # Enrich columns metadata with the LLM definitions
            explanations = understanding.get("column_explanations", {})
            for col in columns_meta.keys():
                if col in explanations:
                    columns_meta[col]["description"] = explanations[col]
            dataset.columns_metadata = columns_meta
            db.commit()

            # 4. Trigger Data Cleaning Agent
            logger.info("Running Data Cleaning Agent...")
            quality_score, quality_report = await DataCleaningAgent.analyze(df)
            job.quality_score = quality_score
            job.quality_report = quality_report
            db.commit()

            # 5. Trigger Visualization Agent
            logger.info("Running Visualization Agent...")
            charts = await VisualizationAgent.auto_generate_charts(df, columns_meta)
            
            # 6. Trigger Insights Agent
            logger.info("Running Insights Agent...")
            insights = await InsightsAgent.generate(
                df=df,
                columns_meta=columns_meta,
                business_domain=dataset.business_domain
            )
            
            # Append generated charts description to findings if available
            job.insights = insights
            db.commit()

            # 7. Check and run Forecasting Agent
            logger.info("Running Forecasting Agent...")
            forecast_result = await ForecastingAgent.forecast(df, columns_meta)
            
            anomalies = {
                "has_anomalies": False,
                "items": []
            }
            # Detect simple anomalies from IQR
            outliers = quality_report.get("outliers_by_column", {})
            if outliers:
                anomalies["has_anomalies"] = True
                for col, info in outliers.items():
                    anomalies["items"].append({
                        "column": col,
                        "type": "outlier_spikes",
                        "description": f"Detected {info['count']} abnormal entry spikes in column '{col}' outside normal boundaries."
                    })
            job.anomalies = anomalies

            # Save auto-generated dashboard config
            # Create a dashboard layout incorporating KPI cards & Plotly figures
            dashboard_layout = []
            
            # Add some KPI Widgets
            dashboard_layout.append({
                "id": "kpi_rows",
                "type": "kpi",
                "title": "Total Observations",
                "w": 3, "h": 2, "x": 0, "y": 0,
                "config": {"value": f"{total_rows:,}", "label": "Rows"}
            })
            dashboard_layout.append({
                "id": "kpi_quality",
                "type": "kpi",
                "title": "Quality Score",
                "w": 3, "h": 2, "x": 3, "y": 0,
                "config": {"value": f"{quality_score}%", "label": "Completeness"}
            })
            
            # Add chart widgets
            x_coord, y_coord = 0, 2
            for chart in charts:
                dashboard_layout.append({
                    "id": f"widget_{chart['id']}",
                    "type": "chart",
                    "title": chart["title"],
                    "w": 6, "h": 4, "x": x_coord, "y": y_coord,
                    "config": chart["plotly_json"]
                })
                # Toggle placement
                x_coord = 6 if x_coord == 0 else 0
                if x_coord == 0:
                    y_coord += 4

            # If forecast succeeded, append forecast chart to dashboard
            if forecast_result.get("success", False):
                dashboard_layout.append({
                    "id": "widget_forecast",
                    "type": "chart",
                    "title": f"Forecasted Trend for {forecast_result['target_col']}",
                    "w": 12, "h": 4, "x": 0, "y": y_coord,
                    "config": forecast_result["plotly_json"]
                })
                # Store forecast commentary inside job insights
                job.insights["forecast_commentary"] = forecast_result["commentary"]
                job.insights["forecast_chart"] = forecast_result["plotly_json"]

            # Save or update dashboard
            dashboard = db.query(models.Dashboard).filter(models.Dashboard.dataset_id == dataset_id).first()
            if dashboard:
                dashboard.title = f"{dataset.name} Overview Dashboard"
                dashboard.layout = dashboard_layout
            else:
                dashboard = models.Dashboard(
                    id=dataset_id, # Link same UUID
                    dataset_id=dataset_id,
                    title=f"{dataset.name} Overview Dashboard",
                    layout=dashboard_layout
                )
                db.add(dashboard)
            
            # Mark job complete
            job.status = "completed"
            job.completed_at = datetime.datetime.utcnow()
            db.commit()
            logger.info(f"Analysis job {job_id} completed successfully!")

        except Exception as e:
            logger.error(f"Failed to profile dataset in job {job_id}: {e}", exc_info=True)
            job.status = "failed"
            job.error_message = str(e)
            db.commit()
