/* ============================================
   Spark ERP — Reports Page Script
   Computes and renders the requested statistics:
   project counts, per-supplier purchases, profit
   per project, and contractor project counts.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all } from "../modules/store.js";
import {
  projectCosts,
  projectProfit,
  supplierPurchases,
  contractorProjectCounts,
  moneyIn,
  moneyOut,
  materialPurchases,
  formatMoney,
  TYPE_LABELS,
} from "../modules/calc.js";
import { translate } from "../modules/i18n.js";

const lang = () => document.documentElement.lang;

function local(obj) {
  return (obj && (obj[lang()] || obj.en)) || "";
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStats() {
  const projects = all("projects");
  const completed = projects.filter((p) => p.status === "done").length;
  document.getElementById("reportTotalProjects").textContent = formatMoney(projects.length);
  document.getElementById("reportCompletedProjects").textContent = formatMoney(completed);

  const txns = all("moneyTransactions");
  const material = all("materialTransactions");
  const incoming = moneyIn(txns);
  const outgoing = moneyOut(txns) + materialPurchases(material);
  document.getElementById("reportTotalIn").textContent = formatMoney(incoming);
  document.getElementById("reportTotalOut").textContent = formatMoney(outgoing);
  document.getElementById("reportNet").textContent = formatMoney(incoming - outgoing);
}

function renderRows(tbodyId, emptyId, rows, cells) {
  const tbody = document.getElementById(tbodyId);
  const empty = document.getElementById(emptyId);
  if (!rows.length) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  tbody.innerHTML = rows.map((r) => cells(r)).join("");
}

function renderReports() {
  renderStats();

  renderRows(
    "reportSuppliersTable",
    "reportSuppliersEmpty",
    supplierPurchases(),
    ({ supplier, purchases }) => `
      <tr>
        <td>${esc(supplier.name)}</td>
        <td class="is-amount">${formatMoney(purchases)}</td>
      </tr>`
  );

  renderRows(
    "reportProfitTable",
    "reportProfitEmpty",
    all("projects"),
    (p) => {
      const profit = projectProfit(p);
      const costs = projectCosts(p);
      const cls = profit < 0 ? "is-negative" : "is-positive";
      return `
        <tr>
          <td>
            <div class="report-project-name">${esc(p.name)}</div>
            <div class="report-project-sub">${esc(local(TYPE_LABELS[p.type]))} · ${formatMoney(p.area)} m² · ${translate("reports.total")}: ${formatMoney(costs.total)}</div>
          </td>
          <td class="is-amount ${cls}">${formatMoney(profit)}</td>
        </tr>`;
    }
  );

  renderRows(
    "reportContractorsTable",
    "reportContractorsEmpty",
    contractorProjectCounts(),
    ({ contractor, projectCount }) => `
      <tr>
        <td>${esc(contractor.name)}</td>
        <td class="is-amount">${formatMoney(projectCount)}</td>
      </tr>`
  );

  window.lucide?.createIcons();
}

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  renderReports();
  window.addEventListener("spark:data-changed", renderReports);
});
