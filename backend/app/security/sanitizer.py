import re
from typing import Tuple, List

PROMPT_INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"disregard prior prompts",
    r"system prompt override",
    r"you are now an unfiltered ai",
    r"jailbreak",
    r"drop database",
    r"truncate table",
    r"delete from users",
]

class InputSanitizationEngine:
    """
    Engine to defend against Prompt Injection and SQL Injection vulnerabilities locally.
    """

    @staticmethod
    def inspect_prompt(prompt: str) -> Tuple[bool, List[str]]:
        """
        Scans input prompt for potential injection attempts.
        Returns (is_safe, list_of_detected_risks)
        """
        risks = []
        lowered = prompt.lower()
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, lowered):
                risks.append(f"Detected suspicious prompt injection pattern: '{pattern}'")

        is_safe = len(risks) == 0
        return is_safe, risks

    @staticmethod
    def sanitize_sql_query(query: str) -> Tuple[bool, str, str]:
        """
        Validates SQL queries to ensure only safe SELECT queries are executed.
        Returns (is_safe, sanitized_query, reason)
        """
        clean_q = query.strip()
        lowered = clean_q.lower()

        # Prohibit destructive SQL statements
        forbidden_keywords = ["drop", "truncate", "delete", "insert", "update", "alter", "grant", "revoke"]
        for kw in forbidden_keywords:
            if re.search(rf"\b{kw}\b", lowered):
                return False, "", f"Prohibited modification keyword '{kw.upper()}' detected in query."

        if not lowered.startswith("select") and not lowered.startswith("with"):
            return False, "", "Only SELECT or WITH queries are permitted."

        return True, clean_q, "Query passed sanitization check."
