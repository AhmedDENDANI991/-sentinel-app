"""Pipeline monitoring and management API."""

from typing import Any
from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter()


@router.get("/status")
async def pipeline_status() -> dict[str, Any]:
    """Get overall pipeline status and statistics."""
    with get_db() as conn:
        # Document counts by status
        status_counts = conn.execute(
            "SELECT processing_status, COUNT(*) as count FROM documents "
            "GROUP BY processing_status"
        ).fetchall()

        # Recent processing log
        recent_logs = conn.execute(
            "SELECT document_uuid, layer, status, message, duration_ms, created_at "
            "FROM ingestion_log ORDER BY created_at DESC LIMIT 50"
        ).fetchall()

        # Total documents
        total = conn.execute("SELECT COUNT(*) as cnt FROM documents").fetchone()

        # Average processing time
        avg_time = conn.execute(
            "SELECT AVG(duration_ms) as avg_ms FROM ingestion_log WHERE status = 'OK'"
        ).fetchone()

        # Documents processed today
        today = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE DATE(created_at) = DATE('now')"
        ).fetchone()

        return {
            "pipeline_status": "OPERATIONAL",
            "total_documents": total["cnt"] if total else 0,
            "documents_today": today["cnt"] if today else 0,
            "avg_processing_ms": round(avg_time["avg_ms"], 1) if avg_time and avg_time["avg_ms"] else 0,
            "by_status": {row["processing_status"]: row["count"] for row in status_counts},
            "recent_activity": [dict(l) for l in recent_logs[:20]],
        }


@router.get("/log")
async def pipeline_log(
    document_uuid: str | None = None,
    layer: str | None = None,
    status: str | None = None,
    limit: int = Query(default=100, le=1000),
) -> dict[str, Any]:
    """Query pipeline processing logs."""
    with get_db() as conn:
        conditions = []
        params: list[Any] = []

        if document_uuid:
            conditions.append("document_uuid = ?")
            params.append(document_uuid)
        if layer:
            conditions.append("layer = ?")
            params.append(layer)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = " WHERE " + " AND ".join(conditions) if conditions else ""

        rows = conn.execute(
            f"SELECT * FROM ingestion_log{where} ORDER BY created_at DESC LIMIT ?",
            params + [limit],
        ).fetchall()

        return {
            "count": len(rows),
            "logs": [dict(r) for r in rows],
        }


@router.get("/layers")
async def pipeline_layers() -> dict[str, Any]:
    """Get performance statistics per pipeline layer."""
    with get_db() as conn:
        layers = conn.execute(
            "SELECT layer, "
            "COUNT(*) as total_calls, "
            "SUM(CASE WHEN status = 'OK' THEN 1 ELSE 0 END) as success, "
            "SUM(CASE WHEN status = 'ERROR' THEN 1 ELSE 0 END) as errors, "
            "AVG(duration_ms) as avg_ms, "
            "MAX(duration_ms) as max_ms, "
            "MIN(duration_ms) as min_ms "
            "FROM ingestion_log GROUP BY layer ORDER BY layer"
        ).fetchall()

        return {
            "layers": [
                {
                    "layer": r["layer"],
                    "total_calls": r["total_calls"],
                    "success": r["success"],
                    "errors": r["errors"],
                    "success_rate": round(r["success"] / r["total_calls"] * 100, 1) if r["total_calls"] > 0 else 0,
                    "avg_ms": round(r["avg_ms"], 1) if r["avg_ms"] else 0,
                    "max_ms": r["max_ms"],
                    "min_ms": r["min_ms"],
                }
                for r in layers
            ]
        }
