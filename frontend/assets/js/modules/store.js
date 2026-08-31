/* ============================================
   Spark ERP — Data Store Module (Offline-First)
   IndexedDB (Dexie.js) durable persistence +
   sync queue dispatching with in-memory cache
   facade for zero-latency UI rendering.
   ============================================ */

import { api } from "./api.js";
import { toast } from "./toast.js";
import { db, initDatabase } from "../db/db.js";
import { generateUUID } from "./uuid.js";

export const COLLECTIONS = {
  projects: "projects",
  suppliers: "suppliers",
  contractors: "contractors",
  clients: "clients",
  others: "others",
  materials: "materials",
  moneyTransactions: "moneyTransactions",
  materialTransactions: "materialTransactions",
  deductions: "deductions",
};

export const PEOPLE_COLLECTIONS = ["suppliers", "contractors", "clients", "others"];

export const COLLECTION_ROLE = {
  suppliers: "supplier",
  contractors: "contractor",
  clients: "client",
  others: "other",
};

export const PROJECT_TYPES = ["apartment", "villa", "clinic", "office", "shop", "other"];

const cache = {
  projects: [],
  suppliers: [],
  contractors: [],
  clients: [],
  others: [],
  materials: [],
  moneyTransactions: [],
  materialTransactions: [],
  deductions: [],
};

let loaded = false;
let _reconciling = false;

export function uid() {
  return generateUUID();
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/* Debounced spark:data-changed — prevents UI thrashing on bulk writes */
let _dataChangedTimer = null;
function emitDataChanged() {
  if (_dataChangedTimer) clearTimeout(_dataChangedTimer);
  _dataChangedTimer = setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent("spark:data-changed"));
    } catch { /* ignore */ }
  }, 80);
}

/* Exported: reload in-memory cache from IndexedDB and trigger UI refresh.
   Called by SyncEngine after a successful pull from the server. */
export async function refreshFromIndexedDB() {
  await loadCacheFromIndexedDB();
  emitDataChanged();
}

/* Load data from local IndexedDB into cache FIRST (instant), then hydrate from API in background */
export async function initStore({ force = false } = {}) {
  if (loaded && !force) return;

  await initDatabase();

  // 1. Immediately populate cache from IndexedDB — zero-latency, works offline
  await loadCacheFromIndexedDB();
  loaded = true;

  // 2. Seed default data only if needed
  await seedDefaultData();

  // 3. Auto-refresh cache whenever SyncEngine pulls remote changes
  window.addEventListener("spark:remote-data-updated", async () => {
    await loadCacheFromIndexedDB();
    emitDataChanged();
  });

  // 4. Fire-and-forget background API hydration — NEVER blocks page render
  if (navigator.onLine) {
    _reconciling = true;
    Promise.resolve().then(async () => {
      try {
        const data = await api.snapshot();
        if (data && typeof data === "object") {
          await reconcileServerSnapshot(data);
          await loadCacheFromIndexedDB();
          emitDataChanged();
        }
      } catch {
        /* Running on local IndexedDB — this is normal when offline */
      } finally {
        _reconciling = false;
      }
    });
  }
}

async function loadCacheFromIndexedDB() {
  try {
    cache.projects = await db.projects.filter((x) => !x.deletedAt).toArray();
    cache.materials = await db.materials.filter((x) => !x.deletedAt).toArray();
    cache.moneyTransactions = await db.moneyTransactions.filter((x) => !x.deletedAt).toArray();
    cache.materialTransactions = await db.materialTransactions.filter((x) => !x.deletedAt).toArray();
    cache.deductions = await db.deductions.filter((x) => !x.deletedAt).toArray();

    const people = await db.people.filter((x) => !x.deletedAt).toArray();
    cache.suppliers = people.filter((p) => p.kind === "suppliers" || p.kind === "supplier" || (Array.isArray(p.roles) && (p.roles.includes("supplier") || p.roles.includes("suppliers"))));
    cache.contractors = people.filter((p) => p.kind === "contractors" || p.kind === "contractor" || (Array.isArray(p.roles) && (p.roles.includes("contractor") || p.roles.includes("contractors"))));
    cache.clients = people.filter((p) => p.kind === "clients" || p.kind === "client" || (Array.isArray(p.roles) && (p.roles.includes("client") || p.roles.includes("clients"))));
    cache.others = people.filter((p) => p.kind === "others" || p.kind === "other" || (Array.isArray(p.roles) && (p.roles.includes("other") || p.roles.includes("others"))));
  } catch (err) {
    console.error("[Store] Error reading IndexedDB cache:", err);
  }
}

