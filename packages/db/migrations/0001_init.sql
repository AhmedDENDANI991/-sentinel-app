-- ============================================================================
-- GENIE_CIVIL_AI — migration initiale (PostgreSQL)
-- Tables : users, projects, project_params (MSP), level_loads (MCC),
--          studies (résultats MCS2/MD/MF/MVR), artifacts (MGM/MPD), uploads (MIA),
--          audit_log.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ---- Auth / RBAC --------------------------------------------------------- --
CREATE TYPE user_role AS ENUM ('admin', 'engineer', 'viewer');

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'engineer',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Projets ------------------------------------------------------------- --
CREATE TABLE IF NOT EXISTS projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);

-- ---- MSP : paramètres projet --------------------------------------------- --
CREATE TYPE seismic_zone     AS ENUM ('I', 'IIa', 'IIb', 'III');
CREATE TYPE usage_group      AS ENUM ('1A', '1B', '2', '3');
CREATE TYPE site_category    AS ENUM ('S1', 'S2', 'S3', 'S4');
CREATE TYPE structural_system AS ENUM
    ('portiques_autostables', 'voiles_porteurs', 'mixte_portiques_voiles', 'noyau');

CREATE TABLE IF NOT EXISTS project_params (
    project_id      UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    zone            seismic_zone NOT NULL,
    usage_group     usage_group NOT NULL,
    site            site_category NOT NULL,
    q_adm_kpa       DOUBLE PRECISION NOT NULL CHECK (q_adm_kpa > 0),
    n_levels        INTEGER NOT NULL CHECK (n_levels >= 1),
    storey_height_m DOUBLE PRECISION NOT NULL CHECK (storey_height_m > 0),
    system          structural_system NOT NULL,
    damping_pct     DOUBLE PRECISION NOT NULL DEFAULT 7 CHECK (damping_pct > 0)
);

-- ---- MCC : charges par niveau -------------------------------------------- --
CREATE TABLE IF NOT EXISTS level_loads (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    level      INTEGER NOT NULL CHECK (level >= 0),
    area_m2    DOUBLE PRECISION NOT NULL CHECK (area_m2 > 0),
    g_kpa      DOUBLE PRECISION NOT NULL CHECK (g_kpa >= 0),
    q_kpa      DOUBLE PRECISION NOT NULL CHECK (q_kpa >= 0),
    height_m   DOUBLE PRECISION NOT NULL CHECK (height_m > 0),
    UNIQUE (project_id, level)
);

-- ---- MIA : uploads (fichiers importés) ----------------------------------- --
CREATE TABLE IF NOT EXISTS uploads (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    size_bytes  BIGINT NOT NULL CHECK (size_bytes >= 0),
    storage_key TEXT NOT NULL,        -- clé S3/MinIO
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Études (résultats du moteur de calcul) ------------------------------ --
CREATE TYPE study_status AS ENUM ('pending', 'running', 'done', 'failed', 'blocked');

CREATE TABLE IF NOT EXISTS studies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status      study_status NOT NULL DEFAULT 'pending',
    result      JSONB,                -- sortie FullStudy (MCS2/MD/MF/MVR)
    blocking    BOOLEAN NOT NULL DEFAULT false,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studies_project ON studies(project_id);

-- ---- MGM / MPD : artefacts générés (.str/IFC/SAF/PDF/XLSX) ---------------- --
CREATE TYPE artifact_kind AS ENUM ('str', 'ifc', 'saf', 'json', 'pdf', 'xlsx');

CREATE TABLE IF NOT EXISTS artifacts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id    UUID NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    kind        artifact_kind NOT NULL,
    storage_key TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Journal d'audit ----------------------------------------------------- --
CREATE TABLE IF NOT EXISTS audit_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    entity     TEXT,
    entity_id  UUID,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
