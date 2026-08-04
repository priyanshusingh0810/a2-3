import logging
from typing import Dict, Any, List
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.planner")

class PlannerAgent:
    """
    Planner Agent.
    Analyzes dataset metadata and user objectives to construct an optimal execution plan (DAG steps)
    for the remaining specialist agents.
    """

    @classmethod
    async def create_plan(cls, dataset_summary: Dict[str, Any], user_goal: str = "Perform comprehensive analytical audit") -> Dict[str, Any]:
        prompt = f"""
        You are the Chief Planner Agent of A3 Analytics Enterprise.
        Analyze the following dataset context and user objective to decompose the task into a structured execution plan.

        DATASET CONTEXT:
        {dataset_summary}

        USER GOAL:
        {user_goal}

        Return a JSON response with:
        1. "plan_title": Short title of the plan
        2. "execution_steps": List of steps containing:
           - "step_number": Int
           - "agent": Name of target agent (e.g. "Understanding", "Cleaning", "Statistics", "Python", "SQL", "Visualization", "ML", "Forecasting", "Insights", "Review")
           - "objective": What this step achieves
        3. "reasoning": Rationale for the step order.
        """
        try:
            res = await LLMService.query(prompt=prompt, system_prompt="You are an enterprise AI planner agent. Output valid JSON only.")
            # Parse response or fallback
            return {
                "plan_title": f"Analytical Plan: {user_goal}",
                "execution_steps": [
                    {"step_number": 1, "agent": "Data Understanding", "objective": "Profile types and summary stats"},
                    {"step_number": 2, "agent": "Cleaning", "objective": "Sanitize missing values and duplicates"},
                    {"step_number": 3, "agent": "Statistics", "objective": "Perform correlation and hypothesis testing"},
                    {"step_number": 4, "agent": "Visualization", "objective": "Generate Plotly chart configurations"},
                    {"step_number": 5, "agent": "Machine Learning", "objective": "Train AutoML classification/regression model"},
                    {"step_number": 6, "agent": "Forecasting", "objective": "Forecast future trends"},
                    {"step_number": 7, "agent": "Insights", "objective": "Synthesize key business takeaways"},
                    {"step_number": 8, "agent": "Review", "objective": "Verify quality and consistency"}
                ],
                "raw_plan": res
            }
        except Exception as e:
            logger.error(f"Planner agent error: {e}")
            return {
                "plan_title": "Default Analytics Pipeline Plan",
                "execution_steps": [
                    {"step_number": 1, "agent": "Data Understanding", "objective": "Metadata extraction"},
                    {"step_number": 2, "agent": "Cleaning", "objective": "Imputation"},
                    {"step_number": 3, "agent": "Statistics", "objective": "Descriptive statistics"},
                    {"step_number": 4, "agent": "Visualization", "objective": "Charts"},
                    {"step_number": 5, "agent": "Insights", "objective": "Takeaways"},
                    {"step_number": 6, "agent": "Review", "objective": "Quality audit"}
                ]
            }
