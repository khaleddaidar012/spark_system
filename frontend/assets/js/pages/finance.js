/* ============================================
   Spark ERP — Financial Accounts Page Script
   Summary (in / out / net) + transaction history.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all } from "../modules/store.js";
import { moneyIn, moneyOut, formatMoney } from "../modules/calc.js";
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
  const incoming = moneyIn(txns);
  const outgoing = moneyOut(txns);
  document.getElementById("financeIn").textContent = formatMoney(incoming);
  document.getElementById("financeOut").textContent = formatMoney(outgoing);
  document.getElementById("financeNet").textContent = formatMoney(incoming - outgoing);
}

function renderHistory() {
  const list = document.getElementById("financeList");
  const empty = document.getElementById("financeEmpty");
  const txns = all("moneyTransactions")
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!txns.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = txns
    .map((t) => {
      const isIn = t.direction === "in";
      const typeLabel = PERSON_TYPE_LABELS[t.personType] || PERSON_TYPE_LABELS.other;
      const amount = (isIn ? "+" : "-") + formatMoney(t.amount);
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(t.personName)}</div>
            <div class="row-item-sub">${typeLabel[lang()] || typeLabel.en}${t.note ? " · " + esc(t.note) : ""}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${esc(t.date || "")}</span>
              <span class="row-stat-value ${isIn ? "is-paid" : "is-remaining"}">${amount}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderSummary();
  renderHistory();
});
