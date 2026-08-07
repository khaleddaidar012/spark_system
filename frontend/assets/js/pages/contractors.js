/* ============================================
   Spark ERP — Contractors Page Script
   Lists contractors with balances, records
   payments (settle account) and shows the
   projects + consumed materials per contractor.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, save, uid } from "../modules/store.js";
import { contractorBalance, contractorProjects, formatMoney } from "../modules/calc.js";
import { recordMoney } from "../modules/actions.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";

const lang = () => document.documentElement.lang;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ROLE_LABELS = {
  plumbing: { en: "Plumbing", ar: "سباكة" },
  electrical: { en: "Electrical", ar: "كهرباء" },
  finishing: { en: "Finishing", ar: "تشطيب" },
  painting: { en: "Painting", ar: "دهانات" },
  tiles: { en: "Tiles", ar: "سيراميك" },
  other: { en: "Other", ar: "أخرى" },
};

const TYPE_LABELS = {
  apartment: { en: "Apartment", ar: "شقة" },
  villa: { en: "Villa", ar: "فيلا" },
  clinic: { en: "Clinic", ar: "عيادة" },
  office: { en: "Office", ar: "مكتب" },
  shop: { en: "Shop", ar: "محل" },
  other: { en: "Other", ar: "أخرى" },
};

function renderContractors() {
  const list = document.getElementById("contractorsList");
  const empty = document.getElementById("contractorsEmpty");
  const rows = all("contractors");

  if (!rows.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = rows
    .map((c) => {
      const b = contractorBalance(c);
      const role = ROLE_LABELS[c.role] || ROLE_LABELS.other;
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(c.name)}</div>
            <div class="row-item-sub">${role[lang()] || role.en}${c.phone ? " · " + esc(c.phone) : ""}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${translate("project.total")}</span>
              <span class="row-stat-value">${formatMoney(b.total)}</span>
            </div>
            <div class="row-stat">
              <span class="row-stat-label">${translate("project.paid")}</span>
              <span class="row-stat-value is-paid">${formatMoney(b.paid)}</span>
            </div>
            <div class="row-stat">
              <span class="row-stat-label">${translate("project.remaining")}</span>
              <span class="row-stat-value is-remaining">${formatMoney(b.remaining)}</span>
            </div>
          </div>
          <div class="row-item-actions">
            <button class="btn btn-soft btn-sm" type="button" data-settle="${c.id}">
              <i data-lucide="wallet" class="icon"></i>
              <span>${translate("contractors.settleAccount")}</span>
            </button>
            <button class="btn btn-outline btn-sm" type="button" data-projects="${c.id}">
              <i data-lucide="folder-open" class="icon"></i>
              <span>${translate("contractors.viewProjects")}</span>
            </button>
          </div>
        </div>`;
    })
    .join("");
  window.lucide?.createIcons();
}

let settleContractorId = null;

function openSettleModal(id) {
  settleContractorId = id;
  const contractor = all("contractors").find((c) => c.id === id);
  if (!contractor) return;
  const remaining = contractorBalance(contractor).remaining;
  document.getElementById("settleAmount").value = remaining > 0 ? remaining : "";
  document.getElementById("settleNote").value = "";
  showModal(document.getElementById("settleModal"));
  document.getElementById("settleAmount").focus();
  window.lucide?.createIcons();
}

function closeSettleModal() {
  hideModal(document.getElementById("settleModal"));
  document.getElementById("settleForm").reset();
  settleContractorId = null;
}

function submitSettle(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = Number(form.elements["amount"].value || 0);
  if (!(amount > 0) || !settleContractorId) {
    form.elements["amount"].focus();
    return;
  }
  const contractor = all("contractors").find((c) => c.id === settleContractorId);
  if (!contractor) return;
  recordMoney({
    direction: "out",
    personType: "contractor",
    personId: contractor.id,
    personName: contractor.name,
    amount,
    projectId: null,
    note: form.elements["note"].value.trim(),
  });
  closeSettleModal();
  renderContractors();
  toast(translate("common.saved"));
}

function openProjectsModal(id) {
  const contractor = all("contractors").find((c) => c.id === id);
  if (!contractor) return;
  const body = document.getElementById("projectsModalBody");
  const projects = contractorProjects(id);

  if (!projects.length) {
    body.innerHTML = `<p class="row-empty">${translate("contractors.noProjects")}</p>`;
  } else {
    body.innerHTML = projects
      .map(({ project, contractor: row, materials }) => {
        const b = contractorBalance(row || { total: 0, paid: 0 });
        const type = (TYPE_LABELS[project.type] || TYPE_LABELS.other)[lang()] || "—";
        const matRows = materials.length
          ? materials
              .map(
                (m) => `
              <tr>
                <td>${esc(m.name)}</td>
                <td>${formatMoney(m.quantity)} ${esc(m.unit || "")}</td>
                <td>${formatMoney(m.total)}</td>
              </tr>`
              )
              .join("")
          : `<tr><td class="analytics-table-empty" colspan="3">${translate("project.noMaterials")}</td></tr>`;
        return `
          <div class="modal-project">
            <div class="row-item-main">
              <div class="row-item-title">${esc(project.name)}</div>
              <div class="row-item-sub">${esc(type)} · ${formatMoney(project.area)} m²</div>
            </div>
            <div class="row-item-stats">
              <div class="row-stat">
                <span class="row-stat-label">${translate("project.total")}</span>
                <span class="row-stat-value">${formatMoney(b.total)}</span>
              </div>
              <div class="row-stat">
                <span class="row-stat-label">${translate("project.paid")}</span>
                <span class="row-stat-value is-paid">${formatMoney(b.paid)}</span>
              </div>
              <div class="row-stat">
                <span class="row-stat-label">${translate("project.remaining")}</span>
                <span class="row-stat-value is-remaining">${formatMoney(b.remaining)}</span>
              </div>
            </div>
            <div class="modal-project-section">
              <h3 class="modal-subtitle">${translate("contractors.materialsConsumed")}</h3>
              <table class="analytics-table">
                <thead>
                  <tr>
                    <th>${translate("project.material")}</th>
                    <th>${translate("project.qty")}</th>
                    <th>${translate("project.total")}</th>
                  </tr>
                </thead>
                <tbody>${matRows}</tbody>
              </table>
            </div>
          </div>`;
      })
      .join("");
  }

  showModal(document.getElementById("projectsModal"));
  window.lucide?.createIcons();
}

function initModal() {
  const modal = document.getElementById("contractorModal");
  const open = () => {
    showModal(modal);
    document.getElementById("conName").focus();
    window.lucide?.createIcons();
  };
  const close = () => {
    hideModal(modal);
    document.getElementById("contractorForm").reset();
  };

  document.getElementById("addContractorBtn").addEventListener("click", open);
  document.getElementById("contractorModalClose").addEventListener("click", close);
  document.getElementById("contractorFormCancel").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.getElementById("contractorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.elements["name"].value.trim();
    if (!name) {
      form.elements["name"].focus();
      return;
    }
    save("contractors", {
      id: uid(),
      name,
      role: form.role.value,
      phone: form.phone.value.trim(),
      total: Number(form.total.value || 0),
      paid: Number(form.paid.value || 0),
    });
    close();
    renderContractors();
    toast(translate("common.saved"));
  });
}

function initSettleModal() {
  document.getElementById("settleModalClose").addEventListener("click", closeSettleModal);
  document.getElementById("settleCancel").addEventListener("click", closeSettleModal);
  const modal = document.getElementById("settleModal");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeSettleModal();
  });
  document.getElementById("settleForm").addEventListener("submit", submitSettle);
}

function initProjectsModal() {
  document.getElementById("projectsModalClose").addEventListener("click", () => {
    hideModal(document.getElementById("projectsModal"));
  });
  const modal = document.getElementById("projectsModal");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideModal(modal);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderContractors();
  initModal();
  initSettleModal();
  initProjectsModal();

  document.getElementById("contractorsList").addEventListener("click", (e) => {
    const settleBtn = e.target.closest("[data-settle]");
    if (settleBtn) {
      openSettleModal(settleBtn.dataset.settle);
      return;
    }
    const projectsBtn = e.target.closest("[data-projects]");
    if (projectsBtn) openProjectsModal(projectsBtn.dataset.projects);
  });
});
