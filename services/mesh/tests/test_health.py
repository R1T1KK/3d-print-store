"""
Health check test for the mesh analysis service.
Scope: M0 — tests the /health endpoint only.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    """The /health endpoint must return 200 with status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "mesh-analysis"
