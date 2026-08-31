/* ============================================
   Spark ERP — Sync State Manager
   Pub/sub state management for reliable data flow.
   Tracks sync status, device info, and pending count.
   ============================================ */

let _state = {
  syncStatus: "idle",
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  deviceId: null,
  deviceType: "laptop",
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
};

const _listeners = new Set();

export const SyncState = {
  get() {
    return { ..._state };
  },

  set(updates) {
    Object.assign(_state, updates);
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },

  subscribe(fn) {
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  },

  setSyncStatus(status) {
    _state.syncStatus = status;
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },

  setLastSyncAt(ts) {
    _state.lastSyncAt = ts;
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },

  setPendingCount(count) {
    _state.pendingCount = count;
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },

  setError(err) {
    _state.error = err;
    _state.syncStatus = "error";
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },

  setDeviceInfo(deviceId, deviceType) {
    _state.deviceId = deviceId;
    _state.deviceType = deviceType;
  },

  setOnline(online) {
    _state.isOnline = online;
    _listeners.forEach((fn) => {
      try { fn(_state); } catch { /* ignore */ }
    });
  },
};

/* Auto-detect device type */
function detectDeviceType() {
  const ua = navigator.userAgent || "";
  if (/Mobi|Android/i.test(ua)) return "phone";
  if (/iPad|iPhone/i.test(ua)) return "phone";
  return "laptop";
}

/* Initialize device ID and type */
function initDevice() {
  let deviceId = localStorage.getItem("spark_device_id");
  if (!deviceId) {
    deviceId =
      "dev_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);
    localStorage.setItem("spark_device_id", deviceId);
  }
  SyncState.setDeviceInfo(
    deviceId,
    localStorage.getItem("spark_device_type") || detectDeviceType()
  );
}

initDevice();

export function getDeviceId() {
  return SyncState.get().deviceId;
}

export function getDeviceType() {
  return SyncState.get().deviceType;
}
