# GENIE_CIVIL_AI — lancement local (Windows PowerShell)
$ErrorActionPreference = "Stop"
Write-Host "==> Démarrage de la stack locale (docker compose)"
docker compose -f infra/docker/docker-compose.yml up --build
