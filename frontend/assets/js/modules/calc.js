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
  return Math.max(0, contractorCost(project) - contractorPaid(project));
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

/* Newest first: createdAt (ms) desc, falling back to reverse insertion order. */
export function sortNewestFirst(arr) {
  return arr
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (b.x.createdAt || 0) - (a.x.createdAt || 0) || b.i - a.i)
    .map((o) => o.x);
}

/* Total value of materials purchased (incoming stock) across transactions. */
export function materialPurchases(txns) {
  return txns.filter((t) => t.direction === "in").reduce((s, t) => s + num(t.total), 0);
}

export function supplierBalance(supplier) {
  const purchases = Math.max(0, num(supplier.purchases));
  const paid = num(supplier.paid);
  const diff = purchases - paid;
  return {
    purchases,
    paid,
    remaining: Math.max(0, diff),
    dueToThem: Math.max(0, diff),
    dueToUs: Math.max(0, -diff),
  };
}

export function supplierTransactions(supplierId) {
  const money = sortNewestFirst(
    all("moneyTransactions").filter((t) => t.personType === "supplier" && t.personId === supplierId)
  );
  const material = sortNewestFirst(
    all("materialTransactions").filter((t) => t.supplierId === supplierId)
  );
  return { money, material };
}

export function contractorTransactions(contractorId) {
  return sortNewestFirst(
    all("moneyTransactions").filter((t) => t.personType === "contractor" && t.personId === contractorId)
  );
}

export function supplierProjectName(projectId) {
  if (!projectId) return "";
  const p = all("projects").find((x) => x.id === projectId);
  return p ? p.name : "";
}

export function contractorBalance(contractor) {
  const total = num(contractor.total);
  const paid = num(contractor.paid);
  const diff = total - paid;
  return {
    total,
    paid,
    remaining: Math.max(0, diff),
    dueToThem: Math.max(0, diff),
    dueToUs: Math.max(0, -diff),
  };
}

export function balanceDirection(b) {
  return b.dueToUs > 0
    ? { key: "balance.owedToUs", amount: b.dueToUs, paid: true }
    : { key: "balance.owedByUs", amount: b.dueToThem, paid: false };
}

export function contractorWorksOnProject(contractorId, projectId) {
  if (!contractorId || !projectId) return false;
  const p = all("projects").find((x) => x.id === projectId);
  if (!p) return false;
  return (
    (p.contractors || []).some((c) => c.id === contractorId || c.contractorId === contractorId) ||
    (p.materials || []).some((m) => m.contractorId === contractorId)
  );
}

export function contractorProjects(contractorId) {
  return all("projects")
    .filter(
      (p) =>
        (p.contractors || []).some((c) => c.id === contractorId || c.contractorId === contractorId) ||
        (p.materials || []).some((m) => m.contractorId === contractorId)
    )
    .map((p) => ({
      project: p,
      contractor: (p.contractors || []).find((c) => c.id === contractorId || c.contractorId === contractorId) || null,
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
  const workmanshipTotal = materials.reduce((s, m) => s + num(m.workmanship), 0);
  const supervisionAmount = num(project.supervisionAmount ?? project.supervisionPercent);
  return {
    materials,
    materialTotal,
    workmanshipTotal,
    supervisionAmount,
    supervision: supervisionAmount,
    grandTotal: materialTotal + workmanshipTotal + supervisionAmount,
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
  const materialPerM2 = perArea(costs.material);
  const laborPerM2 = perArea(costs.contractors);
  return {
    area,
    materialTotal: costs.material,
    materialPerM2,
    laborPerM2,
    totalPerM2: materialPerM2 + laborPerM2,
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
    unitPrice: m.quantity > 0 ? m.total / m.quantity : 0,
    totalPerM2: perArea(m.total),
  }));
}

export function formatMoney(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num(n));
}

/* Return today's date string in local time: YYYY-MM-DD */
function localDateStr(d = new Date()) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

/* Total outgoing money transactions whose date falls within [from, to] (inclusive, YYYY-MM-DD). */
export function expensesBetween(txns, from, to) {
  return txns
    .filter((t) => t.direction === "out" && t.date >= from && t.date <= to)
    .reduce((s, t) => s + num(t.amount), 0);
}

/* Today's outgoing expenses. */
export function dailyExpenses(txns) {
  const d = localDateStr();
  return expensesBetween(txns, d, d);
}

/* Current ISO-week outgoing expenses (Mon–Sun). */
export function weeklyExpenses(txns) {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return expensesBetween(txns, localDateStr(mon), localDateStr(sun));
}

/* Current calendar-month outgoing expenses. */
export function monthlyExpenses(txns) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const from = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return expensesBetween(txns, from, to);
}

