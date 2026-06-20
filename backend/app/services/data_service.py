import os
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional

class DataService:
    @staticmethod
    def load_df(file_path: str, file_type: str, limit: Optional[int] = None) -> pd.DataFrame:
        """Loads a file path into a pandas DataFrame."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = file_type.lower()
        if ext == "csv":
            # For massive CSV files, load up to limit if requested
            if limit:
                return pd.read_csv(file_path, nrows=limit)
            return pd.read_csv(file_path)
        elif ext in ["xlsx", "xls"]:
            if limit:
                return pd.read_excel(file_path, nrows=limit)
            return pd.read_excel(file_path)
        elif ext == "json":
            # JSON reading might need orientation handling
            try:
                if limit:
                    # Reading in chunks or loads to handle limit
                    df = pd.read_json(file_path)
                    return df.head(limit)
                return pd.read_json(file_path)
            except ValueError:
                # Try reading line-delimited JSON
                if limit:
                    return pd.read_json(file_path, lines=True, nrows=limit)
                return pd.read_json(file_path, lines=True)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @classmethod
    def get_preview(cls, file_path: str, file_type: str, limit: int = 50) -> Tuple[List[str], List[Dict[str, Any]], int]:
        """Gets a lists of column headers and serialized row dictionaries for UI previews."""
        df = cls.load_df(file_path, file_type, limit=limit)
        
        # Convert dates, times, and timestamps to strings to prevent JSON serialization errors
        import datetime
        df_clean = df.copy()
        for col in df_clean.columns:
            try:
                if pd.api.types.is_datetime64_any_dtype(df_clean[col]):
                    df_clean[col] = df_clean[col].apply(lambda x: x.strftime('%Y-%m-%d %H:%M:%S') if pd.notnull(x) else None)
                else:
                    df_clean[col] = df_clean[col].apply(
                        lambda x: str(x) if isinstance(x, (pd.Timestamp, datetime.date, datetime.time, datetime.datetime)) else x
                    )
            except Exception:
                pass

        # Convert NaN to None for JSON serialization
        df_clean = df_clean.replace({np.nan: None})
        columns = list(df.columns)
        rows = df_clean.to_dict(orient="records")
        
        # Get actual total rows (without limits)
        total_rows = 0
        if file_type.lower() == "csv":
            try:
                # Fast row count for CSV without loading entire file
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    total_rows = sum(1 for _ in f) - 1 # Subtract header
            except Exception:
                total_rows = len(cls.load_df(file_path, file_type))
        else:
            total_rows = len(cls.load_df(file_path, file_type))
            
        return columns, rows, max(0, total_rows)

    @classmethod
    def analyze_metadata(cls, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyzes columns, basic data types, nulls, and statistics."""
        columns_meta = {}
        for col in df.columns:
            series = df[col]
            null_count = int(series.isnull().sum())
            unique_count = int(series.nunique())
            total = len(series)
            
            # Infer data type
            is_numeric = pd.api.types.is_numeric_dtype(series)
            is_datetime = False
            
            # Try to parse string columns as datetime if they look like it
            if not is_numeric:
                try:
                    # Attempt a quick check on non-null values
                    sample = series.dropna().head(10)
                    if len(sample) > 0:
                        parsed = pd.to_datetime(sample, errors='raise')
                        is_datetime = True
                except (ValueError, TypeError):
                    pass
            else:
                # Check if it was parsed as datetime already
                is_datetime = pd.api.types.is_datetime64_any_dtype(series)
                
            data_type = str(series.dtype)
            if is_datetime:
                data_type = "datetime"
            elif is_numeric:
                if "int" in data_type:
                    data_type = "integer"
                else:
                    data_type = "float"
            else:
                data_type = "string/object"

            meta = {
                "name": col,
                "data_type": data_type,
                "is_numeric": is_numeric,
                "is_datetime": is_datetime,
                "null_count": null_count,
                "null_percentage": float((null_count / total) * 100) if total > 0 else 0.0,
                "unique_count": unique_count,
                "description": f"Column '{col}' of type {data_type} containing {unique_count} unique values."
            }

            if is_numeric and not series.dropna().empty:
                meta["mean"] = float(series.mean())
                meta["min"] = float(series.min())
                meta["max"] = float(series.max())
                meta["std"] = float(series.std()) if not pd.isna(series.std()) else 0.0
            else:
                # Non-numeric statistics
                non_null_series = series.dropna()
                if not non_null_series.empty:
                    try:
                        meta["min"] = str(non_null_series.min())
                        meta["max"] = str(non_null_series.max())
                    except TypeError:
                        # Fallback for mixed types that cannot be compared directly
                        str_series = non_null_series.astype(str)
                        meta["min"] = str(str_series.min())
                        meta["max"] = str(str_series.max())

            columns_meta[col] = meta
            
        return columns_meta

    @classmethod
    def profile_data_quality(cls, df: pd.DataFrame) -> Tuple[float, Dict[str, Any]]:
        """Performs automated data quality analysis and generates a scorecard."""
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = total_rows * total_cols
        
        if total_cells == 0:
            return 100.0, {"score": 100.0, "issues": []}

        # Null Analysis
        null_counts = df.isnull().sum()
        total_nulls = int(null_counts.sum())
        null_percentage = (total_nulls / total_cells) * 100
        
        # Duplicate Analysis
        duplicate_rows = int(df.duplicated().sum())
        duplicate_percentage = (duplicate_rows / total_rows) * 100 if total_rows > 0 else 0
        
        # Outlier Analysis (using standard IQR for numeric fields)
        outliers_detected = {}
        total_outliers = 0
        for col in df.select_dtypes(include=[np.number]).columns:
            series = df[col].dropna()
            if len(series) > 5:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                col_outliers = int(((series < lower_bound) | (series > upper_bound)).sum())
                if col_outliers > 0:
                    outliers_detected[col] = {
                        "count": col_outliers,
                        "percentage": float((col_outliers / len(series)) * 100),
                        "bounds": (float(lower_bound), float(upper_bound))
                    }
                    total_outliers += col_outliers

        # Determine Data Quality Score
        # Deduct score for nulls, duplicates, and outliers
        null_penalty = (total_nulls / total_cells) * 50 # Max 50% penalty
        duplicate_penalty = (duplicate_rows / total_rows) * 30 if total_rows > 0 else 0 # Max 30% penalty
        outlier_penalty = (total_outliers / total_cells) * 20 if total_cells > 0 else 0 # Max 20% penalty
        
        quality_score = max(0.0, min(100.0, 100.0 - (null_penalty + duplicate_penalty + outlier_penalty)))
        quality_score = round(quality_score, 1)

        # Structure concrete data quality issues & cleaning recommendations
        issues = []
        recommendations = []

        if duplicate_rows > 0:
            issues.append({
                "severity": "medium",
                "type": "duplicates",
                "message": f"Found {duplicate_rows} duplicate rows ({duplicate_percentage:.2f}% of dataset)."
            })
            recommendations.append({
                "action": "remove_duplicates",
                "target": "all",
                "description": f"Drop all {duplicate_rows} redundant duplicate rows from the dataset."
            })

        for col, null_c in null_counts.items():
            if null_c > 0:
                pct = (null_c / total_rows) * 100
                severity = "high" if pct > 30 else ("medium" if pct > 10 else "low")
                issues.append({
                    "severity": severity,
                    "type": f"missing_values_{col}",
                    "message": f"Column '{col}' has {null_c} missing values ({pct:.2f}%)."
                })
                
                # Numeric or categorical recommendation
                is_num = pd.api.types.is_numeric_dtype(df[col])
                rec_desc = f"Impute missing values in '{col}' using the mean value." if is_num else f"Impute missing values in '{col}' using the mode (most common value) or tag as 'Unknown'."
                recommendations.append({
                    "action": "impute_missing",
                    "target": col,
                    "description": rec_desc
                })

        for col, outlier_info in outliers_detected.items():
            if outlier_info["percentage"] > 2.0:
                issues.append({
                    "severity": "low",
                    "type": f"outliers_{col}",
                    "message": f"Column '{col}' has {outlier_info['count']} outliers ({outlier_info['percentage']:.2f}% of entries outside standard IQR bounds)."
                })
                recommendations.append({
                    "action": "handle_outliers",
                    "target": col,
                    "description": f"Clip outlier values in '{col}' to the 1.5*IQR bounds ({outlier_info['bounds'][0]:.2f} to {outlier_info['bounds'][1]:.2f}) to prevent model skewing."
                })

        quality_report = {
            "score": quality_score,
            "total_rows": total_rows,
            "total_columns": total_cols,
            "null_cells_count": total_nulls,
            "null_cells_percentage": round(null_percentage, 2),
            "duplicate_rows_count": duplicate_rows,
            "duplicate_rows_percentage": round(duplicate_percentage, 2),
            "outliers_count": total_outliers,
            "outliers_by_column": outliers_detected,
            "issues": issues,
            "recommendations": recommendations
        }

        return quality_score, quality_report

    @classmethod
    def clean_dataset(cls, file_path: str, file_type: str, params: Dict[str, Any], output_path: str) -> Tuple[int, int]:
        """Cleans a dataset based on specified parameters and writes it to an output path."""
        df = cls.load_df(file_path, file_type)
        
        # 1. Duplicates
        if params.get("remove_duplicates", True):
            df = df.drop_duplicates()
            
        # 2. Impute missing values
        if params.get("impute_missing", True):
            for col in df.columns:
                if df[col].isnull().sum() > 0:
                    if pd.api.types.is_numeric_dtype(df[col]):
                        mean_val = df[col].mean()
                        if not pd.isna(mean_val):
                            df[col] = df[col].fillna(mean_val)
                    else:
                        # Categorical or text: use mode
                        if not df[col].dropna().empty:
                            mode_val = df[col].mode()[0]
                            df[col] = df[col].fillna(mode_val)
                        else:
                            df[col] = df[col].fillna("Unknown")

        # 3. Handle Outliers
        if params.get("handle_outliers", False):
            for col in df.select_dtypes(include=[np.number]).columns:
                series = df[col]
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                # Clip values to bounds
                df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)

        # 4. Drop Empty Columns
        if params.get("drop_empty_columns", False):
            df = df.dropna(how='all', axis=1)

        # Save to output file (match type)
        ext = file_type.lower()
        if ext == "csv":
            df.to_csv(output_path, index=False)
        elif ext in ["xlsx", "xls"]:
            df.to_excel(output_path, index=False)
        elif ext == "json":
            df.to_json(output_path, orient="records", date_format="iso")
            
        return len(df), len(df.columns)
