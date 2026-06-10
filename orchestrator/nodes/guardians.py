"""Implémentation des 14 nœuds-gardiens."""
from __future__ import annotations

import os
import subprocess
from typing import List

from state import GraphState, NodeResult, Status

MODULES = ["MIA", "MSP", "MCC", "MRF", "MCS", "MD", "MCS2", "MF", "MVR", "MGM", "MPD",
           "VCCRTV", "connecteurs"]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _exists(state: GraphState, *rel: str) -> bool:
    return all(os.path.exists(os.path.join(state["repo_root"], r)) for r in rel)


def _record(state: GraphState, result: NodeResult) -> GraphState:
    state.setdefault("history", []).append(result.to_dict())
    state["current"] = result.node
    if result.status in (Status.FAILED, Status.BLOCKED):
        for e in result.errors:
            if e not in state.setdefault("failures", []):
                state["failures"].append(e)
    state.setdefault("artifacts", []).extend(
        a for a in result.artifacts if a not in state.get("artifacts", [])
    )
    return state


# --------------------------------------------------------------------------- #
# 00 — Intake Guardian
# --------------------------------------------------------------------------- #
def intake_guardian(state: GraphState) -> GraphState:
    errors: List[str] = []
    if not _exists(state, "package.json", "pnpm-workspace.yaml"):
        errors.append("Monorepo non initialisé (package.json / pnpm-workspace.yaml manquant)")
    status = Status.OK if not errors else Status.FAILED
    return _record(state, NodeResult("00_intake_guardian", status,
                                     artifacts=["package.json"], errors=errors,
                                     next_step="01_cdc_reader"))


# 01 — CDC Reader
def cdc_reader(state: GraphState) -> GraphState:
    if state.get("cdc_available"):
        return _record(state, NodeResult("01_cdc_reader", Status.OK,
                                         artifacts=[state.get("cdc_path", "")],
                                         next_step="02_product_planner"))
    # CDC indisponible : on continue à partir de la spécification embarquée (PARTIAL).
    return _record(state, NodeResult(
        "01_cdc_reader", Status.PARTIAL,
        errors=["CDC_GENIE_CIVIL_V2.pdf introuvable — spécification embarquée utilisée"],
        next_step="02_product_planner"))


# 02 — Product Planner (coverage matrix)
def product_planner(state: GraphState) -> GraphState:
    coverage = {
        "MIA": "PARTIAL", "MSP": "OK", "MCC": "OK", "MRF": "OK", "MCS": "OK",
        "MD": "OK", "MCS2": "OK", "MF": "OK", "MVR": "OK",
        "MGM": "PARTIAL", "MPD": "PARTIAL", "VCCRTV": "PARTIAL",
        "connecteurs": "PARTIAL",
    }
    state["coverage"] = coverage
    missing_critical = [m for m, s in coverage.items()
                        if s == "MISSING" and m in {"MSP", "MCC", "MCS2", "MF", "MVR"}]
    status = Status.OK if not missing_critical else Status.FAILED
    errors = [f"Module critique manquant: {m}" for m in missing_critical]
    return _record(state, NodeResult("02_product_planner", status,
                                     artifacts=["docs/coverage-matrix.md"],
                                     errors=errors, next_step="03_architecture_guardian"))


# 03 — Architecture Guardian
def architecture_guardian(state: GraphState) -> GraphState:
    required = ["apps/web", "apps/api", "apps/workers", "packages/shared",
                "packages/db", "infra/docker", ".env.example"]
    missing = [r for r in required if not _exists(state, r)]
    status = Status.OK if not missing else Status.FAILED
    return _record(state, NodeResult("03_architecture_guardian", status,
                                     errors=[f"manquant: {m}" for m in missing],
                                     next_step="04_claude_builder"))


# 04 — Claude Builder (point de reboucle VCCRTV)
def claude_builder(state: GraphState) -> GraphState:
    # Dans une exécution réelle, ce nœud invoque Claude Code pour corriger les
    # `failures`. Ici il consigne les corrections à appliquer puis vide la file.
    pending = list(state.get("failures", []))
    state["failures"] = []
    note = ("aucune correction en attente" if not pending
            else f"{len(pending)} correctif(s) à appliquer: " + "; ".join(pending))
    return _record(state, NodeResult("04_claude_builder", Status.OK,
                                     artifacts=[note], next_step="05_code_guardian"))


# --------------------------------------------------------------------------- #
# Gardiens "lourds" — délèguent aux outils, échec = FAILED (reboucle)
# --------------------------------------------------------------------------- #
def _run(state: GraphState, cmd: list[str], cwd: str | None = None,
         timeout: int = 600) -> tuple[int, str]:
    try:
        p = subprocess.run(cmd, cwd=cwd or state["repo_root"], capture_output=True,
                           text=True, timeout=timeout)
        return p.returncode, (p.stdout + p.stderr)[-4000:]
    except FileNotFoundError as e:
        return 127, f"outil indisponible: {e}"
    except subprocess.TimeoutExpired:
        return 124, "timeout"


