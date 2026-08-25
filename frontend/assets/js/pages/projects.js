/* ============================================
   Spark ERP — Projects Page Script
   Renders project cards and handles the
   "Add Project" modal (name, type, area,
   advance payment).
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, get, save, uid, setProjectExpectedProfit } from "../modules/store.js";
import { projectCosts, formatMoney, TYPE_LABELS, STATUS_LABELS, num, moneyIn, moneyOut, sortNewestFirst, projectsSummaryStats } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";
import { getPrimaryActivePhase, getActivePhases } from "../modules/project-phases.js";
import { seedPhases } from "../modules/phases-catalog.js";

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

/* ---------- Phase badge helper ---------- */

function renderPhaseBadge(p) {
  if (p.status === "done") return "";
  const activePhases = getActivePhases(p.id);
  if (!activePhases || activePhases.length === 0) return "";

  const primary = getPrimaryActivePhase(p.id);
  if (!primary || primary.status !== "active") return "";

  let subLabel = "";
  if (primary.activeSubPhaseId && Array.isArray(primary.subPhases)) {
    const sub = primary.subPhases.find((s) => s.id === primary.activeSubPhaseId);
    if (sub) {
      subLabel = lang() === "en" && sub.labelEn ? sub.labelEn : sub.label;
    }
  }

  const primaryLabel = lang() === "en" && primary.labelEn ? primary.labelEn : primary.label;
  const moreCount = activePhases.length > 1 ? `+${activePhases.length - 1}` : "";
  const otherNames = activePhases
    .filter((ph) => ph.id !== primary.id)
    .map((ph) => (lang() === "en" && ph.labelEn ? ph.labelEn : ph.label))
    .join(", ");

  return `
    <div class="phase-badge-container">
      <div class="phase-badge" style="--phase-color: ${esc(primary.color || '#6366f1')}">
        <span class="phase-badge-dot"></span>
        <span class="phase-badge-label">${esc(primaryLabel)}</span>
        ${subLabel ? `<span class="phase-badge-sub">${esc(subLabel)}</span>` : ""}
      </div>
      ${moreCount ? `<span class="phase-badge-more" title="${esc(otherNames)}">${esc(moreCount)}</span>` : ""}
    </div>`;
}

/* ---------- Rendering ---------- */

function projectCardHTML(p) {
  const costs = projectCosts(p);
  const status = p.status || "active";
  const done = status === "done";
  const progress = Math.min(100, Math.max(0, Math.round(num(p.progress))));
  const statusClass = done ? "status-done" : status === "paused" ? "status-paused" : "status-active";
  const statusLabel = done ? translate("projects.completed") : local(STATUS_LABELS[status]);
  const detailUrl = `./project.html?id=${encodeURIComponent(p.id)}`;
  const statementUrl = `./statement.html?id=${encodeURIComponent(p.id)}`;

  // Calculate money in/out for this project
  const txns = sortNewestFirst(
    all("moneyTransactions").filter((t) => t.projectId === p.id)
  );
  const incoming = moneyIn(txns) + num(p.advancePayment);
  const outgoing = moneyOut(txns);

  return `
    <div class="project-card${done ? " is-done" : ""}">
      <div class="project-card-top">
        <div class="project-card-head">
          <h3 class="project-card-name">${esc(p.name)}</h3>
          <span class="badge badge-primary">${local(TYPE_LABELS[p.type])}</span>
        </div>
        <span class="project-card-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="project-card-meta">
        <i data-lucide="ruler" class="icon"></i>
        <span class="project-card-area">${formatMoney(p.area)} m²</span>
      </div>
      ${renderPhaseBadge(p)}
      <div class="project-progress">
        <div class="project-progress-track"><span class="project-progress-bar" style="width:${progress}%"></span></div>
        <span class="project-progress-value">${progress}%</span>
      </div>
      <div class="project-cost">
        <span class="cost-item-label">${translate("projects.costTotal")}</span>
        <span class="cost-item-value is-total">${formatMoney(costs.total)}</span>
      </div>
      <div class="project-money-summary">
        <div class="project-money-item is-in">
          <i data-lucide="arrow-down-circle" class="icon"></i>
          <span class="project-money-value">${formatMoney(incoming)}</span>
        </div>
        <div class="project-money-item is-out">
          <i data-lucide="arrow-up-circle" class="icon"></i>
          <span class="project-money-value">${formatMoney(outgoing)}</span>
        </div>
      </div>
      <div class="project-card-actions">
        <a class="btn btn-outline btn-sm project-card-view" href="${detailUrl}">
          <i data-lucide="eye" class="icon"></i>
          <span>${translate("projects.viewDetails")}</span>
        </a>
        <a class="btn btn-soft btn-sm project-card-statement" href="${statementUrl}">
          <i data-lucide="file-text" class="icon"></i>
          <span>${translate("projects.statement")}</span>
        </a>
        ${done ? "" : `
          <button class="btn btn-soft btn-sm project-card-complete" type="button" data-complete="${esc(p.id)}">
            <i data-lucide="check" class="icon"></i>
            <span>${translate("projects.completeProject")}</span>
          </button>`}
      </div>
    </div>`;
}