/* ============================================================
   Income Summary Calculations
   ============================================================ */

/* Total incoming money transactions whose date falls within [from, to] (inclusive, YYYY-MM-DD). */
export function incomeBetween(txns, from, to) {
  return (txns || [])
    .filter((t) => t.direction === "in" && (!from || t.date >= from) && (!to || t.date <= to))
    .reduce((s, t) => s + num(t.amount), 0);
}

/* Today's incoming transactions. */
export function dailyIncome(txns) {
  const d = localDateStr();
  return incomeBetween(txns, d, d);
}

/* Current ISO-week incoming transactions (Mon–Sun). */
export function weeklyIncome(txns) {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return incomeBetween(txns, localDateStr(mon), localDateStr(sun));
}

/* Current calendar-month incoming transactions. */
export function monthlyIncome(txns) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const from = `${y}-${m}-01`;
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  const to = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  return incomeBetween(txns, from, to);
}

export function incomeByPeriod(txns) {
  const list = txns || all("moneyTransactions");
  return {
    today: dailyIncome(list),
    week: weeklyIncome(list),
    month: monthlyIncome(list),
    total: moneyIn(list),
  };
}

/* ============================================================
   Phase Cost & Breakdown Calculations
   ============================================================ */

export function phaseCost(project, phaseId) {
  if (!project || !phaseId) return 0;
  let sum = 0;
  // 1. Sum from phaseLog entries
  for (const entry of project.phaseLog || []) {
    if (entry.type === "finance" && entry.direction === "out" && entry.phaseId === phaseId) {
      sum += num(entry.amount);
    }
  }
  // 2. Sum from otherExpenses if tagged with phase_id and not already in phaseLog
  for (const exp of project.otherExpenses || []) {
    if (exp.phase_id === phaseId && !exp.__loggedToPhase) {
      // If otherExpenses are logged separately, add if not duplicated
    }
  }
  return sum;
}

export function allPhasesCosts(project) {
  if (!project) return {};
  const costs = {};
  for (const ph of project.phases || []) {
    costs[ph.id] = phaseCost(project, ph.id);
  }
  return costs;
}

/* ============================================================
   Projects Overview Financial KPI Header Calculations
   ============================================================ */

export function projectsSummaryStats() {
  const projects = all("projects") || [];
  const moneyTxns = all("moneyTransactions") || [];

  // Total Inflow: All money received across the system / projects
  const totalInflow = moneyIn(moneyTxns);

  // Total Outflow: All project costs + outgoing money
  const projectOutflows = projects.reduce((s, p) => s + projectCost(p), 0);
  const generalOutflows = moneyOut(moneyTxns.filter((t) => !t.projectId));
  const totalOutflow = Math.max(projectOutflows + generalOutflows, moneyOut(moneyTxns));

  // Difference: Inflow - Outflow
  const netDifference = totalInflow - totalOutflow;

  // Expected Profit: Sum of all user-entered project expected profits
  const expectedProfit = projects.reduce((s, p) => s + num(p.expectedProfit), 0);

  // Actual Profit Formula: Expected Profit + (Inflow - Outflow)
  const actualProfit = expectedProfit + netDifference;

  return {
    totalInflow,
    totalOutflow,
    netDifference,
    expectedProfit,
    actualProfit,
  };
}

/* ============================================================
   Person (Contractor / Supplier) Statement of Account
   ============================================================ */

