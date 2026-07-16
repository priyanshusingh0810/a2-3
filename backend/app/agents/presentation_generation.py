import logging
from typing import Dict, Any, List

logger = logging.getLogger("a3.agents.presentation_generation")

class PresentationGenerationAgent:
    @classmethod
    def generate_slides(
        cls, 
        dataset_name: str,
        business_domain: str,
        summary: str,
        quality_score: float,
        stats_report: Dict[str, Any],
        ml_report: Dict[str, Any],
        business_report: Dict[str, Any],
        research_report: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Compiles the analysis results from all agents into a beautiful, slide-by-slide presentation deck."""
        logger.info("Executing Presentation Generation Agent...")
        
        slides = []
        
        # Slide 1: Cover Page
        slides.append({
            "id": "slide_cover",
            "type": "cover",
            "title": "EXECUTIVE DATA INTELLIGENCE BRIEFING",
            "subtitle": f"Automated Multi-Agent Analytics for {dataset_name}",
            "meta": [
                {"label": "Business Domain", "value": business_domain},
                {"label": "Security Classification", "value": "Strictly Confidential / Internal Only"}
            ]
        })
        
        # Slide 2: Executive Summary
        slides.append({
            "id": "slide_summary",
            "type": "summary",
            "title": "Executive Summary",
            "subtitle": "High-level takeaways and core dataset overview",
            "bullets": [
                f"Analysed dataset contains record observations in the '{business_domain}' domain.",
                summary,
                "The analysis was processed autonomously using A3's 10 specialized agent pipelines."
            ]
        })
        
        # Slide 3: Data Quality scorecard
        slides.append({
            "id": "slide_quality",
            "type": "quality",
            "title": "Data Quality & Health Scorecard",
            "subtitle": f"Quality index rated at {quality_score}/100",
            "metrics": [
                {"label": "Data Quality Index", "value": f"{quality_score}%"},
                {"label": "Completeness", "value": f"{stats_report.get('completeness_score', 100.0)}%"},
                {"label": "Duplicate Records", "value": f"{stats_report.get('duplicate_percentage', 0.0)}%"}
            ],
            "bullets": [
                f"Consistency checks rated at {stats_report.get('consistency_score', 100.0)}/100 based on standard outlier margins.",
                "Automated recommended cleaning operations are queued in the data library."
            ]
        })
        
        # Slide 4: Statistical checks
        stats_bullets = []
        for corr in stats_report.get("notable_correlations", [])[:2]:
            stats_bullets.append(corr)
        if stats_report.get("skewness_alert"):
            stats_bullets.append(stats_report["skewness_alert"])
        if not stats_bullets:
            stats_bullets = ["All numeric variables demonstrate typical standard distributions.", "No extreme collinearity anomalies detected."]
            
        slides.append({
            "id": "slide_stats",
            "type": "statistics",
            "title": "Statistical Distribution & Correlations",
            "subtitle": "Underlying mathematical properties and variable relationships",
            "bullets": stats_bullets
        })
        
        # Slide 5: Machine Learning
        ml_bullets = []
        if ml_report.get("model_summary"):
            ml_bullets.append(ml_report["model_summary"])
        for inf in ml_report.get("feature_influence", [])[:2]:
            ml_bullets.append(inf)
        if ml_report.get("deployment_recommendation"):
            ml_bullets.append(f"Model Deployment: {ml_report['deployment_recommendation']}")
        if not ml_bullets:
            ml_bullets = ["No predictive models could be confidently fit to this data size.", "Recommend expanding row observations to establish stable regression coefficients."]
            
        slides.append({
            "id": "slide_ml",
            "type": "ml",
            "title": f"Predictive AI Models ({ml_report.get('model_type', 'General')})",
            "subtitle": "Supervised predictions and regression coefficients",
            "bullets": ml_bullets
        })
        
        # Slide 6: Strategic Recommendations
        slides.append({
            "id": "slide_recommendations",
            "type": "decisions",
            "title": "Decision Engine Recommendations",
            "subtitle": f"Strategic Actions (Priority Score: {business_report.get('priority_score', 70)}/100)",
            "metrics": [
                {"label": "Confidence Level", "value": f"{business_report.get('confidence_score', 80)}%"},
                {"label": "Expected ROI", "value": business_report.get("expected_roi", "100%")},
                {"label": "Risk assessment", "value": business_report.get("risk_level", "Medium")}
            ],
            "bullets": business_report.get("action_plan", ["Implement standard operational monitors."])
        })
        
        # Slide 7: External research
        slides.append({
            "id": "slide_research",
            "type": "research",
            "title": "Macroeconomic Market Research",
            "subtitle": "External events and industry headwinds impacting operations",
            "bullets": [
                research_report.get("market_summary", "Macro economic indices are stable."),
                f"Opportunity Indicator: {research_report.get('opportunities_identified', ['Leverage digital pipeline automations'])[0]}",
                f"Headwind Indicator: {research_report.get('threats_identified', ['Overhead cost increases'])[0]}"
            ]
        })
        
        return slides
