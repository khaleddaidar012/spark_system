/* ============================================
   Spark ERP — Calculations Module
   All totals, balances and costs are computed
   here. The system never stores derived totals;
   they are always calculated from source data.
   ============================================ */

import { all } from "./store.js";

export const TYPE_LABELS = {
  apartment: { en: "Apartment", ar: "شقة" },
  villa: { en: "Villa", ar: "فيلا" },
  clinic: { en: "Clinic", ar: "عيادة" },
  office: { en: "Office", ar: "مكتب" },
  shop: { en: "Shop", ar: "محل" },
  other: { en: "Other", ar: "أخرى" },
};

export const STATUS_LABELS = {
  active: { en: "Active", ar: "نشط" },
  paused: { en: "Paused", ar: "موقوف" },
  done: { en: "Done", ar: "منتهي" },
};

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function materialCost(project) {
  return (project.materials || []).reduce((s, m) => s + num(m.total), 0);
}

export function contractorCost(project) {
  return (project.contractors || []).reduce((s, c) => s + num(c.total), 0);
}

export function contractorPaid(project) {
  return (project.contractors || []).reduce((s, c) => s + num(c.paid), 0);
}

export function contractorRemaining(project) {
  return contractorCost(project) - contractorPaid(project);
}

export function otherExpensesCost(project) {
  return (project.otherExpenses || []).reduce((s, e) => s + num(e.amount), 0);
}

export function projectCost(project) {
  return materialCost(project) + contractorCost(project) + otherExpensesCost(project);
}

export function projectCosts(project) {
  return {
    material: materialCost(project),
    contractors: contractorCost(project),
    other: otherExpensesCost(project),
    total: projectCost(project),
  };
}

export function moneyIn(txns) {
  return txns.filter((t) => t.direction === "in").reduce((s, t) => s + num(t.amount), 0);
}

export function moneyOut(txns) {
  return txns.filter((t) => t.direction === "out").reduce((s, t) => s + num(t.amount), 0);
}

export function moneyBalance(txns) {
  return { incoming: moneyIn(txns), outgoing: moneyOut(txns) };
}

export function supplierBalance(supplier) {
  return {
    purchases: moneyOut(all("moneyTransactions").filter((t) => t.personType === "supplier" && t.personId === supplier.id)),
    paid: num(supplier.paid),
    remaining: moneyOut(all("moneyTransactions").filter((t) => t.personType === "supplier" && t.personId === supplier.id)) - num(supplier.paid),
  };
}

export function supplierTransactions(supplierId) {
  const money = all("moneyTransactions")
    .filter((t) => t.personType === "supplier" && t.personId === supplierId)
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const material = all("materialTransactions")
    .filter((t) => t.supplierId === supplierId)
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  return { money, material };
}

export function supplierProjectName(projectId) {
  if (!projectId) return "";
  const p = all("projects").find((x) => x.id === projectId);
  return p ? p.name : "";
}

export function contractorBalance(contractor) {
  return {
    total: num(contractor.total),
    paid: num(contractor.paid),
    remaining: num(contractor.total) - num(contractor.paid),
  };
}

export function contractorProjects(contractorId) {
  return all("projects")
    .filter(
      (p) =>
        (p.contractors || []).some((c) => c.id === contractorId) ||
        (p.materials || []).some((m) => m.contractorId === contractorId)
    )
    .map((p) => ({
      project: p,
      contractor: (p.contractors || []).find((c) => c.id === contractorId) || null,
      materials: (p.materials || []).filter((m) => m.contractorId === contractorId),
    }));
}

export function contractorMaterials(project, contractorId) {
  return (project.materials || []).filter((m) => m.contractorId === contractorId);
}

export function statementData(project) {
  const materials = (project.materials || []).map((m) => ({
    ...m,
    workmanship: num(m.workmanship),
    clientBought: Boolean(m.clientBought),
  }));
  const materialTotal = materials
    .filter((m) => !m.clientBought)
    .reduce((s, m) => s + num(m.total), 0);
  const workmanshipTotal = materials
    .filter((m) => !m.clientBought)
    .reduce((s, m) => s + num(m.workmanship), 0);
  const supervisionPercent = num(project.supervisionPercent);
  const supervision = (materialTotal + workmanshipTotal) * (supervisionPercent / 100);
  return {
    materials,
    materialTotal,
    workmanshipTotal,
    supervisionPercent,
    supervision,
    grandTotal: materialTotal + workmanshipTotal + supervision,
  };
}

export function projectProfit(project) {
  const income = moneyIn(all("moneyTransactions").filter((t) => t.projectId === project.id));
  return income - projectCost(project);
}

export function supplierPurchases() {
  return all("suppliers").map((s) => ({
    supplier: s,
    purchases: supplierBalance(s).purchases,
  }));
}

export function contractorProjectCounts() {
  return all("contractors").map((c) => {
    const projectIds = new Set();
    all("projects").forEach((p) => {
      const inContractors = (p.contractors || []).some((row) => row.id === c.id);
      const inMaterials = (p.materials || []).some((m) => m.contractorId === c.id);
      if (inContractors || inMaterials) projectIds.add(p.id);
    });
    return { contractor: c, projectCount: projectIds.size };
  });
}

export function clientBalance(client) {
  return {
    paid: moneyIn(all("moneyTransactions").filter((t) => t.personType === "client" && t.personId === client.id)),
    remaining: num(client.remaining),
  };
}

export function projectAnalytics(project) {
  const costs = projectCosts(project);
  const area = num(project.area);
  const perArea = (v) => (area > 0 ? v / area : 0);
  return {
    area,
    materialPerM2: perArea(costs.material),
    laborPerM2: perArea(costs.contractors),
    totalPerM2: perArea(costs.total),
    consumedMaterials: project.materials || [],
  };
}

export function materialAnalytics(project) {
  const area = num(project.area);
  const perArea = (v) => (area > 0 ? v / area : 0);
  const groups = new Map();
  (project.materials || []).forEach((m) => {
    const key = String(m.name || "").trim() || "—";
    const g = groups.get(key) || { name: key, quantity: 0, unit: m.unit || "", total: 0 };
    g.quantity += num(m.quantity);
    g.total += num(m.total);
    if (m.unit && !g.unit) g.unit = m.unit;
    groups.set(key, g);
  });
  return [...groups.values()].map((m) => ({
    ...m,
    totalPerM2: perArea(m.total),
  }));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num(n));
}
