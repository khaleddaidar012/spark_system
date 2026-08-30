/* ============================================
   Spark ERP — Core Sync Engine Coordinator
   Coordinates background push of local syncQueue operations
   and pull of remote server changes upon network connection.
   ============================================ */

import { SyncQueueManager } from "./sync-queue.js";
import { connectivityMonitor } from "./ConnectivityMonitor.js";
import { api } from "../modules/api.js";
import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

const PEOPLE_KEYS = ["suppliers", "contractors", "clients", "others"];

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
  }

  init() {
    // Listen for connectivity restoration
    window.addEventListener("spark:connectivity-changed", (e) => {
      if (e.detail && e.detail.isServerReachable) {
        this.triggerSync();
      }
    });

    // Periodic sync attempt every 30 seconds
    this.syncInterval = setInterval(() => {
      if (connectivityMonitor.isServerReachable) {
        this.triggerSync();
      }
    }, 30000);

    // Initial sync trigger
    if (navigator.onLine) {
      setTimeout(() => this.triggerSync(), 500);
    }
  }

  async triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent("spark:sync-status", { detail: { status: "syncing" } }));

    try {
      // 1. Push pending local operations
      await this.pushPendingOperations();

      // 2. Pull remote changes
      await this.pullRemoteChanges();

      window.dispatchEvent(new CustomEvent("spark:sync-status", { detail: { status: "synced" } }));
    } catch (err) {
      console.warn("[SyncEngine] Sync cycle error:", err);
      window.dispatchEvent(new CustomEvent("spark:sync-status", { detail: { status: "error", error: err.message } }));
    } finally {
      this.isSyncing = false;
    }
  }

  async pushPendingOperations() {
    const pendingOps = await SyncQueueManager.getPending(100);
    if (pendingOps.length === 0) return;

    try {
      const payload = {
        deviceId: localStorage.getItem("spark_device_id") || "device_local",
        operations: pendingOps.map((op) => ({
          id: op.id || generateUUID(),
          entity: op.entity,
          entityId: op.entityId,
          operation: op.operation,
          payload: op.payload,
          createdAt: op.createdAt,
        })),
      };

      const res = await api.pushSync(payload);
      if (res && res.ok) {
        const autoIdsToClear = pendingOps.map((op) => op.autoId);
        await SyncQueueManager.markProcessed(autoIdsToClear);
        console.log(`[SyncEngine] Synced & cleared ${autoIdsToClear.length} operations.`);
      }
    } catch (err) {
      console.warn("[SyncEngine] Push failed:", err);
      for (const op of pendingOps) {
        await SyncQueueManager.markFailed(op.autoId, err.message);
      }
    }
  }

  async pullRemoteChanges() {
    try {
      const res = await api.pullSync();
      if (res && res.ok && res.data) {
        const data = res.data;
        for (const [key, items] of Object.entries(data)) {
          if (!Array.isArray(items) || items.length === 0) continue;

          if (PEOPLE_KEYS.includes(key)) {
            const records = items.map((item) => ({ ...item, kind: key, syncStatus: "synced" }));
            await db.people.bulkPut(records);
          } else if (db[key]) {
            await db[key].bulkPut(items.map((item) => ({ ...item, syncStatus: "synced" })));
          }
        }
        await db.syncMetadata.put({ key: "lastSyncAt", value: res.serverTime || Date.now() });
      }
    } catch (err) {
      console.warn("[SyncEngine] Pull failed:", err);
    }
  }
}

export const syncEngine = new SyncEngine();
