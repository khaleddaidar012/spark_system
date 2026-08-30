/* ============================================
   Spark ERP — Storage Quota & Health Inspector
   Requests persistent storage (iOS/Desktop) and
   monitors IndexedDB storage limits.
   ============================================ */

export async function requestStoragePersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage] Storage persistence granted: ${isPersisted}`);
      return isPersisted;
    } catch (err) {
      console.warn("[Storage] Persistence request failed:", err);
      return false;
    }
  }
  return false;
}

export async function getStorageQuotaEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
      const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
      const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
      return { usageMB, quotaMB, percent, raw: estimate };
    } catch (err) {
      console.warn("[Storage] Quota estimation failed:", err);
    }
  }
  return null;
}
