"""
MCS2 — Calcul Sismique (méthode statique équivalente RPA).

Effort tranchant à la base :        V = A · D · Q · W / R
Facteur d'amplification dynamique :  D = f(T, T2, eta)
Correction d'amortissement :         eta = sqrt(7 / (2 + xi)) >= 0.7
Période empirique :                  T = CT · hN^(3/4)
Distribution par niveau :            Fi = (V - Ft) · Wi·hi / sum(Wj·hj)
                                     Ft = 0.07·T·V  (si T > 0.7 s, sinon 0)
Stabilité P-Delta :                  theta_k = Pk·Δk / (Vk·hk) <= 0.10
"""
from __future__ import annotations

import math
from typing import List

from .models import (
    PDeltaCheck,
    ProjectParams,
    SeismicResult,
    SeismicZone,
    SiteCategory,
    StoreyForce,
    StructuralSystem,
    UsageGroup,
)
from .structure import behavior_coefficient, quality_factor
from .utils import GenieCalcError, ensure_finite, ensure_positive, round_si

# Coefficient d'accélération de zone A (RPA tableau 4.1).
A_TABLE = {
    UsageGroup.G1A: {SeismicZone.I: 0.15, SeismicZone.IIa: 0.25, SeismicZone.IIb: 0.30, SeismicZone.III: 0.40},
    UsageGroup.G1B: {SeismicZone.I: 0.12, SeismicZone.IIa: 0.20, SeismicZone.IIb: 0.25, SeismicZone.III: 0.30},
    UsageGroup.G2:  {SeismicZone.I: 0.10, SeismicZone.IIa: 0.15, SeismicZone.IIb: 0.20, SeismicZone.III: 0.25},
    UsageGroup.G3:  {SeismicZone.I: 0.07, SeismicZone.IIa: 0.10, SeismicZone.IIb: 0.14, SeismicZone.III: 0.18},
}

# Période caractéristique T2 (s) selon catégorie de site (RPA tableau 4.7).
T2_TABLE = {
    SiteCategory.S1: 0.30,
    SiteCategory.S2: 0.40,
    SiteCategory.S3: 0.50,
    SiteCategory.S4: 0.70,
}

# Coefficient CT pour la période empirique (RPA tableau 4.6).
CT_TABLE = {
    StructuralSystem.PORTIQUES_AUTOSTABLES: 0.075,
    StructuralSystem.MIXTE_PORTIQUES_VOILES: 0.050,
    StructuralSystem.VOILES_PORTEURS: 0.050,
    StructuralSystem.NOYAU: 0.050,
}


def zone_acceleration(zone: SeismicZone, usage: UsageGroup) -> float:
    return A_TABLE[usage][zone]


def damping_correction(damping_pct: float) -> float:
    """eta = sqrt(7 / (2 + xi)), borné à 0.7."""
    xi = ensure_positive(damping_pct, name="damping_pct")
    eta = math.sqrt(7.0 / (2.0 + xi))
    return round_si(max(eta, 0.7))


def empirical_period(total_height_m: float, system: StructuralSystem) -> float:
    """T = CT · hN^(3/4)."""
    hn = ensure_positive(total_height_m, name="total_height_m")
    ct = CT_TABLE[system]
    return round_si(ct * hn ** 0.75)


def dynamic_factor(period_s: float, t2_s: float, eta: float) -> float:
    """Facteur d'amplification dynamique D (3 plages de période)."""
    t = ensure_positive(period_s, name="period_s")
    t2 = ensure_positive(t2_s, name="t2_s")
    eta = ensure_positive(eta, name="eta")
    if t <= t2:
        d = 2.5 * eta
    elif t <= 3.0:
        d = 2.5 * eta * (t2 / t) ** (2.0 / 3.0)
    else:
        d = 2.5 * eta * (t2 / 3.0) ** (2.0 / 3.0) * (3.0 / t) ** (5.0 / 3.0)
    return round_si(d)


def base_shear(A: float, D: float, Q: float, W: float, R: float) -> float:
    """V = A · D · Q · W / R."""
    R = ensure_positive(R, name="R")
    for n, v in (("A", A), ("D", D), ("Q", Q), ("W", W)):
        ensure_finite(v, name=n)
    return round_si(A * D * Q * W / R)


