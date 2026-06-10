"""
Contrats de données (Pydantic) — miroir Python des schemas Zod partagés.

Cascade imposée par le Data Contract Guardian :
    MSP -> MCC -> MCS2 -> MD -> MF -> MVR -> MGM -> MPD
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# --------------------------------------------------------------------------- #
# Énumérations RPA
# --------------------------------------------------------------------------- #
class SeismicZone(str, Enum):
    """Zonage sismique RPA."""
    I = "I"
    IIa = "IIa"
    IIb = "IIb"
    III = "III"


class UsageGroup(str, Enum):
    """Groupe d'usage RPA (importance de l'ouvrage)."""
    G1A = "1A"   # ouvrages vitaux
    G1B = "1B"   # ouvrages de grande importance
    G2 = "2"     # ouvrages courants (habitation/bureaux)
    G3 = "3"     # ouvrages de faible importance


class SiteCategory(str, Enum):
    """Catégorie de site RPA (S1 rocheux ... S4 très meuble)."""
    S1 = "S1"
    S2 = "S2"
    S3 = "S3"
    S4 = "S4"


class StructuralSystem(str, Enum):
    """Systèmes de contreventement (extrait, béton armé)."""
    PORTIQUES_AUTOSTABLES = "portiques_autostables"          # R = 5
    VOILES_PORTEURS = "voiles_porteurs"                      # R = 3.5
    MIXTE_PORTIQUES_VOILES = "mixte_portiques_voiles"        # R = 5 (interaction)
    NOYAU = "noyau"                                          # R = 3.5


# --------------------------------------------------------------------------- #
# MSP — Paramètres Projet
# --------------------------------------------------------------------------- #
class ProjectParams(BaseModel):
    """MSP : paramètres généraux du projet."""
    name: str = Field(..., min_length=1)
    zone: SeismicZone
    usage_group: UsageGroup
    site: SiteCategory
    q_adm_kpa: float = Field(..., gt=0, description="Contrainte admissible du sol (kPa)")
    n_levels: int = Field(..., ge=1, description="Nombre de niveaux")
    storey_height_m: float = Field(..., gt=0)
    system: StructuralSystem
    damping_pct: float = Field(7.0, gt=0, le=30, description="Amortissement xi (%)")

    @property
    def total_height_m(self) -> float:
        return self.n_levels * self.storey_height_m


# --------------------------------------------------------------------------- #
# MCC — Charges
# --------------------------------------------------------------------------- #
class LevelLoad(BaseModel):
    level: int = Field(..., ge=0)
    area_m2: float = Field(..., gt=0)
    g_kpa: float = Field(..., ge=0, description="Charge permanente surfacique G (kPa)")
    q_kpa: float = Field(..., ge=0, description="Charge d'exploitation Q (kPa)")
    height_m: float = Field(..., gt=0, description="Cote du niveau / hauteur (m)")


class LoadResult(BaseModel):
    level: int
    g_total_kn: float
    q_total_kn: float
    w_seismic_kn: float = Field(..., description="W = G + beta*Q par niveau")


# --------------------------------------------------------------------------- #
# MCS2 — Sismique
# --------------------------------------------------------------------------- #
class StoreyForce(BaseModel):
    level: int
    height_m: float
    weight_kn: float
    force_kn: float
    shear_kn: float = Field(..., description="Effort tranchant cumulé au niveau")


class SeismicResult(BaseModel):
    period_s: float
    A: float
    D: float
    Q: float
    R: float
    eta: float
    W_total_kn: float
    base_shear_kn: float = Field(..., description="V = A*D*Q*W/R")
    storey_forces: List[StoreyForce]
    overturning_moment_knm: float


class PDeltaCheck(BaseModel):
    level: int
    theta: float
    ok: bool


# --------------------------------------------------------------------------- #
# MF — Fondations
# --------------------------------------------------------------------------- #
class FoundationType(str, Enum):
    ISOLATED = "semelle_isolee"
    STRIP = "semelle_filante"
    RAFT = "radier_general"
    RAFT_RIBBED = "radier_nervure"
    PILES = "pieux"


class FoundationResult(BaseModel):
    type: FoundationType
    required_area_m2: float
    dimensions: dict
    bearing_check_ratio: float = Field(..., description="sigma_sol / q_adm (<=1 OK)")
    ok: bool
    note: Optional[str] = None


# --------------------------------------------------------------------------- #
# MVR — Vérification réglementaire
# --------------------------------------------------------------------------- #
class CheckSeverity(str, Enum):
    OK = "ok"
    WARNING = "warning"
    ERROR = "error"


class RegulatoryCheck(BaseModel):
    code: str
    label: str
    severity: CheckSeverity
    value: Optional[float] = None
    limit: Optional[float] = None
    message: str

    @field_validator("code")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class RegulatoryReport(BaseModel):
    checks: List[RegulatoryCheck]

    @property
    def blocking(self) -> bool:
        return any(c.severity == CheckSeverity.ERROR for c in self.checks)
