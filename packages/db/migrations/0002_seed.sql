-- ============================================================================
-- Seed minimal (développement uniquement — aucun secret réel).
-- Le hash ci-dessous correspond à un mot de passe de démo défini hors code.
-- En production, créer les utilisateurs via l'API (bcrypt côté serveur).
-- ============================================================================

INSERT INTO users (email, password_hash, role)
VALUES ('admin@genie.local', '$2b$10$DEMOPLACEHOLDERHASHdevelopmentonly000000000000000000', 'admin')
ON CONFLICT (email) DO NOTHING;
