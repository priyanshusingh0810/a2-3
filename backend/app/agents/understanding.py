import json
import logging
from typing import Dict, Any, List
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.understanding")

class DataUnderstandingAgent:
    @classmethod
    async def analyze(
        cls, 
        dataset_name: str, 
        columns_meta: Dict[str, Any], 
        sample_rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Analyzes a dataset structure and previews, returning domain, summary, and column definitions."""
        
        system_prompt = (
            "You are an expert Data Analyst Agent. Your task is to analyze the structure of a dataset "
            "and describe its business domain, generate a concise overview summary, and explain the "
            "purpose of each column. You must return your analysis strictly as a JSON object."
        )

        # Simplify metadata for prompt
        simplified_meta = {}
        for col, meta in columns_meta.items():
            simplified_meta[col] = {
                "data_type": meta.get("data_type"),
                "null_percentage": meta.get("null_percentage"),
                "unique_count": meta.get("unique_count")
            }

        prompt = f"""
Dataset Name: {dataset_name}

Column Structure:
{json.dumps(simplified_meta, indent=2)}

Preview Data (first few rows):
{json.dumps(sample_rows[:3], indent=2, default=str)}

Please analyze this dataset and return a JSON object with:
1. "business_domain": A string identifying the industry/domain (e.g., "E-commerce Retail", "SaaS User Activity", "Financial Transactions", "Healthcare Patient Logs", "General Science")
2. "summary": A brief, professional, executive-level summary of what the dataset contains and its analytical value.
3. "column_explanations": A dictionary mapping each column name to a 1-sentence explanation of what it represents based on its name and sample values.

Ensure the output is valid JSON and nothing else.
"""
        
        messages = [{"role": "user", "content": prompt}]
        
        try:
            response_content = await LLMService.chat_completion(
                messages=messages, 
                json_mode=True, 
                system_prompt=system_prompt
            )
            parsed_response = json.loads(response_content)
            return parsed_response
        except Exception as e:
            logger.error(f"Error in DataUnderstandingAgent: {e}")
            # Fallback to local heuristic parsing
            return {
                "business_domain": cls._infer_domain(columns_meta),
                "summary": f"This dataset, named '{dataset_name}', contains {len(columns_meta)} columns tracking attributes over its rows.",
                "column_explanations": {col: f"A column containing {meta.get('data_type')} values." for col, meta in columns_meta.items()}
            }

    @staticmethod
    def _infer_domain(columns_meta: Dict[str, Any]) -> str:
        """Rule-based domain inference as a local fallback."""
        cols = {c.lower() for c in columns_meta.keys()}
        if any(x in cols for x in ["sales", "revenue", "profit", "order_id", "transaction"]):
            return "E-Commerce & Retail Sales"
        if any(x in cols for x in ["patient", "diagnosis", "health", "doctor"]):
            return "Healthcare & Medicine"
        if any(x in cols for x in ["stock", "ticker", "portfolio", "interest", "price"]):
            return "Financial Transactions"
        if any(x in cols for x in ["user_id", "session", "click", "page", "event"]):
            return "SaaS Web Engagement"
        return "General Analytics"
