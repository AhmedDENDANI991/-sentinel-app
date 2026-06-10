"""
GENIE_CIVIL_AI — moteur de calcul (svc-calcul).

Implémente les modules métier du CDC :
  MCC  — Calcul des Charges (G/Q, piscine, cloisons, revêtements, W = G + 0.2Q)
  MRF  — Revêtements (catalogues, compositions, calcul de G)
  MCS  — Choix du Système structurel (coefficients R / D / Q, logique RPA)
  MD   — Dimensionnement / prédimensionnement (poteaux, poutres, dalles, voiles)
  MCS2 — Calcul Sismique (méthode statique équivalente RPA, V = A·D·Q·W/R)
  MF   — Fondations (semelles isolées/filantes, radier, pieux)
  MVR  — Vérification Réglementaire

Toutes les fonctions sont déterministes, sans effet de bord, et refusent
explicitement les valeurs non finies (NaN/inf) — voir genie_calc.utils.
"""

from . import loads, coverings, structure, predim, seismic, foundations, regulatory, models
from .utils import GenieCalcError, ensure_finite

__all__ = [
    "loads",
    "coverings",
    "structure",
    "predim",
    "seismic",
    "foundations",
    "regulatory",
    "models",
    "GenieCalcError",
    "ensure_finite",
]

__version__ = "0.1.0"
