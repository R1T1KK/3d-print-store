"""
API Integration tests for FastAPI Mesh Service endpoints.
"""

from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.schemas import AnalyzeResponse

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@patch("app.main.analyze_mesh_from_url")
def test_analyze_endpoint_success(mock_analyze) -> None:
    mock_analyze.return_value = AnalyzeResponse(
        status="VALID",
        volumeMm3=12500.0,
        sizeXmm=25.0,
        sizeYmm=25.0,
        sizeZmm=20.0,
        isWatertight=True,
        triangleCount=12,
        surfaceAreaMm2=3250.0,
        issues=[],
        meshReport={"fitsBed": True},
    )

    payload = {
        "fileUrl": "https://storage.example.com/test-box.stl?signed=true",
        "fileKey": "models/user-123/test-box.stl",
    }
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "VALID"
    assert data["volumeMm3"] == 12500.0
    assert data["isWatertight"] is True
    assert data["meshReport"]["fitsBed"] is True
