"""Analytics & Dashboard API - Feeds the GFI dashboard with real-time data."""

from typing import Any
from fastapi import APIRouter
from app.database import get_db
from app.pipeline.c6_archiver import get_archive_stats

router = APIRouter()


@router.get("/dashboard")
async def dashboard() -> dict[str, Any]:
    """Main dashboard data - all key metrics."""
    with get_db() as conn:
        # Total documents
        total = conn.execute("SELECT COUNT(*) as cnt FROM documents").fetchone()

        # By status
        by_status = conn.execute(
            "SELECT processing_status, COUNT(*) as count FROM documents GROUP BY processing_status"
        ).fetchall()

        # By entity
        by_entity = conn.execute(
            "SELECT entity_code, COUNT(*) as count FROM documents "
            "WHERE entity_code IS NOT NULL GROUP BY entity_code ORDER BY count DESC"
        ).fetchall()

        # By project
        by_project = conn.execute(
            "SELECT project_code, COUNT(*) as count FROM documents "
            "WHERE project_code IS NOT NULL GROUP BY project_code ORDER BY count DESC"
        ).fetchall()

        # By doc type
        by_type = conn.execute(
            "SELECT doc_type, COUNT(*) as count FROM documents "
            "WHERE doc_type IS NOT NULL GROUP BY doc_type ORDER BY count DESC"
        ).fetchall()

        # Financial summary
        financial = conn.execute(
            "SELECT "
            "SUM(amount_ht) as total_ht, "
            "SUM(amount_tva) as total_tva, "
            "SUM(amount_ttc) as total_ttc, "
            "COUNT(CASE WHEN amount_ttc IS NOT NULL AND amount_ttc > 0 THEN 1 END) as financial_docs "
            "FROM documents WHERE processing_status = 'PROCESSED'"
        ).fetchone()

        # Dedup stats
        dedup = conn.execute(
            "SELECT dedup_level, COUNT(*) as count FROM dedup_log GROUP BY dedup_level"
        ).fetchall()

        # Accounting entries
        accounting = conn.execute(
            "SELECT status, COUNT(*) as count, SUM(amount) as total_amount "
            "FROM accounting_entries GROUP BY status"
        ).fetchall()

        # Average confidence
        avg_conf = conn.execute(
            "SELECT AVG(confidence_score) as avg FROM documents "
            "WHERE processing_status = 'PROCESSED'"
        ).fetchone()

        # Recent documents (last 10)
        recent = conn.execute(
            "SELECT uuid, original_filename, doc_type, entity_code, project_code, "
            "processing_status, confidence_score, created_at "
            "FROM documents ORDER BY created_at DESC LIMIT 10"
        ).fetchall()

        # Documents by period (year/month)
        by_period = conn.execute(
            "SELECT period_year, period_month, COUNT(*) as count, SUM(amount_ttc) as total_amount "
            "FROM documents WHERE period_year IS NOT NULL "
            "GROUP BY period_year, period_month ORDER BY period_year DESC, period_month DESC "
            "LIMIT 24"
        ).fetchall()

        archive = get_archive_stats()

        return {
            "total_documents": total["cnt"] if total else 0,
            "by_status": {r["processing_status"]: r["count"] for r in by_status},
            "by_entity": [{"entity": r["entity_code"], "count": r["count"]} for r in by_entity],
            "by_project": [{"project": r["project_code"], "count": r["count"]} for r in by_project],
            "by_type": [{"type": r["doc_type"], "count": r["count"]} for r in by_type],
            "financial_summary": {
                "total_ht": financial["total_ht"] or 0,
                "total_tva": financial["total_tva"] or 0,
                "total_ttc": financial["total_ttc"] or 0,
                "financial_docs_count": financial["financial_docs"] or 0,
            } if financial else {},
            "dedup_stats": {r["dedup_level"]: r["count"] for r in dedup},
            "accounting_summary": [
                {"status": r["status"], "count": r["count"], "total_amount": r["total_amount"] or 0}
                for r in accounting
            ],
            "avg_confidence": round(avg_conf["avg"], 1) if avg_conf and avg_conf["avg"] else 0,
            "recent_documents": [dict(r) for r in recent],
            "by_period": [dict(r) for r in by_period],
            "archive_stats": archive,
        }


