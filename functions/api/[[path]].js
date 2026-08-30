/**
 * Spark ERP — Cloudflare Pages API (D1 backend)
 *
 * Single catch-all Pages Function serving the whole API.
 * Routes (all under /api):
 *
 *   GET    /api/health                -> { status, service, time }       (public)
 *   POST   /api/auth/login            -> { token, username }             (public)
 *   POST   /api/auth/verify           -> { ok }                          (auth)
 *   POST   /api/auth/logout           -> 204                             (public)
 *   GET    /api/data                  -> full snapshot of all data       (auth)
 *   POST   /api/data                  -> upsert { collection, item }     (auth)
 *   DELETE /api/data                  -> remove  { collection, id }      (auth)
 *   POST   /api/data/reset            -> wipe all data                   (auth)
 *   POST   /api/data/seed             -> seed demo data (if empty)       (auth)
 *   POST   /api/data/restore          -> full replace  { db }            (auth)
 *   POST   /api/backup                -> store snapshot { payload } in KV (auth)
 *   GET    /api/backup/latest         -> latest snapshot from KV          (auth)
 *
 * Auth: HMAC-SHA256 signed bearer token. Admin credentials come from env
 * (SPARK_ADMIN_USERNAME / SPARK_ADMIN_PASSWORD_HASH); nothing is exposed
 * to the browser.
 */

const SNAPSHOT_KEYS = [
  "projects",
  "suppliers",
  "contractors",
  "clients",
  "others",
  "materials",
  "moneyTransactions",
  "materialTransactions",
];

const PEOPLE_COLLECTIONS = ["suppliers", "contractors", "clients", "others"];

const COLLECTION_TABLE = {
  projects: "projects",
  suppliers: "people",
  contractors: "people",
  clients: "people",
  others: "people",
  materials: "materials",
  moneyTransactions: "money_transactions",
  materialTransactions: "material_transactions",
};

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; /* 30 days */

/* The legacy dev hash (admin / Spark@2026#ERP). Used ONLY as a fallback so the
   app keeps working until real secrets are set in the Cloudflare environment. */
const FALLBACK_ADMIN_HASH = "323015fe2dcfe38cccccb8286f7cd571342488eaab0748d8042ab526410f75fb";

