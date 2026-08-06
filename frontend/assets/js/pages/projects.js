/* ============================================
   Spark ERP — Projects Page Script
   Renders project cards and handles the
   "Add Project" modal (name, type, area,
   advance payment).
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, save, uid } from "../modules/store.js";
import { projectCosts, formatMoney, TYPE_LABELS, STATUS_LABELS, num } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";

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

/* ---------- Rendering ---------- */

function projectCardHTML(p) {
  const costs = projectCosts(p);
  const status = p.status || "active";
  const progress = Math.min(100, Math.max(0, Math.round(num(p.progress))));
  const statusClass = status === "done" ? "status-done" : status === "paused" ? "status-paused" : "status-active";

  return `
    <a class="project-card" href="./project.html?id=${encodeURIComponent(p.id)}">
      <div class="project-card-top">
        <h3 class="project-card-name">${esc(p.name)}</h3>
        <span class="badge badge-primary">${local(TYPE_LABELS[p.type])}</span>
      </div>
      <div class="project-card-meta">
        <span class="project-card-area">${formatMoney(p.area)} m²</span>
        <span class="project-card-status ${statusClass}">${local(STATUS_LABELS[status])}</span>
      </div>
      <div class="project-progress">
        <div class="project-progress-track"><span class="project-progress-bar" style="width:${progress}%"></span></div>
        <span class="project-progress-value">${progress}%</span>
      </div>
      <div class="project-cost">
        <div class="cost-item">
          <span class="cost-item-label">${translate("projects.costMaterials")}</span>
          <span class="cost-item-value">${formatMoney(costs.material)}</span>
        </div>
        <div class="cost-item">
          <span class="cost-item-label">${translate("projects.costContractors")}</span>
          <span class="cost-item-value">${formatMoney(costs.contractors)}</span>
        </div>
        <div class="cost-total">
          <span class="cost-item-label">${translate("projects.costTotal")}</span>
          <span class="cost-item-value is-total">${formatMoney(costs.total)}</span>
        </div>
      </div>
    </a>`;
}

function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  const empty = document.getElementById("projectsEmpty");
  const projects = all("projects");

  if (!projects.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = projects.map(projectCardHTML).join("");
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
    status: "active",
    progress: 0,
    createdAt: new Date().toISOString().slice(0, 10),
    contractors: [],
    materials: [],
    otherExpenses: [],
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
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderProjects();
  initModal();
});
