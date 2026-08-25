# Task: 01 - Database Schema & Data Models

Status: pending
Priority: high

## 1. Overview & Objectives

Update the database schema to support automated WhatsApp lead ingestion via n8n. This includes extending the existing `customers` table with program tracking and acquisition source columns, creating a high-performance `webhook_logs` table for tracking all incoming requests, and setting up appropriate indexes, foreign key relationships, and data models.

---

## 2. Dependencies
- Requires: Existing `customers` table (from Task 1).
- Blocks: `04-backend-api.md`, `05-admin-frontend.md`, `07-testing-verification.md`.

---

## 3. Subtasks

- [ ] **Subtask 1.1: Migration Script for `customers` Table Alterations**
- [ ] **Subtask 1.2: Migration Script for `webhook_logs` Table Creation**
- [ ] **Subtask 1.3: Database Indexing & Constraints Configuration**
- [ ] **Subtask 1.4: ORM / Data Model Definitions for `WebhookLog` and `Customer`**
- [ ] **Subtask 1.5: Seed & Schema Rollback Migration Script**

---

## 4. Detailed Subtask Specifications

### Subtask 1.1 — Migration Script for `customers` Table Alterations

#### Objective
Add `program_name` and `source` attributes to the `customers` table so that customer records know which program they are enrolled in/interested in and which channel acquired them.

#### Implementation Details
- **File Location**: `migrations/0002_add_whatsapp_webhook_support.sql` (or backend migration runner).
- Add column `program_name`:
  - Type: `VARCHAR(255)` / `TEXT`, nullable.
  - Purpose: Holds program name from parsed WhatsApp message (e.g., `"برنامج المعلين"`).
- Add column `source`:
  - Type: `VARCHAR(50)` with default `'manual'`.
  - Allowed values: `'manual'`, `'whatsapp_webhook'`.
  - Set existing records default to `'manual'`.

#### Expected Result
The `customers` table contains `program_name` and `source` columns without data loss or corruption of existing customer entries.

---

### Subtask 1.2 — Migration Script for `webhook_logs` Table Creation

#### Objective
Create an audit and observability table `webhook_logs` to capture every inbound payload, status, error trace, elapsed execution time, and resulting customer relationship.

#### Implementation Details
- **File Location**: `migrations/0002_add_whatsapp_webhook_support.sql`.
- Create table `webhook_logs` with the following schema:
  - `id`: `VARCHAR(36)` / `UUID` PRIMARY KEY.
  - `source`: `VARCHAR(50)` NOT NULL DEFAULT `'n8n'`.
  - `payload`: `JSON` / `TEXT` NOT NULL (raw incoming request body and headers metadata).
  - `status`: `VARCHAR(20)` NOT NULL (`'success'` | `'error'`).
  - `action`: `VARCHAR(20)` NULLABLE (`'created'` | `'updated'` | `'no_change'` | `'error'`).
  - `error_message`: `TEXT` NULLABLE (detailed stack trace or validation failure message).
  - `customer_id`: `VARCHAR(36)` / `UUID` NULLABLE, FOREIGN KEY referencing `customers(id)` ON DELETE SET NULL.
  - `processing_time_ms`: `INTEGER` NOT NULL DEFAULT 0.
  - `ip_address`: `VARCHAR(45)` NULLABLE.
  - `created_at`: `TIMESTAMP` DEFAULT CURRENT_TIMESTAMP NOT NULL.

#### Expected Result
Table `webhook_logs` is created with strict foreign key constraints and type safety.

---

### Subtask 1.3 — Database Indexing & Constraints Configuration

#### Objective
Ensure rapid lookups for high-throughput webhook processing and efficient querying in the admin dashboard.

#### Implementation Details
- Create index `idx_webhook_logs_created_at` on `webhook_logs(created_at DESC)` for log timeline sorting.
- Create index `idx_webhook_logs_customer_id` on `webhook_logs(customer_id)` for customer audit history queries.
- Create index `idx_webhook_logs_status` on `webhook_logs(status)` for log dashboard filtering.
- Ensure composite index / unique index on `customers(whatsapp_number, country)` exists to prevent race-condition duplicates during parallel webhook calls.

#### Expected Result
Database queries for customer lookup and webhook log filtering execute with optimal query plans using index scans.

---

### Subtask 1.4 — ORM / Data Model Definitions for `WebhookLog` and `Customer`

#### Objective
Define backend models or data access layer helpers for interacting with `webhook_logs` and updated `customers`.

#### Implementation Details
- **File Location**: `backend/models/WebhookLog.js` (and update `backend/models/Customer.js` if applicable).
- `WebhookLog` model methods:
  - `createLog({ source, payload, status, action, errorMessage, customerId, processingTimeMs, ipAddress })`
  - `getLogs({ page, limit, status, customerId, startDate, endDate })`
  - `getLogById(id)`
  - `updateLog(id, updateData)`
- `Customer` model updates:
  - Include `program_name` and `source` in model schema, serializers, and permitted attributes.

#### Expected Result
Clean data access methods available for webhook controllers and admin service layers.

---

### Subtask 1.5 — Seed & Schema Rollback Migration Script

#### Objective
Provide idempotent down-migration / rollback capability in case migration needs to be reverted during deployment or testing.

#### Implementation Details
- **File Location**: `migrations/0002_add_whatsapp_webhook_support.down.sql` (or rollback section).
- Safely drop `webhook_logs` table, indexes, and remove `program_name`, `source` columns from `customers` if supported by the database engine.

#### Expected Result
Migration can be applied and rolled back cleanly without orphaned database objects.

---

## 5. Edge Cases & Handling
- **Database Engine Dialect Variations (SQLite / D1 vs PostgreSQL / MySQL)**: Ensure JSON columns and default timestamp syntax comply with the target database engine (Cloudflare D1 / SQLite uses `TEXT` for JSON and `DATETIME DEFAULT CURRENT_TIMESTAMP`).
- **Existing Null Data**: Existing customer rows must default to `source = 'manual'` without breaking non-null constraints.
- **Cascading Deletions**: If a customer is deleted, foreign key constraint on `webhook_logs.customer_id` must use `SET NULL` rather than `CASCADE` to preserve audit records.

---

## 6. Regression Requirements
- Existing customer creation, queries, and updates must not fail due to added columns.
- Database connection pools and existing tables must remain unaffected.

---

## 7. Acceptance Criteria

- [ ] Migration script applies cleanly to the database.
- [ ] `customers` table includes `program_name` (nullable) and `source` (default `'manual'`).
- [ ] `webhook_logs` table is created with all required columns and foreign key to `customers(id)`.
- [ ] Indexes for `created_at`, `customer_id`, and `status` are created and active.
- [ ] `WebhookLog` model provides robust methods for creating and querying logs.
- [ ] Rollback script cleanly removes new tables and columns.
