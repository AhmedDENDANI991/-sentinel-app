# API — GENIE_CIVIL_AI

Base URL : `${VITE_API_URL}` (défaut `http://localhost:3001`). Auth : JWT Bearer.

## Santé
| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Liveness |
| GET | `/ready` | — | Readiness |

## Auth
| Méthode | Route | Auth | Corps |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | JWT | profil courant |

## Projets (RBAC : engineer+ pour écriture)
| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/projects` | engineer | créer un projet |
| GET | `/api/projects` | viewer | lister ses projets |
| GET | `/api/projects/:id` | viewer | détail |
| PUT | `/api/projects/:id/params` | engineer | MSP (ProjectParams) |
| PUT | `/api/projects/:id/levels` | engineer | MCC (LevelLoad[]) |

## Upload (MIA)
| Méthode | Route | Auth | Contrôles |
|---|---|---|---|
| POST | `/api/uploads/:projectId` | engineer | MIME liste blanche, taille ≤ `MAX_UPLOAD_BYTES` |

MIME autorisés (défaut) : `application/pdf`, `image/vnd.dxf`, `model/iges`,
`application/octet-stream`.

## Calcul
| Méthode | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/calc/:projectId/run` | engineer | met en file Redis le job `full_study` (202) |

### Exemple
```bash
TOKEN=$(curl -s localhost:3001/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@genie.local","password":"devpassword"}' | jq -r .token)

PID=$(curl -s localhost:3001/api/projects -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"El Achour R+4"}' | jq -r .id)

curl -s -X PUT localhost:3001/api/projects/$PID/params -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"El Achour R+4","zone":"III","usage_group":"2","site":"S3",
       "q_adm_kpa":200,"n_levels":5,"storey_height_m":3.06,"system":"mixte_portiques_voiles"}'

curl -s -X POST localhost:3001/api/calc/$PID/run -H "Authorization: Bearer $TOKEN"
```
