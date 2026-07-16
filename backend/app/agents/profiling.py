import pandas as pd
import numpy as np
import logging
from typing import Dict, Any, Tuple
from app.services.data_service import DataService

logger = logging.getLogger("a3.agents.profiling")

class DataProfilingAgent:
    @classmethod
    async def profile(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Profiles the dataset and calculates metrics like missing values, duplicates, and health score."""
        logger.info("Executing Data Profiling Agent...")
        
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = total_rows * total_cols
        
        # 1. Missing Values
        null_counts = df.isnull().sum()
        total_nulls = int(null_counts.sum())
        completeness_percentage = 100.0 - ((total_nulls / total_cells) * 100.0) if total_cells > 0 else 100.0
        
        # 2. Duplicate Rows
        duplicate_rows = int(df.duplicated().sum())
        duplicate_percentage = (duplicate_rows / total_rows) * 100.0 if total_rows > 0 else 0.0
        
        # 3. Outlier estimation
        outliers_count = 0
        outliers_by_col = {}
        for col in df.select_dtypes(include=[np.number]).columns:
            series = df[col].dropna()
            if len(series) > 5:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower = q1 - 1.5 * iqr
                upper = q3 + 1.5 * iqr
                count = int(((series < lower) | (series > upper)).sum())
                if count > 0:
                    outliers_count += count
                    outliers_by_col[col] = count

        # 4. Consistency & Completeness scores
        # Consistency deduction: based on outliers and mixed types
        consistency_score = max(0.0, 100.0 - (outliers_count / (total_rows or 1) * 20.0))
        completeness_score = completeness_percentage
        
        # 5. Data Quality Score
        # Deduct penalties for nulls, duplicates, and outliers
        null_penalty = (100.0 - completeness_percentage) * 0.5
        dup_penalty = duplicate_percentage * 0.3
        outlier_penalty = min(20.0, (outliers_count / (total_cells or 1)) * 100.0)
        
        quality_score = max(0.0, min(100.0, 100.0 - (null_penalty + dup_penalty + outlier_penalty)))
        quality_score = round(quality_score, 1)

        profile_report = {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "total_cells": total_cells,
            "null_count": total_nulls,
            "null_percentage": round(100.0 - completeness_percentage, 2),
            "duplicate_count": duplicate_rows,
            "duplicate_percentage": round(duplicate_percentage, 2),
            "outliers_count": outliers_count,
            "outliers_by_column": outliers_by_col,
            "completeness_score": round(completeness_score, 1),
            "consistency_score": round(consistency_score, 1),
            "data_quality_score": quality_score,
            "columns": list(df.columns)
        }
        
        return profile_report