export function personAccountStatement({ personId, personType, fromDate = "", toDate = "" }) {
  const moneyTxns = all("moneyTransactions") || [];
  const matTxns = all("materialTransactions") || [];
  const deductions = all("deductions") || [];
  const projects = all("projects") || [];

  const getProjectName = (pId) => {
    if (!pId) return "—";
    const p = projects.find((x) => x.id === pId);
    return p ? p.name : "—";
  };

  const rows = [];
  let openingDues = 0;
  let openingPaid = 0;
  let openingDeductions = 0;

  // 1. Process Material Transactions (for Suppliers)
  if (personType === "supplier") {
    for (const mt of matTxns) {
      if (mt.supplierId !== personId) continue;
      const date = mt.date || (mt.createdAt ? new Date(mt.createdAt).toISOString().slice(0, 10) : "");
      const amount = num(mt.total);
      if (fromDate && date < fromDate) {
        openingDues += amount;
      } else if (!toDate || date <= toDate) {
        rows.push({
          id: mt.id,
          date,
          type: "delivery",
          typeLabel: "توريد بضاعة",
          desc: mt.materialName || mt.notes || "توريد خامات",
          projectId: mt.projectId,
          projectName: getProjectName(mt.projectId),
          due: amount,
          paid: 0,
          deduction: 0,
          invoiceData: mt.invoiceData,
          invoiceType: mt.invoiceType,
          invoiceName: mt.invoiceName,
        });
      }
    }
  }

  // 2. Process Contractor Project Assignments / Dues (for Contractors)
  if (personType === "contractor") {
    for (const p of projects) {
      // Dues from project contractor entries
      for (const c of p.contractors || []) {
        if (c.id === personId) {
          const totalVal = num(c.total);
          // If date not available, treat as current period
          rows.push({
            id: "work_" + p.id + "_" + c.id,
            date: p.createdAt ? p.createdAt.slice(0, 10) : "",
            type: "work",
            typeLabel: "مستخلص / عمل",
            desc: c.role ? `أعمال ${c.role}` : "أعمال مقاولة",
            projectId: p.id,
            projectName: p.name,
            due: totalVal,
            paid: 0,
            deduction: 0,
            invoiceData: c.invoiceData,
            invoiceType: c.invoiceType,
            invoiceName: c.invoiceName,
          });
        }
      }
    }
  }

  // 3. Process Money Transactions (Payments / Advances)
  for (const t of moneyTxns) {
    if (t.personId !== personId) continue;
    const date = t.date || (t.createdAt ? new Date(t.createdAt).toISOString().slice(0, 10) : "");
    const amount = num(t.amount);
    if (fromDate && date < fromDate) {
      if (t.direction === "out") openingPaid += amount;
      else openingDues += amount;
    } else if (!toDate || date <= toDate) {
      rows.push({
        id: t.id,
        date,
        type: t.direction === "out" ? "payment" : "receipt",
        typeLabel: t.direction === "out" ? "دفعة مسددة" : "مبلغ مسترد",
        desc: t.notes || (t.direction === "out" ? "سداد دفعة نقدية" : "استرداد"),
        projectId: t.projectId,
        projectName: getProjectName(t.projectId),
        due: t.direction === "in" ? amount : 0,
        paid: t.direction === "out" ? amount : 0,
        deduction: 0,
        invoiceData: t.invoiceData,
        invoiceType: t.invoiceType,
        invoiceName: t.invoiceName,
      });
    }
  }

  // 4. Process Deductions
  for (const d of deductions) {
    if (d.personId !== personId) continue;
    const date = d.date || (d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : "");
    const amount = num(d.amount);
    if (fromDate && date < fromDate) {
      openingDeductions += amount;
    } else if (!toDate || date <= toDate) {
      rows.push({
        id: d.id,
        date,
        type: "deduction",
        typeLabel: "خصم",
        desc: d.reason || "خصم مالي",
        projectId: d.projectId,
        projectName: getProjectName(d.projectId),
        due: 0,
        paid: 0,
        deduction: amount,
      });
    }
  }

  // Sort rows chronologically
  rows.sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.type.localeCompare(b.type));

  // Compute running balance
  const openingBalance = openingDues - openingPaid - openingDeductions;
  let currentBalance = openingBalance;
  for (const r of rows) {
    currentBalance += (r.due - r.paid - r.deduction);
    r.balance = currentBalance;
  }

  const periodDues = rows.reduce((s, r) => s + r.due, 0);
  const periodPaid = rows.reduce((s, r) => s + r.paid, 0);
  const periodDeductions = rows.reduce((s, r) => s + r.deduction, 0);
  const finalBalance = currentBalance;

  return {
    openingBalance,
    periodDues,
    periodPaid,
    periodDeductions,
    finalBalance,
    rows,
    fromDate,
    toDate,
  };
}

