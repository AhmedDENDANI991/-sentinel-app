"""
Connecteur Autodesk Robot Structural Analysis (svc-robot).

MGM : génère un fichier modèle .str (format texte simplifié) à partir de l'étude.
Mode `mock` (défaut) : produit des résultats d'analyse simulés cohérents, sans
licence Robot. Mode `live` : documenté dans README.md (nécessite Robot + API COM
Windows). Bascule via la variable d'environnement ROBOT_MODE.
"""
from __future__ import annotations

import os
from typing import Any, Dict

MODE = os.environ.get("ROBOT_MODE", "mock")


def generate_str_model(study: Dict[str, Any]) -> str:
    """Sérialise un modèle .str minimal (nœuds/barres/charges) depuis l'étude."""
    project = study.get("project", {})
    seismic = study.get("seismic", {})
    lines = [
        "; GENIE_CIVIL_AI — modele Robot (.str) genere automatiquement",
        f"; Projet: {project.get('name', 'sans nom')}",
        f"; Zone: {project.get('zone')}  Systeme: {project.get('system')}",
        "ROBOT97",
        "FRAME 3D",
        f"; V base = {seismic.get('base_shear_kn')} kN  T = {seismic.get('period_s')} s",
        "NODES",
    ]
    for i, sf in enumerate(seismic.get("storey_forces", []), start=1):
        lines.append(f"  NODE {i}  0 0 {sf['height_m']}")
    lines.append("LOADS  ; forces sismiques par niveau (kN)")
    for i, sf in enumerate(seismic.get("storey_forces", []), start=1):
        lines.append(f"  NODE {i}  FX={sf['force_kn']}")
    lines.append("END")
    return "\n".join(lines) + "\n"


def analyze(study: Dict[str, Any]) -> Dict[str, Any]:
    """Renvoie des résultats d'analyse (mock : dérivés de l'étude statique)."""
    seismic = study.get("seismic", {})
    if MODE == "live":
        raise RuntimeError(
            "ROBOT_MODE=live nécessite Robot + l'API COM (Windows). Voir README.md."
        )
    base = seismic.get("base_shear_kn", 0.0)
    return {
        "engine": "robot-mock",
        "base_reaction_kn": base,
        "max_displacement_mm": round(base * 0.002, 3),  # estimation indicative
        "modal_period_s": seismic.get("period_s"),
        "status": "ok",
    }


if __name__ == "__main__":
    print(f"svc-robot worker (mode={MODE}) prêt.")
