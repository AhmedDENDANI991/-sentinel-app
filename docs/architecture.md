# Architecture — GENIE_CIVIL_AI

## Vue d'ensemble

Monorepo (pnpm workspaces + packages Python) :

```
apps/
  web/        React 18 + Vite + TS (frontend)
  api/        Fastify + TS (API Gateway : auth JWT/RBAC, projets, upload, calc)
  workers/
    svc-calcul/   Python — moteur de calcul (MCC/MRF/MCS/MD/MCS2/MF/MVR)  [cœur testé]
    svc-import/   Python — MIA (extraction PDF/DXF/IFC)
    svc-report/   Python — MPD (note de calcul, conformité, quantitatif)
    svc-robot/    Connecteur Robot (.str + mock)
    svc-revit/    Connecteur Revit APS (mock)
    svc-tekla/    Connecteur Tekla (IFC + mock)
    svc-etabs/    Connecteur ETABS (SAF + mock)
    svc-tedds/    Connecteur Tedds (mock)
packages/
  shared/     Contrats Zod (TS) — miroir des modèles Pydantic
  db/         Schéma + migrations PostgreSQL
  config/     Config partagée
  guardians/  (réservé)
orchestrator/ LangGraph (14 gardiens, boucle VCCRTV, checkpoints)
infra/        Docker (compose + Dockerfiles), GitHub Actions
docs/         Documentation et rapports
tests/        unit / integration / e2e (Playwright)
scripts/      setup, dev, test, guardian, deploy, rollback
```

## Flux de données

```
Frontend (React) ──HTTP──▶ API (Fastify)
                              │  LPUSH job
                              ▼
                          Redis (genie:calc)
                              │  BRPOP
                              ▼
                   Worker svc-calcul (Python)
                     run_full_study()  ──▶  résultat JSON (FullStudy)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        PostgreSQL        MinIO/S3      svc-report (MPD)
       (studies)        (artefacts)    note/conformité/quantitatif
```

## Cascade de calcul (contrats)

`MSP (ProjectParams) → MCC (LevelLoad→LoadResult) → MCS2 (SeismicResult) →
MD (predim) → MF (FoundationResult) → MVR (RegulatoryReport) → MGM → MPD`.

Les contrats existent en **double** : Pydantic (`genie_calc/models.py`) et Zod
(`packages/shared/src/index.ts`), garantissant la cohérence API ↔ workers.

## Méthode de calcul sismique (MCS2)

Méthode statique équivalente RPA :
- `V = A·D·Q·W/R`
- `D` à 3 plages de période ; `η = √(7/(2+ξ)) ≥ 0.7` ; `T = CT·hN^0.75`
- distribution `Fi = (V−Ft)·Wi·hi/Σ(Wj·hj)`, `Ft = 0.07·T·V` si `T>0.7 s`
- effort tranchant cumulé, moment de renversement, vérification P-Δ.

Tables RPA codées : A (zone×groupe), T2 (site), CT et R (système), pénalités Q.

## Connecteurs externes (mocks + prérequis)

Robot, Revit (APS), Tekla, ETABS, Tedds fonctionnent en **mode mock** par défaut
(variables `*_MODE=mock`) pour ne pas bloquer la chaîne. Le mode `live` requiert,
selon l'outil : Windows + licence + API native (COM/.NET) ou identifiants OAuth2
(APS). Détails dans chaque `apps/workers/<svc>/README.md`.

## Orchestrateur (VCCRTV)

`orchestrator/graph.py` construit un `StateGraph` LangGraph de 14 gardiens. En
l'absence de LangGraph, un exécuteur séquentiel équivalent (`run_fallback`)
applique la même logique : un nœud `FAILED` reboucle vers `04_claude_builder`,
un blocage critique réel renvoie un STOP, des checkpoints JSON permettent la
reprise. Garde-fou anti-boucle : 50 itérations max.