@router.get("/financial-summary")
async def financial_summary() -> dict[str, Any]:
    """Detailed financial analytics."""
    with get_db() as conn:
        # By entity
        by_entity = conn.execute(
            "SELECT entity_code, "
            "SUM(amount_ht) as total_ht, SUM(amount_ttc) as total_ttc, "
            "COUNT(*) as doc_count "
            "FROM documents WHERE amount_ttc IS NOT NULL AND entity_code IS NOT NULL "
            "GROUP BY entity_code"
        ).fetchall()

        # By project
        by_project = conn.execute(
            "SELECT project_code, "
            "SUM(amount_ht) as total_ht, SUM(amount_ttc) as total_ttc, "
            "COUNT(*) as doc_count "
            "FROM documents WHERE amount_ttc IS NOT NULL AND project_code IS NOT NULL "
            "GROUP BY project_code"
        ).fetchall()

        # By type
        by_type = conn.execute(
            "SELECT doc_type, "
            "SUM(amount_ht) as total_ht, SUM(amount_ttc) as total_ttc, "
            "COUNT(*) as doc_count "
            "FROM documents WHERE amount_ttc IS NOT NULL AND doc_type IS NOT NULL "
            "GROUP BY doc_type"
        ).fetchall()

        return {
            "by_entity": [dict(r) for r in by_entity],
            "by_project": [dict(r) for r in by_project],
            "by_type": [dict(r) for r in by_type],
        }


@router.get("/ingestion-report")
async def ingestion_report() -> dict[str, Any]:
    """Generate complete ingestion report."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as cnt FROM documents").fetchone()
        processed = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE processing_status = 'PROCESSED'"
        ).fetchone()
        duplicates = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE processing_status = 'DUPLICATE'"
        ).fetchone()
        quarantine = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE processing_status = 'QUARANTINE'"
        ).fetchone()
        errors = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE processing_status = 'ERROR'"
        ).fetchone()
        pending = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE processing_status = 'PENDING'"
        ).fetchone()

        # Accounting entries
        entries_proposed = conn.execute(
            "SELECT COUNT(*) as cnt, SUM(amount) as total FROM accounting_entries WHERE status = 'PROPOSED'"
        ).fetchone()
        entries_auto = conn.execute(
            "SELECT COUNT(*) as cnt, SUM(amount) as total FROM accounting_entries WHERE status = 'AUTO'"
        ).fetchone()

        # Quarantine details
        quarantine_docs = conn.execute(
            "SELECT uuid, original_filename, doc_type, confidence_score, created_at "
            "FROM documents WHERE processing_status = 'QUARANTINE' ORDER BY created_at DESC"
        ).fetchall()

        # Error details
        error_docs = conn.execute(
            "SELECT uuid, original_filename, created_at "
            "FROM documents WHERE processing_status = 'ERROR' ORDER BY created_at DESC LIMIT 50"
        ).fetchall()

        return {
            "report_date": "now",
            "summary": {
                "total_documents": total["cnt"] if total else 0,
                "processed": processed["cnt"] if processed else 0,
                "duplicates_removed": duplicates["cnt"] if duplicates else 0,
                "in_quarantine": quarantine["cnt"] if quarantine else 0,
                "errors": errors["cnt"] if errors else 0,
                "pending": pending["cnt"] if pending else 0,
            },
            "accounting": {
                "entries_proposed": entries_proposed["cnt"] if entries_proposed else 0,
                "proposed_total_amount": entries_proposed["total"] if entries_proposed else 0,
                "entries_auto": entries_auto["cnt"] if entries_auto else 0,
                "auto_total_amount": entries_auto["total"] if entries_auto else 0,
            },
            "quarantine_documents": [dict(r) for r in quarantine_docs],
            "error_documents": [dict(r) for r in error_docs],
        }
