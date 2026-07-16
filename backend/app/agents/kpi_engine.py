import json
import logging
import pandas as pd
from typing import Dict, Any, List
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.kpi_engine")

class KPIEngineAgent:
    @classmethod
    async def analyze(cls, df: pd.DataFrame, columns_meta: Dict[str, Any], business_domain: str) -> Dict[str, Any]:
        """Scans dataset columns, matches key business KPIs, and recommends missing metric indicators."""
        logger.info("Executing Smart KPI Engine Agent...")

        # 1. Map columns using local heuristics to ground matches
        detected_kpis = {}
        missing_kpis = []
        
        # Lowercase mapping keys
        cols_lower = {str(c).lower(): c for c in df.columns}
        
        kpi_mappings = {
            "revenue": ["revenue", "sales", "turnover", "gross_sales", "income"],
            "profit": ["profit", "net_profit", "earnings", "net_income", "margin"],
            "cost": ["cost", "spend", "expenses", "marketing_spend", "cac_spend", "fees"],
            "retention": ["retention", "churn", "subscriber_status", "renew", "active"],
            "conversion": ["conversion", "click_rate", "clicked", "converted", "signup"],
            "cac": ["cac", "acquisition_cost", "marketing_cost"],
            "ltv": ["ltv", "lifetime_value", "clv"]
        }

        for kpi, keywords in kpi_mappings.items():
            matched_col = None
            for kw in keywords:
                for col_name_lower, orig_name in cols_lower.items():
                    if kw in col_name_lower:
                        matched_col = orig_name
                        break
                if matched_col:
                    break
            
            if matched_col and pd.api.types.is_numeric_dtype(df[matched_col]):
                val_sum = float(df[matched_col].sum())
                val_avg = float(df[matched_col].mean())
                detected_kpis[kpi] = {
                    "mapped_column": matched_col,
                    "total": round(val_sum, 2),
                    "average": round(val_avg, 2)
                }
            else:
                missing_kpis.append(kpi)

        # 2. Query LLM to formulate domain-specific KPI mappings & recommendations
        system_prompt = (
            "You are an expert Performance Measurement and Business Analyst. Your task "
            "is to review a dataset's columns and domain, identify what key performance indicators "
            "are currently tracked, and recommend exact mathematical formulas for missing KPIs "
            "specific to this business domain. Return your response strictly as a JSON object."
        )

        prompt = f"""
        Business Domain: {business_domain}
        Columns Present: {list(columns_meta.keys())}
        Heuristically Detected KPIs: {list(detected_kpis.keys())}
        Missing KPIs to Recommend: {missing_kpis}
        
        Please produce a Smart KPI scorecard in JSON:
        1. "detected_kpi_summary": A dictionary of detected KPIs matching their business relevance.
        2. "recommendations": A list of custom formulas and indicators recommended specifically for {business_domain} (e.g. 'Customer Acquisition Cost (CAC) = Total Ad Spend / Conversions').
        3. "growth_multiplier": A percentage representing the potential revenue optimization from implementing recommendations.
        
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
        except Exception as e:
            logger.error(f"KPIEngineAgent LLM failed: {e}")
            parsed = {
                "detected_kpi_summary": {k: f"Tracks transaction {k} volume." for k in detected_kpis.keys()},
                "recommendations": [
                    f"Implement Cost tracking: 'Cost = Cost per Unit * Quantity' using available columns.",
                    f"Calculate customer LTV baseline: 'LTV = Average Order Value * Frequency'."
                ],
                "growth_multiplier": 12.5
            }

        return {
            "detected_kpis": detected_kpis,
            "missing_kpis": missing_kpis,
            "summary": parsed.get("detected_kpi_summary", {}),
            "recommendations": parsed.get("recommendations", []),
            "growth_multiplier": parsed.get("growth_multiplier", 10.0)
        }
