"""
MD — Prédimensionnement (béton armé, règles usuelles BAEL / RPA).

Poteaux : section à partir de l'effort normal et de la contrainte béton.
Poutres : hauteur h = L/10 à L/15, largeur b = 0.4h (>= 20 cm RPA).
Dalles  : épaisseur portée/30 (sur appuis) ou portée/20 (porte-à-faux).
Voiles  : épaisseur min RPA (he/20, >= 15 cm).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

from .utils import ensure_positive, round_si


@dataclass
class ColumnSection:
    n_ult_kn: float
    side_m: float
    area_m2: float


def column_section(n_ult_kn: float, fc28_mpa: float = 25.0,
                   min_side_m: float = 0.30) -> ColumnSection:
    """
    Section carrée de poteau : A >= Nu / (0.6 · fc28) (approche simplifiée,
    contrainte de service réduite). Renvoie un côté arrondi au pas de 5 cm.
    """
    nu = ensure_positive(n_ult_kn, name="n_ult_kn")
    fc = ensure_positive(fc28_mpa, name="fc28_mpa")
    sigma_kpa = 0.6 * fc * 1000.0  # MPa -> kPa
    area_req = nu / sigma_kpa
    side = max(math.sqrt(area_req), min_side_m)
    side = math.ceil(side / 0.05) * 0.05  # pas de 5 cm
    return ColumnSection(n_ult_kn=round_si(nu), side_m=round_si(side),
                         area_m2=round_si(side * side))


@dataclass
class BeamSection:
    span_m: float
    h_m: float
    b_m: float


def beam_section(span_m: float, ratio: float = 12.0) -> BeamSection:
    """h = L/ratio (10..15), b = 0.4h, bornes RPA (b>=20cm, h>=30cm)."""
    L = ensure_positive(span_m, name="span_m")
    ensure_positive(ratio, name="ratio")
    h = max(L / ratio, 0.30)
    h = math.ceil(h / 0.05) * 0.05
    b = max(0.4 * h, 0.20)
    b = math.ceil(b / 0.05) * 0.05
    return BeamSection(span_m=round_si(L), h_m=round_si(h), b_m=round_si(b))


def slab_thickness(span_m: float, cantilever: bool = False) -> float:
    """Épaisseur de dalle pleine : L/30 (appuis) ou L/20 (porte-à-faux), >= 12 cm."""
    L = ensure_positive(span_m, name="span_m")
    e = L / (20.0 if cantilever else 30.0)
    e = max(e, 0.12)
    return round_si(math.ceil(e / 0.01) * 0.01)


def shear_wall_thickness(storey_height_m: float, min_m: float = 0.15) -> float:
    """Épaisseur de voile RPA : max(he/20, 15 cm)."""
    he = ensure_positive(storey_height_m, name="storey_height_m")
    e = max(he / 20.0, min_m)
    return round_si(math.ceil(e / 0.01) * 0.01)
