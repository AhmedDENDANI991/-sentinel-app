"""Tests MCS2 — calcul sismique RPA (méthode statique équivalente)."""
import math

import pytest

from genie_calc import seismic
from genie_calc.models import (
    ProjectParams,
    SeismicZone,
    SiteCategory,
    StructuralSystem,
    UsageGroup,
)


def test_zone_acceleration_table():
    assert seismic.zone_acceleration(SeismicZone.III, UsageGroup.G2) == 0.25
    assert seismic.zone_acceleration(SeismicZone.I, UsageGroup.G3) == 0.07


def test_damping_correction_floor():
    # xi=7% -> eta ~ 0.882
    assert seismic.damping_correction(7.0) == pytest.approx(0.882, abs=1e-3)
    # amortissement énorme -> plancher 0.7
    assert seismic.damping_correction(30.0) >= 0.7


def test_empirical_period_monotonic():
    t_low = seismic.empirical_period(10.0, StructuralSystem.VOILES_PORTEURS)
    t_high = seismic.empirical_period(30.0, StructuralSystem.VOILES_PORTEURS)
    assert t_high > t_low
    assert math.isfinite(t_low)


def test_dynamic_factor_three_branches():
    eta = 0.882
    t2 = 0.4
    # plage 1 : T <= T2
    assert seismic.dynamic_factor(0.3, t2, eta) == pytest.approx(2.5 * eta)
    # plage 2 décroissante
    d2a = seismic.dynamic_factor(1.0, t2, eta)
    d2b = seismic.dynamic_factor(2.0, t2, eta)
    assert d2a > d2b
    # plage 3 : T > 3 s
    d3 = seismic.dynamic_factor(4.0, t2, eta)
    assert 0 < d3 < d2b


def test_base_shear_formula():
    v = seismic.base_shear(A=0.25, D=2.0, Q=1.1, W=10000.0, R=5.0)
    assert v == pytest.approx(0.25 * 2.0 * 1.1 * 10000.0 / 5.0)


def test_distribute_forces_sum_equals_base_shear():
    weights = [1000.0, 1000.0, 800.0]
    heights = [3.0, 6.0, 9.0]
    forces = seismic.distribute_forces(V=500.0, period_s=0.5,
                                       weights_kn=weights, heights_m=heights)
    total = sum(f.force_kn for f in forces)
    assert total == pytest.approx(500.0, rel=1e-3)


def test_base_shear_equals_max_storey_shear():
    weights = [1000.0, 1000.0, 800.0]
    heights = [3.0, 6.0, 9.0]
    V = 500.0
    forces = seismic.distribute_forces(V, 0.5, weights, heights)
    base = max(f.shear_kn for f in forces)
    assert base == pytest.approx(V, rel=1e-3)


def test_ft_applied_above_07s():
    weights = [1000.0, 1000.0]
    heights = [3.0, 6.0]
    forces = seismic.distribute_forces(V=1000.0, period_s=1.2,
                                       weights_kn=weights, heights_m=heights)
    # Avec Ft, la force du sommet est sur-pondérée vs distribution purement Wi·hi.
    top = max(forces, key=lambda f: f.height_m)
    assert top.force_kn > 0
    assert sum(f.force_kn for f in forces) == pytest.approx(1000.0, rel=1e-3)


def test_full_seismic_pipeline_finite():
    params = ProjectParams(
        name="Test R+4", zone=SeismicZone.III, usage_group=UsageGroup.G2,
        site=SiteCategory.S3, q_adm_kpa=200.0, n_levels=5, storey_height_m=3.06,
        system=StructuralSystem.MIXTE_PORTIQUES_VOILES,
    )
    weights = [1500.0] * 5
    heights = [3.06 * (i + 1) for i in range(5)]
    res = seismic.run_seismic(params, weights, heights)
    assert res.base_shear_kn > 0
    assert math.isfinite(res.overturning_moment_knm)
    assert len(res.storey_forces) == 5


def test_p_delta_checks():
    checks = seismic.p_delta_checks(
        weights_above_kn=[3000.0, 2000.0],
        shears_kn=[500.0, 300.0],
        displacements_m=[0.01, 0.008],
        storey_heights_m=[3.0, 3.0],
    )
    assert all(math.isfinite(c.theta) for c in checks)
    assert all(c.ok for c in checks)  # petits déplacements -> stable
