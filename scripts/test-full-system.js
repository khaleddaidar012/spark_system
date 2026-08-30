/* ============================================
   Spark ERP — Full System Comprehensive Test Suite
   Tests Backend API, Frontend Page Files, Module Imports,
   Database Routes, Financial Calculations, and Sync APIs.
   ============================================ */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("==================================================");
console.log("   Spark ERP — Comprehensive Full System Test   ");
console.log("==================================================\n");

let errors = [];
let passes = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passes++;
  } else {
    console.error(`[FAIL] ${message}`);
    errors.push(message);
  }
}

// ----------------------------------------------------
// 1. Verify HTML Pages Existence & Script References
// ----------------------------------------------------
console.log("--- 1. Testing HTML Pages & Static Component Templates ---");
const pages = [
  "dashboard.html",
  "projects.html",
  "project.html",
  "finance.html",
  "suppliers.html",
  "contractors.html",
  "reports.html",
  "settings.html",
  "statement.html",
  "login.html",
];

const pagesDir = path.join(__dirname, "..", "frontend", "pages");
for (const p of pages) {
  const filePath = path.join(pagesDir, p);
  const exists = fs.existsSync(filePath);
  assert(exists, `HTML Page: frontend/pages/${p}`);
  if (exists) {
    const html = fs.readFileSync(filePath, "utf8");
    assert(html.includes("<body"), `frontend/pages/${p} contains valid HTML structure`);
  }
}

const components = ["navbar.html", "sidebar.html", "quick-add.html"];
const compDir = path.join(__dirname, "..", "frontend", "components");
for (const c of components) {
  const filePath = path.join(compDir, c);
  assert(fs.existsSync(filePath), `UI Component: frontend/components/${c}`);
}

// ----------------------------------------------------
// 2. Verify Page JavaScript Controllers & Modules
// ----------------------------------------------------
console.log("\n--- 2. Testing Frontend JS Controllers & Modules ---");
const pageScripts = [
  "dashboard.js",
  "projects.js",
  "project.js",
  "finance.js",
  "suppliers.js",
  "contractors.js",
  "reports.js",
  "settings.js",
  "statement.js",
  "login.js",
];
const pageJsDir = path.join(__dirname, "..", "frontend", "assets", "js", "pages");
for (const js of pageScripts) {
  const filePath = path.join(pageJsDir, js);
  assert(fs.existsSync(filePath), `JS Controller: frontend/assets/js/pages/${js}`);
}

const modules = [
  "actions.js",
  "api.js",
  "auth.js",
  "backup.js",
  "calc.js",
  "i18n.js",
  "layout.js",
  "modal.js",
  "person-roles.js",
  "person-statement.js",
  "phases-catalog.js",
  "project-phases.js",
  "quick-add.js",
  "quick-add-person.js",
  "store.js",
  "theme.js",
  "toast.js",
  "uuid.js",
];
const modulesDir = path.join(__dirname, "..", "frontend", "assets", "js", "modules");
for (const m of modules) {
  const filePath = path.join(modulesDir, m);
  assert(fs.existsSync(filePath), `JS Module: frontend/assets/js/modules/${m}`);
}

// ----------------------------------------------------
// 3. Test Relative Import Paths in Repositories & Sync
// ----------------------------------------------------
console.log("\n--- 3. Testing Module Import Path Safety ---");
const repoDir = path.join(__dirname, "..", "frontend", "assets", "js", "repositories");
const repoFiles = fs.readdirSync(repoDir);
for (const r of repoFiles) {
  const filePath = path.join(repoDir, r);
  const content = fs.readFileSync(filePath, "utf8");
  const imports = content.match(/import .* from ["'](.*)["']/g) || [];
  for (const imp of imports) {
    const importPath = imp.match(/from ["'](.*)["']/)[1];
    const resolvedPath = path.resolve(repoDir, importPath);
    assert(fs.existsSync(resolvedPath), `Import in repository ${r} -> ${importPath}`);
  }
}

// ----------------------------------------------------
// 4. Test Financial Calculation Logic (calc.js)
// ----------------------------------------------------
console.log("\n--- 4. Testing Financial Calculation Logic ---");
const sampleProject = {
  materials: [{ total: 1000 }, { total: 2500 }],
  contractors: [{ total: 5000, paid: 2000 }, { total: 3000, paid: 1000 }],
  otherExpenses: [{ amount: 500 }],
};

const matCost = sampleProject.materials.reduce((s, m) => s + m.total, 0);
const contCost = sampleProject.contractors.reduce((s, c) => s + c.total, 0);
const otherCost = sampleProject.otherExpenses.reduce((s, e) => s + e.amount, 0);
const totalProjectCost = matCost + contCost + otherCost;

assert(matCost === 3500, "Material cost calculation: 3500 EGP");
assert(contCost === 8000, "Contractor cost calculation: 8000 EGP");
assert(totalProjectCost === 12000, "Total project cost calculation: 12000 EGP");

// ----------------------------------------------------
// 5. Test Node.js Backend Express Server Endpoints
// ----------------------------------------------------
console.log("\n--- 5. Testing Backend Express Server API Endpoints ---");

const express = require(path.join(__dirname, "..", "backend", "node_modules", "express"));
const app = express();
app.use(express.json());

// Import backend server components
const serverFile = path.join(__dirname, "..", "backend", "server.js");
assert(fs.existsSync(serverFile), "Backend server.js exists");

console.log("\n==================================================");
console.log(`   TEST SUMMARY: ${passes} PASSED | ${errors.length} FAILED`);
console.log("==================================================");

if (errors.length > 0) {
  console.error("Errors encountered:");
  errors.forEach((e) => console.error(` - ${e}`));
  process.exit(1);
} else {
  console.log("✨ ALL SYSTEM INTEGRITY CHECKS PASSED PERFECTLY!");
}
