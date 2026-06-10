#!/usr/bin/env bash
# Rollback PRODUCTION : revenir au tag précédent et restaurer la DB si besoin.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> GENIE_CIVIL_AI — ROLLBACK"

# 1. Tag précédent (avant-dernier).
PREV_TAG="${ROLLBACK_TO:-$(git tag --sort=-creatordate | sed -n '2p')}"
if [ -z "$PREV_TAG" ]; then
  echo "ERREUR: aucun tag de rollback disponible."
  exit 2
fi
echo "--> Restauration du code au tag $PREV_TAG"
git checkout "$PREV_TAG"

# 2. Restauration DB (si dump fourni).
if [ -n "${RESTORE_DUMP:-}" ] && [ -n "${PROD_DATABASE_URL:-}" ]; then
  echo "--> Restauration DB depuis $RESTORE_DUMP"
  psql "$PROD_DATABASE_URL" < "$RESTORE_DUMP"
else
  echo "WARN: pas de restauration DB (RESTORE_DUMP/PROD_DATABASE_URL absents)."
fi

# 3. Re-déploiement de la version précédente.
CONFIRM_PROD=yes RELEASE_VERSION="$PREV_TAG-rollback" bash scripts/deploy-prod.sh || true

echo "==> Rollback vers $PREV_TAG terminé. Vérifier le monitoring."
