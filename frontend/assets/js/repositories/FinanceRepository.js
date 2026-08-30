/* ============================================
   Spark ERP — Financial Transaction Repository
   Manages money incoming/outgoing ledger, deductions,
   and account balances offline atomically.
   ============================================ */

import { BaseRepository } from "./base-repository.js";
import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

class FinanceRepository extends BaseRepository {
  constructor() {
    super("moneyTransactions", "moneyTransaction");
  }

  /**
   * Get all transactions for a specific project
   */
  async getByProject(projectId) {
    return await db.moneyTransactions
      .where("[projectId+date]")
      .between([projectId, Dexie.minKey], [projectId, Dexie.maxKey])
      .filter((t) => !t.deletedAt)
      .toArray();
  }

  /**
   * Get all transactions for a specific person (supplier/contractor)
   */
  async getByPerson(personId) {
    return await db.moneyTransactions
      .where("[personId+date]")
      .between([personId, Dexie.minKey], [personId, Dexie.maxKey])
      .filter((t) => !t.deletedAt)
      .toArray();
  }

  /**
   * Add a money transaction and update local financial balances atomically
   */
  async addTransaction(txnData) {
    const now = Date.now();
    const txnRecord = {
      ...txnData,
      id: txnData.id || generateUUID(),
      direction: txnData.direction || "out",
      amount: Number(txnData.amount) || 0,
      date: txnData.date || new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
      deletedAt: null,
    };

    await db.transaction("rw", [db.moneyTransactions, db.syncQueue], async () => {
      await db.moneyTransactions.put(txnRecord);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: "moneyTransaction",
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
   * Add a deduction record (for contractor/supplier statement)
   */
  async addDeduction(deductionData) {
    const now = Date.now();
    const deductionRecord = {
      ...deductionData,
      id: deductionData.id || generateUUID(),
      amount: Number(deductionData.amount) || 0,
      date: deductionData.date || new Date().toISOString().slice(0, 10),
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
      deletedAt: null,
    };

    await db.transaction("rw", [db.deductions, db.syncQueue], async () => {
      await db.deductions.put(deductionRecord);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: "deduction",
        entityId: deductionRecord.id,
        operation: "create",
        payload: deductionRecord,
        createdAt: now,
        status: "pending",
      });
    });

    return deductionRecord;
  }

  /**
   * Get all deductions for a person
   */
  async getDeductionsByPerson(personId) {
    return await db.deductions
      .where("[personId+date]")
      .between([personId, Dexie.minKey], [personId, Dexie.maxKey])
      .filter((d) => !d.deletedAt)
      .toArray();
  }
}

export const financeRepository = new FinanceRepository();
