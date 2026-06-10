# Rapport E2E (E2E Guardian)

## Scénario couvert

`tests/e2e/genie-flow.spec.ts` (Playwright, Chromium) reproduit le parcours
imposé par le CDC :

1. Ouvrir l'application (`app-title` = GENIE_CIVIL_AI)
2. Créer un projet (`new-project`, `project-name`)
3. Uploader un fichier mock DXF (`upload-input`)
4. Saisir les paramètres MSP (`param-zone/usage/site/qadm/levels`)
5. Lancer le calcul charges → sismique → fondations → vérification (`run-calc`)
6. Afficher l'effort tranchant à la base (`base-shear`)
7. Générer le rapport (`generate-report` → `report-ready`)
8. Ouvrir le dashboard VCCRTV (`nav-dashboard` → `vccrtv-status`)

Tous les sélecteurs `data-testid` correspondants existent dans
`apps/web/src/App.tsx`.

## Configuration

`tests/e2e/playwright.config.ts` démarre automatiquement le frontend
(`pnpm --filter @genie/web dev`) si `E2E_BASE_URL` n'est pas fourni ; rapport
HTML dans `playwright-report/`.

## Statut

**PARTIAL.** La spécification et la configuration sont en place et exécutables,
mais l'exécution réelle nécessite `pnpm install` + `playwright install chromium`
(navigateurs non installés dans la session de génération). En CI, le job `e2e`
exécute `playwright install --with-deps chromium` puis `pnpm test:e2e`.

## Reproduire

```bash
pnpm install
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```
