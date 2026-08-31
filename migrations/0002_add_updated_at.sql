-- Migration: Add updated_at to all tables for incremental sync support

ALTER TABLE projects ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE people ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE materials ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE money_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE material_transactions ADD COLUMN updated_at INTEGER DEFAULT 0;
ALTER TABLE deductions ADD COLUMN updated_at INTEGER DEFAULT 0;
