# ============================================================================
# GENIE_CIVIL_AI — TOUT-EN-UN (Windows PowerShell)
# Installe, teste, build et vérifie tout le projet, sans GitHub Actions.
# Usage (dans le dossier du projet) :  powershell -ExecutionPolicy Bypass -File scripts\verify-all.ps1
# ============================================================================
$ErrorActionPreference = "Continue"
$root = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $root
$results = @(); $pass = 0; $fail = 0

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Yellow }
function OK($m)   { Write-Host "   [OK] $m" -ForegroundColor Green; $script:results += "OK   | $m"; $script:pass++ }
function KO($m)   { Write-Host "   [X]  $m" -ForegroundColor Red;   $script:results += "FAIL | $m"; $script:fail++ }

Step "0. Outils"
Write-Host "   python: $(python --version 2>&1)"
Write-Host "   node:   $(node --version 2>&1)"

Step "1. Moteur de calcul (Python) — install + 31 tests"
Push-Location "$root\apps\workers\svc-calcul"
python -m venv .venv 2>$null
& .\.venv\Scripts\python.exe -m pip install -q -e ".[dev]" 2>$null
& .\.venv\Scripts\python.exe -m pytest -q 2>&1 | Tee-Object "$env:TEMP\genie_pytest.log" | Out-Null
if ($LASTEXITCODE -eq 0) { OK "pytest (31 tests)" } else { KO "pytest (voir $env:TEMP\genie_pytest.log)" }
Pop-Location

Step "2. Orchestrateur (gardiens + VCCRTV)"
python orchestrator\graph.py 2>&1 | Tee-Object "$env:TEMP\genie_orch.log" | Out-Null
if (Select-String -Path "$env:TEMP\genie_orch.log" -Pattern "done=True" -Quiet) { OK "orchestrateur (done=True)" } else { KO "orchestrateur" }

Step "3. JS : install (pnpm via corepack)"
corepack enable 2>$null
corepack prepare pnpm@10.0.0 --activate 2>$null
pnpm install --frozen-lockfile=false 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { OK "pnpm install" } else { KO "pnpm install" }

Step "4. JS : typecheck"
pnpm -r typecheck 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { OK "typecheck" } else { KO "typecheck" }

Step "5. JS : tests"
pnpm -r test 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { OK "tests JS" } else { KO "tests JS" }

Step "6. JS : build"
pnpm -r build 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { OK "build" } else { KO "build" }

Write-Host "`n============================================================"
Write-Host "  RESUME GENIE_CIVIL_AI"
Write-Host "============================================================"
foreach ($r in $results) {
  if ($r -like "OK*") { Write-Host "  $r" -ForegroundColor Green } else { Write-Host "  $r" -ForegroundColor Red }
}
Write-Host "------------------------------------------------------------"
if ($fail -eq 0) {
  Write-Host "  [OK] TOUT EST VERT — $pass etapes reussies." -ForegroundColor Green
  Write-Host "  Pour lancer l'appli complete :  pnpm docker:up"
} else {
  Write-Host "  [X] $fail etape(s) en echec. Voir les logs dans $env:TEMP\genie_*.log" -ForegroundColor Red
}
Write-Host "============================================================"
exit $fail