function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  const empty = document.getElementById("projectsEmpty");
  const projects = all("projects");

  if (!projects.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    window.lucide?.createIcons();
    return;
  }

  empty.hidden = true;
  const rank = (s) => (s === "done" ? 1 : 0);
  const sorted = projects
    .slice()
    .sort((a, b) => rank(a.status) - rank(b.status));
  grid.innerHTML = sorted.map(projectCardHTML).join("");
  window.lucide?.createIcons();
}

/* ---------- Complete project ---------- */

let pendingCompleteId = null;

function openCompleteConfirm(id) {
  pendingCompleteId = id;
  showModal(document.getElementById("completeModal"));
  window.lucide?.createIcons();
}

function closeCompleteConfirm() {
  pendingCompleteId = null;
  hideModal(document.getElementById("completeModal"));
}

function confirmComplete() {
  const project = get("projects", pendingCompleteId);
  if (project) {
    project.status = "done";
    project.progress = 100;
    save("projects", project);
    toast(translate("common.saved"));
  }
  closeCompleteConfirm();
  renderProjects();
}

/* ---------- Create project modal ---------- */

function openModal() {
  showModal(document.getElementById("projectModal"));
  document.getElementById("projName").focus();
  window.lucide?.createIcons();
}

function closeModal() {
  hideModal(document.getElementById("projectModal"));
  document.getElementById("projectForm").reset();
}

function submitProject(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements["name"].value.trim();
  const type = form.elements["type"].value;
  const area = Number(form.elements["area"].value);
  const advancePayment = Number(form.elements["advancePayment"].value || 0);
  const expectedProfit = Number(form.elements["expectedProfit"]?.value || 0);

  if (!name || !area || area <= 0) {
    form.elements["name"].focus();
    return;
  }

  save("projects", {
    id: uid(),
    name,
    type,
    area,
    advancePayment,
    expectedProfit,
    status: "active",
    progress: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    contractors: [],
    materials: [],
    otherExpenses: [],
    phases: seedPhases(),
    phaseLog: [],
  });

  closeModal();
  renderProjects();
  toast(translate("common.saved"));
}

function initModal() {
  const modal = document.getElementById("projectModal");
  document.getElementById("addProjectBtn").addEventListener("click", openModal);
  document.getElementById("emptyAddBtn").addEventListener("click", openModal);
  document.getElementById("projectModalClose").addEventListener("click", closeModal);
  document.getElementById("projectFormCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById("projectForm").addEventListener("submit", submitProject);

  document.getElementById("projectsGrid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-complete]");
    if (btn) {
      e.preventDefault();
      openCompleteConfirm(btn.dataset.complete);
    }
  });

  const completeModal = document.getElementById("completeModal");
  document.getElementById("completeModalClose").addEventListener("click", closeCompleteConfirm);
  document.getElementById("completeCancel").addEventListener("click", closeCompleteConfirm);
  document.getElementById("completeConfirm").addEventListener("click", confirmComplete);
  completeModal.addEventListener("click", (e) => {
    if (e.target === completeModal) closeCompleteConfirm();
  });
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  renderProjects();
  initModal();
  window.addEventListener("spark:data-changed", renderProjects);
});
