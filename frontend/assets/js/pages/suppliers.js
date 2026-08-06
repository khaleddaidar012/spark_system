/* ============================================
   Spark ERP — Suppliers Page Script
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, save, uid } from "../modules/store.js";
import { supplierBalance, formatMoney } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
              <span class="row-stat-label">${translate("project.remaining")}</span>
              <span class="row-stat-value is-remaining">${formatMoney(b.remaining)}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

function initModal() {
  const modal = document.getElementById("supplierModal");
  const open = () => {
    modal.hidden = false;
    document.getElementById("supName").focus();
    window.lucide?.createIcons();
  };
  const close = () => {
    modal.hidden = true;
    document.getElementById("supplierForm").reset();
  };

  document.getElementById("addSupplierBtn").addEventListener("click", open);
  document.getElementById("supplierModalClose").addEventListener("click", close);
  document.getElementById("supplierFormCancel").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  document.getElementById("supplierForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.name.value.trim();
    if (!name) {
      form.name.focus();
      return;
    }
    save("suppliers", {
      id: uid(),
      name,
      phone: form.phone.value.trim(),
      notes: form.notes.value.trim(),
      purchases: 0,
      paid: 0,
    });
    close();
    renderSuppliers();
    toast(translate("common.saved"));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderSuppliers();
  initModal();
});