export async function reconcileServerSnapshot(data) {
  try {
    for (const key of Object.keys(COLLECTIONS)) {
      const items = Array.isArray(data[key]) ? data[key] : [];
      const serverIdSet = new Set(items.map((x) => x && x.id).filter(Boolean));

      if (PEOPLE_COLLECTIONS.includes(key)) {
        if (db.people) {
          const currentPeople = await db.people
            .where("kind")
            .equals(key)
            .filter((p) => p.syncStatus === "synced" && !p.deletedAt)
            .toArray();
          for (const p of currentPeople) {
            if (!serverIdSet.has(p.id)) {
              await db.people.delete(p.id).catch(() => {});
            }
          }
          if (items.length > 0) {
            await db.people.bulkPut(items.map((item) => ({ ...item, kind: key, syncStatus: "synced" })));
          }
        }
      } else if (db[key]) {
        // Remove local synced items that no longer exist on server
        const currentItems = await db[key]
          .filter((x) => x.syncStatus === "synced" && !x.deletedAt)
          .toArray();
        for (const it of currentItems) {
          if (!serverIdSet.has(it.id)) {
            await db[key].delete(it.id).catch(() => {});
          }
        }
        if (items.length > 0) {
          await db[key].bulkPut(items.map((item) => ({ ...item, syncStatus: "synced" })));
        }
      }
    }
  } catch (err) {
    console.warn("[Store] Error reconciling server snapshot:", err);
  }
}

export function isReconciling() {
  return _reconciling;
}

export function isStoreLoaded() {
  return loaded;
}

export function dbSnapshot() {
  return JSON.parse(JSON.stringify(cache));
}

/* ---------- Reads ---------- */

export function all(name) {
  return cache[name] || [];
}

export function get(name, id) {
  return all(name).find((x) => x.id === id) || null;
}

export function personHasRole(person, role) {
  const roles =
    Array.isArray(person.roles) && person.roles.length
      ? person.roles
      : [COLLECTION_ROLE[person.__collection] || "other"];
  return roles.includes(role);
}

export function allPeople() {
  return PEOPLE_COLLECTIONS.flatMap((name) =>
    all(name).map((p) => ({ ...p, __collection: name }))
  );
}

export function peopleWithRole(role) {
  return allPeople().filter((p) => personHasRole(p, role));
}

export function findPersonById(id) {
  for (const name of PEOPLE_COLLECTIONS) {
    const person = get(name, id);
    if (person) return { person, collection: name };
  }
  return null;
}

/* ---------- Writes ---------- */

export async function save(name, item) {
  if (PEOPLE_COLLECTIONS.includes(name)) {
    item.kind = item.kind || name;
    if (!item.roles || !Array.isArray(item.roles) || !item.roles.length) {
      item.roles = [COLLECTION_ROLE[name] || "supplier"];
    }
  }

  const list = cache[name] || (cache[name] = []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) list.push(item);
  else list[idx] = item;

  const now = Date.now();
  const record = {
    ...item,
    updatedAt: now,
    syncStatus: "pending",
    kind: PEOPLE_COLLECTIONS.includes(name) ? name : item.kind,
  };

  emitDataChanged();

  try {
    const table = PEOPLE_COLLECTIONS.includes(name) ? db.people : db[name];
    if (table) {
      await db.transaction("rw", [table, db.syncQueue], async () => {
        await table.put({ ...record, kind: PEOPLE_COLLECTIONS.includes(name) ? name : undefined });
        await db.syncQueue.add({
          id: generateUUID(),
          entity: name,
          entityId: item.id,
          operation: idx === -1 ? "create" : "update",
          payload: record,
          createdAt: now,
          status: "pending",
        });
      });
    }
    window.dispatchEvent(new CustomEvent("spark:queue-updated"));
  } catch (err) {
    console.error("[Store] Dexie write error:", err);
    if (idx === -1) {
      list.pop();
    } else {
      list[idx] = item;
    }
  }

  return item;
}

