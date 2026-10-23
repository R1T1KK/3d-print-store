"""
FastAPI Mesh Analysis Service
Scope: M0 — health check only. Mesh analysis logic added in M2.
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse

app = FastAPI(
    title="3D Print Store — Mesh Analysis Service",
    description="Internal service for 3D mesh geometry analysis using trimesh.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    """Liveness probe. Returns 200 when the service is running."""
    return JSONResponse(content={"status": "ok", "service": "mesh-analysis", "version": "0.1.0"})
