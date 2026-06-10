# @genie/db — schéma & migrations PostgreSQL

Migrations SQL ordonnées (`NNNN_*.sql`), appliquées par ordre lexicographique.

## Appliquer les migrations

```bash
# via psql (DATABASE_URL dans .env)
for f in packages/db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

En conteneur, le service `postgres` du `docker-compose.yml` monte
`packages/db/migrations` dans `/docker-entrypoint-initdb.d`, donc les migrations
sont appliquées automatiquement à la première initialisation du volume.

## Cascade des données

`project_params (MSP)` → `level_loads (MCC)` → `studies.result (MCS2/MD/MF/MVR)` →
`artifacts (MGM/MPD)`.
