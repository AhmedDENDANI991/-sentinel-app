"""
Cas de référence — bâtiment R+4 à El Achour (Alger), zone sismique III.

Vérifie la cascade complète MSP -> MCC -> MCS2 -> MD -> MF -> MVR et l'absence
de NaN, ainsi que des ordres de grandeur plausibles.
"""
import math

import pytest

from genie_calc.models import (
    LevelLoad,
    ProjectParams,
    SeismicZone,
    SiteCategory,
    StructuralSystem,
    UsageGroup,
)
from genie_calc.pipeline import run_full_study


@pytest.fixture
def el_achour_params() -> ProjectParams:
    # El Achour, Alger -> zone III. Habitation -> groupe 2. Site meuble S3.
    return ProjectParams(
        name="Résidence El Achour R+4",
        zone=SeismicZone.III,
        usage_group=UsageGroup.G2,
        site=SiteCategory.S3,
        q_adm_kpa=200.0,
        n_levels=5,
        storey_height_m=3.06,
        system=StructuralSystem.MIXTE_PORTIQUES_VOILES,
    )


@pytest.fixture
def el_achour_levels() -> list[LevelLoad]:
    area = 240.0  # m2 par niveau
    levels = []
    for i in range(5):
        is_terrace = i == 4
        levels.append(
            LevelLoad(
                level=i,
                area_m2=area,
                g_kpa=6.5 if is_terrace else 6.0,
                q_kpa=1.0 if is_terrace else 1.5,
                height_m=3.06 * (i + 1),
            )
        )
    return levels


def test_el_achour_full_study(el_achour_params, el_achour_levels):
    study = run_full_study(
        el_achour_params, el_achour_levels,
        footprint_m2=240.0, n_columns=12,
    )

    # Pas de NaN nulle part dans le résultat sérialisé.
    def assert_finite(obj, path="root"):
        if isinstance(obj, float):
            assert math.isfinite(obj), f"NaN/inf à {path}"
        elif isinstance(obj, dict):
            for k, v in obj.items():
                assert_finite(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                assert_finite(v, f"{path}[{i}]")

    assert_finite(study)

    # Ordres de grandeur.
    seis = study["seismic"]
    assert seis["A"] == 0.25                 # zone III, groupe 2
    assert seis["R"] == 5.0                  # mixte
    assert seis["base_shear_kn"] > 0
    # V ne doit pas dépasser le poids total (cohérence physique).
    assert seis["base_shear_kn"] < study["w_total_kn"]
    # Somme des forces ~ V.
    total_f = sum(f["force_kn"] for f in seis["storey_forces"])
    assert total_f == pytest.approx(seis["base_shear_kn"], rel=1e-2)

    # Fondations cohérentes avec q_adm=200 kPa.
    assert study["foundation"]["bearing_check_ratio"] <= 1.0
    assert study["foundation"]["ok"]

    # Prédimensionnement plausible.
    assert study["predim"]["column"]["side_m"] >= 0.30
    assert study["predim"]["slab_thickness_m"] >= 0.12

    # Pas d'erreur bloquante MVR sur ce cas nominal.
    assert study["blocking"] is False


def test_overturning_moment_positive(el_achour_params, el_achour_levels):
    study = run_full_study(el_achour_params, el_achour_levels,
                           footprint_m2=240.0, n_columns=12)
    assert study["seismic"]["overturning_moment_knm"] > 0
