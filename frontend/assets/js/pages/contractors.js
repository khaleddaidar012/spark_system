/* ============================================
   Spark ERP — Contractors Page Script
   Lists contractors with balances, records
   payments (settle account) and shows the
   projects + consumed materials per contractor.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, save, uid } from "../modules/store.js";
import { contractorBalance, contractorProjects, formatMoney, balanceDirection, sortNewestFirst, supplierProjectName } from "../modules/calc.js";
import { contractorLabel } from "../modules/person-roles.js";
import { recordMoney } from "../modules/actions.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";
import { openPersonStatement, initStatementModal } from "../modules/person-statement.js";

const lang = () => document.documentElement.lang;

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
      const direction = balanceDirection(b);
      const roleName = contractorLabel(c.role, c.name, lang());
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(c.name)}</div>
            <div class="row-item-sub">${roleName}${c.phone ? " · " + esc(c.phone) : ""}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${translate("project.total")}</span>
              <span class="row-stat-value">${formatMoney(b.total)}</span>
            </div>
            <div class="row-stat">
              <span class="row-stat-label">${translate("project.paid")}</span>
              <span class="row-stat-value" style="color:var(--danger); direction:ltr; font-weight:bold;">-${formatMoney(b.paid)}</span>
            </div>
            <div class="row-stat">
              <span class="row-stat-label">${translate(direction.key)}</span>
              <span class="row-stat-value ${direction.paid ? "is-paid" : "is-remaining"}">${formatMoney(direction.amount)}</span>
            </div>
          </div>
          <div class="row-item-actions">
            <button class="btn btn-primary btn-sm" type="button" data-statement="${c.id}">
              <i data-lucide="file-text" class="icon"></i>
              <span>${translate("contractors.statementBtn") || "كشف حساب"}</span>
            </button>
            <button class="btn btn-soft btn-sm" type="button" data-settle="${c.id}">
              <i data-lucide="wallet" class="icon"></i>
              <span>${translate("contractors.settleAccount")}</span>
            </button>
            <button class="btn btn-outline btn-sm" type="button" data-account="${c.id}">
              <i data-lucide="book-open" class="icon"></i>
              <span>${translate("contractors.viewAccount")}</span>
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

let accountId = null;

function renderAccount() {
  const contractor = all("contractors").find((c) => c.id === accountId);
  if (!contractor) return;
  const b = contractorBalance(contractor);
  const direction = balanceDirection(b);

  document.getElementById("contractorAccountTitle").textContent =
    `${translate("contractors.accountTitle")} — ${contractor.name}`;

  document.getElementById("contractorAccountSummary").innerHTML = `
    <div class="account-summary-grid">
      <div class="account-summary-item">
        <span class="account-summary-label">${translate("project.total")}</span>
        <span class="account-summary-value">${formatMoney(b.total)}</span>
      </div>
      <div class="account-summary-item">
        <span class="account-summary-label">${translate("project.paid")}</span>
        <span class="account-summary-value" style="color:var(--danger); direction:ltr; font-weight:bold;">-${formatMoney(b.paid)}</span>
      </div>
      <div class="account-summary-item">
        <span class="account-summary-label">${translate(direction.key)}</span>
        <span class="account-summary-value ${direction.paid ? "is-paid" : "is-remaining"}">${formatMoney(direction.amount)}</span>
      </div>
    </div>`;

  const txns = sortNewestFirst(
    all("moneyTransactions").filter((t) => t.personType === "contractor" && t.personId === contractor.id)
  );

  const list = document.getElementById("contractorAccountList");
  const empty = document.getElementById("contractorAccountEmpty");

  if (!txns.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = txns
    .map((t) => {
      const isIn = t.direction === "in";
      const project = supplierProjectName(t.projectId);
      const projectPart = project ? ` · ${translate("contractors.project")}: ${esc(project)}` : "";
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${isIn ? translate("finance.totalIn") : translate("finance.totalOut")}</div>
            <div class="row-item-sub">${esc(t.date || "")}${projectPart}${t.note ? " · " + esc(t.note) : ""}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${translate("quick.amount")}</span>
              <span class="row-stat-value" style="direction:ltr; font-weight:bold; color: ${isIn ? 'var(--success)' : 'var(--danger)'}">
                ${isIn ? '+' : '-'}${formatMoney(t.amount)}
              </span>
            </div>
          </div>
        </div>`;
    })
    .join("");
  window.lucide?.createIcons();
}

function openAccount(id) {
  accountId = id;
  showModal(document.getElementById("contractorAccountModal"));
  renderAccount();
}

function closeAccount() {
  accountId = null;
  hideModal(document.getElementById("contractorAccountModal"));
}

function initAccountModal() {
  document.getElementById("contractorAccountClose").addEventListener("click", closeAccount);
  const modal = document.getElementById("contractorAccountModal");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAccount();
  });
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

let projectsModalId = null;

function renderProjectsModal(id) {
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
        const direction = balanceDirection(b);
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
                <span class="row-stat-label">${translate(direction.key)}</span>
                <span class="row-stat-value ${direction.paid ? "is-paid" : "is-remaining"}">${formatMoney(direction.amount)}</span>
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

  window.lucide?.createIcons();
}

function openProjectsModal(id) {
  projectsModalId = id;
  renderProjectsModal(id);
  showModal(document.getElementById("projectsModal"));
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
      kind: "contractors",
      roles: ["contractor"],
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
  const close = () => {
    projectsModalId = null;
    hideModal(document.getElementById("projectsModal"));
  };
  document.getElementById("projectsModalClose").addEventListener("click", close);
  const modal = document.getElementById("projectsModal");
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  renderContractors();
  initModal();
  initSettleModal();
  initProjectsModal();
  initAccountModal();
  initStatementModal();

  document.getElementById("contractorsList").addEventListener("click", (e) => {
    const statementBtn = e.target.closest("[data-statement]");
    if (statementBtn) {
      openPersonStatement({ personId: statementBtn.dataset.statement, personType: "contractor" });
      return;
    }
    const settleBtn = e.target.closest("[data-settle]");
    if (settleBtn) {
      openSettleModal(settleBtn.dataset.settle);
      return;
    }
    const accountBtn = e.target.closest("[data-account]");
    if (accountBtn) {
      openAccount(accountBtn.dataset.account);
      return;
    }
    const projectsBtn = e.target.closest("[data-projects]");
    if (projectsBtn) openProjectsModal(projectsBtn.dataset.projects);
  });

  window.addEventListener("spark:data-changed", () => {
    renderContractors();
    if (accountId) renderAccount();
    if (projectsModalId) renderProjectsModal(projectsModalId);
  });
});
