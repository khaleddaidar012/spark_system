/* ============================================
   Spark ERP — Core Sync Engine Coordinator
   Batched push of local syncQueue operations +
   pull of remote server changes on reconnect.
   Emits real progress events for UI feedback.

   Fallback: if syncQueue is empty but IndexedDB
   has items, uses snapshot push via /api/data.
   ============================================ */

import { SyncQueueManager } from "./sync-queue.js";
import { connectivityMonitor } from "./ConnectivityMonitor.js";
import { api } from "../modules/api.js";
import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

const PEOPLE_KEYS = ["suppliers", "contractors", "clients", "others"];
const PUSH_COLLECTIONS = [
  "projects",
  "suppliers",
  "contractors",
  "clients",
  "others",
  "materials",
  "moneyTransactions",
  "materialTransactions",
  "deductions",
];

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    this.syncInterval = null;
    this._pendingQueueSync = null;
    this.lastSyncAt = null;
    this._watchdogTimer = null;
  }

  forceResetSync() {
    this.isSyncing = false;
    if (this._watchdogTimer) {
      clearTimeout(this._watchdogTimer);
      this._watchdogTimer = null;
    }
    this._emitStatus("error", { error: "تمت إعادة تعيين المزامنة" });
  }

  init() {
    /* Reconnection → trigger sync immediately */
    window.addEventListener("spark:connectivity-changed", (e) => {
      if (e.detail && e.detail.isServerReachable) {
        this.triggerSync();
      }
    });

    /* New data saved → debounced sync trigger */
    window.addEventListener("spark:queue-updated", () => {
      if (!connectivityMonitor.isServerReachable) return;
      if (this._pendingQueueSync) clearTimeout(this._pendingQueueSync);
      this._pendingQueueSync = setTimeout(() => this.triggerSync(), 1500);
    });

    /* Periodic sync every 60 seconds */
    this.syncInterval = setInterval(() => {
      if (connectivityMonitor.isServerReachable && !this.isSyncing) {
        this.triggerSync();
      }
    }, 60000);

    /* Initial sync on load */
    if (navigator.onLine) {
      setTimeout(() => this.triggerSync(), 800);
    }
  }

  async triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    if (this._watchdogTimer) clearTimeout(this._watchdogTimer);
    this._watchdogTimer = setTimeout(() => {
      if (this.isSyncing) {
        console.warn("[SyncEngine] Watchdog timeout: auto-resetting stuck sync state");
        this.isSyncing = false;
        this._emitStatus("error", { error: "انتهت مهلة المزامنة — انقر للإعادة" });
      }
    }, 25000);

    /* Check how many queue operations are pending */
    const queueCount = await SyncQueueManager.getPendingCount();

    /* Collect all pending IndexedDB items (pending_delete + pending syncStatus) */
    const pendingItems = await this._getPendingIndexedDBItems();
    const total = Math.max(queueCount, pendingItems.length);

    this._emitStatus("syncing", { total, pushed: 0, percent: total > 0 ? 1 : 50 });

    try {
      let pushed = 0;

      if (queueCount > 0) {
        /* Fast path: push via sync queue (delta operations) */
        pushed = await this.pushPendingOperations(total);
      } else if (pendingItems.length > 0) {
        /* Fallback path: no queue ops, but IndexedDB has unsynced items */
        /* Push each item individually via /api/data */
        pushed = await this._pushPendingItemsDirect(pendingItems, (done) => {
          const pct = Math.round((done / pendingItems.length) * 100);
          this._emitStatus("syncing", { total: pendingItems.length, pushed: done, percent: pct });
        });
      }

      /* Pull remote changes to merge server-side updates */
      await this.pullRemoteChanges();

      this.lastSyncAt = Date.now();
      this._emitStatus("synced", {
        total,
        pushed,
        percent: 100,
        lastSyncAt: this.lastSyncAt,
      });
    } catch (err) {
      console.warn("[SyncEngine] Sync cycle error:", err);
      this._emitStatus("error", { error: err.message });
    } finally {
      if (this._watchdogTimer) {
        clearTimeout(this._watchdogTimer);
        this._watchdogTimer = null;
      }
      this.isSyncing = false;
    }
  }

  /* Collect all items from IndexedDB that have syncStatus === "pending" */
  async _getPendingIndexedDBItems() {
    const pending = [];
    try {
      const tables = {
        projects: db.projects,
        materials: db.materials,
        moneyTransactions: db.moneyTransactions,
        materialTransactions: db.materialTransactions,
        deductions: db.deductions,
      };

      for (const [name, table] of Object.entries(tables)) {
        if (!table) continue;
        const items = await table
          .filter((x) => x.syncStatus === "pending" || x.syncStatus === "pending_delete")
          .toArray();
        for (const item of items) {
          pending.push({ name, item });
        }
      }

      /* People collections */
      if (db.people) {
        const people = await db.people
          .filter((x) => x.syncStatus === "pending" || x.syncStatus === "pending_delete")
          .toArray();
        for (const person of people) {
          const name = person.kind || "suppliers";
          pending.push({ name, item: person });
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Error reading pending IndexedDB items:", err);
    }
    return pending;
  }

  /* Push pending IndexedDB items directly via /api/data (fallback when queue is empty) */
  async _pushPendingItemsDirect(pendingItems, onProgress) {
    let pushed = 0;
    for (const { name, item } of pendingItems) {
      try {
        if (item.syncStatus === "pending_delete") {
          await api.remove(name, item.id);
        } else {
          await api.save(name, item);
        }

        /* Mark as synced in IndexedDB */
        const table = PEOPLE_KEYS.includes(name) ? db.people : db[name];
        if (table) {
          await table.update(item.id, { syncStatus: "synced" });
        }

        pushed++;
        onProgress(pushed);
      } catch (err) {
        console.warn(`[SyncEngine] Direct push failed for ${name}/${item.id}:`, err);
      }
    }
    return pushed;
  }

  async pushPendingOperations(totalEstimate) {
    const BATCH_SIZE = 50;
    let pushed = 0;
    const total = totalEstimate || (await SyncQueueManager.getPendingCount());
    if (total === 0) return 0;

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
        if (res && (res.ok === true || res.processed)) {
          const autoIdsToClear = pendingOps.map((op) => op.autoId);
          await SyncQueueManager.markProcessed(autoIdsToClear);

          // Update syncStatus of corresponding records in IndexedDB
          for (const op of pendingOps) {
            try {
              const table = PEOPLE_KEYS.includes(op.entity) ? db.people : db[op.entity];
              if (table && op.entityId) {
                if (op.operation === "delete") {
                  await table.delete(op.entityId).catch(() => {});
                } else {
                  await table.update(op.entityId, { syncStatus: "synced" }).catch(() => {});
                }
              }
            } catch {}
          }

          pushed += pendingOps.length;
          batchNum++;

          const percent = total > 0 ? Math.round((pushed / total) * 100) : 100;
          this._emitStatus("syncing", { total, pushed, percent });
        } else {
          console.warn("[SyncEngine] Push returned non-OK:", res);
          break;
        }
      } catch (err) {
        console.warn("[SyncEngine] Push batch failed:", err);
        for (const op of pendingOps) {
          await SyncQueueManager.markFailed(op.autoId, err.message);
        }
        break;
      }

      if (batchNum > 20) break;
    }

    return pushed;
  }

  async pullRemoteChanges() {
    try {
      const res = await api.pullSync();
      if (res && res.ok && res.data) {
        const data = res.data;
        let hadUpdates = false;

        for (const [key, items] of Object.entries(data)) {
          if (!Array.isArray(items) || items.length === 0) continue;
          if (PEOPLE_KEYS.includes(key)) {
            const records = items.map((item) => ({ ...item, kind: key, syncStatus: "synced" }));
            await db.people.bulkPut(records);
            hadUpdates = true;
          } else if (db[key]) {
            await db[key].bulkPut(items.map((item) => ({ ...item, syncStatus: "synced" })));
            hadUpdates = true;
          }
        }

        await db.syncMetadata.put({ key: "lastSyncAt", value: res.serverTime || Date.now() });

        /* Always notify store.js to refresh cache after a server pull,
           so data added on other devices (phone/tablet) appears immediately */
        window.dispatchEvent(new CustomEvent("spark:remote-data-updated"));
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
