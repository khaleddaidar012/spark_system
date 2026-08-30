/* ============================================
   Spark ERP — Sync Queue Storage Manager
   Persistent FIFO operational queue in IndexedDB.
   ============================================ */

import { db } from "../db/db.js";

export class SyncQueueManager {
  /**
   * Get all pending queue operations ordered by autoId (FIFO)
   */
  static async getPending(limit = 50) {
    return await db.syncQueue
      .where("status")
      .equals("pending")
      .limit(limit)
      .toArray();
  }

  /**
   * Mark operations as successfully synced
   */
  static async markProcessed(autoIds) {
    if (!Array.isArray(autoIds) || autoIds.length === 0) return;
    await db.transaction("rw", db.syncQueue, async () => {
      await db.syncQueue.bulkDelete(autoIds);
    });
  }

  /**
   * Mark an operation as failed with error details
   */
  static async markFailed(autoId, errorMessage) {
    const item = await db.syncQueue.get(autoId);
    if (!item) return;

    await db.syncQueue.update(autoId, {
      status: item.retryCount >= 10 ? "error" : "pending",
      retryCount: (item.retryCount || 0) + 1,
      lastError: String(errorMessage || ""),
    });
  }

  /**
   * Get pending queue item count
   */
  static async getPendingCount() {
    return await db.syncQueue.where("status").equals("pending").count();
  }
}
