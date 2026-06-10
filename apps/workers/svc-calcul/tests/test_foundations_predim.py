"""Tests MD (prédimensionnement) et MF (fondations)."""
import math

import pytest

from genie_calc import foundations, predim
from genie_calc.models import FoundationType


def test_column_section_grows_with_load():
    small = predim.column_section(500.0)
    big = predim.column_section(3000.0)
    assert big.side_m >= small.side_m
    assert small.side_m >= 0.30  # côté minimal


def test_beam_section_rpa_bounds():
    b = predim.beam_section(6.0)
    assert b.h_m >= 0.30
    assert b.b_m >= 0.20


def test_slab_thickness_cantilever_thicker():
    assert predim.slab_thickness(5.0, cantilever=True) > predim.slab_thickness(5.0)


def test_shear_wall_min():
    assert predim.shear_wall_thickness(3.0) >= 0.15


def test_isolated_footing_bearing_ok():
    f = foundations.isolated_footing(n_kn=800.0, q_adm_kpa=200.0)
    assert f.type == FoundationType.ISOLATED
    assert f.bearing_check_ratio <= 1.0
    assert f.ok


def test_strip_footing():
    f = foundations.strip_footing(q_lineaire_kn_m=150.0, q_adm_kpa=200.0)
    assert f.type == FoundationType.STRIP
    assert f.ok


def test_select_piles_for_weak_soil():
    f = foundations.select_foundation(total_load_kn=5000.0, footprint_m2=200.0,
                                      q_adm_kpa=80.0, n_columns=10)
    assert f.type == FoundationType.PILES


def test_select_raft_for_heavy_load():
    # Charges énormes sur sol moyen -> radier
    f = foundations.select_foundation(total_load_kn=200000.0, footprint_m2=200.0,
                                      q_adm_kpa=150.0, n_columns=12)
    assert f.type in (FoundationType.RAFT, FoundationType.RAFT_RIBBED)


def test_select_isolated_for_light_load():
    f = foundations.select_foundation(total_load_kn=4000.0, footprint_m2=400.0,
                                      q_adm_kpa=250.0, n_columns=12)
    assert f.type == FoundationType.ISOLATED


def test_no_nan():
    f = foundations.isolated_footing(1234.0, 180.0)
    assert math.isfinite(f.bearing_check_ratio)
    assert math.isfinite(f.required_area_m2)
