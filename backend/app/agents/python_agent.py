import logging
from typing import Dict, Any
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.python")

class PythonAgent:
    """
    Python Agent.
    Generates production-grade Pandas, NumPy, and Scikit-Learn Python code scripts to perform complex local data operations.
    """

    @classmethod
    async def generate_script(cls, dataset_summary: Dict[str, Any], task_description: str) -> Dict[str, Any]:
        prompt = f"""
        You are an expert Senior Python Data Engineer AI Agent.
        Write clean, self-contained Python code using pandas (df) to perform the following task.

        DATASET CONTEXT:
        {dataset_summary}

        TASK DESCRIPTION:
        {task_description}

        Requirements:
        - Assume `df` is already loaded into pandas.
        - Ensure all imports are standard (pandas, numpy, math).
        - Do not perform any file I/O or system operations.
        - Return the code inside python codeblocks ```python ... ```.
        """
        try:
            code = await LLMService.query(prompt=prompt, system_prompt="You write safe, efficient Python data processing scripts.")
            return {
                "task": task_description,
                "generated_code": code,
                "status": "ready_for_sandbox"
            }
        except Exception as e:
            logger.error(f"Python agent script generation error: {e}")
            return {
                "task": task_description,
                "generated_code": "# Fallback python transformation\ndf_result = df.describe()",
                "status": "fallback"
            }
