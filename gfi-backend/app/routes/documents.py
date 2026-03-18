"""Documents API - Query and manage processed documents."""

from typing import Any
from fastapi import APIRouter, Query
from app.database import get_db

router = APIRouter()


@router.get("/")
async def list_documents(
    status: str | None = None,
    entity_code: str | None = None,
    project_code: str | None = None,
    doc_type: str | None = None,
    limit: int = Query(default=50, le=500),
    offset: int = 0,
) -> dict[str, Any]:
    """List documents with optional filters."""
    with get_db() as conn:
        conditions = []
        params: list[Any] = []

        if status:
            conditions.append("processing_status = ?")
            params.append(status)
        if entity_code:
            conditions.append("entity_code = ?")
            params.append(entity_code)
        if project_code:
            conditions.append("project_code = ?")
            params.append(project_code)
        if doc_type:
            conditions.append("doc_type = ?")
            params.append(doc_type)

        where = " WHERE " + " AND ".join(conditions) if conditions else ""

        count_row = conn.execute(f"SELECT COUNT(*) as cnt FROM documents{where}", params).fetchone()
        total = count_row["cnt"] if count_row else 0

        rows = conn.execute(
            f"SELECT uuid, original_filename, canonical_filename, mime_type, file_size, "
            f"entity_code, project_code, doc_type, doc_date, period_year, period_month, "
            f"amount_ht, amount_tva, amount_ttc, counterparty_name, counterparty_nif, "
            f"invoice_number, confidence_score, processing_status, classification_method, "
            f"duplicate_of, created_at, processed_at "
            f"FROM documents{where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "documents": [dict(r) for r in rows],
        }


@router.get("/{doc_uuid}")
async def get_document(doc_uuid: str) -> dict[str, Any]:
    """Get full document details by UUID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE uuid = ?", (doc_uuid,)
        ).fetchone()

        if not row:
            return {"error": "Document not found", "uuid": doc_uuid}

        doc = dict(row)

        # Get pipeline log
        logs = conn.execute(
            "SELECT layer, status, message, duration_ms, created_at "
            "FROM ingestion_log WHERE document_uuid = ? ORDER BY created_at",
            (doc_uuid,),
        ).fetchall()
        doc["pipeline_log"] = [dict(l) for l in logs]

        # Get accounting entries
        entries = conn.execute(
            "SELECT * FROM accounting_entries WHERE document_uuid = ?",
            (doc_uuid,),
        ).fetchall()
        doc["accounting_entries"] = [dict(e) for e in entries]

        # Get dedup info
        dedup = conn.execute(
            "SELECT * FROM dedup_log WHERE document_uuid = ? OR duplicate_uuid = ?",
            (doc_uuid, doc_uuid),
        ).fetchall()
        doc["dedup_info"] = [dict(d) for d in dedup]

        return doc


@router.get("/search/text")
async def search_documents(
    q: str = Query(..., min_length=2),
    limit: int = Query(default=20, le=100),
) -> dict[str, Any]:
    """Full-text search across document content."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT uuid, original_filename, canonical_filename, doc_type, entity_code, "
            "project_code, confidence_score, processing_status, "
            "SUBSTR(ocr_text, MAX(1, INSTR(LOWER(ocr_text), LOWER(?)) - 100), 300) as snippet "
            "FROM documents WHERE ocr_text LIKE ? ORDER BY created_at DESC LIMIT ?",
            (q, f"%{q}%", limit),
        ).fetchall()

        return {
            "query": q,
            "count": len(rows),
            "results": [dict(r) for r in rows],
        }
