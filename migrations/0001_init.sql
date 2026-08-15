-- Spark ERP — D1 schema (Cloudflare SQLite)
-- Minimum tables needed to mirror the existing localStorage data model.
-- Primary columns are stored explicitly; every item is also kept as a JSON
-- snapshot in `data` so the frontend receives byte-identical objects.

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT '',        -- suppliers | contractors | clients | others
  name TEXT NOT NULL DEFAULT '',
  roles TEXT NOT NULL DEFAULT '[]',     -- JSON array of roles
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS money_transactions (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT '',
  person_id TEXT,
  project_id TEXT,
  created_at INTEGER DEFAULT 0,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS material_transactions (
  id TEXT PRIMARY KEY,
  direction TEXT NOT NULL DEFAULT '',
  project_id TEXT,
  created_at INTEGER DEFAULT 0,
  data TEXT NOT NULL
);

-- Useful indexes for the queries the app performs (person/project filtering).
CREATE INDEX IF NOT EXISTS idx_people_kind ON people(kind);
CREATE INDEX IF NOT EXISTS idx_money_person ON money_transactions(person_id);
CREATE INDEX IF NOT EXISTS idx_money_project ON money_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_project ON material_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
