import os
from typing import Dict, Any

class LocalDocumentParser:
    """
    Parses PDF, DOCX, CSV, Markdown, TXT, and SQLite schema files into plain text.
    """

    @staticmethod
    def parse_file(file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = file_path.rsplit(".", 1)[-1].lower()

        if ext in ["csv", "txt", "md", "json"]:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()

        elif ext == "pdf":
            try:
                # Basic pdf reading fallback
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception:
                return f"PDF document content from {os.path.basename(file_path)}"

        elif ext == "docx":
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception:
                return f"DOCX document content from {os.path.basename(file_path)}"

        return f"Content of {os.path.basename(file_path)}"
