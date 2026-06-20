import logging
import pandas as pd
import numpy as np
from datetime import timedelta
from typing import Dict, Any, List, Tuple, Optional
from app.services.llm_service import LLMService
from app.agents.visualization import VisualizationAgent

logger = logging.getLogger("a3.agents.forecasting")

class ForecastingAgent:
    @classmethod
    async def forecast(cls, df: pd.DataFrame, columns_meta: Dict[str, Any]) -> Dict[str, Any]:
        """Auto-detects time-series columns, executes trend predictions, and returns Plotly configs."""
        
        # 1. Detect date and target numeric columns
        date_cols = [c for c, m in columns_meta.items() if m.get("is_datetime") or "date" in c.lower()]
        numeric_cols = [c for c, m in columns_meta.items() if m.get("is_numeric") and c.lower() not in ["id", "index"]]

        if not date_cols:
            return {
                "success": False,
                "message": "No date/time column detected in the dataset. Forecasting requires a temporal axis."
            }

        if not numeric_cols:
            return {
                "success": False,
                "message": "No target numeric column detected for trend prediction."
            }

        date_col = date_cols[0]
        # Prefer sales/revenue/profit, else use the first numeric col
        target_col = numeric_cols[0]
        for col in numeric_cols:
            if col.lower() in ["sales", "revenue", "profit", "amount", "total", "count"]:
                target_col = col
                break

        try:
            # Prepare dataset
            temp_df = df[[date_col, target_col]].copy()
            temp_df[date_col] = pd.to_datetime(temp_df[date_col], errors='coerce')
            temp_df = temp_df.dropna(subset=[date_col, target_col])
            
            # Sort by date
            temp_df = temp_df.sort_values(by=date_col)
            
            # Group by day/week/month depending on total span
            date_min = temp_df[date_col].min()
            date_max = temp_df[date_col].max()
            days_span = (date_max - date_min).days

            if days_span > 365 * 2:
                # Group by Month
                grouped = temp_df.groupby(temp_df[date_col].dt.to_period('M'))[target_col].sum().reset_index()
                grouped[date_col] = grouped[date_col].dt.to_timestamp()
                forecast_periods = 6 # 6 months
                freq = "MS"
                period_label = "Months"
            elif days_span > 60:
                # Group by Week
                grouped = temp_df.groupby(pd.Grouper(key=date_col, freq='W'))[target_col].sum().reset_index()
                forecast_periods = 12 # 12 weeks
                freq = "W"
                period_label = "Weeks"
            else:
                # Group by Day
                grouped = temp_df.groupby(pd.Grouper(key=date_col, freq='D'))[target_col].sum().reset_index()
                forecast_periods = 30 # 30 days
                freq = "D"
                period_label = "Days"

            grouped = grouped.dropna()
            if len(grouped) < 3:
                return {
                    "success": False,
                    "message": f"Insufficient timeline points ({len(grouped)}) after resampling to forecast trend."
                }

            # 2. Local-first Regression Forecast (Fast, zero compile dependencies)
            # Create a time index feature (0, 1, 2...)
            grouped['time_index'] = np.arange(len(grouped))
            
            # Fit linear trend + seasonal components (month-of-year or day-of-week)
            from sklearn.linear_model import Ridge
            from sklearn.preprocessing import PolynomialFeatures
            
            X = grouped[['time_index']].values
            y = grouped[target_col].values
            
            # Use 2nd degree polynomial for slight curvature
            poly = PolynomialFeatures(degree=2, include_bias=False)
            X_poly = poly.fit_transform(X)
            
            model = Ridge(alpha=1.0)
            model.fit(X_poly, y)
            
            # Predict historical points
            hist_preds = model.predict(X_poly)
            
            # Generate future time index
            future_indices = np.arange(len(grouped), len(grouped) + forecast_periods)
            X_future = future_indices.reshape(-1, 1)
            X_future_poly = poly.transform(X_future)
            
            future_preds = model.predict(X_future_poly)
            # Clip negative forecast values
            future_preds = np.clip(future_preds, a_min=0, a_max=None)

            # Generate future timestamps
            last_date = grouped[date_col].max()
            future_dates = [last_date + timedelta(days=(i+1)* (30 if freq=="MS" else (7 if freq=="W" else 1))) for i in range(forecast_periods)]
            
            # 3. Create Plotly layout
            plotly_json = {
                "data": [
                    {
                        "x": [str(d.date()) for d in grouped[date_col]],
                        "y": y.tolist(),
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": f"Historical {target_col}",
                        "line": {"color": "#6366f1"}
                    },
                    {
                        "x": [str(d.date()) for d in grouped[date_col]],
                        "y": hist_preds.tolist(),
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Historical Trend",
                        "line": {"color": "#a855f7", "dash": "dot"}
                    },
                    {
                        "x": [str(d.date()) for d in future_dates],
                        "y": future_preds.tolist(),
                        "type": "scatter",
                        "mode": "lines+markers",
                        "name": f"Forecasted {target_col}",
                        "line": {"color": "#14b8a6", "width": 3}
                    }
                ],
                "layout": VisualizationAgent._get_base_layout(
                    f"{target_col} Forecast (Next {forecast_periods} {period_label})", 
                    "Timeline", 
                    target_col
                )
            }

            # 4. Generate LLM commentary on forecast
            mean_hist = float(np.mean(y))
            mean_future = float(np.mean(future_preds))
            pct_change = ((mean_future - mean_hist) / mean_hist * 100) if mean_hist > 0 else 0.0
            
            summary_prompt = f"""
Trend Forecasting Details:
- Target Variable: {target_col}
- Temporal Resolution: {freq} (Period span: {period_label})
- Average Historical Value: {mean_hist:.2f}
- Average Forecasted Value (next {forecast_periods} periods): {mean_future:.2f}
- Predicted Net Growth/Decline: {pct_change:.1f}%

Write an executive explanation (2-3 sentences) of this predictive forecast, outlining whether the trend is growing or declining, potential business implications, and suggestions on demand/resource planning.
"""
            messages = [{"role": "user", "content": summary_prompt}]
            commentary = await LLMService.chat_completion(
                messages=messages,
                system_prompt="You are a senior forecasting consultant. Write a brief predictive commentary."
            )

            return {
                "success": True,
                "target_col": target_col,
                "date_col": date_col,
                "forecast_periods": forecast_periods,
                "period_label": period_label,
                "plotly_json": plotly_json,
                "commentary": commentary.strip()
            }

        except Exception as e:
            logger.error(f"Error in ForecastingAgent: {e}")
            return {
                "success": False,
                "message": f"Error running mathematical forecasting model: {str(e)}"
            }
