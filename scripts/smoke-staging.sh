#!/usr/bin/env bash
# Smoke tests staging : vérifie la santé de l'API et la disponibilité du frontend.
set -euo pipefail

API_URL="${STAGING_API_URL:-http://localhost:3001}"
WEB_URL="${STAGING_WEB_URL:-http://localhost:5173}"

echo "==> Smoke tests (API=$API_URL WEB=$WEB_URL)"

check() {
  local url="$1" name="$2"
  if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
    echo "   OK   $name ($url)"
  else
    echo "   FAIL $name ($url)"
    return 1
  fi
}

FAILED=0
check "$API_URL/health" "API health" || FAILED=1
check "$WEB_URL" "Frontend" || FAILED=1

if [ "$FAILED" -ne 0 ]; then
  echo "==> Smoke tests ÉCHEC"
  exit 1
fi
echo "==> Smoke tests OK"