export function remove(name, id) {
  const list = cache[name];
  if (!list) return false;
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  const removedItem = list[idx];
  list.splice(idx, 1);

  const now = Date.now();
  (async () => {
    try {
      const table = PEOPLE_COLLECTIONS.includes(name) ? db.people : db[name];
      if (table) {
        await db.transaction("rw", [table, db.syncQueue], async () => {
          const existing = await table.get(id);
          if (existing) {
            await table.put({ ...existing, deletedAt: now, syncStatus: "pending_delete" });
          }
          await db.syncQueue.add({
            id: generateUUID(),
            entity: name,
            entityId: id,
            operation: "delete",
            payload: { id, deletedAt: now },
            createdAt: now,
            status: "pending",
          });
        });
      }
      window.dispatchEvent(new CustomEvent("spark:queue-updated"));
    } catch (err) {
      console.error("[Store] Dexie remove error:", err);
      list.splice(idx, 0, removedItem);
    }
  })();

  emitDataChanged();
  return true;
}

export async function wipeAll() {
  try {
    await db.transaction("rw", [db.projects, db.people, db.materials, db.moneyTransactions, db.materialTransactions, db.deductions], async () => {
      await Promise.all([
        db.projects.clear(),
        db.people.clear(),
        db.materials.clear(),
        db.moneyTransactions.clear(),
        db.materialTransactions.clear(),
        db.deductions.clear(),
      ]);
    });
  } catch {}
  for (const key of Object.keys(cache)) cache[key] = [];
  if (navigator.onLine) await api.reset().catch(() => {});
}

export async function deleteCategories({ projects = false, finance = false, suppliers = false, contractors = false } = {}) {
  if (finance) {
    cache.moneyTransactions = [];
    cache.materialTransactions = [];
    cache.deductions = [];
    await db.moneyTransactions.clear();
    await db.materialTransactions.clear();
    await db.deductions.clear();
  }
  if (projects) {
    cache.projects = [];
    await db.projects.clear();
  }
  if (suppliers) {
    cache.suppliers = [];
    await db.people.where("kind").equals("suppliers").delete();
  }
  if (contractors) {
    cache.contractors = [];
    await db.people.where("kind").equals("contractors").delete();
  }
  if (navigator.onLine) {
    await api.restore(dbSnapshot()).catch(() => {});
  }
  return true;
}

export async function clearAll() {
  await wipeAll();
  await seedDefaultData();
  await initStore({ force: true });
}

/* Default seed data — contractors & suppliers */
const DEFAULT_CONTRACTORS = [
  { name: "مقاول لين", role: "lean" },
  { name: "محمد سلطان", role: "wooddoors" },
  { name: "نصار الديب", role: "woodcladding" },
  { name: "محمد الحمشبي", role: "marble" },
  { name: "مصطفى (تكسير)", role: "demolition" },
  { name: "عم زكريا", role: "insulation" },
  { name: "مصطفى (عزل)", role: "insulation" },
  { name: "عم هاني السباك", role: "insulplumb" },
  { name: "عم هاني (مقاول سباكة)", role: "plumbing" },
  { name: "محمد بلال", role: "fireworks" },
  { name: "أحمد وهبة", role: "ironwork" },
  { name: "عبد الرحمن", role: "carpentry" },
  { name: "إبراهيم السيد أحمد", role: "electrical" },
  { name: "حامد العلمي", role: "gypsum" },
  { name: "أبو هبة (جبس)", role: "gypsum" },
  { name: "أبو يوسف", role: "painting" },
  { name: "عبده الفار", role: "painting" },
  { name: "حسام عبد الواحد", role: "painting" },
  { name: "حسام الزرقا", role: "painting" },
  { name: "إيهاب جمعة", role: "plastering" },
  { name: "محمود الحفية", role: "plastering" },
  { name: "سرور (محارة)", role: "plastering" },
  { name: "عم سليمان البحري", role: "plastering" },
  { name: "إبراهيم (مباني)", role: "masonry" },
  { name: "عم سرور (مباني)", role: "masonry" },
  { name: "شركة الأقصى", role: "hvac" },
  { name: "كريم الشناوي", role: "tiles" },
  { name: "إبراهيم (مبلط)", role: "tiles" },
  { name: "السعيد", role: "aluminum" },
  { name: "معتز", role: "aluminum" },
  { name: "ميكانيوم", role: "kitchens" },
];

