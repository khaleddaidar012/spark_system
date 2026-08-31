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
import { SyncState, getDeviceId } from "../modules/state.js";

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

function cleanPayloadForServer(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const cleaned = { ...payload };
  delete cleaned.syncStatus;
  // Keep deletedAt so server/other devices know it's a delete operation, or handle it via operations
  return cleaned;
}

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

  forceSync() {
    this.isSyncing = false;
    if (this._watchdogTimer) {
      clearTimeout(this._watchdogTimer);
      this._watchdogTimer = null;
    }
    this.triggerSync();
  }

  init() {
    /* Track online/offline status */
    window.addEventListener("online", () => SyncState.setOnline(true));
    window.addEventListener("offline", () => SyncState.setOnline(false));

    /* Reconnection → trigger sync immediately */
    window.addEventListener("spark:connectivity-changed", (e) => {
      SyncState.setOnline(e.detail && e.detail.isServerReachable);
      if (e.detail && e.detail.isServerReachable) {
        this.triggerSync();
      }
    });

    /* Tab focus or visibility → auto-pull latest changes from other devices */
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && connectivityMonitor.isServerReachable && !this.isSyncing) {
        this.triggerSync();
      }
    });

    window.addEventListener("focus", () => {
      if (connectivityMonitor.isServerReachable && !this.isSyncing) {
        this.triggerSync();
      }
    });

    /* New data saved → debounced sync trigger */
    window.addEventListener("spark:queue-updated", () => {
      if (!connectivityMonitor.isServerReachable) return;
      if (this._pendingQueueSync) clearTimeout(this._pendingQueueSync);
      this._pendingQueueSync = setTimeout(() => this.triggerSync(), 1500);
    });

    /* Periodic sync every 30 seconds */
    this.syncInterval = setInterval(() => {
      if (connectivityMonitor.isServerReachable && !this.isSyncing) {
        const timeSinceLastSync = Date.now() - (this.lastSyncAt || 0);
        if (timeSinceLastSync > 25000) {
          this.triggerSync();
        }
      }
    }, 30000);

    /* Initial sync on load */
    if (navigator.onLine) {
      setTimeout(() => this.triggerSync(), 800);
    }
  }

  async triggerSync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    SyncState.setSyncStatus("syncing");

    if (this._watchdogTimer) clearTimeout(this._watchdogTimer);
    this._watchdogTimer = setTimeout(() => {
      if (this.isSyncing) {
        console.warn("[SyncEngine] Watchdog timeout: auto-resetting stuck sync state");
        this.isSyncing = false;
        SyncState.setError("انتهت مهلة المزامنة — انقر للإعادة");
        this._emitStatus("error", { error: "انتهت مهلة المزامنة — انقر للإعادة" });
      }
    }, 25000);

    /* Update pending count */
    const queueCount = await SyncQueueManager.getPendingCount();
    SyncState.setPendingCount(queueCount);

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
        /* Update pending count after direct push */
        SyncQueueManager.getPendingCount().then((c) => SyncState.setPendingCount(c));
      }

      /* Pull remote changes to merge server-side updates */
      await this.pullRemoteChanges();

      this.lastSyncAt = Date.now();
      SyncState.setLastSyncAt(this.lastSyncAt);
      SyncState.setSyncStatus("synced");
      this._emitStatus("synced", {
        total,
        pushed,
        percent: 100,
        lastSyncAt: this.lastSyncAt,
      });
    } catch (err) {
      console.warn("[SyncEngine] Sync cycle error:", err);
      SyncState.setError(err.message);
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
          await api.save(name, cleanPayloadForServer(item));
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
            payload: cleanPayloadForServer(op.payload),
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

          /* Update pending count after each batch */
          SyncQueueManager.getPendingCount().then((c) => SyncState.setPendingCount(c));

          const percent = total > 0 ? Math.round((pushed / total) * 100) : 100;
          this._emitStatus("syncing", { total, pushed, percent });
        } else {
          console.warn("[SyncEngine] Push returned non-OK:", res);
          for (const op of pendingOps) {
            await SyncQueueManager.markFailed(op.autoId, "server-rejected");
          }
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
      const since = this.lastSyncAt || 0;
      const res = await api.pullSync(since);
      if (res && res.ok && res.data) {
        const data = res.data;
        const allCollectionKeys = [
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

        for (const key of allCollectionKeys) {
          const serverItems = Array.isArray(data[key]) ? data[key] : [];
          const serverIdSet = new Set(serverItems.map((x) => x && x.id).filter(Boolean));

          if (PEOPLE_KEYS.includes(key)) {
            if (db.people) {
              const allLocalPeople = await db.people.toArray();

              /* Remove local synced items that no longer exist on server */
              if (since === 0) {
                for (const p of allLocalPeople) {
                  if (p.kind !== key) continue; /* Only process people of this category */
                  if (!serverIdSet.has(p.id) && p.syncStatus === "synced" && !p.deletedAt) {
                    await db.people.delete(p.id).catch(() => {});
                  }
                }
              }

              /* Merge server items with local pending items (conflict resolution) */
              if (serverItems.length > 0) {
                const mergedItems = serverItems.map((serverItem) => {
                  const localItem = allLocalPeople.find((p) => p.id === serverItem.id);
                  if (localItem && localItem.syncStatus === "pending" && localItem.updatedAt >= serverItem.updatedAt) {
                    return { ...localItem, kind: key, syncStatus: "synced", deletedAt: null };
                  }
                  const { syncStatus: _s, deletedAt: _d, ...cleanServer } = serverItem;
                  return { ...cleanServer, kind: key, syncStatus: "synced", deletedAt: null };
                });
                await db.people.bulkPut(mergedItems);
              }
            }
          } else if (db[key]) {
            const allLocalItems = await db[key].toArray();

            /* Remove local synced items that no longer exist on server */
            if (since === 0) {
              for (const it of allLocalItems) {
                if (!serverIdSet.has(it.id) && it.syncStatus === "synced" && !it.deletedAt) {
                  await db[key].delete(it.id).catch(() => {});
                }
              }
            }

            /* Merge server items with local pending items (conflict resolution) */
            if (serverItems.length > 0) {
              const mergedItems = serverItems.map((serverItem) => {
                const localItem = allLocalItems.find((i) => i.id === serverItem.id);
                if (localItem && localItem.syncStatus === "pending" && localItem.updatedAt >= serverItem.updatedAt) {
                  return { ...localItem, syncStatus: "synced", deletedAt: null };
                }
                const { syncStatus: _s, deletedAt: _d, ...cleanServer } = serverItem;
                return { ...cleanServer, syncStatus: "synced", deletedAt: null };
              });
              await db[key].bulkPut(mergedItems);
            }
          }
        }

        await db.syncMetadata.put({ key: "lastSyncAt", value: res.serverTime || Date.now() });

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
