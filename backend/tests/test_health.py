from fastapi.testclient import TestClient
from app.main import app
from app.ai.factory import AILocalProviderFactory

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "app_name" in data
    assert "ollama_connected" in data

def test_ai_factory_supported_models():
    factory = AILocalProviderFactory()
    models = factory.get_supported_models()
    assert isinstance(models, list)
    assert len(models) > 0
    assert "qwen2.5:latest" in models
