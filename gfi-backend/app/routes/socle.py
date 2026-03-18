"""
Socle 0 - Reference Data Management API
Manage entities, projects, associates, and their shares.
"""

from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel
from app.database import get_db

router = APIRouter()


# --- Pydantic models ---

class EntityCreate(BaseModel):
    code: str
    name: str
    nif: str | None = None
    rc: str | None = None
    nis: str | None = None
    address: str | None = None


class ProjectCreate(BaseModel):
    code: str
    name: str
    entity_code: str
    description: str | None = None
    status: str = "ACTIF"
    budget: float = 0
    surface: float = 0


class AssociateCreate(BaseModel):
    name: str
    nif: str | None = None
    email: str | None = None
    phone: str | None = None


class ShareCreate(BaseModel):
    associate_id: int
    project_id: int
    share_percentage: float
    capital_amount: float = 0


# --- Entities ---

@router.get("/entities")
async def list_entities() -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM entities ORDER BY code").fetchall()
        return {"entities": [dict(r) for r in rows]}


@router.post("/entities")
async def create_entity(entity: EntityCreate) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO entities (code, name, nif, rc, nis, address) VALUES (?, ?, ?, ?, ?, ?)",
            (entity.code, entity.name, entity.nif, entity.rc, entity.nis, entity.address),
        )
        return {"status": "created", "entity": entity.model_dump()}


@router.put("/entities/{entity_id}")
async def update_entity(entity_id: int, entity: EntityCreate) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute(
            "UPDATE entities SET code=?, name=?, nif=?, rc=?, nis=?, address=? WHERE id=?",
            (entity.code, entity.name, entity.nif, entity.rc, entity.nis, entity.address, entity_id),
        )
        return {"status": "updated", "entity": entity.model_dump()}


@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: int) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute("DELETE FROM entities WHERE id=?", (entity_id,))
        return {"status": "deleted", "id": entity_id}


# --- Projects ---

@router.get("/projects")
async def list_projects() -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT p.*, e.name as entity_name FROM projects p "
            "LEFT JOIN entities e ON p.entity_id = e.id ORDER BY p.code"
        ).fetchall()
        return {"projects": [dict(r) for r in rows]}


@router.post("/projects")
async def create_project(project: ProjectCreate) -> dict[str, Any]:
    with get_db() as conn:
        entity = conn.execute(
            "SELECT id FROM entities WHERE code = ?", (project.entity_code,)
        ).fetchone()
        entity_id = entity["id"] if entity else None

        conn.execute(
            "INSERT INTO projects (code, name, entity_id, description, status, budget, surface) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (project.code, project.name, entity_id, project.description,
             project.status, project.budget, project.surface),
        )
        return {"status": "created", "project": project.model_dump()}


@router.put("/projects/{project_id}")
async def update_project(project_id: int, project: ProjectCreate) -> dict[str, Any]:
    with get_db() as conn:
        entity = conn.execute(
            "SELECT id FROM entities WHERE code = ?", (project.entity_code,)
        ).fetchone()
        entity_id = entity["id"] if entity else None

        conn.execute(
            "UPDATE projects SET code=?, name=?, entity_id=?, description=?, status=?, budget=?, surface=? WHERE id=?",
            (project.code, project.name, entity_id, project.description,
             project.status, project.budget, project.surface, project_id),
        )
        return {"status": "updated", "project": project.model_dump()}


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute("DELETE FROM projects WHERE id=?", (project_id,))
        return {"status": "deleted", "id": project_id}


# --- Associates ---

@router.get("/associates")
async def list_associates() -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM associates ORDER BY name").fetchall()
        associates = []
        for r in rows:
            assoc = dict(r)
            shares = conn.execute(
                "SELECT s.*, p.code as project_code, p.name as project_name "
                "FROM associate_shares s "
                "JOIN projects p ON s.project_id = p.id "
                "WHERE s.associate_id = ?",
                (assoc["id"],),
            ).fetchall()
            assoc["shares"] = [dict(s) for s in shares]
            associates.append(assoc)
        return {"associates": associates}


@router.post("/associates")
async def create_associate(associate: AssociateCreate) -> dict[str, Any]:
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO associates (name, nif, email, phone) VALUES (?, ?, ?, ?)",
            (associate.name, associate.nif, associate.email, associate.phone),
        )
        return {"status": "created", "id": cursor.lastrowid, "associate": associate.model_dump()}


@router.put("/associates/{associate_id}")
async def update_associate(associate_id: int, associate: AssociateCreate) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute(
            "UPDATE associates SET name=?, nif=?, email=?, phone=? WHERE id=?",
            (associate.name, associate.nif, associate.email, associate.phone, associate_id),
        )
        return {"status": "updated", "associate": associate.model_dump()}


@router.delete("/associates/{associate_id}")
async def delete_associate(associate_id: int) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute("DELETE FROM associate_shares WHERE associate_id=?", (associate_id,))
        conn.execute("DELETE FROM associates WHERE id=?", (associate_id,))
        return {"status": "deleted", "id": associate_id}


# --- Shares ---

@router.post("/shares")
async def create_share(share: ShareCreate) -> dict[str, Any]:
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO associate_shares "
            "(associate_id, project_id, share_percentage, capital_amount) "
            "VALUES (?, ?, ?, ?)",
            (share.associate_id, share.project_id, share.share_percentage, share.capital_amount),
        )
        return {"status": "created", "share": share.model_dump()}


@router.get("/shares")
async def list_shares() -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT s.*, a.name as associate_name, p.code as project_code, p.name as project_name "
            "FROM associate_shares s "
            "JOIN associates a ON s.associate_id = a.id "
            "JOIN projects p ON s.project_id = p.id "
            "ORDER BY p.code, a.name"
        ).fetchall()
        return {"shares": [dict(r) for r in rows]}
