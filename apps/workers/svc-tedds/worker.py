"""
Connecteur Tekla Tedds (svc-tedds) — notes de calcul d'éléments.

Mode `mock` par défaut : renvoie un descriptif de calcul d'élément (poutre/poteau)
formaté. Mode `live` : Tedds API (Windows). Voir README.md.
"""
from __future__ import annotations

import os
from typing import Any, Dict

MODE = os.environ.get("TEDDS_MODE", "mock")


def calc_element(study: Dict[str, Any]) -> Dict[str, Any]:
    if MODE == "live":
        raise RuntimeError("TEDDS_MODE=live : Tedds API (Windows) requis. Voir README.md.")
    predim = study.get("predim", {})
    return {
        "engine": "tedds-mock",
        "beam": predim.get("beam"),
        "column": predim.get("column"),
        "note": "Vérification BAEL/EC2 simulée (mode mock).",
        "status": "ok",
    }


if __name__ == "__main__":
    print(f"svc-tedds worker (mode={MODE}) prêt.")
