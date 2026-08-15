/* ============================================
   Spark ERP — Offline API test harness
   Runs the Cloudflare Pages Function against a
   local SQLite database (node:sqlite) that mimics
   the D1 binding, so the migration logic can be
   verified without wrangler or a Cloudflare account.
   Usage: node scripts/test-api.mjs
   ============================================ */

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { onRequest } from "../functions/api/[[path]].js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationSQL = readFileSync(join(root, "migrations", "0001_init.sql"), "utf8");

/* D1-compatible shim over node:sqlite */
class Stmt {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.params = [];
  }
  bind(...args) {
    this.params = args;
    return this;
  }
  all() {
    return Promise.resolve({ results: this.db.prepare(this.sql).all(...this.params) });
  }
  run() {
    const r = this.db.prepare(this.sql).run(...this.params);
    return Promise.resolve({ success: true, meta: { changes: r.changes } });
  }
  first() {
    return Promise.resolve(this.db.prepare(this.sql).get(...this.params) ?? null);
  }
}

class D1Shim {
  constructor(db) {
    this.db = db;
  }
  prepare(sql) {
    return new Stmt(this.db, sql);
  }
  async batch(stmts) {
    this.db.exec("BEGIN");
    try {
      for (const s of stmts) s.run();
      this.db.exec("COMMIT");
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
    return stmts.map(() => ({ success: true }));
  }
}

function makeEnv(db) {
  return {
    DB: new D1Shim(db),
    SPARK_ADMIN_USERNAME: "admin",
    SPARK_ADMIN_PASSWORD_HASH: "323015fe2dcfe38cccccb8286f7cd571342488eaab0748d8042ab526410f75fb",
    AUTH_SECRET: "test-secret-0123456789abcdef",
  };
}

function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  return new Request("http://localhost" + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function call(env, method, path, body, token) {
  const res = await onRequest({ request: req(method, path, body, token), env });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/* tiny test framework */
let pass = 0;
let fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log("  PASS  " + name);
  } else {
    fail++;
    console.log("  FAIL  " + name + "  " + extra);
  }
}
function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* async main */
const db = new DatabaseSync(":memory:");
db.exec(migrationSQL);
const env = makeEnv(db);

console.log("== Spark ERP API test ==");

let r = await call(env, "GET", "/api/health");
check("health 200 + status ok", r.status === 200 && r.data.status === "ok", JSON.stringify(r));

r = await call(env, "GET", "/api/data");
check("snapshot requires auth (401)", r.status === 401, "status=" + r.status);

r = await call(env, "POST", "/api/auth/login", { username: "admin", password: "wrongpass" });
check("login rejects bad password (401)", r.status === 401, JSON.stringify(r));

r = await call(env, "POST", "/api/auth/login", { username: "admin", password: "Spark@2026#ERP" });
check("login succeeds with token", r.status === 200 && !!r.data.token, JSON.stringify(r));
const token = r.data.token;

r = await call(env, "GET", "/api/data", undefined, token);
check("snapshot (empty) returns all 8 collections", r.status === 200 && Object.keys(r.data).length === 8, JSON.stringify(Object.keys(r.data)));

r = await call(env, "POST", "/api/data/seed", {}, token);
check("seed inserts demo data", r.status === 200 && r.data.seeded === true, JSON.stringify(r));

r = await call(env, "POST", "/api/data/seed", {}, token);
check("seed is skipped when data exists", r.status === 200 && r.data.seeded === false, JSON.stringify(r));

r = await call(env, "GET", "/api/data", undefined, token);
const snap = r.data;
check(
  "seed counts (1 project, 3 suppliers, 5 contractors, 1 client, 5 materials, 5 money, 0 mat)",
  snap.projects.length === 1 &&
    snap.suppliers.length === 3 &&
    snap.contractors.length === 5 &&
    snap.clients.length === 1 &&
    snap.others.length === 0 &&
    snap.materials.length === 5 &&
    snap.moneyTransactions.length === 5 &&
    snap.materialTransactions.length === 0,
  JSON.stringify(Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length])))
);

const project = snap.projects[0];
check("project keeps nested contractors/materials", Array.isArray(project.contractors) && project.contractors.length === 5 && Array.isArray(project.materials) && project.materials.length === 3 && project.name === "شقة 150 م² - التجمع الخامس");
const supplier = snap.suppliers[0];

