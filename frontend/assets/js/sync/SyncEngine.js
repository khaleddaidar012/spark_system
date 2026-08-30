/* ============================================
   Spark ERP — Core Sync Engine Coordinator
   Batched push of local syncQueue operations +
   pull of remote server changes on reconnect.
   Emits real progress events for UI feedback.
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
    this._pendingQueueSync = null;
    this.lastSyncAt = null;
  }

  init() {
    /* Reconnection → trigger sync immediately */
    window.addEventListener("spark:connectivity-changed", (e) => {
      if (e.detail && e.detail.isServerReachable) {
        this.triggerSync();
      }
    });

    /* Queue updated (new save) → debounced sync trigger when online */
    window.addEventListener("spark:queue-updated", () => {
      if (!connectivityMonitor.isServerReachable) return;
      if (this._pendingQueueSync) clearTimeout(this._pendingQueueSync);
      this._pendingQueueSync = setTimeout(() => this.triggerSync(), 1500);
    });

    /* Periodic sync every 60 seconds (reduced from 30s) */
    this.syncInterval = setInterval(() => {
      if (connectivityMonitor.isServerReachable && !this.isSyncing) {
        this.triggerSync();
      }
    }, 60000);

    /* Initial sync on load if already online */
    if (navigator.onLine) {
      setTimeout(() => this.triggerSync(), 800);
    }
  }

  async triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    /* How many items are pending? */
    const total = await SyncQueueManager.getPendingCount();

    this._emitStatus("syncing", { total, pushed: 0, percent: 0 });

    try {
      /* 1. Push pending local operations with real progress */
      await this.pushPendingOperations(total);

      /* 2. Pull remote changes */
      await this.pullRemoteChanges();

      this.lastSyncAt = Date.now();
      this._emitStatus("synced", { total, pushed: total, percent: 100, lastSyncAt: this.lastSyncAt });
    } catch (err) {
      console.warn("[SyncEngine] Sync cycle error:", err);
      this._emitStatus("error", { error: err.message });
    } finally {
      this.isSyncing = false;
    }
  }

  async pushPendingOperations(totalEstimate) {
    const BATCH_SIZE = 50;
    let pushed = 0;
    const total = totalEstimate || (await SyncQueueManager.getPendingCount());
    if (total === 0) return;

    let batchNum = 0;
    while (true) {
      const pendingOps = await SyncQueueManager.getPending(BATCH_SIZE);
      if (pendingOps.length === 0) break;

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
          pushed += pendingOps.length;
          batchNum++;

          /* Emit real progress */
          const percent = total > 0 ? Math.round((pushed / total) * 100) : 100;
          this._emitStatus("syncing", { total, pushed, percent });
        } else {
          break;
        }
      } catch (err) {
        console.warn("[SyncEngine] Push batch failed:", err);
        for (const op of pendingOps) {
          await SyncQueueManager.markFailed(op.autoId, err.message);
        }
        break;
      }

      /* Safety: limit iterations */
      if (batchNum > 20) break;
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

  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncAt: this.lastSyncAt,
    };
  }

  _emitStatus(status, detail = {}) {
    window.dispatchEvent(
      new CustomEvent("spark:sync-status", {
        detail: { status, ...detail },
      })
    );
  }
}

export const syncEngine = new SyncEngine();
