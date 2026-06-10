"""
Connecteur Tekla Structures (svc-tekla) — export IFC.

Mode `mock` (défaut) : génère un en-tête IFC valide (STEP) minimal à partir de
l'étude, sans Tekla. Mode `live` : Tekla Open API (.NET, Windows). Voir README.md.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict

MODE = os.environ.get("TEKLA_MODE", "mock")


def export_ifc(study: Dict[str, Any]) -> str:
    """Produit un fichier IFC (STEP) minimal mais bien formé."""
    name = study.get("project", {}).get("name", "Projet")
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")
    return f"""ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('GENIE_CIVIL_AI IFC export'),'2;1');
FILE_NAME('{name}.ifc','{ts}',('GENIE_CIVIL_AI'),('svc-tekla'),'IFC4','svc-tekla-mock','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('0GENIECIVILAI000000001',$,'{name}',$,$,$,$,$,$);
ENDSEC;
END-ISO-10303-21;
"""


def run(study: Dict[str, Any]) -> Dict[str, Any]:
    if MODE == "live":
        raise RuntimeError("TEKLA_MODE=live : Tekla Open API (.NET/Windows) requis. Voir README.md.")
    return {"engine": "tekla-mock", "ifc_bytes": len(export_ifc(study)), "status": "ok"}


if __name__ == "__main__":
    print(f"svc-tekla worker (mode={MODE}) prêt.")
