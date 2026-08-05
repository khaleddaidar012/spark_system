/* ============================================
   Spark ERP — Dashboard Page Script
   Demo data only. Renders stats, charts and
   recent lists. Data layer arrives in Phase 2+.
   ============================================ */

import { initLayout } from "../modules/layout.js";

/* ---------- Demo data ---------- */

const STATS = {
  projects: { value: 42 },
  active: { value: 12 },
  finished: { value: 30 },
  income: { value: 482500, prefix: "$" },
  expenses: { value: 315200, prefix: "$" },
  profit: { value: 167300, prefix: "$" },
  inventory: { value: 95800, prefix: "$" },
  lowstock: { value: 6 },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const INCOME_DATA = [28, 34, 30, 44, 52, 48, 61, 55, 68, 74, 70, 82];
const EXPENSES_DATA = [22, 26, 24, 31, 35, 33, 40, 38, 44, 47, 45, 52];

const COST_DATA = [
  { label: "Tower A", value: 184 },
  { label: "Villa B", value: 132 },
  { label: "Bridge C", value: 96 },
  { label: "Factory D", value: 74 },
  { label: "School E", value: 41 },
];

const MATERIAL_DATA = [
  { label: "Cement", value: 240, unit: "tons" },
  { label: "Steel", value: 185, unit: "tons" },
  { label: "Sand", value: 160, unit: "m³" },
  { label: "Bricks", value: 120, unit: "k pcs" },
  { label: "Paint", value: 68, unit: "ltr" },
];

const ACTIVITIES = [
  { color: "icon-success", title: "Project 'Tower A' marked as active", time: "2 minutes ago" },
  { color: "icon-primary", title: "New client 'Omar Hassan' added", time: "1 hour ago" },
  { color: "icon-accent", title: "Material purchase: 50 bags of cement", time: "3 hours ago" },
  { color: "icon-info", title: "Income of $12,000 recorded", time: "Yesterday" },
  { color: "icon-warning", title: "Low stock warning: Steel bars", time: "Yesterday" },
];

const PAYMENTS = [
  { name: "Omar Hassan", project: "Tower A", amount: 12000, in: true },
  { name: "Salma Kareem", project: "Villa B", amount: 4500, in: true },
  { name: "Ahmed Nour", project: "Bridge C", amount: 8900, in: true },
  { name: "Laila Mansour", project: "Factory D", amount: 2300, in: true },
];

const EXPENSES = [
  { name: "Cement purchase", category: "Materials", amount: 3400, out: true },
  { name: "Worker salaries", category: "Labor", amount: 5200, out: true },
  { name: "Diesel refuel", category: "Fuel", amount: 480, out: true },
  { name: "Equipment rental", category: "Equipment", amount: 1600, out: true },
];

/* ---------- Helpers ---------- */

const numFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function animateCount(el, value, prefix) {
  const duration = 800;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (prefix || "") + numFmt.format(Math.round(value * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderStats() {
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const key = el.dataset.stat;
    const stat = STATS[key];
    if (!stat) return;
    animateCount(el, stat.value, el.dataset.prefix ?? stat.prefix ?? "");
  });
}

function renderVerticalChart(container, data) {
  const max = Math.max(...data);
  container.classList.add("chart-bars");
  container.innerHTML = data
    .map(
      (v, i) => `
      <div class="chart-bar">
        <span class="chart-bar-value">${v}</span>
        <div class="chart-bar-fill" style="height:${Math.max(4, (v / max) * 100)}%"></div>
        <span class="chart-bar-label">${MONTHS[i]}</span>
      </div>`
    )
    .join("");
}

function renderHorizontalChart(container, rows, unit) {
  const max = Math.max(...rows.map((r) => r.value));
  container.classList.add("chart-rows");
  container.innerHTML = rows
    .map(
      (r) => `
      <div class="chart-row">
        <span class="chart-row-label">${r.label}</span>
        <div class="chart-row-track">
          <div class="chart-row-fill" style="width:${(r.value / max) * 100}%"></div>
        </div>
        <span class="chart-row-value">${r.value}${unit ? " " + unit : ""}</span>
      </div>`
    )
    .join("");
}

function listItem(iconPath, color, title, meta, amount, amountClass) {
  return `
    <div class="list-item">
      <span class="list-item-icon ${color}" aria-hidden="true">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconPath}</svg>
      </span>
      <div class="list-item-content">
        <p class="list-item-title">${title}</p>
        <p class="list-item-meta">${meta}</p>
      </div>
      ${amount ? `<span class="list-item-amount ${amountClass}">${amount}</span>` : ""}
    </div>`;
}

const ICON_CHECK = `<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>`;
const ICON_PLUS = `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>`;
const ICON_BOX = `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>`;
const ICON_ALERT = `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`;
const ICON_DOLLAR = `<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`;
const ICON_CARD = `<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>`;

function renderLists() {
  const activities = document.querySelector("[data-activities]");
  if (activities) {
    activities.innerHTML = ACTIVITIES.map((a) =>
      listItem(ICON_CHECK, a.color, a.title, a.time)
    ).join("");
  }

  const payments = document.querySelector("[data-payments]");
  if (payments) {
    payments.innerHTML = PAYMENTS.map((p) =>
      listItem(
        ICON_DOLLAR,
        "icon-success",
        p.name,
        p.project,
        moneyFmt.format(p.amount),
        "amount-in"
      )
    ).join("");
  }

  const expenses = document.querySelector("[data-expenses]");
  if (expenses) {
    expenses.innerHTML = EXPENSES.map((e) =>
      listItem(
        ICON_CARD,
        "icon-danger",
        e.name,
        e.category,
        moneyFmt.format(e.amount),
        "amount-out"
      )
    ).join("");
  }
}

function renderCharts() {
  const income = document.querySelector('[data-chart="income"]');
  const expenses = document.querySelector('[data-chart="expenses"]');
  const costs = document.querySelector('[data-chart="costs"]');
  const materials = document.querySelector('[data-chart="materials"]');

  if (income) renderVerticalChart(income, INCOME_DATA);
  if (expenses) {
    renderVerticalChart(expenses, EXPENSES_DATA);
    expenses.querySelectorAll(".chart-bar-fill").forEach((b) => b.classList.add("fill-danger"));
  }
  if (costs) renderHorizontalChart(costs, COST_DATA, "$k");
  if (materials) renderHorizontalChart(materials, MATERIAL_DATA);
}

document.addEventListener("DOMContentLoaded", async () => {
  await initLayout();
  renderStats();
  renderCharts();
  renderLists();
});
