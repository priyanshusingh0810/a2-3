import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import engine, Base
from app.api import auth, datasets, chat, reports, dashboards
from app.services.llm_service import LLMService

# Setup logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("a3.main")

# Auto-create tables (SQLite local-first)
logger.info("Initializing database schema...")
Base.metadata.create_all(bind=engine)
logger.info("Database tables created successfully.")

# Programmatically check and add column if not exists
from sqlalchemy import text
try:
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            # Check for datasets
            has_dataset_col = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name='datasets' AND column_name='file_content');"
            )).scalar()
            if not has_dataset_col:
                logger.info("Adding column file_content to datasets table...")
                conn.execute(text("ALTER TABLE datasets ADD COLUMN file_content BYTEA;"))
            
            # Check for reports
            has_report_col = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name='reports' AND column_name='file_content');"
            )).scalar()
            if not has_report_col:
                logger.info("Adding column file_content to reports table...")
                conn.execute(text("ALTER TABLE reports ADD COLUMN file_content BYTEA;"))

            # Check for users.llm_provider
            has_provider_col = conn.execute(text(
                "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                "WHERE table_name='users' AND column_name='llm_provider');"
            )).scalar()
            if not has_provider_col:
                logger.info("Adding LLM columns to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_provider VARCHAR(50) DEFAULT 'default';"))
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_model VARCHAR(100);"))
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_api_key VARCHAR(255);"))

            # Check for analysis_jobs new columns
            new_job_cols_pg = [
                ("statistical_report", "JSON"),
                ("ml_report", "JSON"),
                ("business_report", "JSON"),
                ("research_report", "JSON"),
                ("presentation_deck", "JSON"),
                ("scenario_simulations", "JSON"),
                ("explanation_mode_reports", "JSON"),
                ("agent_run_history", "JSON"),
            ]
            for col_name, col_type in new_job_cols_pg:
                has_col = conn.execute(text(
                    f"SELECT EXISTS (SELECT 1 FROM information_schema.columns "
                    f"WHERE table_name='analysis_jobs' AND column_name='{col_name}');"
                )).scalar()
                if not has_col:
                    logger.info(f"Adding column {col_name} to analysis_jobs table...")
                    conn.execute(text(f"ALTER TABLE analysis_jobs ADD COLUMN {col_name} {col_type};"))
        else:
            # SQLite
            res_datasets = conn.execute(text("PRAGMA table_info(datasets);")).fetchall()
            cols_datasets = [r[1] for r in res_datasets]
            if "file_content" not in cols_datasets:
                logger.info("Adding column file_content to datasets table...")
                conn.execute(text("ALTER TABLE datasets ADD COLUMN file_content BLOB;"))
                
            res_reports = conn.execute(text("PRAGMA table_info(reports);")).fetchall()
            cols_reports = [r[1] for r in res_reports]
            if "file_content" not in cols_reports:
                logger.info("Adding column file_content to reports table...")
                conn.execute(text("ALTER TABLE reports ADD COLUMN file_content BLOB;"))

            res_users = conn.execute(text("PRAGMA table_info(users);")).fetchall()
            cols_users = [r[1] for r in res_users]
            if "llm_provider" not in cols_users:
                logger.info("Adding LLM columns to users table...")
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_provider TEXT DEFAULT 'default';"))
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_model TEXT;"))
                conn.execute(text("ALTER TABLE users ADD COLUMN llm_api_key TEXT;"))

            res_analysis = conn.execute(text("PRAGMA table_info(analysis_jobs);")).fetchall()
            cols_analysis = [r[1] for r in res_analysis]
            new_job_cols_lite = [
                ("statistical_report", "TEXT"),
                ("ml_report", "TEXT"),
                ("business_report", "TEXT"),
                ("research_report", "TEXT"),
                ("presentation_deck", "TEXT"),
                ("scenario_simulations", "TEXT"),
                ("explanation_mode_reports", "TEXT"),
                ("agent_run_history", "TEXT"),
            ]
            for col_name, col_type in new_job_cols_lite:
                if col_name not in cols_analysis:
                    logger.info(f"Adding column {col_name} to analysis_jobs table...")
                    conn.execute(text(f"ALTER TABLE analysis_jobs ADD COLUMN {col_name} {col_type};"))
except Exception as e:
    logger.error(f"Error checking/adding columns to DB: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A3 - Autonomous AI Data Analyst Platform",
    version="1.0.0"
)

# Configure CORS
# In production, specify exact domain list instead of ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(datasets.router, prefix=f"{settings.API_V1_STR}/datasets", tags=["Datasets"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["AI Data Chat"])
app.include_router(dashboards.router, prefix=f"{settings.API_V1_STR}/dashboards", tags=["Dashboards"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports"])

@app.get("/health")
async def health_check():
    """Health check endpoint confirming database status and local Ollama reachability."""
    ollama_ok = await LLMService.check_ollama_status()
    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "ollama_connected": ollama_ok,
        "configured_model": settings.OLLAMA_MODEL
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
