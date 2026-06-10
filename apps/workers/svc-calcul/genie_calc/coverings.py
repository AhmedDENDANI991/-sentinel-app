"""
MRF — Revêtements.

Catalogue de compositions de planchers/revêtements et calcul de la charge
permanente surfacique G (kPa) par sommation des couches (epaisseur * poids
volumique). Poids volumiques usuels (kN/m3).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from .utils import GenieCalcError, ensure_non_negative, round_si

# Poids volumiques usuels (kN/m3) — DTR B.C.2.2 / valeurs courantes.
UNIT_WEIGHTS_KN_M3: Dict[str, float] = {
    "beton_arme": 25.0,
    "beton_banche": 22.0,
    "mortier_pose": 20.0,
    "carrelage": 22.0,
    "chape": 22.0,
    "enduit_platre": 10.0,
    "enduit_ciment": 18.0,
    "sable": 17.0,
    "etancheite_multicouche": 12.0,
    "forme_pente": 22.0,
    "isolant": 0.5,
    "faux_plafond": 0.2,  # forfait (kN/m2) traité comme surfacique si epaisseur=1
    "cloison_legere": 1.0,  # forfait surfacique
}


@dataclass(frozen=True)
class Layer:
    material: str
    thickness_m: float

    def g_kpa(self) -> float:
        gamma = UNIT_WEIGHTS_KN_M3.get(self.material)
        if gamma is None:
            raise GenieCalcError(f"Matériau inconnu dans le catalogue: {self.material!r}")
        e = ensure_non_negative(self.thickness_m, name=f"thickness[{self.material}]")
        return gamma * e


@dataclass(frozen=True)
class Composition:
    name: str
    layers: List[Layer]

    def g_kpa(self) -> float:
        return round_si(sum(layer.g_kpa() for layer in self.layers))


# Compositions de référence (réutilisables par MCC).
CATALOG: Dict[str, Composition] = {
    "plancher_courant": Composition(
        name="Plancher étage courant (dalle pleine 16cm + revêtement)",
        layers=[
            Layer("beton_arme", 0.16),
            Layer("mortier_pose", 0.02),
            Layer("carrelage", 0.02),
            Layer("enduit_platre", 0.015),
            Layer("cloison_legere", 1.0),  # forfait cloisons réparties (1 kN/m2)
        ],
    ),
    "plancher_terrasse": Composition(
        name="Plancher terrasse inaccessible (étanchéité + forme de pente)",
        layers=[
            Layer("beton_arme", 0.16),
            Layer("forme_pente", 0.10),
            Layer("isolant", 0.04),
            Layer("etancheite_multicouche", 0.02),
            Layer("enduit_platre", 0.015),
        ],
    ),
    "plancher_terrasse_accessible": Composition(
        name="Plancher terrasse accessible",
        layers=[
            Layer("beton_arme", 0.16),
            Layer("forme_pente", 0.10),
            Layer("etancheite_multicouche", 0.02),
            Layer("mortier_pose", 0.02),
            Layer("carrelage", 0.02),
            Layer("enduit_platre", 0.015),
        ],
    ),
    "dalle_piscine": Composition(
        name="Radier/dalle de piscine (étanchéité renforcée)",
        layers=[
            Layer("beton_arme", 0.25),
            Layer("etancheite_multicouche", 0.03),
            Layer("carrelage", 0.02),
            Layer("mortier_pose", 0.02),
        ],
    ),
}


def composition_g(name: str) -> float:
    """Retourne G (kPa) d'une composition du catalogue."""
    comp = CATALOG.get(name)
    if comp is None:
        raise GenieCalcError(
            f"Composition inconnue: {name!r}. Disponibles: {sorted(CATALOG)}"
        )
    return comp.g_kpa()


def custom_composition_g(layers: List[Dict[str, float]]) -> float:
    """Calcule G (kPa) d'une composition fournie dynamiquement."""
    return round_si(sum(Layer(l["material"], l["thickness_m"]).g_kpa() for l in layers))
