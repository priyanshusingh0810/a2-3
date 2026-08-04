import logging
from typing import Dict, Any
from app.services.llm_service import LLMService
from app.security.sanitizer import InputSanitizationEngine

logger = logging.getLogger("a3.agents.sql")

class SQLAgent:
    """
    SQL Agent.
    Translates natural language questions into sanitized, read-only SQL queries targeting dataset tables.
    """

    @classmethod
    async def generate_sql(cls, table_name: str, schema_info: Dict[str, Any], query_prompt: str) -> Dict[str, Any]:
        prompt = f"""
        You are an Enterprise SQL Agent.
        Translate the following natural language request into a valid, read-only ANSI SQL SELECT query.

        TABLE NAME: {table_name}
        SCHEMA: {schema_info}
        USER REQUEST: {query_prompt}

        Rules:
        - Output ONLY the SQL SELECT statement.
        - NEVER use DROP, TRUNCATE, DELETE, INSERT, UPDATE, or ALTER.
        """
        try:
            raw_sql = await LLMService.query(prompt=prompt, system_prompt="You produce safe, read-only SQL SELECT queries.")
            # Strip formatting
            sql_clean = raw_sql.replace("```sql", "").replace("```", "").strip()

            is_safe, sanitized_sql, reason = InputSanitizationEngine.sanitize_sql_query(sql_clean)
            if not is_safe:
                logger.warning(f"SQL Agent output failed sanitization: {reason}")
                return {
                    "query_prompt": query_prompt,
                    "sql": f"SELECT * FROM {table_name} LIMIT 100;",
                    "is_safe": False,
                    "reason": reason
                }

            return {
                "query_prompt": query_prompt,
                "sql": sanitized_sql,
                "is_safe": True,
                "reason": "Sanitized successfully"
            }
        except Exception as e:
            logger.error(f"SQL agent query generation error: {e}")
            return {
                "query_prompt": query_prompt,
                "sql": f"SELECT * FROM {table_name} LIMIT 100;",
                "is_safe": True,
                "reason": "Fallback query"
            }