/* ------------------------------------------------------------------ */
/*  Small helpers                                                       */
/* ------------------------------------------------------------------ */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function unauthorized() {
  return json({ error: "Unauthorized" }, 401);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function constantTimeEqual(a, b) {
  const A = String(a == null ? "" : a);
  const B = String(b == null ? "" : b);
  let diff = A.length ^ B.length;
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    diff |= (A.charCodeAt(i) || 0) ^ (B.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function uid() {
  return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function b64u(bytes) {
  const arr = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < arr.length; i += 0x8000) {
    s += String.fromCharCode(...arr.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(str) {
  const b64 = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function textToBytes(text) {
  return new TextEncoder().encode(text);
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", textToBytes(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------------ */
/*  Token auth                                                          */
/* ------------------------------------------------------------------ */

async function signToken(username, secret) {
  const payload = b64u(textToBytes(JSON.stringify({ u: username, exp: Date.now() + TOKEN_TTL_MS })));
  const key = await crypto.subtle.importKey("raw", textToBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, textToBytes(payload));
  return payload + "." + b64u(sig);
}

async function verifyToken(token, secret) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const key = await crypto.subtle.importKey("raw", textToBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromB64u(sig), textToBytes(payload));
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromB64u(payload)));
    if (!data.u || !data.exp || Date.now() > data.exp) return null;
    return data.u;
  } catch {
    return null;
  }
}

function config(env) {
  return {
    adminUser: env.SPARK_ADMIN_USERNAME || "admin",
    adminHash: env.SPARK_ADMIN_PASSWORD_HASH || FALLBACK_ADMIN_HASH,
    authSecret: env.AUTH_SECRET || (env.SPARK_ADMIN_PASSWORD_HASH || FALLBACK_ADMIN_HASH) + ":spark-erp-secret",
  };
}

async function requireAuth(request, env) {
  const token = bearerToken(request);
  if (!token) return null;
  return verifyToken(token, config(env).authSecret);
}

/* ------------------------------------------------------------------ */
/*  D1 access                                                           */
/* ------------------------------------------------------------------ */

function readRows(db, sql) {
  return db.prepare(sql).all().then((r) => r.results || []);
}

async function upsertItem(db, collection, item) {
  if (!item || typeof item !== "object" || !item.id) return { ok: false, error: "item.id is required" };
  const table = COLLECTION_TABLE[collection];
  if (!table) return { ok: false, error: "unknown collection: " + collection };

  const data = JSON.stringify(item);
  if (table === "people") {
    await db.prepare(
      `INSERT INTO people (id, kind, name, roles, data) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         kind = excluded.kind, name = excluded.name,
         roles = excluded.roles, data = excluded.data`
    ).bind(item.id, collection, String(item.name || ""), JSON.stringify(item.roles || []), data).run();
  } else if (table === "projects") {
    await db.prepare(
      `INSERT INTO projects (id, name, type, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, type = excluded.type,
         status = excluded.status, created_at = excluded.created_at, data = excluded.data`
    ).bind(item.id, String(item.name || ""), item.type || "", item.status || "", item.createdAt || "", data).run();
  } else if (table === "materials") {
    await db.prepare(
      `INSERT INTO materials (id, name, data) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data`
    ).bind(item.id, String(item.name || ""), data).run();
  } else if (table === "money_transactions") {
    await db.prepare(
      `INSERT INTO money_transactions (id, direction, person_id, project_id, created_at, data) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         direction = excluded.direction, person_id = excluded.person_id,
         project_id = excluded.project_id, created_at = excluded.created_at, data = excluded.data`
    ).bind(item.id, item.direction || "", item.personId || null, item.projectId || null, item.createdAt || 0, data).run();
  } else {
    await db.prepare(
      `INSERT INTO material_transactions (id, direction, project_id, created_at, data) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         direction = excluded.direction, project_id = excluded.project_id,
         created_at = excluded.created_at, data = excluded.data`
    ).bind(item.id, item.direction || "", item.projectId || null, item.createdAt || 0, data).run();
  }
  return { ok: true };
}

async function removeItem(db, collection, id) {
  if (!COLLECTION_TABLE[collection]) return { ok: false, error: "unknown collection" };
  if (!id) return { ok: false, error: "id is required" };
  const table = COLLECTION_TABLE[collection];
  await db.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return { ok: true };
}

async function reset(db) {
  await db.batch([
    db.prepare("DELETE FROM projects"),
    db.prepare("DELETE FROM people"),
    db.prepare("DELETE FROM materials"),
    db.prepare("DELETE FROM money_transactions"),
    db.prepare("DELETE FROM material_transactions"),
  ]);
}

async function snapshot(db) {
  const [projects, people, materials, money, mat] = await Promise.all([
    readRows(db, "SELECT data FROM projects ORDER BY rowid ASC"),
    readRows(db, "SELECT kind, data FROM people ORDER BY rowid ASC"),
    readRows(db, "SELECT data FROM materials ORDER BY rowid ASC"),
    readRows(db, "SELECT data FROM money_transactions ORDER BY rowid ASC"),
    readRows(db, "SELECT data FROM material_transactions ORDER BY rowid ASC"),
  ]);
  const result = {
    projects: projects.map((r) => JSON.parse(r.data)),
    suppliers: [],
    contractors: [],
    clients: [],
    others: [],
    materials: materials.map((r) => JSON.parse(r.data)),
    moneyTransactions: money.map((r) => JSON.parse(r.data)),
    materialTransactions: mat.map((r) => JSON.parse(r.data)),
  };
  for (const row of people) {
    const item = JSON.parse(row.data);
    if (Array.isArray(result[row.kind])) result[row.kind].push(item);
  }
  return result;
}

async function restore(db, full) {
  if (!full || typeof full !== "object") return { ok: false, error: "invalid db payload" };
  const stmts = [
    db.prepare("DELETE FROM projects"),
    db.prepare("DELETE FROM people"),
    db.prepare("DELETE FROM materials"),
    db.prepare("DELETE FROM money_transactions"),
    db.prepare("DELETE FROM material_transactions"),
  ];
  for (const key of SNAPSHOT_KEYS) {
    const list = Array.isArray(full[key]) ? full[key] : [];
    for (const item of list) {
      if (!item || typeof item !== "object" || !item.id || !COLLECTION_TABLE[key]) continue;
      const table = COLLECTION_TABLE[key];
      const data = JSON.stringify(item);
      if (table === "people") {
        stmts.push(
          db.prepare(
            `INSERT INTO people (id, kind, name, roles, data) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               kind = excluded.kind, name = excluded.name,
               roles = excluded.roles, data = excluded.data`
          ).bind(item.id, key, String(item.name || ""), JSON.stringify(item.roles || []), data)
        );
      } else if (table === "projects") {
        stmts.push(
          db.prepare(
            `INSERT INTO projects (id, name, type, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name, type = excluded.type,
               status = excluded.status, created_at = excluded.created_at, data = excluded.data`
          ).bind(item.id, String(item.name || ""), item.type || "", item.status || "", item.createdAt || "", data)
        );
      } else if (table === "materials") {
        stmts.push(
          db.prepare(
            `INSERT INTO materials (id, name, data) VALUES (?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data`
          ).bind(item.id, String(item.name || ""), data)
        );
      } else if (table === "money_transactions") {
        stmts.push(
          db.prepare(
            `INSERT INTO money_transactions (id, direction, person_id, project_id, created_at, data) VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               direction = excluded.direction, person_id = excluded.person_id,
               project_id = excluded.project_id, created_at = excluded.created_at, data = excluded.data`
          ).bind(item.id, item.direction || "", item.personId || null, item.projectId || null, item.createdAt || 0, data)
        );
      } else {
        stmts.push(
          db.prepare(
            `INSERT INTO material_transactions (id, direction, project_id, created_at, data) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               direction = excluded.direction, project_id = excluded.project_id,
               created_at = excluded.created_at, data = excluded.data`
          ).bind(item.id, item.direction || "", item.projectId || null, item.createdAt || 0, data)
        );
      }
    }
  }
  await db.batch(stmts);
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Demo seed (mirrors the old store.js seed, only inserted when empty) */
/* ------------------------------------------------------------------ */

async function seed(db) {
  const count = await db.prepare("SELECT COUNT(*) AS n FROM projects").first();
  if (count && Number(count.n) > 0) return { ok: true, seeded: false };

  const today = new Date().toISOString().slice(0, 10);
  let seedCreatedAt = Date.now() - 5 * 60 * 1000;
  const money = (direction, personType, personId, personName, amount, projectId = null, note = "") => ({
    id: uid(),
    direction,
    personType,
    personId,
    personName,
    amount: Number(amount),
    projectId,
    date: today,
    createdAt: (seedCreatedAt += 60 * 1000),
    note,
  });

  const suppliers = [
    { id: uid(), name: "أبو حمد للرمل", phone: "01000000001", notes: "", supplies: ["رمل", "زلط", "سن"], purchases: 12500, paid: 12500 },
    { id: uid(), name: "المنصورة للأسمنت", phone: "01000000002", notes: "", supplies: ["أسمنت", "جبس"], purchases: 48000, paid: 30000 },
    { id: uid(), name: "الصلب الحديث", phone: "01000000003", notes: "", supplies: ["حديد تسليح"], purchases: 96000, paid: 60000 },
  ];
  const contractors = [
    { id: uid(), name: "مقاول السباكة", role: "plumbing", phone: "01111111111", total: 15000, paid: 10000 },
    { id: uid(), name: "مقاول الكهرباء", role: "electrical", phone: "01111111112", total: 12000, paid: 5000 },
    { id: uid(), name: "مقاول التشطيب", role: "finishing", phone: "01111111113", total: 40000, paid: 15000 },
    { id: uid(), name: "مقاول الدهانات", role: "painting", phone: "01111111114", total: 8000, paid: 8000 },
    { id: uid(), name: "مقاول السيراميك", role: "tiles", phone: "01111111115", total: 20000, paid: 20000 },
  ];
  const clients = [{ id: uid(), name: "م/ أحمد السيد", phone: "01200000001", notes: "", paid: 50000, remaining: 300000 }];
  const materials = [
    { id: uid(), name: "أسمنت", unit: "شيكارة", qty: 350, unitPrice: 110 },
    { id: uid(), name: "رمل", unit: "متر مكعب", qty: 20, unitPrice: 250 },
    { id: uid(), name: "حديد تسليح", unit: "طن", qty: 8, unitPrice: 12000 },
    { id: uid(), name: "سيراميك", unit: "متر مربع", qty: 40, unitPrice: 220 },
    { id: uid(), name: "دهانات", unit: "جالون", qty: 60, unitPrice: 320 },
  ];
  const project = {
    id: uid(),
    name: "شقة 150 م² - التجمع الخامس",
    type: "apartment",
    area: 150,
    advancePayment: 50000,
    status: "active",
    progress: 45,
    createdAt: today,
    contractors: contractors.map((c) => ({ id: c.id, name: c.name, role: c.role, total: c.total, paid: c.paid })),
    materials: [
      { id: uid(), name: "أسمنت", supplierId: suppliers[1].id, supplierName: suppliers[1].name, contractorId: contractors[0].id, contractorName: contractors[0].name, quantity: 100, unit: "شيكارة", unitPrice: 110, total: 11000, date: today },
      { id: uid(), name: "رمل", supplierId: suppliers[0].id, supplierName: suppliers[0].name, contractorId: contractors[0].id, contractorName: contractors[0].name, quantity: 10, unit: "متر مكعب", unitPrice: 250, total: 2500, date: today },
      { id: uid(), name: "حديد تسليح", supplierId: suppliers[2].id, supplierName: suppliers[2].name, contractorId: contractors[1].id, contractorName: contractors[1].name, quantity: 4, unit: "طن", unitPrice: 12000, total: 48000, date: today },
    ],
    otherExpenses: [],
  };

  const dbData = {
    projects: [project],
    suppliers,
    contractors,
    clients,
    materials,
    moneyTransactions: [
      money("in", "client", clients[0].id, clients[0].name, 50000, project.id, "دفعة مقدمة"),
      money("out", "contractor", contractors[0].id, contractors[0].name, 10000, project.id, "دفعة مقاول السباكة"),
      money("out", "contractor", contractors[1].id, contractors[1].name, 5000, project.id, "دفعة مقاول الكهرباء"),
      money("out", "supplier", suppliers[1].id, suppliers[1].name, 30000, project.id, "دفعة أسمنت"),
      money("out", "supplier", suppliers[2].id, suppliers[2].name, 60000, project.id, "دفعة حديد"),
    ],
    materialTransactions: [],
  };

  await restore(db, dbData);
  return { ok: true, seeded: true };
}

/* ------------------------------------------------------------------ */
/*  Request router                                                      */
/* ------------------------------------------------------------------ */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const segments = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = request.method.toUpperCase();

  try {
    /* Health (public) */
    if (segments[0] === "health" && method === "GET") {
      return json({ status: "ok", service: "spark-erp-api", time: Date.now() });
    }

    /* Auth */
    if (segments[0] === "auth" && segments[1] === "login" && method === "POST") {
      const body = await readJson(request);
      const { username, password } = body || {};
      if (typeof username !== "string" || typeof password !== "string") {
        return json({ error: "username and password are required" }, 400);
      }
      const c = config(env);
      const hash = await sha256Hex(password);
      if (!constantTimeEqual(username, c.adminUser) || !constantTimeEqual(hash, c.adminHash)) {
        return json({ error: "Invalid username or password" }, 401);
      }
      const token = await signToken(username, c.authSecret);
      return json({ token, username });
    }

    if (segments[0] === "auth" && segments[1] === "verify" && method === "POST") {
      const user = await requireAuth(request, env);
      if (!user) return unauthorized();
      const body = await readJson(request);
      const c = config(env);
      const ok = constantTimeEqual(await sha256Hex(String((body && body.password) || "")), c.adminHash);
      return json({ ok });
    }

    if (segments[0] === "auth" && segments[1] === "logout" && method === "POST") {
      return new Response(null, { status: 204 });
    }

    /* Data */
    if (segments[0] === "data") {
      const user = await requireAuth(request, env);
      if (!user) return unauthorized();

      if (method === "GET" && segments.length === 1) {
        return json(await snapshot(env.DB));
      }
      if (segments[1] === "reset" && method === "POST") {
        await reset(env.DB);
        return json({ ok: true });
      }
      if (segments[1] === "seed" && method === "POST") {
        return json(await seed(env.DB));
      }
      if (segments[1] === "restore" && method === "POST") {
        const body = await readJson(request);
        if (!body || !body.db) return json({ error: "db payload is required" }, 400);
        return json(await restore(env.DB, body.db));
      }
      if (segments.length === 1 && method === "POST") {
        const body = await readJson(request);
        const res = await upsertItem(env.DB, body && body.collection, body && body.item);
        return res.ok ? json({ ok: true }) : json({ error: res.error }, 400);
      }
      if (segments.length === 1 && method === "DELETE") {
        const body = await readJson(request);
        const res = await removeItem(env.DB, body && body.collection, body && body.id);
        return res.ok ? json({ ok: true }) : json({ error: res.error }, 400);
      }
      return json({ error: "not found" }, 404);
    }

    /* Sync Engine Push & Pull API */
    if (segments[0] === "sync") {
      const user = await requireAuth(request, env);
      if (!user) return unauthorized();

      if (segments[1] === "push" && method === "POST") {
        const body = await readJson(request);
        const ops = Array.isArray(body && body.operations) ? body.operations : [];
        const processed = [];
        for (const op of ops) {
          if (!op || !op.entity || !op.payload) continue;
          if (op.operation === "delete") {
            await removeItem(env.DB, op.entity, op.entityId || op.payload.id);
          } else {
            await upsertItem(env.DB, op.entity, op.payload);
          }
          if (op.id) processed.push(op.id);
        }
        return json({ ok: true, processed, serverTime: Date.now() });
      }

      if (segments[1] === "pull" && method === "GET") {
        const data = await snapshot(env.DB);
        return json({ ok: true, serverTime: Date.now(), data });
      }

      return json({ error: "not found" }, 404);
    }

    /* Backup snapshots (stored in KV when a binding is configured) */
    if (segments[0] === "backup") {
      const user = await requireAuth(request, env);
      if (!user) return unauthorized();

      if (method === "POST") {
        const body = await readJson(request);
        if (!env.BACKUP_KV) return json({ error: "BACKUP_KV binding is not configured" }, 501);
        await env.BACKUP_KV.put("latest", JSON.stringify(body), { expirationTtl: 60 * 60 * 24 * 365 });
        await env.BACKUP_KV.put("backup-" + Date.now(), JSON.stringify(body), { expirationTtl: 60 * 60 * 24 * 365 });
        return json({ ok: true });
      }
      if (segments[1] === "latest" && method === "GET") {
        if (!env.BACKUP_KV) return json({ error: "BACKUP_KV binding is not configured" }, 501);
        const raw = await env.BACKUP_KV.get("latest");
        if (raw == null) return json({ error: "no backup yet" }, 404);
        return json(JSON.parse(raw));
      }
      return json({ error: "not found" }, 404);
    }

    return json({ error: "not found" }, 404);
  } catch (err) {
    return json({ error: err.message || "internal error" }, 500);
  }
}