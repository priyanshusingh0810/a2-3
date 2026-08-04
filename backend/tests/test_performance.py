from fastapi.testclient import TestClient
from app.main import app
from app.services.cache import cache_manager
from app.services.logger import enterprise_logger

client = TestClient(app)

def test_cache_manager():
    cache_manager.set("test_key", {"status": "ok"}, ttl_seconds=60)
    val = cache_manager.get("test_key")
    assert val == {"status": "ok"}

    stats = cache_manager.get_stats()
    assert stats["hits"] >= 1

def test_enterprise_logger():
    enterprise_logger.info("Testing enterprise rotating log entry...")
    assert enterprise_logger.name == "a3"

def test_telemetry_endpoint():
    res = client.get("/api/telemetry/metrics")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "cpu_usage_pct" in data
    assert "cache" in data
