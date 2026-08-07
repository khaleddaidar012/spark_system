/* ============================================
   Spark ERP — Business Actions Module
   Every action keeps accounts in sync.
   Users only enter data; the system updates
   project costs, inventory and person accounts.
   ============================================ */

import { all, get, save, uid, today, findPersonById } from "./store.js";
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

function stockOut(name, quantity) {
  const item = all("materials").find((m) => m.name === name);
  if (item) {
    item.qty = num(item.qty) - num(quantity);
    if (item.qty < 0) item.qty = 0;
    save("materials", item);
  }
}

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

export function addMaterialToProject(projectId, { name, supplierId, contractorId, quantity, unit, unitPrice, date }) {
  const project = get("projects", projectId);
  if (!project) return null;
  const supplierRef = supplierId ? findPersonById(supplierId) : null;
  const supplier = supplierRef ? supplierRef.person : null;
  const contractorRef = contractorId ? findPersonById(contractorId) : null;
  const contractor = contractorRef ? contractorRef.person : null;
  const qty = num(quantity);
  const price = num(unitPrice);
  const total = qty * price;

  const item = {
    id: uid(),
    name: String(name || "").trim(),
    supplierId: supplier ? supplier.id : null,
    supplierName: supplier ? supplier.name : "",
    contractorId: contractor ? contractor.id : null,
    contractorName: contractor ? contractor.name : "",
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
    save(supplierRef.collection, supplier);
  }

  stockIn(item.name, qty, item.unit);

  save("materialTransactions", {
    id: uid(),
    direction: "in",
    projectId: project.id,
    supplierId: supplier ? supplier.id : null,
    supplierName: supplier ? supplier.name : "",
    contractorId: contractor ? contractor.id : null,
    contractorName: contractor ? contractor.name : "",
    materialName: item.name,
    quantity: qty,
    unit: item.unit,
    unitPrice: price,
    total,
    date: item.date,
  });

  return item;
}

export function consumeMaterial(projectId, { name, quantity, unit, date }) {
  const project = get("projects", projectId);
  if (!project) return null;
  const qty = num(quantity);
  const item = {
    id: uid(),
    name: String(name || "").trim(),
    supplierId: null,
    supplierName: "",
    quantity: qty,
    unit: unit || "",
    unitPrice: 0,
    total: 0,
    date: date || today(),
  };

  project.materials = project.materials || [];
  project.materials.push(item);
  save("projects", project);
  stockOut(item.name, qty);

  save("materialTransactions", {
    id: uid(),
    direction: "out",
    projectId: project.id,
    supplierId: null,
    materialName: item.name,
    quantity: qty,
    unit: item.unit,
    unitPrice: 0,
    total: 0,
    date: item.date,
  });

  return item;
}

/* ---------- Project contractors ---------- */

export function addContractorToProject(projectId, { name, role, total, paid, contractorId = null }) {
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
  if (contractorId) item.contractorId = contractorId;

  project.contractors = project.contractors || [];
  project.contractors.push(item);
  save("projects", project);

  if (contractorId) {
    const existing = all("contractors").find((c) => c.id === contractorId);
    if (existing) {
      existing.total = num(existing.total) + totalV;
      existing.paid = num(existing.paid) + paidV;
      save("contractors", existing);
    }
  } else {
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
