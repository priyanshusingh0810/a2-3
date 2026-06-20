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
