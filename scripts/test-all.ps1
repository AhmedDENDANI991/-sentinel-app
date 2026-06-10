# GENIE_CIVIL_AI — suite de tests complète (Windows PowerShell)
$ErrorActionPreference = "Stop"
Write-Host "==> Tests Python (moteur de calcul)"
Push-Location apps/workers/svc-calcul
& .\.venv\Scripts\Activate.ps1
python -m pytest --cov=genie_calc --cov-report=term-missing
Pop-Location

Write-Host "==> Tests JS (web/api/shared)"
pnpm -r test

Write-Host "==> Typecheck"
pnpm -r typecheck

Write-Host "==> Gardiens (orchestrateur)"
python orchestrator/graph.py

Write-Host "==> Tous les tests terminés."
