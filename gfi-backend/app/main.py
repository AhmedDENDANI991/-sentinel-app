"""
GFI v7.0 - Module d'Ingestion Automatique Universelle
Pipeline Big Data 400 Go - Zero Intervention Humaine Post-Depot
Groupe Dendani - Cerveau Digital Ultra-Intelligent
"""

import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db
from app.routes import (
    intake_router,
    documents_router,
    pipeline_router,
    socle_router,
    analytics_router,
    archive_router,
    accounting_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    os.makedirs("/tmp/gfi-archive", exist_ok=True)
    os.makedirs("/tmp/gfi-uploads", exist_ok=True)
    os.makedirs("/tmp/gfi-quarantine", exist_ok=True)
    yield
    # Shutdown


app = FastAPI(
    title="GFI v7.0 - Module d'Ingestion Automatique Universelle",
    description="Pipeline Big Data 400 Go - Groupe Dendani",
    version="7.0.0",
    lifespan=lifespan,
)

# CORS - Allow all origins for deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(intake_router, prefix="/api/intake", tags=["C1 - Intake"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(pipeline_router, prefix="/api/pipeline", tags=["Pipeline"])
app.include_router(socle_router, prefix="/api/socle", tags=["Socle 0 - Reference Data"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics & Dashboard"])
app.include_router(archive_router, prefix="/api/archive", tags=["C6 - Archive"])
app.include_router(accounting_router, prefix="/api/accounting", tags=["C7 - Comptabilite SCF"])


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Serve frontend static files
STATIC_DIR = Path(__file__).parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        file_path = STATIC_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(STATIC_DIR / "index.html"))
