"""
Connecteur ETABS (CSI) — svc-etabs.

Interface d'analyse + export SAF (Structural Analysis Format). Mode `mock` par
défaut (résultats simulés). Mode `live` : API CSI OAPI (Windows + ETABS). README.md.
"""
from __future__ import annotations

import os
from typing import Any, Dict

MODE = os.environ.get("ETABS_MODE", "mock")


def export_saf(study: Dict[str, Any]) -> Dict[str, Any]:
    """Représentation SAF simplifiée (tables) du modèle."""
    seismic = study.get("seismic", {})
    return {
        "format": "SAF",
        "StructuralPointConnections": len(seismic.get("storey_forces", [])),
        "LoadCases": ["G", "Q", "EX", "EY"],
        "base_shear_kn": seismic.get("base_shear_kn"),
    }


def analyze(study: Dict[str, Any]) -> Dict[str, Any]:
    if MODE == "live":
        raise RuntimeError("ETABS_MODE=live : CSI OAPI (Windows + ETABS) requis. Voir README.md.")
    s = study.get("seismic", {})
    return {"engine": "etabs-mock", "base_shear_kn": s.get("base_shear_kn"),
            "period_s": s.get("period_s"), "status": "ok"}


if __name__ == "__main__":
    print(f"svc-etabs worker (mode={MODE}) prêt.")
