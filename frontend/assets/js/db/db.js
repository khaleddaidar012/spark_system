/* ============================================
   Spark ERP — Local Database Instance (Dexie.js)
   IndexedDB Object Stores for Offline Operations
   ============================================ */

import Dexie from "../../vendor/dexie.mjs";

export const db = new Dexie("spark_erp_db");

db.version(1).stores({
  projects: "id, name, type, status, createdAt, updatedAt, syncStatus, deletedAt",
  projectCases: "id, projectId, status, createdAt, updatedAt, syncStatus, deletedAt",
  projectSubCases: "id, caseId, projectId, status, createdAt, updatedAt, syncStatus, deletedAt",
  people: "id, kind, name, phone, createdAt, updatedAt, syncStatus, deletedAt",
  materials: "id, name, unit, unitPrice, createdAt, updatedAt, syncStatus, deletedAt",
  inventory: "id, materialId, qty, location, updatedAt, syncStatus",
  moneyTransactions: "id, direction, personId, projectId, caseId, date, createdAt, updatedAt, syncStatus, deletedAt, [personId+date], [projectId+date]",
  materialTransactions: "id, direction, materialId, projectId, supplierId, date, createdAt, updatedAt, syncStatus, deletedAt",
  deductions: "id, personId, personType, projectId, date, createdAt, updatedAt, syncStatus, deletedAt, [personId+date]",
  financialAccounts: "id, name, accountType, balance, updatedAt, syncStatus",
  syncQueue: "++autoId, id, entity, entityId, operation, createdAt, status",
  syncMetadata: "key",
  settings: "key",
  syncLogs: "++autoId, timestamp, level, category",
});

export async function initDatabase() {
  try {
    if (!db.isOpen()) {
      await db.open();
      console.log("[Spark DB] IndexedDB spark_erp_db initialized successfully");
    }
    return true;
  } catch (err) {
    console.error("[Spark DB] Database open error:", err);
    throw err;
  }
}