/* upsert: rename project */
const renamed = { ...project, name: "Project After Rename", progress: 60 };
r = await call(env, "POST", "/api/data", { collection: "projects", item: renamed }, token);
check("upsert project returns ok", r.status === 200 && r.data.ok === true, JSON.stringify(r));

r = await call(env, "GET", "/api/data", undefined, token);
const after = r.data;
check("rename persisted + nested arrays intact", after.projects[0].name === "Project After Rename" && after.projects[0].progress === 60 && after.projects[0].materials.length === 3, JSON.stringify(after.projects[0]));

/* upsert a new money transaction, then remove it */
const newTxn = { id: "txn_test_1", direction: "in", personType: "client", personId: null, personName: "Test Client", amount: 1234, projectId: null, date: "2026-08-14", createdAt: 123456789, note: "test" };
r = await call(env, "POST", "/api/data", { collection: "moneyTransactions", item: newTxn }, token);
check("upsert money transaction ok", r.status === 200 && r.data.ok === true);

r = await call(env, "GET", "/api/data", undefined, token);
check("money transaction present", r.data.moneyTransactions.some((t) => t.id === "txn_test_1"));

r = await call(env, "DELETE", "/api/data", { collection: "moneyTransactions", id: "txn_test_1" }, token);
check("delete money transaction ok", r.status === 200 && r.data.ok === true);

r = await call(env, "GET", "/api/data", undefined, token);
check("money transaction removed", !r.data.moneyTransactions.some((t) => t.id === "txn_test_1"));

/* round-trip exactness: material added with all fields */
const matTxn = { id: "mat_txn_1", direction: "in", projectId: project.id, supplierId: supplier.id, supplierName: supplier.name, contractorId: null, contractorName: "", materialName: "أسمنت", quantity: 50, unit: "شيكارة", unitPrice: 110, total: 5500, date: "2026-08-14", createdAt: 9999 };
r = await call(env, "POST", "/api/data", { collection: "materialTransactions", item: matTxn }, token);
check("upsert material transaction ok", r.status === 200 && r.data.ok === true);

r = await call(env, "GET", "/api/data", undefined, token);
const got = r.data.materialTransactions.find((t) => t.id === "mat_txn_1");
check("material transaction round-trips exactly", eq(got, matTxn), JSON.stringify(got));

/* auth verify */
r = await call(env, "POST", "/api/auth/verify", { password: "Spark@2026#ERP" }, token);
check("verify correct password -> ok:true", r.status === 200 && r.data.ok === true, JSON.stringify(r));
r = await call(env, "POST", "/api/auth/verify", { password: "nope" }, token);
check("verify wrong password -> ok:false", r.status === 200 && r.data.ok === false, JSON.stringify(r));

/* backup endpoint without KV binding -> 501 */
r = await call(env, "POST", "/api/backup", { payload: 1 }, token);
check("backup without KV binding -> 501", r.status === 501, JSON.stringify(r));

/* restore full replace */
const customDb = {
  projects: [],
  suppliers: [{ id: "p1", name: "Only Supplier", phone: "", notes: "", roles: ["supplier"], purchases: 0, paid: 0 }],
  contractors: [],
  clients: [],
  others: [],
  materials: [],
  moneyTransactions: [],
  materialTransactions: [],
};
r = await call(env, "POST", "/api/data/restore", { db: customDb }, token);
check("restore ok", r.status === 200 && r.data.ok === true, JSON.stringify(r));

r = await call(env, "GET", "/api/data", undefined, token);
check("restore replaces all data", r.data.projects.length === 0 && r.data.suppliers.length === 1 && r.data.suppliers[0].name === "Only Supplier" && r.data.materials.length === 0, JSON.stringify(r));

/* reset wipes everything */
r = await call(env, "POST", "/api/data/reset", {}, token);
check("reset ok", r.status === 200 && r.data.ok === true);

r = await call(env, "GET", "/api/data", undefined, token);
const empty = r.data;
check("reset empties all collections", Object.values(empty).every((v) => v.length === 0));

/* unauthorized endpoints */
r = await call(env, "GET", "/api/backup/latest");
check("backup/latest requires auth", r.status === 401);
r = await call(env, "POST", "/api/data/reset", {});
check("reset requires auth", r.status === 401);

/* expired/invalid token rejected */
r = await call(env, "GET", "/api/data", undefined, "bad.token.here");
check("invalid token rejected (401)", r.status === 401);

console.log("\nRESULT: " + pass + " passed, " + fail + " failed");
db.close();
process.exit(fail === 0 ? 0 : 1);