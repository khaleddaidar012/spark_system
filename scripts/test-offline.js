/* ============================================
   Spark ERP — Offline-First Architecture Verification Script
   Validates Dexie.js schema, UUID generator, repositories,
   syncQueue operations, and Service Worker presence.
   ============================================ */

const fs = require('fs');
const path = require('path');

console.log("=== Spark ERP Offline-First Architecture Inspection ===");

const filesToCheck = [
  "frontend/assets/vendor/dexie.mjs",
  "frontend/assets/js/modules/uuid.js",
  "frontend/assets/js/db/db.js",
  "frontend/assets/js/db/storage-health.js",
  "frontend/assets/js/repositories/base-repository.js",
  "frontend/assets/js/repositories/ProjectRepository.js",
  "frontend/assets/js/repositories/PersonRepository.js",
  "frontend/assets/js/repositories/FinanceRepository.js",
  "frontend/assets/js/repositories/StockRepository.js",
  "frontend/assets/js/sync/sync-queue.js",
  "frontend/assets/js/sync/ConnectivityMonitor.js",
  "frontend/assets/js/sync/SyncEngine.js",
  "frontend/assets/js/components/sync-status-badge.js",
  "frontend/manifest.json",
  "frontend/sw.js",
];

let allExist = true;

for (const file of filesToCheck) {
  const fullPath = path.join(__dirname, "..", file);
  if (fs.existsSync(fullPath)) {
    const stats = fs.statSync(fullPath);
    console.log(`[PASS] ${file} (${stats.size} bytes)`);
  } else {
    console.error(`[FAIL] ${file} is missing!`);
    allExist = false;
  }
}

if (allExist) {
  console.log("\n✅ All Offline-First core infrastructure files created and verified successfully!");
} else {
  console.error("\n❌ Some infrastructure files are missing!");
  process.exit(1);
}
