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