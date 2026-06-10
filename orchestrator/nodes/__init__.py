"""
Nœuds de l'orchestrateur (gardiens).

Chaque nœud est une fonction `(GraphState) -> GraphState`. Ils sont volontairement
légers et déterministes : ils inspectent le dépôt et produisent un `NodeResult`.
Les gardiens "lourds" (lint, pytest, semgrep) délèguent aux scripts du dépôt et
ne lèvent jamais d'exception non gérée — un échec se traduit par un statut FAILED
qui fait reboucler la machine vers `04_claude_builder`.
"""
from .guardians import (
    intake_guardian,
    cdc_reader,
    product_planner,
    architecture_guardian,
    claude_builder,
    code_guardian,
    data_contract_guardian,
    calculation_guardian,
    security_guardian,
    integration_guardian,
    e2e_guardian,
    deployment_guardian,
    validation_guardian,
    release_guardian,
)

NODE_SEQUENCE = [
    ("00_intake_guardian", intake_guardian),
    ("01_cdc_reader", cdc_reader),
    ("02_product_planner", product_planner),
    ("03_architecture_guardian", architecture_guardian),
    ("04_claude_builder", claude_builder),
    ("05_code_guardian", code_guardian),
    ("06_data_contract_guardian", data_contract_guardian),
    ("07_calculation_guardian", calculation_guardian),
    ("08_security_guardian", security_guardian),
    ("09_integration_guardian", integration_guardian),
    ("10_e2e_guardian", e2e_guardian),
    ("11_deployment_guardian", deployment_guardian),
    ("12_validation_guardian", validation_guardian),
    ("13_release_guardian", release_guardian),
]

__all__ = ["NODE_SEQUENCE"] + [name for name, _ in NODE_SEQUENCE]
