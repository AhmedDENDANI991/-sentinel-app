# GENIE_CIVIL_AI

Plateforme de calcul de structures (génie civil) : import de plans, paramètres
projet, calcul des charges, **calcul sismique RPA (méthode statique équivalente)**,
prédimensionnement, fondations, vérification réglementaire et génération
documentaire. Orchestration par gardiens (LangGraph) avec boucle VCCRTV.

> Réalisé à partir de la spécification du CDC. Voir
> [`FINAL_VALIDATION_REPORT.md`](./FINAL_VALIDATION_REPORT.md) pour l'état exact
> (ce qui est testé vs. ce qui est squelette/mock).

## Cœur vérifié

Le moteur de calcul (`apps/workers/svc-calcul`) est **réel et testé** :
**31 tests pytest, 93 % de couverture**, cas de référence **El Achour R+4**
(zone III) → V ≈ 1083 kN, fondations OK, aucune valeur NaN.

## Stack

React 18 + Vite + TS (web) · Fastify + TS (api) · Python 3.11 (workers) ·
PostgreSQL · Redis · MinIO/S3 · Docker Compose · GitHub Actions · Playwright ·
LangGraph (orchestrateur).

## Démarrage rapide

```bash
# 1. Cœur de calcul (testable immédiatement, sans Node ni Docker)
cd apps/workers/svc-calcul
python -m venv .venv && . .venv/bin/activate
pip install -e ".[dev]"
pytest --cov=genie_calc          # -> 31 passed

# 2. Gardiens / orchestrateur
python ../../../orchestrator/graph.py

# 3. Stack complète (Docker)
cd ../../..
cp .env.example .env
pnpm install
pnpm docker:up                   # web:5173 api:3001 postgres redis minio + workers
```

## Modules (CDC)

`MIA` import · `MSP` paramètres · `MCC` charges · `MRF` revêtements ·
`MCS` système · `MD` prédim · `MCS2` sismique RPA · `MF` fondations ·
`MVR` vérification · `MGM` modèles (.str/IFC/SAF) · `MPD` documents ·
`VCCRTV` boucle qualité · connecteurs Robot/Revit/Tekla/ETABS/Tedds (mocks).

Détail : [`docs/coverage-matrix.md`](./docs/coverage-matrix.md),
[`docs/architecture.md`](./docs/architecture.md),
[`docs/api.md`](./docs/api.md), [`docs/deployment.md`](./docs/deployment.md).

## Commandes principales

| But | Commande |
|---|---|
| Tests calcul | `pnpm calc:test` |
| Tests JS | `pnpm -r test` |
| Typecheck | `pnpm -r typecheck` |
| E2E | `pnpm test:e2e` |
| Gardiens | `pnpm guardian` |
| Docker local | `pnpm docker:up` |
| Deploy staging | `pnpm deploy:staging` |
| Deploy prod | `CONFIRM_PROD=yes pnpm deploy:prod` |
| Rollback | `bash scripts/rollback.sh` |

## Licence / connecteurs externes

Robot, Revit (APS), Tekla, ETABS, Tedds tournent en **mode mock** par défaut afin
de ne jamais bloquer la chaîne. Le mode `live` requiert licences/identifiants
(voir `apps/workers/<svc>/README.md`).
