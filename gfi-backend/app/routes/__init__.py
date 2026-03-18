"""API Routes for GFI v7.0 Ingestion Module."""

from app.routes.intake import router as intake_router
from app.routes.documents import router as documents_router
from app.routes.pipeline import router as pipeline_router
from app.routes.socle import router as socle_router
from app.routes.analytics import router as analytics_router
from app.routes.archive import router as archive_router
from app.routes.accounting import router as accounting_router

__all__ = [
    "intake_router",
    "documents_router",
    "pipeline_router",
    "socle_router",
    "analytics_router",
    "archive_router",
    "accounting_router",
]
