import { defineConfig, devices } from "@playwright/test";

/**
 * Configuration Playwright (E2E Guardian).
 * Scénario couvert (cf. genie-flow.spec.ts) : ouvrir l'app -> créer un projet ->
 * uploader un fichier mock -> saisir les paramètres -> calcul charges -> sismique
 * -> fondations -> vérification -> génération rapport -> dashboard VCCRTV.
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "../../playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  // Démarre la stack web+api si E2E_BASE_URL n'est pas fourni.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm --filter @genie/web dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
