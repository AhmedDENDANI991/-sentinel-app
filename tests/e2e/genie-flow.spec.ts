import { test, expect } from "@playwright/test";

/**
 * Parcours E2E complet imposé par le CDC.
 * Les sélecteurs ciblent des attributs data-testid stables côté frontend.
 */
test.describe("Parcours étude génie civil (El Achour R+4)", () => {
  test("création projet -> calcul -> rapport -> dashboard VCCRTV", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-title")).toContainText("GENIE_CIVIL_AI");

    // 1. Créer un projet
    await page.getByTestId("new-project").click();
    await page.getByTestId("project-name").fill("Résidence El Achour R+4");

    // 2. Uploader un fichier mock (plan DXF)
    await page.getByTestId("upload-input").setInputFiles({
      name: "plan.dxf",
      mimeType: "image/vnd.dxf",
      buffer: Buffer.from("0\nSECTION\n2\nENTITIES\n0\nENDSEC\n0\nEOF\n"),
    });

    // 3. Paramètres MSP
    await page.getByTestId("param-zone").selectOption("III");
    await page.getByTestId("param-usage").selectOption("2");
    await page.getByTestId("param-site").selectOption("S3");
    await page.getByTestId("param-qadm").fill("200");
    await page.getByTestId("param-levels").fill("5");

    // 4. Lancer le calcul (charges -> sismique -> fondations -> vérification)
    await page.getByTestId("run-calc").click();
    await expect(page.getByTestId("base-shear")).toBeVisible({ timeout: 15_000 });

    // 5. Génération du rapport
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-ready")).toBeVisible();

    // 6. Dashboard VCCRTV
    await page.getByTestId("nav-dashboard").click();
    await expect(page.getByTestId("vccrtv-status")).toBeVisible();
  });
});
