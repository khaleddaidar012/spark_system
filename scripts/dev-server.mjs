/* ============================================
   Spark ERP — Local dev server for smoke tests
   Serves the frontend statically and routes
   /api/* through the real Pages Function backed
   by an in-memory SQLite D1 shim. Lets the whole
   app run in a browser without wrangler.
   Usage: node scripts/dev-server.mjs [port]
   ============================================ */

import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { onRequest } from "../functions/api/[[path]].js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frontendDir = join(root, "frontend");
const migrationSQL = readFileSync(join(root, "migrations", "0001_init.sql"), "utf8");
const port = Number(process.argv[2]) || 3000;

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

const db = new DatabaseSync(":memory:");
db.exec(migrationSQL);
const env = {
  DB: new D1Shim(db),
  SPARK_ADMIN_USERNAME: "admin",
  SPARK_ADMIN_PASSWORD_HASH: "323015fe2dcfe38cccccb8286f7cd571342488eaab0748d8042ab526410f75fb",
  AUTH_SECRET: "dev-server-secret-0123456789abcdef",
};

async function apiCall(path, body) {
  return onRequest({
    request: new Request("http://localhost" + path, {
      method: body !== undefined ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    env,
  });
}

async function seedDemo() {
  const login = await apiCall("/api/auth/login", { username: "admin", password: "Spark@2026#ERP" });
  const { token } = await login.json();
  await onRequest({
    request: new Request("http://localhost/api/data/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    }),
    env,
  });
}

await seedDemo();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  try {
    if (url.pathname.startsWith("/api")) {
      const body = await readBody(req);
      const fr = new Request("http://localhost" + url.pathname + url.search, {
        method: req.method,
        headers: { "Content-Type": "application/json", ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
        ...(body ? { body } : {}),
      });
      const out = await onRequest({ request: fr, env });
      res.writeHead(out.status, Object.fromEntries(out.headers.entries()));
      const buf = await out.arrayBuffer();
      res.end(Buffer.from(buf));
      return;
    }

    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/dashboard.html";

    /* Pages are served from frontend/pages, while assets/components/data stay
       at the frontend root (matching the relative URLs used by the HTML). */
    const candidates = [join(frontendDir, normalize(p)), join(frontendDir, "pages", normalize(p))];
    let file = candidates.find((f) => f.startsWith(frontendDir) && existsSync(f) && !statSync(f).isDirectory());
    if (!file) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const data = readFileSync(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  } catch (err) {
    console.error("[dev-server] error for " + req.method + " " + url.pathname);
    console.error(err.stack || err);
    res.writeHead(500);
    res.end("Server error: " + err.message);
  }
}).listen(port, () => {
  console.log("Spark ERP dev server on http://localhost:" + port);
});

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
  });
}