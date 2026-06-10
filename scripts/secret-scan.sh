#!/usr/bin/env bash
# Scan de secrets minimal (sans dépendance externe). Renvoie 1 si un secret
# probable est commité. Les fichiers .env (hors .env.example) sont ignorés via .gitignore.
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERNS='(AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|PGP) PRIVATE KEY-----|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[0-9A-Za-z]{36}|sk-[A-Za-z0-9]{32,})'

# Cherche dans les fichiers suivis par git, en excluant les exemples/docs.
FILES=$(git ls-files | grep -Ev '(\.env\.example$|^docs/|\.md$|secret-scan\.sh$)' || true)

HITS=0
if [ -n "$FILES" ]; then
  # shellcheck disable=SC2086
  if echo "$FILES" | xargs -r grep -EnI "$PATTERNS" 2>/dev/null; then
    HITS=1
  fi
fi

if [ "$HITS" -ne 0 ]; then
  echo "SECURITY: secret(s) probable(s) détecté(s) ci-dessus." >&2
  exit 1
fi
echo "secret-scan: OK (aucun secret évident détecté)."
exit 0
