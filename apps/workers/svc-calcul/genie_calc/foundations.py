"""
MF — Fondations.

Choix et dimensionnement préliminaire selon la contrainte admissible q_adm :
  - semelle isolée (poteau)         : A = N / q_adm  -> côté carré
  - semelle filante (mur/voile)     : b = q_lineaire / q_adm
  - radier général                  : si surface semelles > ~50% emprise
  - pieux                           : si q_adm faible / charges élevées
La sélection automatique compare le ratio de surface des semelles à l'emprise.
"""
from __future__ import annotations

import math

from .models import FoundationResult, FoundationType
from .utils import ensure_positive, round_si

# Seuils de bascule (heuristiques de prédimensionnement).
RAFT_AREA_RATIO = 0.50          # semelles couvrant >50% -> radier
PILE_QADM_THRESHOLD_KPA = 100.0  # sol très médiocre -> pieux à étudier


def isolated_footing(n_kn: float, q_adm_kpa: float) -> FoundationResult:
    n = ensure_positive(n_kn, name="n_kn")
    q = ensure_positive(q_adm_kpa, name="q_adm_kpa")
    area = n / q
    side = math.ceil(math.sqrt(area) / 0.05) * 0.05
    sigma = n / (side * side)
    ratio = sigma / q
    return FoundationResult(
        type=FoundationType.ISOLATED,
        required_area_m2=round_si(area),
        dimensions={"a_m": round_si(side), "b_m": round_si(side)},
        bearing_check_ratio=round_si(ratio),
        ok=ratio <= 1.0,
        note="Semelle isolée carrée sous poteau.",
    )


def strip_footing(q_lineaire_kn_m: float, q_adm_kpa: float) -> FoundationResult:
    ql = ensure_positive(q_lineaire_kn_m, name="q_lineaire_kn_m")
    q = ensure_positive(q_adm_kpa, name="q_adm_kpa")
    width = ql / q
    width = math.ceil(width / 0.05) * 0.05
    sigma = ql / width
    ratio = sigma / q
    return FoundationResult(
        type=FoundationType.STRIP,
        required_area_m2=round_si(width),  # par mètre linéaire
        dimensions={"b_m": round_si(width), "par_metre_lineaire": 1.0},
        bearing_check_ratio=round_si(ratio),
        ok=ratio <= 1.0,
        note="Semelle filante sous mur/voile (largeur par mètre linéaire).",
    )


def raft(total_load_kn: float, footprint_m2: float, q_adm_kpa: float,
         ribbed: bool = False) -> FoundationResult:
    nt = ensure_positive(total_load_kn, name="total_load_kn")
    emprise = ensure_positive(footprint_m2, name="footprint_m2")
    q = ensure_positive(q_adm_kpa, name="q_adm_kpa")
    sigma = nt / emprise
    ratio = sigma / q
    return FoundationResult(
        type=FoundationType.RAFT_RIBBED if ribbed else FoundationType.RAFT,
        required_area_m2=round_si(emprise),
        dimensions={"surface_m2": round_si(emprise),
                    "epaisseur_estimee_m": round_si(max(0.30, emprise ** 0.5 / 30.0))},
        bearing_check_ratio=round_si(ratio),
        ok=ratio <= 1.0,
        note="Radier nervuré." if ribbed else "Radier général.",
    )


def select_foundation(total_load_kn: float, footprint_m2: float,
                      q_adm_kpa: float, n_columns: int = 1) -> FoundationResult:
    """
    Sélection automatique :
      - q_adm très faible -> pieux (interface, étude détaillée requise)
      - surface des semelles isolées > 50% emprise -> radier
      - sinon -> semelle isolée moyenne par poteau
    """
    nt = ensure_positive(total_load_kn, name="total_load_kn")
    emprise = ensure_positive(footprint_m2, name="footprint_m2")
    q = ensure_positive(q_adm_kpa, name="q_adm_kpa")
    n_cols = max(int(n_columns), 1)

    if q < PILE_QADM_THRESHOLD_KPA:
        return FoundationResult(
            type=FoundationType.PILES,
            required_area_m2=round_si(nt / q),
            dimensions={"recommandation": "pieux", "n_poteaux": float(n_cols)},
            bearing_check_ratio=round_si(1.0),
            ok=True,
            note=("Sol médiocre (q_adm < 100 kPa) : fondations profondes (pieux) "
                  "à étudier — capacité portante par frottement+pointe requise."),
        )

    footings_area = nt / q  # surface totale des semelles isolées
    if footings_area / emprise > RAFT_AREA_RATIO:
        ribbed = n_cols >= 4
        return raft(nt, emprise, q, ribbed=ribbed)

    per_column = nt / n_cols
    res = isolated_footing(per_column, q)
    res.note = f"{n_cols} semelles isolées (charge moyenne {round_si(per_column)} kN/poteau)."
    return res
