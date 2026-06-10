"""
État partagé de l'orchestrateur GENIE_CIVIL_AI.

Chaque nœud reçoit le `GraphState`, le met à jour (status, errors, artifacts,
next_step) et le renvoie. La boucle VCCRTV s'appuie sur `failures` pour
reboucler vers `claude_builder`.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, TypedDict


class Status(str, Enum):
    PENDING = "pending"
    OK = "ok"
    PARTIAL = "partial"
    BLOCKED = "blocked"
    FAILED = "failed"


@dataclass
class NodeResult:
    node: str
    status: Status
    artifacts: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    next_step: str | None = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["status"] = self.status.value
        return d


class GraphState(TypedDict, total=False):
    """État sérialisable (checkpoint durable)."""
    repo_root: str
    cdc_path: str
    cdc_available: bool
    history: List[Dict[str, Any]]      # journal des NodeResult
    failures: List[str]                # erreurs ouvertes -> reboucle builder
    artifacts: List[str]               # chemins produits
    coverage: Dict[str, str]           # module -> OK/PARTIAL/MISSING/BLOCKED
    blocked: bool                      # blocage critique réel -> STOP
    done: bool
    current: str                       # nœud courant
    iterations: int                    # garde-fou anti-boucle infinie


def initial_state(repo_root: str, cdc_path: str, cdc_available: bool) -> GraphState:
    return GraphState(
        repo_root=repo_root,
        cdc_path=cdc_path,
        cdc_available=cdc_available,
        history=[],
        failures=[],
        artifacts=[],
        coverage={},
        blocked=False,
        done=False,
        current="00_intake_guardian",
        iterations=0,
    )
