/* ============================================
   Spark ERP — Business Actions Module
   Every action keeps accounts in sync.
   Users only enter data; the system updates
   project costs, inventory and person accounts.
   ============================================ */

import { all, get, save, uid, today } from "./store.js";
import { num } from "./calc.js";

/* ---------- Money ---------- */

export function recordMoney({ direction, personType, personId, personName, amount, projectId = null, note = "" }) {
  const value = num(amount);
  const txn = {
    id: uid(),
    direction,
    personType,
    personId: personId || null,
    personName: personName || "",
    amount: value,
    projectId: projectId || null,
    date: today(),
    note: note || "",
  };
  save("moneyTransactions", txn);

  if (personType === "supplier") {
    const person = get("suppliers", personId);
    if (person) {
      person.paid = num(person.paid) + (direction === "out" ? value : -value);
      save("suppliers", person);
    }
  } else if (personType === "contractor") {
    const person = get("contractors", personId);
    if (person) {
      person.paid = num(person.paid) + (direction === "out" ? value : -value);
      save("contractors", person);
    }
  } else if (personType === "client") {
    const person = get("clients", personId);
    if (person) {
      person.paid = num(person.paid) + (direction === "in" ? value : -value);
      save("clients", person);
    }
  }

  return txn;
}

/* ---------- Project materials ---------- */

function stockIn(name, quantity, unit) {
  const item = all("materials").find((m) => m.name === name);
  if (item) {
    item.qty = num(item.qty) + num(quantity);
    item.unit = unit || item.unit;
    save("materials", item);
  } else {
    save("materials", {
      id: uid(),
      name,
      unit: unit || "",
      qty: num(quantity),
      unitPrice: 0,
    });
  }
}

export function addMaterialToProject(projectId, { name, supplierId, quantity, unit, unitPrice, date }) {
  const project = get("projects", projectId);
  if (!project) return null;
  const supplier = supplierId ? get("suppliers", supplierId) : null;
  const qty = num(quantity);
  const price = num(unitPrice);
  const total = qty * price;

  const item = {
    id: uid(),
    name: String(name || "").trim(),
    supplierId: supplier ? supplier.id : null,
    supplierName: supplier ? supplier.name : "",
    quantity: qty,
    unit: unit || "",
    unitPrice: price,
    total,
    date: date || today(),
  };

  project.materials = project.materials || [];
  project.materials.push(item);
  save("projects", project);

  if (supplier) {
    supplier.purchases = num(supplier.purchases) + total;
    save("suppliers", supplier);
  }

  stockIn(item.name, qty, item.unit);

  save("materialTransactions", {
    id: uid(),
    direction: "in",
    projectId: project.id,
    supplierId: supplier ? supplier.id : null,
    materialName: item.name,
    quantity: qty,
    unit: item.unit,
    unitPrice: price,
    total,
    date: item.date,
  });

  return item;
}

/* ---------- Project contractors ---------- */

export function addContractorToProject(projectId, { name, role, total, paid }) {
  const project = get("projects", projectId);
  if (!project) return null;
  const totalV = num(total);
  const paidV = num(paid);

  const item = {
    id: uid(),
    name: String(name || "").trim(),
    role: role || "other",
    total: totalV,
    paid: paidV,
  };

  project.contractors = project.contractors || [];
  project.contractors.push(item);
  save("projects", project);

  const existing = all("contractors").find((c) => c.name === item.name);
  if (existing) {
    existing.total = num(existing.total) + totalV;
    existing.paid = num(existing.paid) + paidV;
    save("contractors", existing);
  } else {
    save("contractors", {
      id: uid(),
      name: item.name,
      role: item.role,
      phone: "",
      total: totalV,
      paid: paidV,
    });
  }

  return item;
}

/* ---------- Other expenses ---------- */

export function addOtherExpense(projectId, { label, amount }) {
  const project = get("projects", projectId);
  if (!project) return null;
  project.otherExpenses = project.otherExpenses || [];
  project.otherExpenses.push({
    id: uid(),
    label: String(label || "").trim(),
    amount: num(amount),
    date: today(),
  });
  save("projects", project);
  return project;
}
