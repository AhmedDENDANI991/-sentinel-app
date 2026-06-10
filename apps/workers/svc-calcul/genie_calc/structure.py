"""
MCS — Choix du Système structurel.

Détermine le coefficient de comportement R (selon le système), le facteur de
qualité Q (Q = 1 + sum Pq) et fournit les paramètres alimentant MCS2.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from .models import StructuralSystem
from .utils import GenieCalcError, ensure_finite

# Coefficient de comportement R (RPA tableau 4.3, béton armé).
R_BY_SYSTEM: Dict[StructuralSystem, float] = {
    StructuralSystem.PORTIQUES_AUTOSTABLES: 5.0,
    StructuralSystem.VOILES_PORTEURS: 3.5,
    StructuralSystem.MIXTE_PORTIQUES_VOILES: 5.0,
    StructuralSystem.NOYAU: 3.5,
}

# Pénalités Pq des 6 critères de qualité (RPA tableau 4.4) — observés/non observés.
QUALITY_CRITERIA = [
    "conditions_minimales_files_contreventement",
    "redondance_en_plan",
    "regularite_en_plan",
    "regularite_en_elevation",
    "controle_qualite_materiaux",
    "controle_qualite_execution",
]
# Pénalité maximale typique par critère lorsqu'il n'est pas observé.
DEFAULT_PENALTY = 0.05


@dataclass
class StructureChoice:
    system: StructuralSystem
    R: float
    Q: float
    penalties: Dict[str, float]


def behavior_coefficient(system: StructuralSystem) -> float:
    if system not in R_BY_SYSTEM:
        raise GenieCalcError(f"Système structurel non supporté: {system}")
    return R_BY_SYSTEM[system]


def quality_factor(observed: List[str] | None = None,
                   penalties: Dict[str, float] | None = None) -> float:
    """
    Q = 1 + sum(Pq).
    `observed` = critères respectés (Pq = 0). Les autres reçoivent leur pénalité
    (par défaut 0.05). `penalties` permet de surcharger par critère.
    """
    observed = set(observed or [])
    penalties = penalties or {}
    total = 0.0
    for crit in QUALITY_CRITERIA:
        if crit in observed:
            continue
        total += ensure_finite(penalties.get(crit, DEFAULT_PENALTY), name=f"Pq[{crit}]")
    return round(1.0 + total, 4)


def choose_structure(system: StructuralSystem,
                     observed_criteria: List[str] | None = None,
                     penalties: Dict[str, float] | None = None) -> StructureChoice:
    pen = {c: (0.0 if (observed_criteria and c in observed_criteria)
               else (penalties or {}).get(c, DEFAULT_PENALTY))
           for c in QUALITY_CRITERIA}
    return StructureChoice(
        system=system,
        R=behavior_coefficient(system),
        Q=quality_factor(observed_criteria, penalties),
        penalties=pen,
    )
