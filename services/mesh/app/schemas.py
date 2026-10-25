"""
Pydantic request and response schemas for the FastAPI mesh analysis service.
Source of Truth: SPEC.md §4, §8 & ARCHITECTURE.md §4
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    fileUrl: str = Field(..., description="Signed or direct URL to download the 3D model")
    fileKey: Optional[str] = Field(None, description="Internal storage key for tracking")
    timeoutSeconds: Optional[float] = Field(15.0, description="Max execution timeout in seconds")


class AnalyzeResponse(BaseModel):
    status: str = Field(..., description="Validation outcome: 'VALID' or 'INVALID'")
    volumeMm3: Optional[float] = Field(None, description="Polyhedral volume in cubic millimeters")
    sizeXmm: Optional[float] = Field(None, description="Bounding box X dimension in mm")
    sizeYmm: Optional[float] = Field(None, description="Bounding box Y dimension in mm")
    sizeZmm: Optional[float] = Field(None, description="Bounding box Z dimension in mm")
    isWatertight: Optional[bool] = Field(None, description="Whether mesh geometry is watertight / manifold")
    triangleCount: Optional[int] = Field(None, description="Total face / facet count")
    surfaceAreaMm2: Optional[float] = Field(None, description="Surface area in square millimeters")
    issues: List[str] = Field(default_factory=list, description="Diagnostic warnings or failure reasons")
    meshReport: Dict[str, Any] = Field(default_factory=dict, description="Detailed diagnostic telemetry")
