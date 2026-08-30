/* ============================================
   Spark ERP — Abstract Base Repository Layer
   Handles IndexedDB table operations, soft deletes,
   timestamping, UUID generation, and sync queue
   enqueuing.
   ============================================ */

import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

export class BaseRepository {
  /**
   * @param {string} tableName - Dexie table name
   * @param {string} entityName - Entity name for syncQueue (e.g. 'project', 'person')
   */
  constructor(tableName, entityName) {
    this.tableName = tableName;
    this.entityName = entityName;
  }

  get table() {
    return db[this.tableName];
  }

  /**
   * Read all active (non-deleted) records
   */
  async getAll() {
    return await this.table.filter((item) => !item.deletedAt).toArray();
  }

  /**
   * Get single record by ID
   */
  async getById(id) {
    if (!id) return null;
    const item = await this.table.get(id);
    return item && !item.deletedAt ? item : null;
  }

  /**
   * Create or save entity locally and enqueue sync operation
   */
  async save(data) {
    const now = Date.now();
    const isNew = !data.id;
    const id = data.id || generateUUID();

    const record = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: now,
      version: (data.version || 0) + 1,
      syncStatus: "pending",
      deletedAt: data.deletedAt || null,
    };

    const operation = isNew ? "create" : "update";

    await db.transaction("rw", [this.table, db.syncQueue], async () => {
      await this.table.put(record);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: this.entityName,
        entityId: id,
        operation,
        payload: record,
        createdAt: now,
        status: "pending",
      });
    });

    return record;
  }

  /**
   * Soft-delete entity locally and enqueue delete operation
   */
  async delete(id) {
    if (!id) return false;
    const now = Date.now();
    const existing = await this.table.get(id);
    if (!existing) return false;

    const record = {
      ...existing,
      updatedAt: now,
      version: (existing.version || 0) + 1,
      syncStatus: "pending_delete",
      deletedAt: now,
    };

    await db.transaction("rw", [this.table, db.syncQueue], async () => {
      await this.table.put(record);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: this.entityName,
        entityId: id,
        operation: "delete",
        payload: { id, deletedAt: now },
        createdAt: now,
        status: "pending",
      });
    });

    return true;
  }

  /**
   * Bulk insert/update items during Sync Pull reconciliation (bypasses syncQueue)
   */
  async bulkSyncApply(items) {
    if (!Array.isArray(items) || items.length === 0) return;
    await this.table.bulkPut(
      items.map((item) => ({
        ...item,
        syncStatus: "synced",
      }))
    );
  }
}
