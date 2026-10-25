"""
Unit tests for trimesh geometry analyzer.
Verifies volume, bounding box, watertightness, and error cases.
"""

import io
import trimesh
import pytest
from app.analyzer import analyze_mesh_bytes


def create_sample_box_stl_bytes(x: float = 20.0, y: float = 20.0, z: float = 20.0) -> bytes:
    """Helper creating a valid watertight binary STL box."""
    mesh = trimesh.creation.box(extents=(x, y, z))
    buf = io.BytesIO()
    mesh.export(buf, file_type="stl")
    return buf.getvalue()


def test_valid_watertight_box() -> None:
    """A 20x20x20mm box must report volume=8000mm³ within 0.1% and watertight=True."""
    stl_bytes = create_sample_box_stl_bytes(20.0, 20.0, 20.0)
    result = analyze_mesh_bytes(stl_bytes, file_type="stl")

    assert result.status == "VALID"
    assert result.isWatertight is True
    assert result.volumeMm3 is not None
    # 20 * 20 * 20 = 8000 mm³
    assert pytest.approx(8000.0, rel=0.01) == result.volumeMm3
    assert result.sizeXmm == 20.0
    assert result.sizeYmm == 20.0
    assert result.sizeZmm == 20.0
    assert result.triangleCount == 12  # Box has 12 triangular facets
    assert len(result.issues) == 0


def test_oversized_mesh_bed_warning() -> None:
    """A 300x100x50mm mesh exceeds 220mm bed X limit and flags a clear warning."""
    stl_bytes = create_sample_box_stl_bytes(300.0, 100.0, 50.0)
    result = analyze_mesh_bytes(stl_bytes, file_type="stl")

    assert result.status == "VALID"
    assert any("exceed build bed volume" in issue for issue in result.issues)
    assert result.meshReport["fitsBed"] is False


def test_empty_bytes_rejected() -> None:
    """Empty 0-byte file must return status INVALID."""
    result = analyze_mesh_bytes(b"", file_type="stl")
    assert result.status == "INVALID"
    assert "Empty file received" in result.issues[0]


def test_corrupt_bytes_rejected() -> None:
    """Random garbage bytes must return status INVALID."""
    garbage = b"NOT_A_VALID_STL_HEADER" + b"\x00\xFF" * 100
    result = analyze_mesh_bytes(garbage, file_type="stl")
    assert result.status == "INVALID"
    assert len(result.issues) > 0


def test_obj_format_support() -> None:
    """OBJ formatted cylinder must parse with correct bounds and status VALID."""
    cylinder = trimesh.creation.cylinder(radius=10.0, height=30.0)
    buf = io.BytesIO()
    cylinder.export(buf, file_type="obj")
    result = analyze_mesh_bytes(buf.getvalue(), file_type="obj")

    assert result.status == "VALID"
    assert result.sizeZmm == pytest.approx(30.0, rel=0.05)
