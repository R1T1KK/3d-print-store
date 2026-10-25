"""
FastAPI Mesh Analysis Engine.
Computes volume (mm³), bounding box (X, Y, Z mm), triangle count, and watertightness diagnostics using trimesh.
Conforms to SPEC.md §5.4, §8 and SECURITY.md §3.
"""

import io
import os
import httpx
import trimesh
from typing import Optional
from app.schemas import AnalyzeResponse

# Enforce limits defined in SECURITY.md §2.2 & §3.1
MAX_FILE_SIZE_BYTES = 52_428_800  # 50 MB
MAX_FACETS = 3_000_000
BUILD_BED_X_MM = 220.0
BUILD_BED_Y_MM = 220.0
BUILD_BED_Z_MM = 250.0


def infer_file_type(name_or_url: str) -> str:
    """Extract format extension, defaulting to stl."""
    clean = name_or_url.split("?")[0].lower()
    if clean.endswith(".stl"):
        return "stl"
    elif clean.endswith(".obj"):
        return "obj"
    elif clean.endswith(".3mf"):
        return "3mf"
    return "stl"


def analyze_mesh_bytes(content: bytes, file_type: str = "stl") -> AnalyzeResponse:
    """
    Parses and analyzes raw mesh bytes using trimesh.
    Never throws uncaught exceptions; returns structured VALID or INVALID response.
    """
    if not content or len(content) == 0:
        return AnalyzeResponse(
            status="INVALID",
            issues=["Empty file received (0 bytes)."],
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        return AnalyzeResponse(
            status="INVALID",
            issues=[f"File size ({len(content)} bytes) exceeds 50 MB limit."],
        )

    try:
        loaded = trimesh.load(
            io.BytesIO(content),
            file_type=file_type,
            force=None,
        )
    except Exception as exc:
        return AnalyzeResponse(
            status="INVALID",
            issues=[f"Failed to parse 3D file: {str(exc)}"],
        )

    # Normalize Scene objects into a unified single Trimesh
    if isinstance(loaded, trimesh.Scene):
        if len(loaded.geometry) == 0:
            return AnalyzeResponse(
                status="INVALID",
                issues=["3D scene contains no valid geometry."],
            )
        try:
            mesh = trimesh.util.concatenate(loaded.dump())
        except Exception as exc:
            return AnalyzeResponse(
                status="INVALID",
                issues=[f"Failed to consolidate scene geometries: {str(exc)}"],
            )
    elif isinstance(loaded, trimesh.Trimesh):
        mesh = loaded
    else:
        return AnalyzeResponse(
            status="INVALID",
            issues=["Unsupported 3D geometry structure."],
        )

    # Sanity checks on vertices and faces
    if len(mesh.faces) == 0 or len(mesh.vertices) == 0:
        return AnalyzeResponse(
            status="INVALID",
            issues=["Mesh has zero faces or vertices (degenerate geometry)."],
        )

    issues: list[str] = []

    # Facet count check (SECURITY.md §3.1)
    triangle_count = int(len(mesh.faces))
    if triangle_count > MAX_FACETS:
        issues.append(
            f"Facet count ({triangle_count:,}) exceeds safety threshold ({MAX_FACETS:,}). Slicing performance may degrade."
        )

    # Bounding Box Extents (X, Y, Z in mm)
    extents = mesh.extents
    size_x = float(round(extents[0], 2))
    size_y = float(round(extents[1], 2))
    size_z = float(round(extents[2], 2))

    # Printer build volume check (220 x 220 x 250 mm)
    fits_bed = (
        size_x <= BUILD_BED_X_MM
        and size_y <= BUILD_BED_Y_MM
        and size_z <= BUILD_BED_Z_MM
    )
    if not fits_bed:
        issues.append(
            f"Model dimensions ({size_x} × {size_y} × {size_z} mm) exceed build bed volume "
            f"({BUILD_BED_X_MM} × {BUILD_BED_Y_MM} × {BUILD_BED_Z_MM} mm)."
        )

    # Watertight / Manifold verification
    is_watertight = bool(mesh.is_watertight)
    if not is_watertight:
        issues.append(
            "Mesh is non-manifold / non-watertight (contains open edges or holes). Volume estimated from convex bounds."
        )

    # Volume computation in mm³
    try:
        if is_watertight:
            volume_mm3 = float(round(abs(mesh.volume), 2))
        else:
            # Fallback for open meshes: calculate convex hull volume or absolute volume if available
            raw_vol = mesh.volume
            if raw_vol is not None and abs(raw_vol) > 0.01:
                volume_mm3 = float(round(abs(raw_vol), 2))
            else:
                volume_mm3 = float(round(abs(mesh.convex_hull.volume), 2))
    except Exception:
        volume_mm3 = float(round(abs(mesh.convex_hull.volume), 2))

    surface_area_mm2 = float(round(mesh.area, 2))

    # Detailed diagnostic report
    mesh_report = {
        "isWatertight": is_watertight,
        "isWindingConsistent": bool(mesh.is_winding_consistent),
        "eulerNumber": int(mesh.euler_number),
        "vertexCount": int(len(mesh.vertices)),
        "faceCount": triangle_count,
        "fitsBed": fits_bed,
        "bedLimitsMm": {"x": BUILD_BED_X_MM, "y": BUILD_BED_Y_MM, "z": BUILD_BED_Z_MM},
        "extentsMm": {"x": size_x, "y": size_y, "z": size_z},
        "volumeMm3": volume_mm3,
        "surfaceAreaMm2": surface_area_mm2,
    }

    return AnalyzeResponse(
        status="VALID",
        volumeMm3=volume_mm3,
        sizeXmm=size_x,
        sizeYmm=size_y,
        sizeZmm=size_z,
        isWatertight=is_watertight,
        triangleCount=triangle_count,
        surfaceAreaMm2=surface_area_mm2,
        issues=issues,
        meshReport=mesh_report,
    )


async def analyze_mesh_from_url(
    file_url: str,
    file_key: Optional[str] = None,
    timeout_seconds: float = 15.0,
) -> AnalyzeResponse:
    """
    Downloads signed 3D file from URL and performs complete geometry analysis.
    """
    file_type = infer_file_type(file_key or file_url)

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
            resp = await client.get(file_url)
            if resp.status_code != 200:
                return AnalyzeResponse(
                    status="INVALID",
                    issues=[f"Failed to fetch model from storage: HTTP {resp.status_code}"],
                )
            content = resp.content
    except httpx.TimeoutException:
        return AnalyzeResponse(
            status="INVALID",
            issues=[f"Mesh download exceeded {timeout_seconds}s timeout."],
        )
    except Exception as exc:
        return AnalyzeResponse(
            status="INVALID",
            issues=[f"Failed to download mesh: {str(exc)}"],
        )

    return analyze_mesh_bytes(content, file_type=file_type)
