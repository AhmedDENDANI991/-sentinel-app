"""Tests MCC / MRF — charges et revêtements."""
import math

import pytest

from genie_calc import coverings, loads
from genie_calc.models import LevelLoad, UsageGroup
from genie_calc.utils import GenieCalcError


def test_covering_catalog_g_positive_and_finite():
    for name in coverings.CATALOG:
        g = coverings.composition_g(name)
        assert g > 0
        assert math.isfinite(g)


def test_plancher_terrasse_heavier_than_courant_without_partitions():
    # La terrasse (forme de pente + étanchéité) est lourde.
    assert coverings.composition_g("plancher_terrasse") > 4.0


def test_custom_composition():
    g = coverings.custom_composition_g(
        [{"material": "beton_arme", "thickness_m": 0.20}]
    )
    assert g == pytest.approx(5.0)  # 25 * 0.20


def test_unknown_material_raises():
    with pytest.raises(GenieCalcError):
        coverings.custom_composition_g([{"material": "vibranium", "thickness_m": 0.1}])


def test_level_loads_w_formula():
    lv = LevelLoad(level=0, area_m2=100.0, g_kpa=5.0, q_kpa=1.5, height_m=3.0)
    res = loads.level_loads(lv, UsageGroup.G2)
    assert res.g_total_kn == pytest.approx(500.0)
    assert res.q_total_kn == pytest.approx(150.0)
    # W = G + 0.2 Q (groupe 2)
    assert res.w_seismic_kn == pytest.approx(500.0 + 0.2 * 150.0)


def test_beta_higher_for_group_1():
    lv = LevelLoad(level=0, area_m2=100.0, g_kpa=5.0, q_kpa=2.0, height_m=3.0)
    w2 = loads.level_loads(lv, UsageGroup.G2).w_seismic_kn
    w1 = loads.level_loads(lv, UsageGroup.G1B).w_seismic_kn
    assert w1 > w2  # beta 0.30 > 0.20


def test_pool_loads():
    # 2 m de profondeur : pression de fond = 20 kPa, poussée voile = 20 kN/m
    assert loads.pool_hydrostatic_load(2.0) == pytest.approx(20.0)
    assert loads.pool_wall_thrust_resultant(2.0) == pytest.approx(20.0)


def test_negative_area_rejected():
    with pytest.raises(Exception):
        LevelLoad(level=0, area_m2=-1, g_kpa=5, q_kpa=1, height_m=3)


def test_no_nan_in_outputs():
    lv = LevelLoad(level=0, area_m2=120.0, g_kpa=6.0, q_kpa=2.5, height_m=3.0)
    res = loads.level_loads(lv, UsageGroup.G2)
    for v in (res.g_total_kn, res.q_total_kn, res.w_seismic_kn):
        assert math.isfinite(v)
