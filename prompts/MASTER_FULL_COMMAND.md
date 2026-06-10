# MASTER_FULL_COMMAND — mission GENIE_CIVIL_AI

Brief d'origine : réaliser la plateforme GENIE_CIVIL_AI décrite par le CDC
(`CDC_GENIE_CIVIL_V2.pdf`) en mode architecte/devops/QA/sécurité/orchestrateur,
avec exécution réelle dans le dépôt (créer, coder, tester, auditer, corriger).

## Règles clés conservées
- Respecter la stack imposée (React 18 / Fastify / Python / PostgreSQL / Redis /
  MinIO ; orchestrateur LangGraph ; CI GitHub Actions ; tests Vitest/Pytest/Playwright).
- Modules MIA→MPD, boucle VCCRTV, contrats JSON, cascade
  `MSP→MCC→MCS2→MD→MF→MVR→MGM→MPD`.
- Ne pas bloquer sur Robot/Revit/Tekla/ETABS/Tedds : mocks propres + prérequis documentés.
- Pas de secrets dans le code. Pas de livraison sans tests. Pas de DONE si build/
  tests/sécurité/docker/staging échouent.

## Séquence (0→38)
Intake → lecture CDC → product/architecture guardians → orchestrateur → monorepo →
DB → contrats → API → frontend → modules métier (MIA…MPD) → connecteurs →
VCCRTV → MPD → dashboard → tests (unit/intégration/e2e) → sécurité → Docker →
CI/CD → staging → smoke → monitoring → prod → rollback → FINAL_VALIDATION_REPORT.

## État de réalisation
Voir [`../FINAL_VALIDATION_REPORT.md`](../FINAL_VALIDATION_REPORT.md).

> Note : le PDF du CDC n'était pas présent dans l'environnement d'exécution ;
> la réalisation s'appuie sur la spécification détaillée du brief. Fournir le PDF
> pour un audit de conformité ligne-à-ligne.
