import logging
import os
from logging.handlers import RotatingFileHandler
from app.config import BASE_DIR, settings

def setup_enterprise_logging():
    """Configures rotating file logging and structured output for A3 Analytics Enterprise."""
    log_dir = os.path.join(BASE_DIR, "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "a3_enterprise.log")

    logger = logging.getLogger("a3")
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        # Rotating File Handler (max 10MB per log, keep 5 backups)
        file_handler = RotatingFileHandler(log_file, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        # Stream Console Handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger

enterprise_logger = setup_enterprise_logging()
