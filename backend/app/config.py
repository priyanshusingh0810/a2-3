import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

# Define base paths
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_DIR = BASE_DIR / "reports"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "A3 Analytics"
    API_V1_STR: str = "/api"
    
    # Security & JWT
    # In production, change this secret key to a secure random string
    SECRET_KEY: str = "supersecretkeychangeinproduction123!@#"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "sqlite:///./a3_analytics.db"
    
    # Storage Paths
    UPLOAD_FOLDER: str = str(UPLOAD_DIR)
    REPORT_FOLDER: str = str(REPORT_DIR)
    
    # Local-First LLM Settings (Ollama)
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:latest"  # Default model, fallback to llama3 if not present
    MOCK_AI: bool = False  # Set to True to bypass LLM and use heuristic summaries
    
    # Custom LLM / Cloud Settings
    GEMINI_API_KEY: Optional[str] = None
    LLM_PROVIDER: str = "default"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
