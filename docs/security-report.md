# Rapport de sécurité (Security Guardian)

## Contrôles automatisés (CI)

| Contrôle | Outil | Statut | Emplacement |
|---|---|:---:|---|
| Secret scanning | `scripts/secret-scan.sh` | **PASS** (aucun secret détecté) | exécuté localement + CI |
| Audit dépendances JS | `pnpm audit` | en CI (`node` job) | `.github/workflows/ci.yml` |
| Audit dépendances Python | `pip-audit` | en CI (`security` job) | idem |
| SAST | Semgrep `p/ci` | en CI (non bloquant) | idem |

## Mesures applicatives en place

- **JWT** signé (`@fastify/jwt`), expiration configurable (`JWT_EXPIRES_IN`).
- **RBAC** hiérarchique (`admin > engineer > viewer`) via `requireRole`
  (`apps/api/src/auth.ts`) sur toutes les routes d'écriture.
- **Upload durci** (`apps/api/src/routes/uploads.ts`) : liste blanche MIME,
  taille bornée (`MAX_UPLOAD_BYTES` + limites `@fastify/multipart`).
- **Validation d'entrée** systématique par Zod (API) et Pydantic (workers) —
  réduit injection / désérialisation non sûre.
- **Requêtes SQL** : schéma paramétré ; l'implémentation `pg` doit utiliser des
  requêtes paramétrées (jamais de concaténation).
- **Secrets** : aucun secret réel dans le code ; tout provient de l'environnement
  (`.env` ignoré par git, seul `.env.example` est versionné).
- **En-têtes** : nginx ajoute `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` (`infra/docker/nginx.conf`).

## Points de vigilance / à durcir avant production

1. Remplacer l'auth démo (`DEMO_USERS`) par la table `users` + **bcrypt** réel.
2. Ajouter **rate limiting** (`@fastify/rate-limit`) et **CSRF** si cookies.
3. Activer **HTTPS/TLS** au terminateur (reverse proxy) en staging/prod.
4. Brancher **Sentry** pour la traçabilité des erreurs.
5. Politique de mots de passe + rotation `JWT_SECRET`.
