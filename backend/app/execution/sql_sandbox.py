import sqlite3
import time
from typing import Dict, Any, Optional
from app.execution.base import BaseExecutionSandbox, ExecutionResult
from app.security.sanitizer import InputSanitizationEngine

class SecureSQLSandbox(BaseExecutionSandbox):
    """
    Isolated local SQL execution sandbox.
    Validates natural language SQL queries, enforces read-only access, and caps query result limits.
    """

    def execute(self, code_or_query: str, context: Dict[str, Any], timeout_seconds: int = 15) -> ExecutionResult:
        start_time = time.time()
        
        is_safe, clean_sql, reason = InputSanitizationEngine.sanitize_sql_query(code_or_query)
        if not is_safe:
            return ExecutionResult(
                success=False,
                error=f"SQL Sandbox Validation Failed: {reason}",
                execution_time_ms=0.0
            )

        db_path = context.get("db_path", ":memory:")
        max_rows = context.get("max_rows", 1000)

        # Enforce LIMIT if not present
        clean_sql = clean_sql.rstrip(";").strip()
        if "limit" not in clean_sql.lower():
            clean_sql = f"{clean_sql} LIMIT {max_rows}"

        try:
            should_close = False
            if "conn" in context and isinstance(context["conn"], sqlite3.Connection):
                conn = context["conn"]
            else:
                conn = sqlite3.connect(db_path)
                should_close = True

            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute(clean_sql)
            rows = cursor.fetchall()
            
            columns = [column[0] for column in cursor.description] if cursor.description else []
            data = [dict(row) for row in rows]
            
            if should_close:
                conn.close()
            elapsed = (time.time() - start_time) * 1000

            return ExecutionResult(
                success=True,
                output={
                    "columns": columns,
                    "rows": data,
                    "row_count": len(data)
                },
                stdout=f"Query returned {len(data)} rows.",
                execution_time_ms=round(elapsed, 2)
            )
        except Exception as e:
            elapsed = (time.time() - start_time) * 1000
            return ExecutionResult(
                success=False,
                error=f"Database execution error: {str(e)}",
                execution_time_ms=round(elapsed, 2)
            )
