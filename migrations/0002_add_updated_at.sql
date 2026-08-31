-- Migration: Add updated_at to all tables for incremental sync support

ALTER TABLE projects ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE people ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE materials ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE money_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE material_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;

-- Some older D1 databases might be missing the deductions table entirely
CREATE TABLE IF NOT EXISTS deductions (
  id TEXT PRIMARY KEY,
  person_id TEXT,
  person_type TEXT,
  project_id TEXT,
  date TEXT,
  created_at INTEGER DEFAULT 0,
  data TEXT NOT NULL,
  updated_at INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_deductions_person ON deductions(person_id);
CREATE INDEX IF NOT EXISTS idx_deductions_project ON deductions(project_id);
