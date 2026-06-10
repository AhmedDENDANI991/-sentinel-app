"""
MCC — Calcul des Charges.

Sommation des charges permanentes G et d'exploitation Q par niveau, charge
piscine (poussée hydrostatique simplifiée), et poids sismique par niveau
selon W = G + beta*Q (RPA, beta dépend de l'usage).
"""
from __future__ import annotations

from typing import List

from .models import LevelLoad, LoadResult, UsageGroup
from .utils import ensure_non_negative, ensure_positive, round_si

WATER_UNIT_WEIGHT_KN_M3 = 10.0  # ~9.81, arrondi sécuritaire

# Coefficient beta de pondération de Q dans le poids sismique W (RPA tableau 4.5).
# Valeurs courantes : habitation/bureaux 0.2, stockage/public 0.3-0.4.
BETA_BY_USAGE = {
    UsageGroup.G1A: 0.30,
    UsageGroup.G1B: 0.30,
    UsageGroup.G2: 0.20,
    UsageGroup.G3: 0.20,
}


def seismic_beta(usage: UsageGroup) -> float:
    return BETA_BY_USAGE[usage]


def level_loads(level: LevelLoad, usage: UsageGroup) -> LoadResult:
    """Charges totales (kN) d'un niveau et son poids sismique W."""
    area = ensure_positive(level.area_m2, name="area_m2")
    g = ensure_non_negative(level.g_kpa, name="g_kpa")
    q = ensure_non_negative(level.q_kpa, name="q_kpa")
    beta = seismic_beta(usage)

    g_total = g * area
    q_total = q * area
    w = g_total + beta * q_total
    return LoadResult(
        level=level.level,
        g_total_kn=round_si(g_total),
        q_total_kn=round_si(q_total),
        w_seismic_kn=round_si(w),
    )


def building_loads(levels: List[LevelLoad], usage: UsageGroup) -> List[LoadResult]:
    """MCC principal : charges par niveau pour l'ensemble du bâtiment."""
    return [level_loads(lv, usage) for lv in levels]


def total_seismic_weight(results: List[LoadResult]) -> float:
    """W total = somme des W de niveau (entrée du calcul sismique)."""
    return round_si(sum(r.w_seismic_kn for r in results))


def pool_hydrostatic_load(depth_m: float) -> float:
    """
    Charge hydrostatique au fond d'une piscine (kPa) : p = gamma_w * h.
    Utilisée comme Q additionnelle sur la dalle de fond.
    """
    h = ensure_positive(depth_m, name="depth_m")
    return round_si(WATER_UNIT_WEIGHT_KN_M3 * h)


def pool_wall_thrust_resultant(depth_m: float) -> float:
    """
    Résultante de la poussée triangulaire sur un voile de piscine (kN/m linéaire) :
    P = 0.5 * gamma_w * h^2.
    """
    h = ensure_positive(depth_m, name="depth_m")
    return round_si(0.5 * WATER_UNIT_WEIGHT_KN_M3 * h * h)
