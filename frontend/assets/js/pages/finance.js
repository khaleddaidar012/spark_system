/* ============================================
   Spark ERP — Financial Accounts Page Script
   Summary (in / out / net) + transaction history.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all } from "../modules/store.js";
import { moneyIn, moneyOut, materialPurchases, sortNewestFirst, supplierProjectName, num, formatMoney } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";

const lang = () => document.documentElement.lang;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PERSON_TYPE_LABELS = {
  supplier: { en: "Supplier", ar: "مورد" },
  contractor: { en: "Contractor", ar: "مقاول" },
  client: { en: "Client", ar: "عميل" },
  other: { en: "Other", ar: "أخرى" },
};

function renderSummary() {
  const txns = all("moneyTransactions");
  const material = all("materialTransactions");
  const incoming = moneyIn(txns);
  const outgoing = moneyOut(txns) + materialPurchases(material);
  document.getElementById("financeIn").textContent = formatMoney(incoming);
  document.getElementById("financeOut").textContent = formatMoney(outgoing);
  document.getElementById("financeNet").textContent = formatMoney(incoming - outgoing);
}

function renderHistory() {
  const list = document.getElementById("financeList");
  const empty = document.getElementById("financeEmpty");

  const moneyRows = all("moneyTransactions").map((t) => {
    const typeLabel = PERSON_TYPE_LABELS[t.personType] || PERSON_TYPE_LABELS.other;
    return {
      createdAt: t.createdAt,
      isIn: t.direction === "in",
      amount: (t.direction === "in" ? "+" : "-") + formatMoney(t.amount),
      title: esc(t.personName),
      sub: `${typeLabel[lang()] || typeLabel.en}${t.note ? " · " + esc(t.note) : ""}`,
      dateLabel: t.date || "",
    };
  });

  const purchaseRows = all("materialTransactions")
    .filter((t) => t.direction === "in" && num(t.total) > 0)
    .map((t) => {
      const project = supplierProjectName(t.projectId);
      return {
        createdAt: t.createdAt,
        isIn: false,
        amount: "-" + formatMoney(t.total),
        title: esc(t.materialName),
        sub: `${translate("finance.purchase")} · ${formatMoney(t.quantity)} ${esc(t.unit || "")}${project ? " · " + translate("suppliers.project") + ": " + esc(project) : ""}`,
        dateLabel: t.date || "",
      };
    });

  const rows = sortNewestFirst([...moneyRows, ...purchaseRows]);

  if (!rows.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = rows
    .map((r) => `
      <div class="row-item">
        <div class="row-item-main">
          <div class="row-item-title">${r.title}</div>
          <div class="row-item-sub">${r.sub}</div>
        </div>
        <div class="row-item-stats">
          <div class="row-stat">
            <span class="row-stat-label">${esc(r.dateLabel)}</span>
            <span class="row-stat-value ${r.isIn ? "is-paid" : "is-remaining"}">${r.amount}</span>
          </div>
        </div>
      </div>`)
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  renderSummary();
  renderHistory();
  window.addEventListener("spark:data-changed", () => {
    renderSummary();
    renderHistory();
  });
});
