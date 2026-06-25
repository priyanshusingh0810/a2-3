import json
import logging
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("a3.llm_service")

class LLMService:
    @staticmethod
    async def check_ollama_status() -> bool:
        """Verifies if local Ollama service is reachable."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def chat_completion(
        cls, 
        messages: List[Dict[str, str]], 
        json_mode: bool = False,
        system_prompt: Optional[str] = None
    ) -> str:
        """Calls the LLM provider (Ollama) or falls back to Mock engine."""
        
        # Override to mock if configured
        if settings.MOCK_AI:
            logger.info("MOCK_AI is enabled. Falling back to heuristic mock response.")
            is_code_request = False
            if system_prompt and "python" in system_prompt.lower():
                is_code_request = True
            elif any("code" in m["content"].lower() or "python" in m["content"].lower() for m in messages):
                is_code_request = True
                
            if is_code_request and not json_mode:
                return cls._get_mock_code_response(messages)
            return cls._get_mock_response(messages, json_mode)

        # Build list of messages, incorporating system prompt if provided
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)

        # Attempt to call local Ollama
        try:
            payload = {
                "model": settings.OLLAMA_MODEL,
                "messages": formatted_messages,
                "stream": False,
                "options": {
                    "temperature": 0.2
                }
            }
            if json_mode:
                payload["format"] = "json"
                
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json=payload
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["message"]["content"]
                else:
                    logger.warning(f"Ollama returned status code {response.status_code}. Using mock fallback.")
        except Exception as e:
            logger.warning(f"Failed to communicate with Ollama at {settings.OLLAMA_BASE_URL}: {e}. Using mock fallback.")

        # Fallback if connection fails
        return cls._get_mock_response(messages, json_mode)

    @classmethod
    def _get_mock_code_response(cls, messages: List[Dict[str, str]]) -> str:
        """Generates a dynamic Python script that runs in the sandbox on the actual dataframe."""
        import re
        user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        
        # Try to extract the user's question from the prompt template
        question = "general query"
        match = re.search(r'answer this question:\s*"(.*?)"', user_msg)
        if match:
            question = match.group(1)
        else:
            match_simple = re.search(r'question:\s*"(.*?)"', user_msg)
            if match_simple:
                question = match_simple.group(1)
                
        safe_question = question.replace('"', '\\"').replace('\n', ' ')
        
        code = f"""```python
# Dynamic Mock AI code generator
import pandas as pd
import numpy as np

query = "{safe_question}".lower()

def find_col(keywords):
    for col in df.columns:
        col_lower = str(col).lower()
        if any(kw in col_lower for kw in keywords):
            return col
    return None

col_project = find_col(["project", "name", "title", "task", "job", "line"])
col_assignee = find_col(["assigned", "assignee", "who", "owner", "person", "member", "individual", "resource", "lead", "staff"])
col_status = find_col(["status", "stage", "progress", "percent", "complete", "state", "productivity"])
col_sales = find_col(["sales", "revenue", "amount", "value", "price", "cost", "profit"])
col_region = find_col(["region", "country", "territory", "zone", "location", "area"])

# 1. Assignment / Owner query
if col_assignee and ("assign" in query or "who" in query or "individual" in query or "person" in query or "whom" in query):
    counts = df[col_assignee].value_counts()
    total_individuals = len(counts)
    
    items_desc = []
    for person, cnt in counts.head(5).items():
        items_desc.append(f"{{person}} ({{cnt}} projects)")
        
    ans = f"Sales projects are assigned to {{total_individuals}} individuals. The primary assignees and their project counts are: " + ", ".join(items_desc) + "."
    if len(counts) > 5:
        ans += f" Other assignees include: " + ", ".join(list(map(str, counts.index[5:10]))) + "."
        
    chart_data = {{
        "data": [{{
            "x": list(map(str, counts.index[:10])),
            "y": list(map(int, counts.values[:10])),
            "type": "bar",
            "marker": {{"color": "#6366f1"}}
        }}],
        "layout": {{
            "title": "Projects count by Assignee",
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(17,24,39,0.5)",
            "font": {{"color": "#f3f4f6"}}
        }}
    }}
    result_text = ans
    result_chart = chart_data

# 2. Progress / Status query
elif col_status and ("progress" in query or "status" in query or "complete" in query or "productivity" in query):
    is_numeric_status = pd.api.types.is_numeric_dtype(df[col_status])
    if is_numeric_status:
        avg_pct = df[col_status].mean()
        ans = f"The overall average progress/productivity level of the projects is {{avg_pct:.2f}}."
        
        chart_data = {{
            "data": [{{
                "x": df[col_status].dropna().tolist(),
                "type": "histogram",
                "marker": {{"color": "#6366f1"}}
            }}],
            "layout": {{
                "title": f"Distribution of Project Progress ({{col_status}})",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor": "rgba(17,24,39,0.5)",
                "font": {{"color": "#f3f4f6"}}
            }}
        }}
    else:
        counts = df[col_status].value_counts()
        total_projects = len(df)
        pcts = (counts / total_projects) * 100
        
        items_desc = []
        for status_val, cnt in counts.items():
            items_desc.append(f"{{status_val}}: {{cnt}} projects ({{pcts[status_val]:.1f}}%)")
            
        ans = f"Overall progress and status of projects: " + "; ".join(items_desc) + "."
        
        chart_data = {{
            "data": [{{
                "labels": list(map(str, counts.index)),
                "values": list(map(int, counts.values)),
                "type": "pie",
                "hole": 0.4,
                "marker": {{"colors": ["#6366f1", "#10b981", "#f59e0b", "#ef4444"]}}
            }}],
            "layout": {{
                "title": "Project Status Breakdown",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor": "rgba(17,24,39,0.5)",
                "font": {{"color": "#f3f4f6"}}
            }}
        }}
        
    result_text = ans
    result_chart = chart_data

# 3. Sales / Region query
elif col_sales and col_region:
    grouped = df.groupby(col_region)[col_sales].sum().reset_index()
    top_grouped = grouped.sort_values(by=col_sales, ascending=False)
    
    ans = f"Analyzing {{col_sales}} grouped by {{col_region}}: the top area is '{{top_grouped.iloc[0][col_region]}}' with a total of {{top_grouped.iloc[0][col_sales]:,.2f}}."
    
    chart_data = {{
        "data": [{{
            "x": list(map(str, top_grouped[col_region])),
            "y": list(map(float, top_grouped[col_sales])),
            "type": "bar",
            "marker": {{"color": "#6366f1"}}
        }}],
        "layout": {{
            "title": f"{{col_sales}} by {{col_region}}",
            "paper_bgcolor": "rgba(0,0,0,0)",
            "plot_bgcolor": "rgba(17,24,39,0.5)",
            "font": {{"color": "#f3f4f6"}}
        }}
    }}
    result_text = ans
    result_chart = chart_data

# 4. Fallback / general aggregate
else:
    total_cols = len(df.columns)
    total_rows = len(df)
    cols_str = ", ".join(list(df.columns)[:5])
    num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    if num_cols:
        col = num_cols[0]
        mean_val = df[col].mean()
        ans = f"The dataset contains {{total_rows}} records and {{total_cols}} columns (including {{cols_str}}). The variable '{{col}}' has an average value of {{mean_val:,.2f}}."
    else:
        ans = f"The dataset contains {{total_rows}} records and {{total_cols}} columns. The columns are: {{', '.join(list(df.columns))}}."
    result_text = ans
    result_chart = None
```"""
        return code


    @classmethod
    def _get_mock_response(cls, messages: List[Dict[str, str]], json_mode: bool) -> str:
        """Generates standard analytical mock responses based on templates/heuristics."""
        # Retrieve user query
        user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        user_msg_lower = user_msg.lower()

        # 1. VISUALIZATION MOCK AGENT
        if "plotly" in user_msg_lower or "visualization" in user_msg_lower:
            if json_mode:
                return json.dumps({
                    "chart_type": "bar",
                    "x_column": "Category",
                    "y_column": "Sales",
                    "title": "Sales distribution by Category",
                    "plotly_json": {
                        "data": [{
                            "x": ["Electronics", "Clothing", "Home", "Sports", "Books"],
                            "y": [12000, 8500, 9300, 4100, 3200],
                            "type": "bar",
                            "marker": {"color": "#6366f1"}
                        }],
                        "layout": {
                            "title": "Sales by Category",
                            "paper_bgcolor": "rgba(0,0,0,0)",
                            "plot_bgcolor": "rgba(0,0,0,0)",
                            "font": {"color": "#f3f4f6"},
                            "xaxis": {"gridcolor": "#374151"},
                            "yaxis": {"gridcolor": "#374151"}
                        }
                    }
                })
            return "Here is a bar chart displaying your category sales."

        # 2. DATA UNDERSTANDING MOCK AGENT
        if "understanding" in user_msg_lower or "columns" in user_msg_lower or "detect dataset" in user_msg_lower:
            if json_mode:
                return json.dumps({
                    "domain": "E-Commerce & Retail",
                    "summary": "This dataset captures transaction-level sales information, highlighting consumer categories, revenues, region details, and customer segment metrics.",
                    "column_explanations": {
                        "Date": "The transaction date of the purchase.",
                        "Category": "Product classification groups.",
                        "Sales": "Total monetary volume generated per item.",
                        "Quantity": "Total count of units purchased.",
                        "Profit": "Net income generated after cost deductions.",
                        "Region": "Geographic area where the transaction occurred."
                    }
                })
            return "E-Commerce transactional dataset. Key categories include Sales, Profit, and Region."

        # 3. DATA QUALITY MOCK AGENT
        if "quality" in user_msg_lower or "cleaning" in user_msg_lower:
            if json_mode:
                return json.dumps({
                    "quality_score": 85.5,
                    "issues": [
                        {"type": "missing", "col": "Profit", "count": 12},
                        {"type": "duplicate", "col": "Rows", "count": 3}
                    ],
                    "recommendations": "Drop duplicates and impute the missing Profit values with mean."
                })
            return "Data Quality Score: 85.5/100. Recommend dropping duplicates."

        # 4. INSIGHTS MOCK AGENT
        if "insight" in user_msg_lower or "opportunities" in user_msg_lower:
            if json_mode:
                return json.dumps({
                    "findings": [
                        "Electronics drives 40% of overall revenue but has lower margin than Clothing.",
                        "Sales spike consistently in December due to holiday trends.",
                        "The West region yields the highest average order value."
                    ],
                    "opportunities": ["Run promos in high-margin categories.", "Optimise supply chains in the West."],
                    "risks": ["Negative profitability outliers in Sportswear."]
                })
            return "Key Finding: Electronics represents the highest sales volume, but Clothing shows the highest average profit margin."

        # 5. GENERAL DATA Q&A (Fallback)
        # Check if the query is a common business query
        if "region" in user_msg_lower:
            fig_data = {
                "data": [{"x": ["West", "East", "Central", "South"], "y": [45000, 38000, 29000, 18000], "type": "bar", "marker": {"color": "#6366f1"}}],
                "layout": {"title": "Sales by Region", "paper_bgcolor": "rgba(0,0,0,0)", "plot_bgcolor": "rgba(0,0,0,0)", "font": {"color": "#f3f4f6"}}
            }
            if json_mode:
                return json.dumps({
                    "answer": "The West region has the highest sales ($45,000), followed closely by the East ($38,000).",
                    "chart": fig_data
                })
            return "The West region generated the highest overall sales."

        if "product" in user_msg_lower or "top 10" in user_msg_lower:
            fig_data = {
                "data": [{"x": ["Laptop", "Smartphone", "Tablet", "Monitor", "Headphones"], "y": [15000, 12000, 8000, 5000, 3000], "type": "bar"}],
                "layout": {"title": "Top Selling Products", "paper_bgcolor": "rgba(0,0,0,0)", "plot_bgcolor": "rgba(0,0,0,0)", "font": {"color": "#f3f4f6"}}
            }
            if json_mode:
                return json.dumps({
                    "answer": "The top-performing product is Laptop, accounting for $15,000 in revenue, with Smartphone in second place.",
                    "chart": fig_data
                })
            return "The top products are Laptops and Smartphones."

        # Default fallback
        if json_mode:
            return json.dumps({
                "answer": "I have successfully analyzed the dataset and retrieved the matching metrics. Let me know if you would like me to plot this trend.",
                "chart": None
            })
        return "I have completed analyzing the dataset with local heuristic rules. How can I help you visualize or forecast these trends?"
