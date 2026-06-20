import json
import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from app.services.llm_service import LLMService

logger = logging.getLogger("a3.agents.visualization")

class VisualizationAgent:
    @classmethod
    async def auto_generate_charts(cls, df: pd.DataFrame, columns_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Automatically builds 3-4 interactive Plotly figures and describes them."""
        charts = []
        
        # 1. Identify column roles
        date_cols = [c for c, m in columns_meta.items() if m.get("is_datetime") or "date" in c.lower()]
        numeric_cols = [c for c, m in columns_meta.items() if m.get("is_numeric")]
        categorical_cols = [c for c, m in columns_meta.items() if not m.get("is_numeric") and not m.get("is_datetime") and m.get("unique_count") < 30]

        # Ensure we have data
        if df.empty:
            return []

        # Chart 1: Time Series (if date column exists)
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            num_col = numeric_cols[0]
            try:
                # Group by date and sum/mean
                temp_df = df.copy()
                temp_df[date_col] = pd.to_datetime(temp_df[date_col], errors='coerce')
                temp_df = temp_df.dropna(subset=[date_col])
                
                # Resample or group by date to keep points reasonable (max 100 points)
                resampled = temp_df.groupby(temp_df[date_col].dt.date)[num_col].sum().reset_index()
                resampled = resampled.sort_values(by=date_col)
                if len(resampled) > 100:
                    resampled = resampled.sample(100).sort_values(by=date_col)

                plotly_json = {
                    "data": [{
                        "x": [str(x) for x in resampled[date_col]],
                        "y": resampled[num_col].tolist(),
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": num_col,
                        "line": {"color": "#6366f1", "width": 3},
                        "marker": {"color": "#818cf8"}
                    }],
                    "layout": cls._get_base_layout(f"{num_col} Trend Over Time", date_col, num_col)
                }
                
                charts.append({
                    "id": "time_series",
                    "title": f"{num_col} Trend Over Time",
                    "type": "line",
                    "plotly_json": plotly_json,
                    "description": ""
                })
            except Exception as e:
                logger.warning(f"Failed to generate time series chart: {e}")

        # Chart 2: Categorical Bar Chart (if categorical and numeric exist)
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            try:
                grouped = df.groupby(cat_col)[num_col].sum().reset_index()
                grouped = grouped.sort_values(by=num_col, ascending=False).head(15)

                plotly_json = {
                    "data": [{
                        "x": grouped[cat_col].tolist(),
                        "y": grouped[num_col].tolist(),
                        "type": "bar",
                        "marker": {
                            "color": "#a855f7", # Purple theme
                            "line": {"width": 1, "color": "#1f2937"}
                        }
                    }],
                    "layout": cls._get_base_layout(f"Total {num_col} by {cat_col}", cat_col, num_col)
                }
                
                charts.append({
                    "id": "category_bar",
                    "title": f"Total {num_col} by {cat_col}",
                    "type": "bar",
                    "plotly_json": plotly_json,
                    "description": ""
                })
            except Exception as e:
                logger.warning(f"Failed to generate category bar chart: {e}")

        # Chart 3: Numeric Distribution / Histogram
        if numeric_cols:
            num_col = numeric_cols[-1]
            try:
                clean_vals = df[num_col].dropna()
                # Bin values for plotly histogram
                plotly_json = {
                    "data": [{
                        "x": clean_vals.tolist(),
                        "type": "histogram",
                        "nbinsx": 30,
                        "marker": {"color": "#14b8a6"} # Teal theme
                    }],
                    "layout": cls._get_base_layout(f"Distribution of {num_col}", num_col, "Frequency")
                }
                charts.append({
                    "id": "distribution_hist",
                    "title": f"Distribution of {num_col}",
                    "type": "histogram",
                    "plotly_json": plotly_json,
                    "description": ""
                })
            except Exception as e:
                logger.warning(f"Failed to generate histogram: {e}")

        # Chart 4: Correlation Heatmap (if multiple numeric cols exist)
        if len(numeric_cols) >= 3:
            try:
                corr = df[numeric_cols].corr().round(2)
                # Replace NaNs
                corr = corr.fillna(0)
                
                plotly_json = {
                    "data": [{
                        "z": corr.values.tolist(),
                        "x": corr.columns.tolist(),
                        "y": corr.index.tolist(),
                        "type": "heatmap",
                        "colorscale": "Viridis",
                        "zmin": -1.0,
                        "zmax": 1.0
                    }],
                    "layout": cls._get_base_layout("Numerical Column Correlation Matrix", "Columns", "Columns")
                }
                charts.append({
                    "id": "correlation_heatmap",
                    "title": "Numerical Correlation Heatmap",
                    "type": "heatmap",
                    "plotly_json": plotly_json,
                    "description": ""
                })
            except Exception as e:
                logger.warning(f"Failed to generate correlation heatmap: {e}")

        # 2. Let LLM summarize each chart's insights
        for chart in charts:
            chart["description"] = await cls._generate_chart_description(
                chart["title"], 
                chart["type"], 
                chart["plotly_json"]["data"][0]
            )

        return charts

    @staticmethod
    def _get_base_layout(title: str, xaxis_title: str, yaxis_title: str) -> Dict[str, Any]:
        """Returns standard dark-themed premium layout configurations."""
        return {
            "title": {
                "text": title,
                "font": {"size": 16, "color": "#f3f4f6", "family": "Inter, system-ui"}
            },
            "paper_bgcolor": "rgba(0,0,0,0)", # transparent
            "plot_bgcolor": "rgba(17,24,39,0.5)", # subtle dark slate
            "font": {"color": "#9ca3af", "family": "Inter, system-ui"},
            "margin": {"l": 50, "r": 30, "t": 60, "b": 50},
            "xaxis": {
                "title": {"text": xaxis_title, "font": {"size": 12, "color": "#9ca3af"}},
                "gridcolor": "#1f2937",
                "zerolinecolor": "#374151"
            },
            "yaxis": {
                "title": {"text": yaxis_title, "font": {"size": 12, "color": "#9ca3af"}},
                "gridcolor": "#1f2937",
                "zerolinecolor": "#374151"
            },
            "autosize": True
        }

    @classmethod
    async def _generate_chart_description(cls, chart_title: str, chart_type: str, chart_data: Dict[str, Any]) -> str:
        """Sends chart metrics to LLM to write a business description."""
        
        # Summarize chart data to keep prompt small
        x_sample = chart_data.get("x", [])[:10]
        y_sample = chart_data.get("y", [])[:10]
        
        prompt = f"""
Chart Title: {chart_title}
Chart Type: {chart_type}
Sample Data Shown:
- X-axis points: {x_sample}
- Y-axis values: {y_sample}

Please provide a 1-2 sentence business-oriented explanation of what this chart shows and the key takeaway. Write in executive-level language.
"""
        messages = [{"role": "user", "content": prompt}]
        try:
            desc = await LLMService.chat_completion(
                messages=messages,
                system_prompt="You are a senior business analyst. Write a clear, concise visual description."
            )
            return desc.strip()
        except Exception:
            return f"Visualization showing the relationship and distributions of parameters for '{chart_title}'."
