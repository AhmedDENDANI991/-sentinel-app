"""
C7 - FEEDER: SCF Accounting Entries Management API
Manage proposed and validated accounting entries.
"""

from typing import Any
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.database import get_db

router = APIRouter()


class EntryValidation(BaseModel):
    validated_by: str = "DAF"


@router.get("/entries")
async def list_entries(
    status: str | None = None,
    journal: str | None = None,
    entity_code: str | None = None,
    project_code: str | None = None,
    limit: int = Query(default=50, le=500),
    offset: int = 0,
) -> dict[str, Any]:
    """List accounting entries with filters."""
    with get_db() as conn:
        conditions = []
        params: list[Any] = []

        if status:
            conditions.append("status = ?")
            params.append(status)
        if journal:
            conditions.append("journal = ?")
            params.append(journal)
        if entity_code:
            conditions.append("entity_code = ?")
            params.append(entity_code)
        if project_code:
            conditions.append("project_code = ?")
            params.append(project_code)

        where = " WHERE " + " AND ".join(conditions) if conditions else ""

        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM accounting_entries{where}", params
        ).fetchone()

        rows = conn.execute(
            f"SELECT e.*, d.original_filename "
            f"FROM accounting_entries e "
            f"LEFT JOIN documents d ON e.document_uuid = d.uuid "
            f"{where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        return {
            "total": count_row["cnt"] if count_row else 0,
            "entries": [dict(r) for r in rows],
        }


@router.post("/entries/{entry_id}/validate")
async def validate_entry(entry_id: int, validation: EntryValidation) -> dict[str, Any]:
    """Validate a proposed accounting entry."""
    with get_db() as conn:
        conn.execute(
            "UPDATE accounting_entries SET status = 'VALIDATED', "
            "validated_by = ?, validated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (validation.validated_by, entry_id),
        )
        return {"status": "validated", "entry_id": entry_id}


@router.post("/entries/{entry_id}/reject")
async def reject_entry(entry_id: int) -> dict[str, Any]:
    """Reject a proposed accounting entry."""
    with get_db() as conn:
        conn.execute(
            "UPDATE accounting_entries SET status = 'REJECTED' WHERE id = ?",
            (entry_id,),
        )
        return {"status": "rejected", "entry_id": entry_id}


@router.post("/entries/validate-all-auto")
async def validate_all_auto() -> dict[str, Any]:
    """Validate all AUTO entries (confidence >= 98%)."""
    with get_db() as conn:
        result = conn.execute(
            "UPDATE accounting_entries SET status = 'VALIDATED', "
            "validated_by = 'SYSTEM-AUTO', validated_at = CURRENT_TIMESTAMP "
            "WHERE status = 'AUTO'"
        )
        return {"status": "validated", "count": result.rowcount}


@router.get("/journals")
async def list_journals() -> dict[str, Any]:
    """List all accounting journals with totals."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT journal, COUNT(*) as entry_count, SUM(amount) as total_amount, "
            "SUM(CASE WHEN status = 'PROPOSED' THEN 1 ELSE 0 END) as proposed, "
            "SUM(CASE WHEN status = 'VALIDATED' THEN 1 ELSE 0 END) as validated, "
            "SUM(CASE WHEN status = 'AUTO' THEN 1 ELSE 0 END) as auto "
            "FROM accounting_entries GROUP BY journal ORDER BY journal"
        ).fetchall()

        return {"journals": [dict(r) for r in rows]}


@router.get("/plan-comptable")
async def plan_comptable_summary() -> dict[str, Any]:
    """SCF chart of accounts summary with balances."""
    with get_db() as conn:
        debits = conn.execute(
            "SELECT account_debit as account, SUM(amount) as total "
            "FROM accounting_entries WHERE status IN ('VALIDATED', 'AUTO') "
            "GROUP BY account_debit ORDER BY account_debit"
        ).fetchall()

        credits = conn.execute(
            "SELECT account_credit as account, SUM(amount) as total "
            "FROM accounting_entries WHERE status IN ('VALIDATED', 'AUTO') "
            "GROUP BY account_credit ORDER BY account_credit"
        ).fetchall()

        # SCF account class descriptions
        class_names = {
            '1': 'Comptes de capitaux',
            '2': 'Comptes d\'immobilisations',
            '3': 'Comptes de stocks',
            '4': 'Comptes de tiers',
            '5': 'Comptes financiers',
            '6': 'Comptes de charges',
            '7': 'Comptes de produits',
        }

        return {
            "debits": [dict(r) for r in debits],
            "credits": [dict(r) for r in credits],
            "class_names": class_names,
        }
