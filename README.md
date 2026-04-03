# Sentinel - Plateforme de Gouvernance Opérationnelle

Système de gouvernance multi-sociétés, multi-projets, gouverné par la preuve.

## Architecture

- **Backend** : Fastify + TypeScript + Prisma + PostgreSQL
- **Frontend** : React 18 + Vite + TypeScript + TailwindCSS
- **Intégrations** : n8n, Odoo, HubSpot, Rossum, Aircall, Power BI, Claude

## Demarrage rapide

```bash
# 1. Installer les dependances
npm install
cd packages/backend && npm install
cd ../frontend && npm install
cd ../..

# 2. Configurer l'environnement
cp .env.example packages/backend/.env
# Editer packages/backend/.env avec vos credentials PostgreSQL

# 3. Initialiser la base de donnees
cd packages/backend
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

# 4. Lancer le projet
npm run dev
```

Backend : http://localhost:3000
Frontend : http://localhost:5173

## Comptes de demonstration

| Email | Mot de passe | Role |
|-------|-------------|------|
| admin@sentinel.dz | sentinel-admin-2024 | ADMIN |
| daf@sentinel.dz | sentinel-daf-2024 | DAF |
| comptable@sentinel.dz | sentinel-compta-2024 | COMPTABLE |

## Tests

```bash
cd packages/backend && npm test
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /api/auth/login | Connexion |
| GET /api/dashboard/kpis | KPIs tableau de bord |
| GET /api/audit-objects | Objets audites (state machine) |
| POST /api/audit-objects/:id/transition | Transition d'etat |
| GET /api/proof/chain/:id | Chaine de preuve |
| GET /api/questionnaires | Questionnaires intelligents |
| GET /api/companies | Societes |
| GET /api/projects | Projets |
| GET /api/documents | Documents |
| GET /api/journal | Ecritures comptables |
| GET /api/hr/employees | Employes |
| GET /api/hr/tasks | Taches SPI |
| GET /api/legal/deadlines | Echeances juridiques |
| GET /api/workflows | Workflows |
| GET /api/rules | Regles metier |
| GET /api/integrations/health | Sante des integrations |

## Structure

```
packages/
  backend/
    src/
      routes/          # 17 modules de routes API
      services/        # State machine, proof registry, questionnaires, audit
      middleware/       # Auth, RBAC
      integrations/    # n8n, Odoo, HubSpot, Rossum, Aircall, Power BI
      utils/           # Prisma, validation Zod, erreurs
    prisma/            # Schema + seed
    tests/             # Tests Vitest
  frontend/
    src/
      pages/           # 13 pages
      components/      # Layout, composants partages
      hooks/           # Auth store (Zustand)
      services/        # Client API
      types/           # Types TypeScript
```
