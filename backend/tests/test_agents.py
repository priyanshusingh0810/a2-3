import pytest
from app.agents.planner import PlannerAgent
from app.agents.python_agent import PythonAgent
from app.agents.sql_agent import SQLAgent
from app.agents.review import ReviewAgent

@pytest.mark.anyio
async def test_planner_agent():
    plan = await PlannerAgent.create_plan(
        dataset_summary={"name": "test_sales.csv", "rows": 500, "columns": ["date", "revenue", "category"]},
        user_goal="Identify top performing categories"
    )
    assert "plan_title" in plan
    assert len(plan["execution_steps"]) > 0

@pytest.mark.anyio
async def test_python_agent():
    res = await PythonAgent.generate_script(
        dataset_summary={"columns": ["revenue", "cost"]},
        task_description="Compute net profit = revenue - cost"
    )
    assert res["status"] in ["ready_for_sandbox", "fallback"]
    assert "generated_code" in res

@pytest.mark.anyio
async def test_sql_agent():
    res = await SQLAgent.generate_sql(
        table_name="sales",
        schema_info={"columns": ["region", "amount"]},
        query_prompt="Sum of amount by region"
    )
    assert res["is_safe"] is True
    assert "SELECT" in res["sql"].upper()

@pytest.mark.anyio
async def test_review_agent():
    res = await ReviewAgent.review_analysis_artifacts(
        job_outputs={"quality_report": {"completeness": 99.0}}
    )
    assert res["review_passed"] is True
    assert "quality_score" in res
