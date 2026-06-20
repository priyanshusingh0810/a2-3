import sys
import logging
import io
import json
import re
import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple, Optional
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.query")

class QueryAgent:
    @classmethod
    async def run_query(cls, df: pd.DataFrame, columns_meta: Dict[str, Any], question: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Translates NL query to python code, executes it in a secure sandbox, and returns text + chart."""
        
        system_prompt = (
            "You are a Python Data Analyst coding assistant. Your task is to write a short Python script "
            "that processes a pandas DataFrame named 'df' to answer a user's question, "
            "and generates a Plotly figure to support the answer. "
            "Return ONLY executable Python code within a markdown block. No conversational text."
        )

        columns_desc = {col: meta.get("data_type") for col, meta in columns_meta.items()}
        
        prompt = f"""
Given a pandas DataFrame named 'df' with the following columns:
{json.dumps(columns_desc, indent=2)}

Preview data (first row):
{json.dumps(df.head(1).to_dict(orient="records"), default=str)}

Write a Python code snippet to answer this question: "{question}"

Instructions for your Python code:
1. Perform the necessary pandas aggregation or analysis.
2. Store the final answer in a string variable named 'result_text'. Keep the text professional and detailed.
3. If the answer is best visualized, construct a Plotly figure and store it as a dictionary or a plotly.graph_objects.Figure object in a variable named 'result_chart'. Use a dark theme configuration:
   - paper_bgcolor: 'rgba(0,0,0,0)'
   - plot_bgcolor: 'rgba(17,24,39,0.5)'
   - font color: '#f3f4f6'
4. Do NOT attempt to read files, import os, sys, subprocess, or make web requests.
5. Provide ONLY the raw Python code within a single ```python ``` block.

Example:
```python
sales_by_region = df.groupby('Region')['Sales'].sum().reset_index()
highest_sales = sales_by_region.sort_values(by='Sales', ascending=False).iloc[0]
result_text = f"The region with the highest sales is {{highest_sales['Region']}} with total sales of ${{highest_sales['Sales']:,.2f}}."

# Chart
result_chart = {{
    "data": [{{
        "x": sales_by_region['Region'].tolist(),
        "y": sales_by_region['Sales'].tolist(),
        "type": "bar",
        "marker": {{"color": "#6366f1"}}
    }}],
    "layout": {{
        "title": "Sales by Region",
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor": "rgba(17,24,39,0.5)",
        "font": {{"color": "#f3f4f6"}}
    }}
}}
```
"""
        messages = [{"role": "user", "content": prompt}]
        
        try:
            code_response = await LLMService.chat_completion(
                messages=messages,
                system_prompt=system_prompt
            )
            
            # Extract code from markdown blocks
            code_match = re.search(r"```python(.*?)```", code_response, re.DOTALL)
            if code_match:
                code_to_run = code_match.group(1).strip()
            else:
                code_to_run = code_response.replace("```", "").strip()

            # Execute code in sandbox
            result_text, result_chart = cls._execute_sandboxed_code(df, code_to_run)
            return result_text, result_chart
            
        except Exception as e:
            logger.error(f"Error executing LLM generated code query: {e}")
            # Fallback to rule-based parser
            return cls._rule_based_fallback(df, columns_meta, question)

    @classmethod
    def _execute_sandboxed_code(cls, df: pd.DataFrame, code: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """Executes Python code in a restricted scope and extracts result variables."""
        # Clean code of obvious security risks
        risk_keywords = ["__import__", "open", "shutil", "os.", "sys.", "subprocess", "eval", "pickle", "requests", "socket"]
        for kw in risk_keywords:
            if kw in code:
                raise PermissionError(f"Security restriction violation: '{kw}' is prohibited.")

        # Prepare isolated namespace
        local_scope = {
            "df": df,
            "pd": pd,
            "np": np,
            "result_text": "I processed the query but could not formulate a text answer.",
            "result_chart": None
        }
        
        # Capture standard outputs in case print was used
        stdout_capture = io.StringIO()
        old_stdout = sys.stdout
        sys.stdout = stdout_capture
        
        try:
            # Execute code
            exec(code, {}, local_scope)
            sys.stdout = old_stdout
        except Exception as e:
            sys.stdout = old_stdout
            raise RuntimeError(f"Sandbox runtime execution error: {e}")

        # Extract values
        res_text = local_scope.get("result_text", "")
        # If result_text wasn't populated, check stdout
        print_output = stdout_capture.getvalue().strip()
        if not res_text and print_output:
            res_text = print_output

        res_chart = local_scope.get("result_chart")
        
        # If it's a Plotly figure object, convert to dictionary
        if res_chart is not None:
            if hasattr(res_chart, "to_dict"):
                res_chart = res_chart.to_dict()
            elif not isinstance(res_chart, dict):
                res_chart = None

        return res_text, res_chart

    @classmethod
    def _rule_based_fallback(cls, df: pd.DataFrame, columns_meta: Dict[str, Any], question: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """A simple local fallback to answer basic queries when LLM is offline or sandbox fails."""
        q = question.lower()
        numeric_cols = [c for c, m in columns_meta.items() if m.get("is_numeric")]
        categorical_cols = [c for c, m in columns_meta.items() if not m.get("is_numeric") and not m.get("is_datetime")]

        if "highest" in q or "top" in q or "best" in q:
            if categorical_cols and numeric_cols:
                cat, num = categorical_cols[0], numeric_cols[0]
                grouped = df.groupby(cat)[num].sum().reset_index()
                top_row = grouped.sort_values(by=num, ascending=False).iloc[0]
                
                ans = f"According to local analysis, the category '{top_row[cat]}' has the highest values of '{num}' totaling {top_row[num]:,.2f}."
                
                # Render simple bar chart
                top_grouped = grouped.sort_values(by=num, ascending=False).head(10)
                chart = {
                    "data": [{
                        "x": top_grouped[cat].tolist(),
                        "y": top_grouped[num].tolist(),
                        "type": "bar",
                        "marker": {"color": "#6366f1"}
                    }],
                    "layout": {
                        "title": f"Top performing {cat} by {num}",
                        "paper_bgcolor": "rgba(0,0,0,0)",
                        "plot_bgcolor": "rgba(17,24,39,0.5)",
                        "font": {"color": "#f3f4f6"}
                    }
                }
                return ans, chart

        # General generic response
        ans = "I completed analyzing your dataset. There are a total of {} records. The main numerical variables are {}.".format(
            len(df), ", ".join(numeric_cols[:3])
        )
        return ans, None
