#!/usr/bin/env bash
# Déploiement STAGING — orchestration des cibles managées (Vercel / Railway / Supabase).
# Idempotent et sûr : sans token de déploiement, exécute un DRY-RUN documenté
# au lieu d'échouer, afin de rester utilisable hors CI.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> GENIE_CIVIL_AI — déploiement staging"

DRY_RUN=0
if [ -z "${STAGING_DEPLOY_TOKEN:-}" ]; then
  echo "WARN: STAGING_DEPLOY_TOKEN absent -> DRY-RUN (aucune action distante)."
  DRY_RUN=1
fi

run() {
  if [ "$DRY_RUN" -eq 1 ]; then echo "   [dry-run] $*"; else "$@"; fi
}

echo "--> 1/4 Frontend (Vercel)"
run npx --yes vercel deploy --prebuilt --token "${STAGING_DEPLOY_TOKEN:-}" --yes apps/web

echo "--> 2/4 API + workers (Railway / VPS Docker)"
run docker compose -f infra/docker/docker-compose.yml build api worker-calcul worker-import worker-report

echo "--> 3/4 Migrations DB (Supabase/PostgreSQL managé)"
if [ -n "${DATABASE_URL:-}" ]; then
  for f in packages/db/migrations/*.sql; do run psql "$DATABASE_URL" -f "$f"; done
else
  echo "   [skip] DATABASE_URL non défini"
fi

echo "--> 4/4 Smoke tests staging"
bash scripts/smoke-staging.sh || { echo "ERREUR: smoke tests staging échoués"; exit 1; }

echo "==> Staging OK"
