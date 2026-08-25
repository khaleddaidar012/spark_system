/* ============================================
   Spark ERP — Data Store Module
   Central Cloudflare D1 database behind a thin
   in-memory facade. The rest of the app keeps
   using the same synchronous API (all/get/save/
   remove) — reads come from memory, writes are
   applied locally then pushed to the API so the
   data is shared across devices.
   ============================================ */

import { api } from "./api.js";
import { toast } from "./toast.js";

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

/* Implicit role of a person stored in each collection when no roles[] is set. */
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

export function uid() {
  return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/* Load the full snapshot from the shared database into memory.
   Must be awaited before rendering. */
export async function initStore({ force = false } = {}) {
  if (loaded && !force) return;
  const data = await api.snapshot();
  for (const key of Object.keys(cache)) {
    cache[key] = Array.isArray(data[key]) ? data[key] : [];
  }
  loaded = true;
  seedDefaultData();
}

export function isStoreLoaded() {
  return loaded;
}

/* Current database state as a plain object (used by backup/restore). */
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

function reportSyncError() {
  toast("Sync failed — check your connection", "danger");
}

/* Apply locally (so the UI updates instantly) and push to the shared DB. */
export function save(name, item) {
  const list = cache[name] || (cache[name] = []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) list.push(item);
  else list[idx] = item;
  if (loaded) api.save(name, item).catch(reportSyncError);
  return item;
}

export function remove(name, id) {
  const list = cache[name];
  if (!list) return false;
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  if (loaded) api.remove(name, id).catch(reportSyncError);
  return true;
}

/* Empty the shared database (without re-seeding). */
export async function wipeAll() {
  await api.reset();
  for (const key of Object.keys(cache)) cache[key] = [];
}

/* Empty the database and re-create the demo seed. */
export async function clearAll() {
  await api.reset();
  await api.seed();
  await initStore({ force: true });
}

/* ============================================================
   Default seed data — contractors & suppliers
   Non-destructive: only inserts records that are not already
   present (matched by name). Safe to call on every app start.
   ============================================================ */

const DEFAULT_CONTRACTORS = [
  /* Lean */
  { name: "مقاول لين", role: "lean" },
  /* Wood doors / cladding */
  { name: "محمد سلطان", role: "wooddoors" },
  { name: "نصار الديب", role: "woodcladding" },
  /* Marble */
  { name: "محمد الحمشبي", role: "marble" },
  /* Demolition / cleanup */
  { name: "مصطفى (تكسير)", role: "demolition" },
  /* Insulation */
  { name: "عم زكريا", role: "insulation" },
  { name: "مصطفى (عزل)", role: "insulation" },
  /* Insulation + plumbing */
  { name: "عم هاني السباك", role: "insulplumb" },
  { name: "عم هاني (مقاول سباكة)", role: "plumbing" },
  /* Fire safety */
  { name: "محمد بلال", role: "fireworks" },
  /* Carpentry / ironwork */
  { name: "أحمد وهبة", role: "ironwork" },
  { name: "عبد الرحمن", role: "carpentry" },
  /* Electrical */
  { name: "إبراهيم السيد أحمد", role: "electrical" },
  /* Gypsum */
  { name: "حامد العلمي", role: "gypsum" },
  { name: "أبو هبة (جبس)", role: "gypsum" },
  /* Painting */
  { name: "أبو يوسف", role: "painting" },
  { name: "عبده الفار", role: "painting" },
  { name: "حسام عبد الواحد", role: "painting" },
  { name: "حسام الزرقا", role: "painting" },
  /* Plastering */
  { name: "إيهاب جمعة", role: "plastering" },
  { name: "محمود الحفية", role: "plastering" },
  { name: "سرور (محارة)", role: "plastering" },
  { name: "عم سليمان البحري", role: "plastering" },
  /* Masonry */
  { name: "إبراهيم (مباني)", role: "masonry" },
  { name: "عم سرور (مباني)", role: "masonry" },
  /* HVAC */
  { name: "شركة الأقصى", role: "hvac" },
  /* Tiles */
  { name: "كريم الشناوي", role: "tiles" },
  { name: "إبراهيم (مبلط)", role: "tiles" },
  /* Aluminum & kitchens */
  { name: "السعيد", role: "aluminum" },
  { name: "معتز", role: "aluminum" },
  { name: "ميكانيوم", role: "kitchens" },
];

const DEFAULT_SUPPLIERS = [
  /* Plumbing */
  { name: "هيثم أبو العنيين", supplies: ["بضاعة سباكة"], notes: "دمياط" },
  { name: "عبد العزيز السلاب", supplies: ["بضاعة سباكة"], notes: "القاهرة" },
  /* Electrical */
  { name: "هشام الشربيني", supplies: ["توريدات كهرباء"] },
  /* Insulation */
  { name: "ألفا", supplies: ["مواد عزل"] },
  { name: "محمد أشرف", supplies: ["مواد عزل"] },
  /* Ceramics — each as a separate record */
  { name: "مورد سيراميك علوان", supplies: ["سيراميك"] },
  { name: "القطان", supplies: ["سيراميك"] },
  { name: "أبو العز", supplies: ["سيراميك"] },
  { name: "أبو الهدى", supplies: ["سيراميك"] },
  { name: "الشربيني (سيراميك)", supplies: ["سيراميك"] },
];

export function seedDefaultData() {
  const existingContractorNames = new Set(all("contractors").map((c) => c.name));
  for (const c of DEFAULT_CONTRACTORS) {
    if (!existingContractorNames.has(c.name)) {
      save("contractors", {
        id: uid(),
        name: c.name,
        role: c.role,
        phone: "",
        total: 0,
        paid: 0,
      });
    }
  }

  const existingSupplierNames = new Set(all("suppliers").map((s) => s.name));
  for (const s of DEFAULT_SUPPLIERS) {
    if (!existingSupplierNames.has(s.name)) {
      save("suppliers", {
        id: uid(),
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

/* ---------- Deductions Helpers ---------- */

export function addDeduction({ personId, personType, amount, reason, date, projectId }) {
  const item = {
    id: uid(),
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

/* ---------- Expected Profit Helpers ---------- */

export function setProjectExpectedProfit(projectId, amount) {
  const project = get("projects", projectId);
  if (!project) return false;
  project.expectedProfit = Number(amount) || 0;
  save("projects", project);
  return true;
}