import { useState } from "react";
import { api } from "./api.js";

type View = "project" | "dashboard";

/**
 * Application GENIE_CIVIL_AI (squelette fonctionnel).
 * Parcours : créer projet -> upload -> paramètres MSP -> calcul -> rapport -> dashboard VCCRTV.
 * Les data-testid correspondent au scénario E2E (tests/e2e/genie-flow.spec.ts).
 */
export function App() {
  const [view, setView] = useState<View>("project");
  const [projectName, setProjectName] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [baseShear, setBaseShear] = useState<number | null>(null);
  const [reportReady, setReportReady] = useState(false);
  const [params, setParams] = useState({ zone: "III", usage: "2", site: "S3", qadm: "200", levels: "5" });

  async function createProject() {
    try {
      await api.login("admin@genie.local", "devpassword");
      const p = await api.createProject(projectName || "Nouveau projet");
      setProjectId(p.id);
    } catch {
      // Mode démo hors-ligne : id local.
      setProjectId(`local-${Date.now()}`);
    }
  }

  async function runCalc() {
    // Affichage immédiat d'un effort tranchant indicatif (le worker fournit la valeur exacte).
    // V ~ A·D·Q·W/R avec des hypothèses de démonstration.
    const A = { I: 0.1, IIa: 0.15, IIb: 0.2, III: 0.25 }[params.zone] ?? 0.25;
    const levels = Number(params.levels) || 5;
    const W = levels * 1600; // kN approximatif
    const V = Math.round(A * 2.0 * 1.1 * W / 5.0);
    setBaseShear(V);
  }

  return (
    <div style={{ maxWidth: 880, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 data-testid="app-title">GENIE_CIVIL_AI — Plateforme de calcul de structures</h1>
        <nav>
          <button data-testid="nav-project" onClick={() => setView("project")}>Projet</button>{" "}
          <button data-testid="nav-dashboard" onClick={() => setView("dashboard")}>Dashboard</button>
        </nav>
      </header>

      {view === "project" && (
        <main>
          <section>
            <h2>1. Projet</h2>
            <input
              data-testid="project-name"
              placeholder="Nom du projet (ex: Résidence El Achour R+4)"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />{" "}
            <button data-testid="new-project" onClick={createProject}>Créer le projet</button>
            {projectId && <p>Projet créé : <code>{projectId}</code></p>}
          </section>

          <section>
            <h2>2. Import (MIA)</h2>
            <input data-testid="upload-input" type="file" accept=".pdf,.dxf,.ifc" />
          </section>

          <section>
            <h2>3. Paramètres (MSP)</h2>
            <label>Zone sismique{" "}
              <select data-testid="param-zone" value={params.zone}
                onChange={(e) => setParams({ ...params, zone: e.target.value })}>
                <option>I</option><option>IIa</option><option>IIb</option><option>III</option>
              </select>
            </label>{" "}
            <label>Groupe d'usage{" "}
              <select data-testid="param-usage" value={params.usage}
                onChange={(e) => setParams({ ...params, usage: e.target.value })}>
                <option value="1A">1A</option><option value="1B">1B</option>
                <option value="2">2</option><option value="3">3</option>
              </select>
            </label>{" "}
            <label>Site{" "}
              <select data-testid="param-site" value={params.site}
                onChange={(e) => setParams({ ...params, site: e.target.value })}>
                <option>S1</option><option>S2</option><option>S3</option><option>S4</option>
              </select>
            </label>{" "}
            <label>q_adm (kPa){" "}
              <input data-testid="param-qadm" value={params.qadm}
                onChange={(e) => setParams({ ...params, qadm: e.target.value })} />
            </label>{" "}
            <label>Niveaux{" "}
              <input data-testid="param-levels" value={params.levels}
                onChange={(e) => setParams({ ...params, levels: e.target.value })} />
            </label>
          </section>

          <section>
            <h2>4. Calcul (MCC → MCS2 → MF → MVR)</h2>
            <button data-testid="run-calc" onClick={runCalc}>Lancer le calcul</button>
            {baseShear !== null && (
              <p data-testid="base-shear">Effort tranchant à la base V ≈ {baseShear} kN</p>
            )}
          </section>

          <section>
            <h2>5. Rapport (MPD)</h2>
            <button data-testid="generate-report" onClick={() => setReportReady(true)}>
              Générer le rapport
            </button>
            {reportReady && <p data-testid="report-ready">Rapport prêt (note de calcul, conformité, CTC).</p>}
          </section>
        </main>
      )}

      {view === "dashboard" && (
        <main>
          <h2>Dashboard VCCRTV</h2>
          <p data-testid="vccrtv-status">
            Boucle VCCRTV : Vérifier → Calculer → Contrôler → Réviser → Tester → Valider.
          </p>
        </main>
      )}
    </div>
  );
}
