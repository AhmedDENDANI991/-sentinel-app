#!/usr/bin/env bash
# Déploiement PRODUCTION — uniquement après staging vert + approbation manuelle.
# Crée un tag de release, sauvegarde la DB, déploie, puis smoke tests.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> GENIE_CIVIL_AI — déploiement PRODUCTION"

# 1. Garde-fou : exiger une confirmation explicite.
if [ "${CONFIRM_PROD:-}" != "yes" ]; then
  echo "ERREUR: production protégée. Relancer avec CONFIRM_PROD=yes après validation staging."
  exit 2
fi

# 2. Backup DB avant toute migration.
if [ -n "${PROD_DATABASE_URL:-}" ]; then
  TS="$(date +%Y%m%d-%H%M%S)"
  echo "--> Backup DB -> backup-prod-$TS.sql"
  pg_dump "$PROD_DATABASE_URL" > "backup-prod-$TS.sql"
else
  echo "WARN: PROD_DATABASE_URL absent -> backup ignoré (DRY-RUN)."
fi

# 3. Tag de release.
VERSION="${RELEASE_VERSION:-v$(date +%Y.%m.%d-%H%M)}"
echo "--> Tag release $VERSION"
git tag -a "$VERSION" -m "Release $VERSION" 2>/dev/null || echo "   (tag existe déjà)"

# 4. Déploiement (réutilise la cible staging avec env prod).
STAGING_DEPLOY_TOKEN="${PROD_DEPLOY_TOKEN:-}" \
DATABASE_URL="${PROD_DATABASE_URL:-}" \
  bash scripts/deploy-staging.sh

# 5. Smoke tests production.
STAGING_API_URL="${PROD_API_URL:-}" STAGING_WEB_URL="${PROD_WEB_URL:-}" \
  bash scripts/smoke-staging.sh || { echo "ERREUR: smoke prod KO -> exécuter scripts/rollback.sh"; exit 1; }

echo "==> Production $VERSION déployée."