def distribute_forces(V: float, period_s: float,
                      weights_kn: List[float], heights_m: List[float]) -> List[StoreyForce]:
    """
    Distribution verticale de V :
        Ft = 0.07·T·V (si T > 0.7 s, plafonné à 0.25·V), appliqué au sommet
        Fi = (V - Ft) · Wi·hi / sum(Wj·hj)
    Renvoie les forces et efforts tranchants cumulés (du haut vers le bas).
    """
    if len(weights_kn) != len(heights_m):
        raise GenieCalcError("weights_kn et heights_m doivent avoir la même longueur")
    if not weights_kn:
        raise GenieCalcError("Aucun niveau fourni")

    t = ensure_positive(period_s, name="period_s")
    denom = sum(ensure_positive(w, name="Wi") * ensure_positive(h, name="hi")
                for w, h in zip(weights_kn, heights_m))
    if denom <= 0:
        raise GenieCalcError("Somme Wi·hi nulle")

    ft = 0.07 * t * V if t > 0.7 else 0.0
    ft = min(ft, 0.25 * V)

    top_index = max(range(len(heights_m)), key=lambda i: heights_m[i])
    forces: List[float] = []
    for i, (w, h) in enumerate(zip(weights_kn, heights_m)):
        fi = (V - ft) * (w * h) / denom
        if i == top_index:
            fi += ft
        forces.append(fi)

    # Effort tranchant cumulé : du niveau le plus haut vers le bas.
    order = sorted(range(len(heights_m)), key=lambda i: heights_m[i], reverse=True)
    cumulative = 0.0
    shear_by_index = [0.0] * len(forces)
    for idx in order:
        cumulative += forces[idx]
        shear_by_index[idx] = cumulative

    return [
        StoreyForce(
            level=i,
            height_m=round_si(heights_m[i]),
            weight_kn=round_si(weights_kn[i]),
            force_kn=round_si(forces[i]),
            shear_kn=round_si(shear_by_index[i]),
        )
        for i in range(len(forces))
    ]


def overturning_moment(forces: List[StoreyForce]) -> float:
    """Moment de renversement à la base = sum Fi · hi."""
    return round_si(sum(f.force_kn * f.height_m for f in forces))


def run_seismic(params: ProjectParams, weights_kn: List[float],
                heights_m: List[float], observed_criteria: List[str] | None = None) -> SeismicResult:
    """Pipeline MCS2 complet à partir des paramètres MSP et des poids MCC."""
    A = zone_acceleration(params.zone, params.usage_group)
    eta = damping_correction(params.damping_pct)
    T = empirical_period(params.total_height_m, params.system)
    T2 = T2_TABLE[params.site]
    D = dynamic_factor(T, T2, eta)
    R = behavior_coefficient(params.system)
    Q = quality_factor(observed_criteria)
    W = sum(ensure_positive(w, name="Wi") for w in weights_kn)
    V = base_shear(A, D, Q, W, R)
    forces = distribute_forces(V, T, weights_kn, heights_m)
    return SeismicResult(
        period_s=T, A=A, D=D, Q=Q, R=R, eta=eta,
        W_total_kn=round_si(W), base_shear_kn=V,
        storey_forces=forces,
        overturning_moment_knm=overturning_moment(forces),
    )


def p_delta_checks(weights_above_kn: List[float], shears_kn: List[float],
                   displacements_m: List[float], storey_heights_m: List[float],
                   limit: float = 0.10) -> List[PDeltaCheck]:
    """
    Vérification de l'effet P-Delta : theta_k = Pk·Δk / (Vk·hk) <= limit.
    Pk = poids cumulé au-dessus du niveau k, Δk = déplacement relatif d'étage.
    """
    n = len(weights_above_kn)
    if not (n == len(shears_kn) == len(displacements_m) == len(storey_heights_m)):
        raise GenieCalcError("Les listes P-Delta doivent avoir la même longueur")
    checks: List[PDeltaCheck] = []
    for k in range(n):
        vk = ensure_positive(shears_kn[k], name="Vk")
        hk = ensure_positive(storey_heights_m[k], name="hk")
        pk = ensure_finite(weights_above_kn[k], name="Pk")
        dk = ensure_finite(displacements_m[k], name="delta_k")
        theta = pk * dk / (vk * hk)
        checks.append(PDeltaCheck(level=k, theta=round_si(theta), ok=theta <= limit))
    return checks
