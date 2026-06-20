import json
import logging
import pandas as pd
from typing import Dict, Any, Tuple
from app.services.data_service import DataService
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.cleaning")

class DataCleaningAgent:
    @classmethod
    async def analyze(cls, df: pd.DataFrame) -> Tuple[float, Dict[str, Any]]:
        """Profiles the dataset for quality and enriches recommendations using the LLM."""
        
        # 1. Run standard pandas profile first
        quality_score, raw_profile = DataService.profile_data_quality(df)
        
        system_prompt = (
            "You are a Senior Data Quality Engineer Agent. Your task is to review a data quality report, "
            "explain the business impact of the identified issues, and write structured, actionable "
            "recommendations for cleaning the dataset. You must return your analysis strictly as a JSON object."
        )

        prompt = f"""
Data Quality Report Metrics:
- Quality Score: {quality_score}/100
- Total Rows: {raw_profile['total_rows']}
- Total Columns: {raw_profile['total_columns']}
- Duplicate Rows: {raw_profile['duplicate_rows_count']}
- Missing Cells: {raw_profile['null_cells_count']} ({raw_profile['null_cells_percentage']}% of cells)
- Outliers Detected in Columns: {list(raw_profile['outliers_by_column'].keys())}

Detailed Issues Found:
{json.dumps(raw_profile['issues'], indent=2)}

Please write an enriched data quality assessment in JSON format:
1. "narrative_summary": A 2-3 sentence summary explaining the overall health of this dataset and its readiness for modeling or analysis.
2. "actionable_plan": A list of items explaining step-by-step how to resolve the issues (e.g., 'Impute Profit using average value to preserve 12 rows', 'Remove 3 duplicate rows to prevent double counting').

Ensure your output is valid JSON and nothing else.
"""
        messages = [{"role": "user", "content": prompt}]
        
        try:
            response_content = await LLMService.chat_completion(
                messages=messages,
                json_mode=True,
                system_prompt=system_prompt
            )
            parsed = json.loads(response_content)
            
            # Enrich raw profile
            raw_profile["narrative_summary"] = parsed.get("narrative_summary", "No summary generated.")
            raw_profile["actionable_plan"] = parsed.get("actionable_plan", [r["description"] for r in raw_profile["recommendations"]])
        except Exception as e:
            logger.error(f"Error in DataCleaningAgent LLM enrichment: {e}")
            raw_profile["narrative_summary"] = f"Dataset quality score is {quality_score}/100. It is moderately clean and ready for analysis once basic cleaning is done."
            raw_profile["actionable_plan"] = [r["description"] for r in raw_profile["recommendations"]]
            
        return quality_score, raw_profile
