/* ============================================
   Spark ERP — Data Store Module
   Simple localStorage-backed collections.
   Collections: projects, suppliers, contractors,
   clients, materials, moneyTransactions,
   materialTransactions.
   ============================================ */

const DB_KEY = "spark_db_v1";

export const COLLECTIONS = {
  projects: "projects",
  suppliers: "suppliers",
  contractors: "contractors",
  clients: "clients",
  materials: "materials",
  moneyTransactions: "moneyTransactions",
  materialTransactions: "materialTransactions",
};

export const PROJECT_TYPES = ["apartment", "villa", "clinic", "office", "shop", "other"];

export function uid() {
  return "id_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function getDB() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || {};
  } catch {
    return {};
  }
}

function setDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage unavailable */
  }
}

export function all(name) {
  return getDB()[name] || [];
}

export function get(name, id) {
  return all(name).find((x) => x.id === id) || null;
}

export function save(name, item) {
  const db = getDB();
  const list = db[name] || (db[name] = []);
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) list.push(item);
  else list[idx] = item;
  setDB(db);
  return item;
}

export function remove(name, id) {
  const db = getDB();
  const list = db[name];
  if (!list) return false;
  const idx = list.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  setDB(db);
  return true;
}

export function clearAll() {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Seed data (first run only) ---------- */

function seedIfEmpty() {
  try {
    if (localStorage.getItem(DB_KEY)) return;
  } catch {
    return;
  }

  const money = (direction, personType, personId, personName, amount, projectId = null, note = "") => ({
    id: uid(),
    direction,
    personType,
    personId,
    personName,
    amount: Number(amount),
    projectId,
    date: today(),
    note,
  });

  const suppliers = [
    { id: uid(), name: "أبو حمد للرمل", phone: "01000000001", notes: "", purchases: 12500, paid: 12500 },
    { id: uid(), name: "المنصورة للأسمنت", phone: "01000000002", notes: "", purchases: 48000, paid: 30000 },
    { id: uid(), name: "الصلب الحديث", phone: "01000000003", notes: "", purchases: 96000, paid: 60000 },
  ];

  const contractors = [
    { id: uid(), name: "مقاول السباكة", role: "plumbing", phone: "01111111111", total: 15000, paid: 10000 },
    { id: uid(), name: "مقاول الكهرباء", role: "electrical", phone: "01111111112", total: 12000, paid: 5000 },
    { id: uid(), name: "مقاول التشطيب", role: "finishing", phone: "01111111113", total: 40000, paid: 15000 },
    { id: uid(), name: "مقاول الدهانات", role: "painting", phone: "01111111114", total: 8000, paid: 8000 },
    { id: uid(), name: "مقاول السيراميك", role: "tiles", phone: "01111111115", total: 20000, paid: 20000 },
  ];

  const clients = [
    { id: uid(), name: "م/ أحمد السيد", phone: "01200000001", notes: "", paid: 50000, remaining: 300000 },
  ];

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
    createdAt: today(),
    contractors: contractors.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      total: c.total,
      paid: c.paid,
    })),
    materials: [
      { id: uid(), name: "أسمنت", supplierId: suppliers[1].id, supplierName: suppliers[1].name, quantity: 100, unit: "شيكارة", unitPrice: 110, total: 11000, date: today() },
      { id: uid(), name: "رمل", supplierId: suppliers[0].id, supplierName: suppliers[0].name, quantity: 10, unit: "متر مكعب", unitPrice: 250, total: 2500, date: today() },
      { id: uid(), name: "حديد تسليح", supplierId: suppliers[2].id, supplierName: suppliers[2].name, quantity: 4, unit: "طن", unitPrice: 12000, total: 48000, date: today() },
    ],
    otherExpenses: [],
  };

  const moneyTransactions = [
    money("in", "client", clients[0].id, clients[0].name, 50000, project.id, "دفعة مقدمة"),
    money("out", "contractor", contractors[0].id, contractors[0].name, 10000, project.id, "دفعة مقاول السباكة"),
    money("out", "contractor", contractors[1].id, contractors[1].name, 5000, project.id, "دفعة مقاول الكهرباء"),
    money("out", "supplier", suppliers[1].id, suppliers[1].name, 30000, project.id, "دفعة أسمنت"),
    money("out", "supplier", suppliers[2].id, suppliers[2].name, 60000, project.id, "دفعة حديد"),
  ];

  const db = {
    projects: [project],
    suppliers,
    contractors,
    clients,
    materials,
    moneyTransactions,
    materialTransactions: [],
  };

  setDB(db);
}

export function initStore() {
  seedIfEmpty();
}
