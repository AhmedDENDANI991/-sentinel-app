"""
Connecteur Revit via Autodesk Platform Services (svc-revit).

Mode `mock` (défaut) : simule l'authentification APS et l'export modèle, sans
identifiants. Mode `live` : OAuth2 client_credentials APS (REVIT_APS_CLIENT_ID /
REVIT_APS_CLIENT_SECRET) — voir README.md. Bascule via REVIT_APS_MODE.
"""
from __future__ import annotations

import os
from typing import Any, Dict

MODE = os.environ.get("REVIT_APS_MODE", "mock")


def get_access_token() -> str:
    if MODE == "live":
        cid = os.environ.get("REVIT_APS_CLIENT_ID")
        secret = os.environ.get("REVIT_APS_CLIENT_SECRET")
        if not (cid and secret):
            raise RuntimeError("REVIT_APS_MODE=live : identifiants APS manquants. Voir README.md.")
        # Implémentation live : POST https://developer.api.autodesk.com/authentication/v2/token
        raise NotImplementedError("Brancher l'appel OAuth2 APS ici.")
    return "mock-aps-token"


def export_model(study: Dict[str, Any]) -> Dict[str, Any]:
    """Export du modèle structurel vers Revit (mock : métadonnées de bucket APS)."""
    get_access_token()
    name = study.get("project", {}).get("name", "projet")
    return {
        "engine": "revit-aps-mock",
        "bucket": "genie-aps-bucket",
        "object_key": f"{name.replace(' ', '_')}.rvt",
        "status": "uploaded",
    }


if __name__ == "__main__":
    print(f"svc-revit worker (mode={MODE}) prêt.")
