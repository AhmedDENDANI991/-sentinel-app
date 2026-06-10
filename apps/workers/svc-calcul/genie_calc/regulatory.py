"""
MVR — Vérification Réglementaire.

Agrège des contrôles RPA/BAEL et produit un rapport avec sévérités
(ok / warning / error). Une erreur bloquante interdit le DONE (cf. Guardians).
"""
from __future__ import annotations

from typing import List

from .models import (
    CheckSeverity,
    FoundationResult,
    PDeltaCheck,
    RegulatoryCheck,
    RegulatoryReport,
    SeismicResult,
)

# Effort tranchant minimal réglementaire : V_dynamique >= 0.80 * V_statique
# (RPA art. 4.3.6) — ici contrôle de cohérence si V dynamique fourni.
MIN_DYNAMIC_RATIO = 0.80
# Période empirique majorée admissible : T_calc <= 1.30 * T_empirique.
MAX_PERIOD_RATIO = 1.30


def check_base_shear_nonzero(seismic: SeismicResult) -> RegulatoryCheck:
    ok = seismic.base_shear_kn > 0
    return RegulatoryCheck(
        code="MVR-V01",
        label="Effort tranchant à la base",
        severity=CheckSeverity.OK if ok else CheckSeverity.ERROR,
        value=seismic.base_shear_kn,
        limit=0.0,
        message="V > 0 calculé." if ok else "V nul ou négatif — données sismiques invalides.",
    )


def check_p_delta(checks: List[PDeltaCheck]) -> RegulatoryCheck:
    worst = max((c.theta for c in checks), default=0.0)
    if worst <= 0.10:
        sev = CheckSeverity.OK
        msg = "Effet P-Delta négligeable (theta <= 0.10)."
    elif worst <= 0.20:
        sev = CheckSeverity.WARNING
        msg = "P-Delta à amplifier (0.10 < theta <= 0.20) : majorer les efforts."
    else:
        sev = CheckSeverity.ERROR
        msg = "Instabilité P-Delta (theta > 0.20) : structure à rigidifier."
    return RegulatoryCheck(
        code="MVR-PD01", label="Stabilité P-Delta",
        severity=sev, value=round(worst, 4), limit=0.10, message=msg,
    )


def check_foundation(found: FoundationResult) -> RegulatoryCheck:
    ok = found.ok and found.bearing_check_ratio <= 1.0
    return RegulatoryCheck(
        code="MVR-F01", label="Portance des fondations",
        severity=CheckSeverity.OK if ok else CheckSeverity.ERROR,
        value=found.bearing_check_ratio, limit=1.0,
        message=("sigma_sol <= q_adm vérifié." if ok
                 else "sigma_sol > q_adm : redimensionner la fondation."),
    )


def check_period(seismic: SeismicResult, t_modal_s: float | None = None) -> RegulatoryCheck:
    if t_modal_s is None:
        return RegulatoryCheck(
            code="MVR-T01", label="Période fondamentale",
            severity=CheckSeverity.WARNING, value=seismic.period_s, limit=None,
            message="Période modale non fournie : seule la période empirique est utilisée.",
        )
    ratio = t_modal_s / seismic.period_s if seismic.period_s else float("inf")
    ok = ratio <= MAX_PERIOD_RATIO
    return RegulatoryCheck(
        code="MVR-T01", label="Période fondamentale",
        severity=CheckSeverity.OK if ok else CheckSeverity.WARNING,
        value=round(ratio, 3), limit=MAX_PERIOD_RATIO,
        message=("T_modal <= 1.30·T_empirique." if ok
                 else "T_modal > 1.30·T_empirique : plafonner T pour le calcul de D."),
    )


def build_report(seismic: SeismicResult,
                 foundation: FoundationResult,
                 p_delta: List[PDeltaCheck] | None = None,
                 t_modal_s: float | None = None) -> RegulatoryReport:
    checks = [
        check_base_shear_nonzero(seismic),
        check_period(seismic, t_modal_s),
        check_foundation(foundation),
    ]
    if p_delta:
        checks.append(check_p_delta(p_delta))
    return RegulatoryReport(checks=checks)
