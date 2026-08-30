/* ============================================
   Spark ERP — Materials & Stock Repository
   Manages material catalog, stock adjustments,
   and material transactions offline with delta updates.
   ============================================ */

import { BaseRepository } from "./base-repository.js";
import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

class StockRepository extends BaseRepository {
  constructor() {
    super("materials", "material");
  }

  /**
   * Add a material transaction (receipt or usage)
   */
  async addMaterialTransaction(matTxnData) {
    const now = Date.now();
    const txnRecord = {
      ...matTxnData,
      id: matTxnData.id || generateUUID(),
      direction: matTxnData.direction || "in",
      quantity: Number(matTxnData.quantity || matTxnData.qty) || 0,
      unitPrice: Number(matTxnData.unitPrice) || 0,
      total: Number(matTxnData.total) || 0,
      date: matTxnData.date || new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
      deletedAt: null,
    };

    await db.transaction("rw", [db.materialTransactions, db.syncQueue], async () => {
      await db.materialTransactions.put(txnRecord);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: "materialTransaction",
        entityId: txnRecord.id,
        operation: "create",
        payload: txnRecord,
        createdAt: now,
        status: "pending",
      });
    });

    return txnRecord;
  }

  /**
   * Get material transactions by project
   */
  async getByProject(projectId) {
    return await db.materialTransactions
      .filter((t) => !t.deletedAt && t.projectId === projectId)
      .toArray();
  }
}

export const stockRepository = new StockRepository();
