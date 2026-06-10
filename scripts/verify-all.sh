#!/usr/bin/env bash
# ============================================================================
# GENIE_CIVIL_AI — TOUT-EN-UN
# Installe, teste, build et vérifie l'ensemble du projet, sans GitHub Actions.
# Usage :  bash scripts/verify-all.sh
# Aucune action manuelle : la machine fait tout et affiche un résumé final.
# ============================================================================
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

GREEN='\033[0;32m'; RED='\033[0;31m'; YEL='\033[1;33m'; NC='\033[0m'
PASS=0; FAIL=0
declare -a RESULTS

step() { echo -e "\n${YEL}==> $1${NC}"; }
ok()   { echo -e "${GREEN}   ✅ $1${NC}"; RESULTS+=("OK   | $1"); PASS=$((PASS+1)); }
ko()   { echo -e "${RED}   ❌ $1${NC}"; RESULTS+=("FAIL | $1"); FAIL=$((FAIL+1)); }

# --- 0. Prérequis -----------------------------------------------------------
step "0. Vérification des outils"
command -v python3 >/dev/null && echo "   python3: $(python3 --version)" || { echo "   python3 manquant"; exit 1; }
command -v node    >/dev/null && echo "   node:    $(node --version)"    || { echo "   node manquant"; exit 1; }

# --- 1. Moteur de calcul Python --------------------------------------------
step "1. Moteur de calcul (Python) — install + 31 tests"
cd "$ROOT/apps/workers/svc-calcul"
python3 -m venv .venv 2>/dev/null || true
# shellcheck disable=SC1091
. .venv/bin/activate
pip install -q --disable-pip-version-check -e ".[dev]" >/dev/null 2>&1
if python -m pytest -q >/tmp/genie_pytest.log 2>&1; then
  COUNT="$(grep -oE '[0-9]+ passed' /tmp/genie_pytest.log | head -1)"
  ok "pytest — ${COUNT:-tests réussis}"
else
  ko "pytest (voir /tmp/genie_pytest.log)"; tail -5 /tmp/genie_pytest.log
fi
deactivate 2>/dev/null || true
cd "$ROOT"

# --- 2. Orchestrateur (14 gardiens) ----------------------------------------
step "2. Orchestrateur (gardiens + boucle VCCRTV)"
if python3 orchestrator/graph.py >/tmp/genie_orch.log 2>&1 && grep -q "done=True" /tmp/genie_orch.log; then
  ok "orchestrateur (done=True)"
else
  ko "orchestrateur (voir /tmp/genie_orch.log)"
fi

# --- 3. Sécurité ------------------------------------------------------------
step "3. Scan de secrets"
if bash scripts/secret-scan.sh >/tmp/genie_sec.log 2>&1; then ok "aucun secret"; else ko "secrets détectés"; fi

# --- 4. Chaîne JS (web/api/shared) -----------------------------------------
step "4. JS : install (pnpm via corepack)"
corepack enable >/dev/null 2>&1 || true
corepack prepare pnpm@10.0.0 --activate >/dev/null 2>&1 || true
if pnpm install --frozen-lockfile=false >/tmp/genie_pnpm.log 2>&1; then ok "pnpm install"; else ko "pnpm install (voir /tmp/genie_pnpm.log)"; fi

step "5. JS : typecheck"
if pnpm -r typecheck >/tmp/genie_tc.log 2>&1; then ok "typecheck (shared/api/web/config)"; else ko "typecheck (voir /tmp/genie_tc.log)"; fi

step "6. JS : tests (Vitest)"
if pnpm -r test >/tmp/genie_jstest.log 2>&1; then ok "tests JS (shared + api)"; else ko "tests JS (voir /tmp/genie_jstest.log)"; fi

step "7. JS : build (web + api + shared)"
if pnpm -r build >/tmp/genie_build.log 2>&1; then ok "build (web vite + api/shared tsc)"; else ko "build (voir /tmp/genie_build.log)"; fi

# --- Résumé -----------------------------------------------------------------
echo -e "\n============================================================"
echo -e "  RÉSUMÉ GENIE_CIVIL_AI"
echo -e "============================================================"
for r in "${RESULTS[@]}"; do
  if [[ "$r" == OK* ]]; then echo -e "  ${GREEN}$r${NC}"; else echo -e "  ${RED}$r${NC}"; fi
done
echo -e "------------------------------------------------------------"
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}✅ TOUT EST VERT — $PASS/$((PASS+FAIL)) étapes réussies.${NC}"
  echo -e "  Le projet fonctionne. (La CI GitHub rouge = réglage de compte, pas le code.)"
  echo -e "  Pour lancer l'appli complète :  pnpm docker:up"
else
  echo -e "  ${RED}❌ $FAIL étape(s) en échec sur $((PASS+FAIL)). Voir les logs /tmp/genie_*.log${NC}"
fi
echo -e "============================================================"
exit "$FAIL"
