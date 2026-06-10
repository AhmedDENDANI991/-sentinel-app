# Déploiement — GENIE_CIVIL_AI

## Local (Docker Compose)

```bash
cp .env.example .env          # renseigner les valeurs locales (pas de secret réel commité)
pnpm docker:up                # = docker compose -f infra/docker/docker-compose.yml up --build
```

Services : `web` (5173), `api` (3001), `worker-calcul`, `worker-import`,
`worker-report`, `postgres` (5432), `redis` (6379), `minio` (9000/9001).
Les migrations `packages/db/migrations/*.sql` sont appliquées au premier
démarrage de `postgres` (montées dans `/docker-entrypoint-initdb.d`).

## Staging

```bash
pnpm deploy:staging           # scripts/deploy-staging.sh
```

Cibles (managées) :
- **Frontend** → Vercel (`vercel deploy --prebuilt`).
- **API + workers** → Railway ou VPS Docker (`docker compose build`).
- **DB** → Supabase / PostgreSQL managé (migrations via `psql`).
- **Redis** → managé. **Storage** → S3/MinIO compatible.

Sans `STAGING_DEPLOY_TOKEN`, le script s'exécute en **DRY-RUN** (aucune action
distante) puis lance les **smoke tests** (`scripts/smoke-staging.sh` : `/health`
API + frontend). Le déploiement n'est validé que si les smoke tests passent.

## Production

```bash
CONFIRM_PROD=yes RELEASE_VERSION=v2026.06.10 pnpm deploy:prod
```

Garde-fous : confirmation explicite (`CONFIRM_PROD=yes`), **backup DB**
(`pg_dump`) avant migration, **tag de release**, smoke tests. La production ne
doit être déclenchée qu'après un staging vert et une approbation manuelle
(environnement protégé GitHub `production`).

## Rollback

```bash
ROLLBACK_TO=v2026.06.01 RESTORE_DUMP=backup-prod-XXigit.sql bash scripts/rollback.sh
```

Revient au tag précédent, restaure la DB si un dump est fourni, redéploie.

## Monitoring

- **Sentry** (`SENTRY_DSN`) pour les erreurs API/web.
- **Better Stack / UptimeRobot** sur `/health` (`UPTIME_CHECK_URL`).
- Logs structurés Fastify (pino) ; healthchecks Docker sur chaque service.
