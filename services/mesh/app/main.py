"""
FastAPI Mesh Analysis Service.
Provides internal microservice endpoints for 3D model geometry analysis.
Source of Truth: SPEC.md §8 & ARCHITECTURE.md §3
"""

import os
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.responses import JSONResponse
from app.schemas import AnalyzeRequest, AnalyzeResponse
from app.analyzer import analyze_mesh_from_url

app = FastAPI(
    title="3D Print Store — Mesh Analysis Service",
    description="Internal microservice for 3D geometry parsing, volume, bounding box, and watertightness checks.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

INTERNAL_TOKEN = os.environ.get("MESH_SERVICE_TOKEN")


def verify_authorization(authorization: str | None = None) -> None:
    """Validates internal bearer token if configured in production/internal environment."""
    if not INTERNAL_TOKEN or INTERNAL_TOKEN.startswith("[GENERATE-"):
        # Development / Unconfigured mode: allow internal requests
        return

    expected = f"Bearer {INTERNAL_TOKEN}"
    if authorization != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing mesh service authorization token.",
        )


@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    """Liveness probe. Returns 200 when service is healthy."""
    return JSONResponse(
        content={
            "status": "ok",
            "service": "mesh-analysis",
            "version": "1.0.0",
        }
    )


@app.post("/analyze", response_model=AnalyzeResponse, tags=["analysis"])
async def analyze_model(
    request: AnalyzeRequest,
    authorization: str | None = Header(None),
) -> AnalyzeResponse:
    """
    Analyzes a 3D model from a signed storage URL.
    Returns polyhedral volume (mm³), bounding box (mm), and watertightness diagnostics.
    """
    verify_authorization(authorization)

    timeout = request.timeoutSeconds or 15.0
    result = await analyze_mesh_from_url(
        file_url=request.fileUrl,
        file_key=request.fileKey,
        timeout_seconds=timeout,
    )
    return result
