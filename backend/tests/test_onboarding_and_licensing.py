import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.license_service import LicenseManagerService
from app.services.settings_service import SettingsManagerService
from app.services.workspace_service import WorkspaceManagerService
from app.db.session import get_db
from app.db import models

client = TestClient(app)

def test_onboarding_status_and_trial():
    # 1. Get onboarding status
    res = client.get("/api/onboarding/status")
    assert res.status_code == 200
    data = res.json()
    assert "setup_completed" in data
    assert "license" in data
    assert data["license"]["is_trial"] is True
    assert data["license"]["status"] == "active"

def test_onboarding_setup_wizard():
    # 2. Submit setup wizard
    payload = {
        "workspace_name": "Test Enterprise Analytics",
        "user_name": "Alice",
        "password": None,
        "selected_model": "llama3:latest",
        "storage_location": "./data",
        "theme": "dark"
    }
    res = client.post("/api/onboarding/setup", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["setup_completed"] is True

    # Re-check status
    res2 = client.get("/api/onboarding/status")
    assert res2.status_code == 200
    assert res2.json()["setup_completed"] is True
    assert res2.json()["workspace_name"] == "Test Enterprise Analytics"

from app.security.licensing import EnterpriseLicensingEngine

def test_onboarding_activate_license():
    valid_key = EnterpriseLicensingEngine.create_mock_signed_license(customer_email="admin@test.local", plan_type="Enterprise", days_valid=365)
    payload = {"license_key": valid_key}
    res = client.post("/api/onboarding/activate-license", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["license"]["is_trial"] is False
