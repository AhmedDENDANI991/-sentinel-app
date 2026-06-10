"""
Pipeline de calcul : cascade MSP -> MCC -> MCS2 -> MD -> MF -> MVR.

Fournit `run_full_study`, point d'entrée unique consommé par le worker
svc-calcul et par les tests (cas de référence El Achour).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from . import foundations, loads, predim, regulatory, seismic
from .models import LevelLoad, ProjectParams


def run_full_study(
    params: ProjectParams,
    levels: List[LevelLoad],
    *,
    footprint_m2: float,
    n_columns: int = 1,
    observed_criteria: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Exécute la cascade complète et renvoie un dictionnaire sérialisable JSON."""
    # MCC — charges par niveau + poids sismiques
    load_results = loads.building_loads(levels, params.usage_group)
    weights = [r.w_seismic_kn for r in load_results]
    heights = [lv.height_m for lv in levels]
    w_total = loads.total_seismic_weight(load_results)

    # MCS2 — sismique
    seis = seismic.run_seismic(params, weights, heights, observed_criteria)

    # MD — prédimensionnement (poteau le plus chargé ~ effort à la base / n)
    n_base = max(w_total / max(n_columns, 1), 1.0)
    column = predim.column_section(n_base * 1.35)  # combinaison ELU approchée
    beam = predim.beam_section(max(heights[-1] / params.n_levels if params.n_levels else 4.0, 3.0))
    slab = predim.slab_thickness(5.0)
    wall = predim.shear_wall_thickness(params.storey_height_m)

    # MF — fondations
    found = foundations.select_foundation(
        total_load_kn=w_total, footprint_m2=footprint_m2,
        q_adm_kpa=params.q_adm_kpa, n_columns=n_columns,
    )

    # MVR — vérification réglementaire
    report = regulatory.build_report(seis, found)

    return {
        "project": params.model_dump(mode="json"),
        "loads": [r.model_dump(mode="json") for r in load_results],
        "w_total_kn": w_total,
        "seismic": seis.model_dump(mode="json"),
        "predim": {
            "column": column.__dict__,
            "beam": beam.__dict__,
            "slab_thickness_m": slab,
            "shear_wall_thickness_m": wall,
        },
        "foundation": found.model_dump(mode="json"),
        "regulatory": report.model_dump(mode="json"),
        "blocking": report.blocking,
    }