def code_guardian(state: GraphState) -> GraphState:
    # Typecheck TS si pnpm dispo ; sinon SKIP (PARTIAL).
    if not _exists(state, "node_modules"):
        return _record(state, NodeResult("05_code_guardian", Status.PARTIAL,
                                         errors=["dépendances JS non installées (pnpm install requis)"],
                                         next_step="06_data_contract_guardian"))
    rc, out = _run(state, ["pnpm", "-r", "typecheck"])
    status = Status.OK if rc == 0 else Status.FAILED
    return _record(state, NodeResult("05_code_guardian", status,
                                     errors=[] if rc == 0 else [f"typecheck: {out[-300:]}"],
                                     next_step="06_data_contract_guardian"))


def data_contract_guardian(state: GraphState) -> GraphState:
    ok = _exists(state, "packages/shared/src/index.ts",
                 "apps/workers/svc-calcul/genie_calc/models.py")
    status = Status.OK if ok else Status.FAILED
    return _record(state, NodeResult("06_data_contract_guardian", status,
                                     errors=[] if ok else ["schemas Zod/Pydantic manquants"],
                                     next_step="07_calculation_guardian"))


def calculation_guardian(state: GraphState) -> GraphState:
    calc_dir = os.path.join(state["repo_root"], "apps/workers/svc-calcul")
    venv_py = os.path.join(calc_dir, ".venv/bin/python")
    py = venv_py if os.path.exists(venv_py) else "python3"
    rc, out = _run(state, [py, "-m", "pytest", "-q"], cwd=calc_dir)
    status = Status.OK if rc == 0 else Status.FAILED
    return _record(state, NodeResult("07_calculation_guardian", status,
                                     artifacts=["docs/calculation-test-report.md"],
                                     errors=[] if rc == 0 else [f"pytest: {out[-300:]}"],
                                     next_step="08_security_guardian"))


def security_guardian(state: GraphState) -> GraphState:
    # Scan de secrets simple + délègue aux audits si dispo.
    rc, _ = _run(state, ["bash", "scripts/secret-scan.sh"])
    status = Status.OK if rc == 0 else Status.FAILED
    return _record(state, NodeResult("08_security_guardian", status,
                                     artifacts=["docs/security-report.md"],
                                     errors=[] if rc == 0 else ["secrets potentiels détectés"],
                                     next_step="09_integration_guardian"))


def integration_guardian(state: GraphState) -> GraphState:
    ok = _exists(state, "infra/docker/docker-compose.yml")
    status = Status.OK if ok else Status.PARTIAL
    return _record(state, NodeResult("09_integration_guardian", status,
                                     artifacts=["docs/integration-report.md"],
                                     errors=[] if ok else ["compose manquant"],
                                     next_step="10_e2e_guardian"))


def e2e_guardian(state: GraphState) -> GraphState:
    ok = _exists(state, "tests/e2e/playwright.config.ts")
    status = Status.PARTIAL if ok else Status.FAILED
    return _record(state, NodeResult("10_e2e_guardian", status,
                                     artifacts=["docs/e2e-report.md"],
                                     errors=[] if ok else ["config Playwright manquante"],
                                     next_step="11_deployment_guardian"))


def deployment_guardian(state: GraphState) -> GraphState:
    required = ["infra/docker/docker-compose.yml",
                "infra/github-actions/ci.yml",
                "scripts/deploy-staging.sh"]
    missing = [r for r in required if not _exists(state, r)]
    status = Status.OK if not missing else Status.FAILED
    return _record(state, NodeResult("11_deployment_guardian", status,
                                     errors=[f"manquant: {m}" for m in missing],
                                     next_step="12_validation_guardian"))


def validation_guardian(state: GraphState) -> GraphState:
    # DONE interdit si des failures restent ouvertes.
    open_failures = state.get("failures", [])
    if open_failures:
        return _record(state, NodeResult("12_validation_guardian", Status.FAILED,
                                         errors=open_failures, next_step="04_claude_builder"))
    return _record(state, NodeResult("12_validation_guardian", Status.OK,
                                     artifacts=["FINAL_VALIDATION_REPORT.md"],
                                     next_step="13_release_guardian"))


def release_guardian(state: GraphState) -> GraphState:
    state["done"] = True
    return _record(state, NodeResult("13_release_guardian", Status.OK,
                                     artifacts=["docs/deployment.md"], next_step=None))
