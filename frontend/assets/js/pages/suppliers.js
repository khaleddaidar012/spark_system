/* ============================================
   Spark ERP — Suppliers Page Script
   List, add, edit suppliers and view their
   account + transaction log (with the project
   each transaction belongs to).
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, get, save, uid } from "../modules/store.js";
import { supplierBalance, supplierTransactions, supplierProjectName, formatMoney, balanceDirection } from "../modules/calc.js";
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

let editingId = null;
let accountId = null;

function splitSupplies(value) {
  return String(value || "")
    .split(/[,،]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function renderSuppliers() {
  const list = document.getElementById("suppliersList");
  const empty = document.getElementById("suppliersEmpty");
  const rows = all("suppliers");

  if (!rows.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = rows
    .map((s) => {
      const b = supplierBalance(s);
      const direction = balanceDirection(b);
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(s.name)}</div>
            <div class="row-item-sub">${esc(s.phone || "—")}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${translate("finance.purchases")}</span>
              <span class="row-stat-value">${formatMoney(b.purchases)}</span>
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
          <div class="row-item-actions">
            <button class="btn btn-soft btn-sm" type="button" data-edit="${esc(s.id)}">
              <i data-lucide="pencil" class="icon"></i>
              <span>${translate("suppliers.editSupplier")}</span>
            </button>
            <button class="btn btn-outline btn-sm" type="button" data-account="${esc(s.id)}">
              <i data-lucide="wallet" class="icon"></i>
              <span>${translate("suppliers.viewAccount")}</span>
            </button>
          </div>
        </div>`;
    })
    .join("");
  window.lucide?.createIcons();
}

/* ---------- Add / Edit modal ---------- */

function fillForm(supplier) {
  document.getElementById("supName").value = supplier.name || "";
  document.getElementById("supPhone").value = supplier.phone || "";
  document.getElementById("supNotes").value = supplier.notes || "";
  document.getElementById("supSupplies").value = (supplier.supplies || []).join(", ");
}

function resetForm() {
  document.getElementById("supplierForm").reset();
}

function openModal(editing) {
  editingId = editing ? editing.id : null;
  document.getElementById("supplierModalTitle").textContent = editing
    ? translate("suppliers.modalEditTitle")
    : translate("suppliers.modalTitle");
  fillForm(editing || {});
  showModal(document.getElementById("supplierModal"));
  document.getElementById("supName").focus();
  window.lucide?.createIcons();
}

function closeModal() {
  hideModal(document.getElementById("supplierModal"));
  resetForm();
  editingId = null;
}

function submitSupplier(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements["name"].value.trim();
  if (!name) {
    form.elements["name"].focus();
    return;
  }
  const supplier = editingId ? get("suppliers", editingId) : { id: uid() };
  if (!supplier) return;
  supplier.name = name;
  supplier.phone = form.phone.value.trim();
  supplier.notes = form.notes.value.trim();
  supplier.supplies = splitSupplies(form.supplies.value);
  if (!editingId) {
    supplier.purchases = 0;
    supplier.paid = 0;
  }
  save("suppliers", supplier);
  closeModal();
  renderSuppliers();
  toast(translate("common.saved"));
}

/* ---------- Account view ---------- */

function renderAccount() {
  const supplier = get("suppliers", accountId);
  if (!supplier) return;
  const b = supplierBalance(supplier);
  const direction = balanceDirection(b);
  const { money, material } = supplierTransactions(supplier.id);

  document.getElementById("supplierAccountTitle").textContent =
    `${translate("suppliers.accountTitle")} — ${supplier.name}`;

  document.getElementById("supplierAccountSummary").innerHTML = `
    <div class="account-summary-grid">
      <div class="account-summary-item">
        <span class="account-summary-label">${translate("finance.purchases")}</span>
        <span class="account-summary-value">${formatMoney(b.purchases)}</span>
      </div>
      <div class="account-summary-item">
        <span class="account-summary-label">${translate("project.paid")}</span>
        <span class="account-summary-value is-paid">${formatMoney(b.paid)}</span>
      </div>
      <div class="account-summary-item">
        <span class="account-summary-label">${translate(direction.key)}</span>
        <span class="account-summary-value ${direction.paid ? "is-paid" : "is-remaining"}">${formatMoney(direction.amount)}</span>
      </div>
    </div>`;

  const list = document.getElementById("supplierAccountList");
  const empty = document.getElementById("supplierAccountEmpty");

  const moneyRows = money.map((t) => {
    const isIn = t.direction === "in";
    const project = supplierProjectName(t.projectId);
    const projectPart = project ? ` · ${translate("suppliers.project")}: ${esc(project)}` : "";
    return `
      <div class="row-item">
        <div class="row-item-main">
          <div class="row-item-title">${isIn ? translate("finance.totalIn") : translate("finance.totalOut")}</div>
          <div class="row-item-sub">${esc(t.date || "")}${projectPart}${t.note ? " · " + esc(t.note) : ""}</div>
        </div>
        <div class="row-item-stats">
          <div class="row-stat">
            <span class="row-stat-label">${translate("quick.amount")}</span>
            <span class="row-stat-value ${isIn ? "is-paid" : "is-remaining"}">${formatMoney(t.amount)}</span>
          </div>
        </div>
      </div>`;
  });

  const materialRows = material.map((m) => {
    const project = supplierProjectName(m.projectId);
    const projectPart = project ? ` · ${translate("suppliers.project")}: ${esc(project)}` : "";
    return `
      <div class="row-item">
        <div class="row-item-main">
          <div class="row-item-title">${esc(m.materialName)}</div>
          <div class="row-item-sub">${esc(m.date || "")}${projectPart}</div>
        </div>
        <div class="row-item-stats">
          <div class="row-stat">
            <span class="row-stat-label">${translate("project.qty")}</span>
            <span class="row-stat-value">${formatMoney(m.quantity)} ${esc(m.unit || "")}</span>
          </div>
          <div class="row-stat">
            <span class="row-stat-label">${translate("project.total")}</span>
            <span class="row-stat-value">${formatMoney(m.total)}</span>
          </div>
        </div>
      </div>`;
  });

  const allRows = [...materialRows, ...moneyRows];
  if (!allRows.length) {
    list.innerHTML = "";
    empty.hidden = false;
  } else {
    empty.hidden = true;
    list.innerHTML = allRows.join("");
  }
  window.lucide?.createIcons();
}

function openAccount(id) {
  accountId = id;
  showModal(document.getElementById("supplierAccountModal"));
  renderAccount();
}

function closeAccount() {
  accountId = null;
  hideModal(document.getElementById("supplierAccountModal"));
}

function initModal() {
  const modal = document.getElementById("supplierModal");
  document.getElementById("addSupplierBtn").addEventListener("click", () => openModal(null));
  document.getElementById("supplierModalClose").addEventListener("click", closeModal);
  document.getElementById("supplierFormCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.getElementById("supplierForm").addEventListener("submit", submitSupplier);

  const accountModal = document.getElementById("supplierAccountModal");
  document.getElementById("supplierAccountClose").addEventListener("click", closeAccount);
  accountModal.addEventListener("click", (e) => {
    if (e.target === accountModal) closeAccount();
  });

  document.getElementById("suppliersList").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      const supplier = get("suppliers", editBtn.dataset.edit);
      if (supplier) openModal(supplier);
      return;
    }
    const accountBtn = e.target.closest("[data-account]");
    if (accountBtn) openAccount(accountBtn.dataset.account);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderSuppliers();
  initModal();
});
