"""
Embedded Desktop Backend Launcher for PyInstaller & Tauri bundle.
Launches local FastAPI server on 127.0.0.1:8000 when the desktop app starts.
"""
import sys
import os
import uvicorn
from app.config import settings

def launch_desktop_backend():
    print(f"Starting A3 Analytics Enterprise Backend on http://127.0.0.1:8000...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, log_level="info")

if __name__ == "__main__":
    launch_desktop_backend()
