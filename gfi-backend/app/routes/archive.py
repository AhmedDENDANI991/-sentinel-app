"""Archive browsing and management API."""

from typing import Any
from fastapi import APIRouter
from app.pipeline.c6_archiver import get_archive_tree, get_archive_stats

router = APIRouter()


@router.get("/tree")
async def archive_tree() -> dict[str, Any]:
    """Get the complete archive directory tree."""
    return {"tree": get_archive_tree()}


@router.get("/stats")
async def archive_stats() -> dict[str, Any]:
    """Get archive statistics."""
    return get_archive_stats()
