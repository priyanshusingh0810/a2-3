import json
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.insights")

class InsightsAgent:
    @classmethod
    async def generate(cls, df: pd.DataFrame, columns_meta: Dict[str, Any], business_domain: str) -> Dict[str, Any]:
        """Runs math aggregations on df and prompts the LLM to generate executive insights."""
        
        # 1. Compute quick local statistics to ground the LLM
        numeric_cols = [c for c, m in columns_meta.items() if m.get("is_numeric")]
        categorical_cols = [c for c, m in columns_meta.items() if not m.get("is_numeric") and not m.get("is_datetime") and m.get("unique_count") < 20]
        
        summary_stats = {}
        
        # Find high correlation pairs
        high_corr = []
        if len(numeric_cols) >= 2:
            try:
                corr_matrix = df[numeric_cols].corr()
                for i in range(len(numeric_cols)):
                    for j in range(i+1, len(numeric_cols)):
                        val = corr_matrix.iloc[i, j]
                        if abs(val) > 0.4 and not pd.isna(val):
                            high_corr.append(f"({numeric_cols[i]}, {numeric_cols[j]}): Correlation={val:.2f}")
            except Exception:
                pass
                
        # Find top classes for main categorical and numeric pairings
        top_performers = []
        if categorical_cols and numeric_cols:
            cat = categorical_cols[0]
            num = numeric_cols[0]
            try:
                grouped = df.groupby(cat)[num].sum().reset_index()
                grouped = grouped.sort_values(by=num, ascending=False)
                if len(grouped) > 0:
                    top_performers.append(f"Top 3 '{cat}' by '{num}': {', '.join([f'{r[cat]} ({r[num]:.1f})' for _, r in grouped.head(3).iterrows()])}")
                    bottom_idx = max(0, len(grouped) - 3)
                    top_performers.append(f"Bottom 3 '{cat}' by '{num}': {', '.join([f'{r[cat]} ({r[num]:.1f})' for _, r in grouped.iloc[bottom_idx:].iterrows()])}")
            except Exception:
                pass

        system_prompt = (
            "You are a Principal Business Intelligence Analyst. Your task is to review a dataset's "
            "statistical summaries, identify key insights, opportunities, and business risks, and "
            "write them in professional, executive-level language. You must return your analysis strictly as a JSON object."
        )

        prompt = f"""
Business Domain: {business_domain}
Total Row Count: {len(df)}
Columns Profile: {list(columns_meta.keys())}

Calculated Data Relations:
- Outliers/Correlations: {high_corr if high_corr else 'No major correlation found.'}
- Category Performance: {top_performers if top_performers else 'No major categories.'}

Please generate an executive intelligence report containing:
1. "key_findings": A list of 3-4 bullet points summarizing major discoveries, trends, or notable patterns.
2. "business_opportunities": A list of 2-3 actionable growth areas, profit optimizations, or operational adjustments.
3. "risks": A list of 1-2 potential risks, data anomalies, or negative trends detected in the numbers.

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
            return parsed
        except Exception as e:
            logger.error(f"Error in InsightsAgent: {e}")
            # Heuristic fallback
            findings = ["Standard data trend is stable across columns."]
            if high_corr:
                findings.append(f"A correlation was observed between variables: {high_corr[0]}.")
            if top_performers:
                findings.append(top_performers[0])
                
            return {
                "key_findings": findings,
                "business_opportunities": ["Optimize operations and marketing focus on top performing categorical buckets."],
                "risks": ["Review missing cell percentages and potential outliers detected in numeric limits."]
            }
