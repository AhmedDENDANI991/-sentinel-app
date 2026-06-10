# @genie/guardians

Package réservé aux utilitaires partagés des gardiens côté Node.

L'implémentation effective des **14 gardiens** et de la boucle **VCCRTV** se
trouve dans l'orchestrateur Python :

- `orchestrator/graph.py` — graphe LangGraph (+ exécuteur de secours)
- `orchestrator/state.py` — état partagé / checkpoints
- `orchestrator/nodes/guardians.py` — les 14 nœuds (00→13)

Lancement : `pnpm guardian` (= `tsx scripts/guardian.ts` → `python orchestrator/graph.py`).
