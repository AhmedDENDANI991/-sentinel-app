"""Utilitaires communs : garde-fous numériques (NaN interdit)."""
from __future__ import annotations

import math
from typing import Iterable


class GenieCalcError(ValueError):
    """Erreur métier de calcul (entrée invalide, divergence, NaN, etc.)."""


def ensure_finite(value: float, *, name: str) -> float:
    """Refuse NaN / inf. Le CDC interdit explicitement les NaN dans les sorties."""
    if value is None:
        raise GenieCalcError(f"{name}: valeur manquante (None)")
    v = float(value)
    if math.isnan(v):
        raise GenieCalcError(f"{name}: NaN interdit")
    if math.isinf(v):
        raise GenieCalcError(f"{name}: valeur infinie interdite")
    return v


def ensure_positive(value: float, *, name: str) -> float:
    v = ensure_finite(value, name=name)
    if v <= 0:
        raise GenieCalcError(f"{name}: doit être strictement positif (reçu {v})")
    return v


def ensure_non_negative(value: float, *, name: str) -> float:
    v = ensure_finite(value, name=name)
    if v < 0:
        raise GenieCalcError(f"{name}: doit être >= 0 (reçu {v})")
    return v


def round_si(value: float, ndigits: int = 4) -> float:
    """Arrondi stable pour sérialisation JSON (évite le bruit flottant)."""
    return round(ensure_finite(value, name="round_si"), ndigits)


def sum_finite(values: Iterable[float], *, name: str) -> float:
    total = 0.0
    for i, v in enumerate(values):
        total += ensure_finite(v, name=f"{name}[{i}]")
    return total
