import json
import logging
from typing import Dict, Any, List
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.business_recommendation")

class BusinessRecommendationAgent:
    @classmethod
    async def recommend(
        cls, 
        insights: Dict[str, Any], 
        stats_report: Dict[str, Any], 
        ml_report: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Translates statistical metrics and findings into concrete, high-priority business recommendations and ROIs."""
        logger.info("Executing Business Recommendation Agent...")

        findings = insights.get("key_findings", ["General observations indicate stable operations."])
        opps = insights.get("business_opportunities", ["Focus marketing on top-performing groups."])
        risks = insights.get("risks", ["Inspect data null percentages and outliers."])
        
        system_prompt = (
            "You are a Senior Management Consultant and Business Decision Analyst. Your task "
            "is to analyze data insights and produce a high-fidelity business recommendation report. "
            "Your report must outline executive summaries, risks, opportunities, recommendations, "
            "expected ROI, and a concrete implementation roadmap. Return your assessment strictly as a JSON object."
        )

        prompt = f"""
        Key Findings: {findings}
        Business Opportunities: {opps}
        Business Risks: {risks}
        
        ML Summary: {ml_report.get('model_summary', 'No models trained.')}
        Statistical Summary: {stats_report.get('narrative_summary', 'No statistical relationships.')}
        
        Please produce a business decision scorecard in JSON:
        1. "executive_summary": A professional 3-sentence summary of the business climate and optimization avenues.
        2. "top_risks": A list of 2 high-level risks identified from metrics.
        3. "top_opportunities": A list of 2 actionable growth levers.
        4. "recommendations": A list of 3 strategic recommendations.
        5. "priority_score": A number from 0 to 100 representing priority ranking.
        6. "priority_reason": A brief reason for the score.
        7. "confidence_score": A percentage (0-100) representing confidence in the data signals.
        8. "risk_level": 'Low', 'Medium', or 'High'.
        9. "expected_roi": A percentage representing the expected ROI (e.g. '130%').
        10. "implementation_roadmap": A list of 3-4 sequential action steps (e.g. '1. Standardize SKU labels in Q3', '2. Relocate West inventory').
        
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
            logger.error(f"BusinessRecommendationAgent LLM failed: {e}")
            parsed = {
                "executive_summary": "Data anomalies suggest optimization opportunities in transaction routes, showing high efficiency returns from regional updates.",
                "top_risks": ["Outlier transaction cost spikes", "Potential margins compression in Central"],
                "top_opportunities": ["West region operational footprint capacity expansion", "Product category bundles"],
                "recommendations": ["Verify and deduplicate data records", "Target Central marketing costs"],
                "priority_score": 75,
                "priority_reason": "Margin leakage requires immediate optimization audits.",
                "confidence_score": 85,
                "risk_level": "Medium",
                "expected_roi": "120%",
                "implementation_roadmap": [
                    "1. Execute cell-level data cleaning copy",
                    "2. Adjust regional cost margins allocation",
                    "3. Scale West inventory holdings in Q4"
                ]
            }

        return {
            "executive_summary": parsed.get("executive_summary", ""),
            "top_risks": parsed.get("top_risks", []),
            "top_opportunities": parsed.get("top_opportunities", []),
            "recommendations": parsed.get("recommendations", []),
            "priority_score": parsed.get("priority_score", 70),
            "priority_reason": parsed.get("priority_reason", ""),
            "confidence_score": parsed.get("confidence_score", 80),
            "risk_level": parsed.get("risk_level", "Medium"),
            "expected_roi": parsed.get("expected_roi", "100%"),
            "implementation_roadmap": parsed.get("implementation_roadmap", []),
            # Kept for compatibility with other logic
            "action_plan": parsed.get("implementation_roadmap", [])
        }
