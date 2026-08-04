import os
from app.config import settings

def test_desktop_launcher_module():
    import desktop_launcher
    assert hasattr(desktop_launcher, "launch_desktop_backend")
    assert settings.DATABASE_URL.startswith("sqlite")
