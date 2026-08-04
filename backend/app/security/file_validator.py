import os
from typing import Tuple, List

ALLOWED_EXTENSIONS = {
    "csv", "xlsx", "xls", "json", "parquet", "pdf", "docx", "md", "txt", "sqlite", "db"
}

MAX_FILE_SIZE_MB = 250  # Local limit (250MB)

class FileValidationGuard:
    """
    Validates uploaded files for allowed extensions, safe filenames, and maximum file size.
    """

    @staticmethod
    def validate_file(filename: str, file_size_bytes: int) -> Tuple[bool, str]:
        if not filename or "." not in filename:
            return False, "Invalid filename: missing extension."

        ext = filename.rsplit(".", 1)[-1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return False, f"File format '.{ext}' is not supported. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}."

        file_size_mb = file_size_bytes / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            return False, f"File size ({file_size_mb:.1f} MB) exceeds maximum local threshold of {MAX_FILE_SIZE_MB} MB."

        return True, "File validation passed."
