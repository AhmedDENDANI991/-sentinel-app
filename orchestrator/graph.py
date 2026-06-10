"""
Graphe d'orchestration GENIE_CIVIL_AI (LangGraph + fallback).

Construit un StateGraph LangGraph avec la séquence des 14 gardiens et des arêtes
conditionnelles : un nœud FAILED renvoie vers `04_claude_builder` (boucle VCCRTV),
un blocage critique réel renvoie vers END avec STOP, sinon on avance.

Si `langgraph` n'est pas installé, un exécuteur séquentiel équivalent prend le
relais (`run_fallback`) afin que l'orchestrateur reste exécutable partout.

Usage :
    python orchestrator/graph.py            # exécute la machine sur le dépôt courant
    python orchestrator/graph.py --json     # sortie JSON du résultat final
"""
from __future__ import annotations

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))  # accès à state / nodes

from state import GraphState, Status, initial_state  # noqa: E402
from nodes import NODE_SEQUENCE  # noqa: E402

MAX_ITERATIONS = 50  # garde-fou anti-boucle infinie
CHECKPOINT = os.path.join(os.path.dirname(__file__), "checkpoints", "state.json")

# Index des nœuds par nom pour le routage.
NODE_MAP = {name: fn for name, fn in NODE_SEQUENCE}
ORDER = [name for name, _ in NODE_SEQUENCE]


def _save_checkpoint(state: GraphState) -> None:
    os.makedirs(os.path.dirname(CHECKPOINT), exist_ok=True)
    with open(CHECKPOINT, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def _next_after(name: str) -> str | None:
    i = ORDER.index(name)
    return ORDER[i + 1] if i + 1 < len(ORDER) else None


def _route(state: GraphState, last_node: str) -> str | None:
    """Routage post-nœud : reboucle builder sur échec, STOP sur blocage critique."""
    last = state["history"][-1]
    status = last["status"]
    if status == Status.BLOCKED.value:
        state["blocked"] = True
        return None  # STOP
    # Le validation_guardian renvoie explicitement vers le builder en cas d'échec.
    if last.get("next_step") is not None and status == Status.FAILED.value:
        return last["next_step"]
    if status == Status.FAILED.value and last_node not in (
        "04_claude_builder", "12_validation_guardian"
    ):
        return "04_claude_builder"
    return _next_after(last_node)


def run_fallback(state: GraphState) -> GraphState:
    """Exécuteur séquentiel avec boucle VCCRTV (sans dépendance LangGraph)."""
    current = state.get("current", ORDER[0])
    while current is not None:
        state["iterations"] = state.get("iterations", 0) + 1
        if state["iterations"] > MAX_ITERATIONS:
            state["blocked"] = True
            state.setdefault("failures", []).append("boucle VCCRTV: itérations max atteintes")
            break
        state = NODE_MAP[current](state)
        _save_checkpoint(state)
        if state.get("done"):
            break
        current = _route(state, current)
    return state


def build_langgraph():
    """Construit le StateGraph LangGraph (si la lib est disponible)."""
    from langgraph.graph import StateGraph, END  # type: ignore

    g = StateGraph(dict)
    for name, fn in NODE_SEQUENCE:
        g.add_node(name, fn)
    g.set_entry_point(ORDER[0])

    def make_router(node_name: str):
        def router(state: GraphState):
            nxt = _route(state, node_name)
            return END if nxt is None else nxt
        return router

    targets = ORDER + ["04_claude_builder"]
    for name in ORDER:
        if name == ORDER[-1]:
            g.add_conditional_edges(name, make_router(name),
                                    {**{t: t for t in targets}, END: END})
        else:
            g.add_conditional_edges(name, make_router(name),
                                    {**{t: t for t in targets}, END: END})
    return g.compile()


def run(repo_root: str, cdc_path: str) -> GraphState:
    state = initial_state(repo_root, cdc_path, os.path.exists(cdc_path))
    try:
        app = build_langgraph()
        result = app.invoke(state, config={"recursion_limit": MAX_ITERATIONS})
        _save_checkpoint(result)  # type: ignore[arg-type]
        return result  # type: ignore[return-value]
    except Exception as exc:  # langgraph absent ou erreur de compilation -> fallback
        print(f"[orchestrator] LangGraph indisponible ({exc}); exécuteur de secours.",
              file=sys.stderr)
        return run_fallback(state)


def main() -> int:
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    cdc_path = os.path.join(repo_root, "CDC_GENIE_CIVIL_V2.pdf")
    state = run(repo_root, cdc_path)

    summary = {
        "done": state.get("done", False),
        "blocked": state.get("blocked", False),
        "iterations": state.get("iterations", 0),
        "open_failures": state.get("failures", []),
        "coverage": state.get("coverage", {}),
        "nodes": [(h["node"], h["status"]) for h in state.get("history", [])],
    }
    if "--json" in sys.argv:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print("=== GENIE_CIVIL_AI orchestrator ===")
        for node, st in summary["nodes"]:
            print(f"  {st.upper():8} {node}")
        print(f"\n  done={summary['done']} blocked={summary['blocked']} "
              f"iterations={summary['iterations']}")
        if summary["open_failures"]:
            print("  failures ouvertes:")
            for f in summary["open_failures"]:
                print(f"    - {f}")
    # Code de sortie non nul si bloqué (utile en CI).
    return 1 if state.get("blocked") else 0


if __name__ == "__main__":
    raise SystemExit(main())
