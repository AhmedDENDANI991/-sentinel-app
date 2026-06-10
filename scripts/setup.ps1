# GENIE_CIVIL_AI — installation (Windows PowerShell)
$ErrorActionPreference = "Stop"
Write-Host "==> Installation GENIE_CIVIL_AI"

if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env"; Write-Host "  .env créé depuis .env.example" }

Write-Host "--> Dépendances JS (pnpm)"
corepack enable
pnpm install

Write-Host "--> Moteur de calcul Python (svc-calcul)"
Push-Location apps/workers/svc-calcul
python -m venv .venv
& .\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Pop-Location

Write-Host "==> Installation terminée. Lancer:  pnpm docker:up  ou  pnpm dev"