const DEFAULT_SUPPLIERS = [
  { name: "هيثم أبو العنيين", supplies: ["بضاعة سباكة"], notes: "دمياط" },
  { name: "عبد العزيز السلاب", supplies: ["بضاعة سباكة"], notes: "القاهرة" },
  { name: "هشام الشربيني", supplies: ["توريدات كهرباء"] },
  { name: "ألفا", supplies: ["مواد عزل"] },
  { name: "محمد أشرف", supplies: ["مواد عزل"] },
  { name: "مورد سيراميك علوان", supplies: ["سيراميك"] },
  { name: "القطان", supplies: ["سيراميك"] },
  { name: "أبو العز", supplies: ["سيراميك"] },
  { name: "أبو الهدى", supplies: ["سيراميك"] },
  { name: "الشربيني (سيراميك)", supplies: ["سيراميك"] },
];

export async function seedDefaultData() {
  if (!localStorage.getItem("spark_contractors_deleted")) {
    const existingNames = new Set(all("contractors").map((c) => c.name));
    for (const c of DEFAULT_CONTRACTORS) {
      if (!existingNames.has(c.name)) {
        const id = "seed_c_" + encodeURIComponent(c.name.trim()).replace(/%/g, "_").toLowerCase();
        save("contractors", {
          id,
          name: c.name,
          role: c.role,
          phone: "",
          total: 0,
          paid: 0,
        });
      }
    }
  }

  if (!localStorage.getItem("spark_suppliers_deleted")) {
    const existingNames = new Set(all("suppliers").map((s) => s.name));
    for (const s of DEFAULT_SUPPLIERS) {
      if (!existingNames.has(s.name)) {
        const id = "seed_s_" + encodeURIComponent(s.name.trim()).replace(/%/g, "_").toLowerCase();
        save("suppliers", {
          id,
          name: s.name,
          phone: "",
          notes: s.notes || "",
          supplies: s.supplies || [],
          purchases: 0,
          paid: 0,
        });
      }
    }
  }
}

/* Deductions Helpers */
export function addDeduction({ personId, personType, amount, reason, date, projectId }) {
  const item = {
    id: generateUUID(),
    personId: personId || "",
    personType: personType || "contractor",
    amount: Number(amount) || 0,
    reason: reason || "",
    date: date || today(),
    projectId: projectId || "",
    createdAt: Date.now(),
  };
  save("deductions", item);
  return item;
}

export function deleteDeduction(id) {
  return remove("deductions", id);
}

export function getDeductionsByPerson(personId, personType, fromDate, toDate) {
  return all("deductions").filter((d) => {
    if (d.personId !== personId) return false;
    if (personType && d.personType !== personType) return false;
    if (fromDate && d.date && d.date < fromDate) return false;
    if (toDate && d.date && d.date > toDate) return false;
    return true;
  });
}

export function setProjectExpectedProfit(projectId, amount) {
  const project = get("projects", projectId);
  if (!project) return false;
  project.expectedProfit = Number(amount) || 0;
  save("projects", project);
  return true;
}