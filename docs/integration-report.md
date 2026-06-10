# Rapport d'intégration (Integration Guardian)

## Chaînes vérifiées

| Intégration | Mécanisme | Statut | Vérification |
|---|---|:---:|---|
| API ↔ Worker calcul | Redis `LPUSH`/`BRPOP` (file `genie:calc`) | **OK (contrat)** | `process_job` testé en direct (résultat El Achour) |
| API ↔ PostgreSQL | `pg` / store abstrait | PARTIAL | store mémoire actif ; impl. `pg` à brancher |
| API ↔ Redis | `ioredis` | PARTIAL | enqueue + fallback dégradé testé via route `/api/calc` |
| API ↔ MinIO/S3 | clé de stockage générée à l'upload | PARTIAL | clé calculée ; push S3 à brancher |
| Frontend ↔ API | `fetch` (`apps/web/src/api.ts`) | OK (contrat) | login → projet → calcul (parcours E2E) |
| Connecteurs (mocks) | Robot/.str, Tekla/IFC, ETABS/SAF, Revit/APS, Tedds | **OK (mock)** | générateurs exécutables sans licence |

## Vérification directe du contrat de calcul

`apps/workers/svc-calcul/worker.py::process_job` exécuté sur le job El Achour R+4 :
production d'un `FullStudy` complet (V ≈ 1083 kN, fondation OK, non bloquant),
sans NaN. Le format de sortie respecte le schéma Zod `FullStudySchema`.

## Tests d'intégration applicatifs (API)

`apps/api/src/server.test.ts` (Vitest + `app.inject`) couvre : `/health`,
refus 401 sans JWT, login → JWT → création de projet, readiness. Exécution :
`pnpm --filter @genie/api test` (nécessite `pnpm install`).

## Limites

- Les chaînes marquées PARTIAL nécessitent l'installation des dépendances JS
  (`pnpm install`) et un environnement Docker actif pour une validation
  bout-en-bout complète (non exécutée dans la session de génération).
