/**
 * Guardian runner (TypeScript) — `pnpm guardian`.
 *
 * Lance l'orchestrateur de gardiens (Python) et imprime un résumé. Sert de point
 * d'entrée unique côté Node pour la CI et les développeurs.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname ?? ".", "..");
const graph = resolve(repoRoot, "orchestrator/graph.py");

if (!existsSync(graph)) {
  console.error("orchestrator/graph.py introuvable");
  process.exit(1);
}

const python = process.env.PYTHON ?? "python3";
console.log("==> Exécution des gardiens (orchestrateur LangGraph / fallback)\n");

const res = spawnSync(python, [graph], { stdio: "inherit", cwd: repoRoot });
process.exit(res.status ?? 1);
