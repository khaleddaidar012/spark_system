/* ============================================
   Spark ERP — Contractors Page Script
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, save, uid } from "../modules/store.js";
import { contractorBalance, formatMoney } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";

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
        </div>`;
    })
    .join("");
}

function initModal() {
  const modal = document.getElementById("contractorModal");
  const open = () => {
    modal.hidden = false;
    document.getElementById("conName").focus();
    window.lucide?.createIcons();
  };
  const close = () => {
    modal.hidden = true;
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

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
  await initLayout();
  renderContractors();
  initModal();
});
