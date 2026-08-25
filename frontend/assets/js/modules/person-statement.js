/* ============================================
   Spark ERP — Person Statement of Account Module
   Used by both Contractors & Suppliers pages
   for viewing, filtering by date, applying
   deductions, and printing Arabic RTL A4 PDF.
   ============================================ */

import { all, get, addDeduction } from "./store.js";
import { personAccountStatement, formatMoney, num } from "./calc.js";
import { translate } from "./i18n.js";
import { toast } from "./toast.js";
import { showModal, hideModal } from "./modal.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let activePersonId = null;
let activePersonType = null;
let currentFromDate = "";
let currentToDate = "";

export function openPersonStatement({ personId, personType }) {
  activePersonId = personId;
  activePersonType = personType;
  currentFromDate = "";
  currentToDate = "";

  const fromInput = document.getElementById("statementFromDate");
  const toInput = document.getElementById("statementToDate");
  if (fromInput) fromInput.value = "";
  if (toInput) toInput.value = "";

  renderStatement();

  const modal = document.getElementById("personStatementModal");
  if (modal) {
    showModal(modal);
    window.lucide?.createIcons();
  }
}

export function renderStatement() {
  if (!activePersonId || !activePersonType) return;

  const collection = activePersonType === "contractor" ? "contractors" : "suppliers";
  const person = get(collection, activePersonId);
  if (!person) return;

  // 1. Update Title & Info Header
  const titleEl = document.getElementById("personStatementTitle");
  if (titleEl) {
    titleEl.textContent =
      activePersonType === "contractor"
        ? `${translate("statement.contractorStatementTitle") || "كشف حساب مقاول"}: ${person.name}`
        : `${translate("statement.supplierStatementTitle") || "كشف حساب مورد"}: ${person.name}`;
  }

  const infoEl = document.getElementById("statementPersonInfo");
  if (infoEl) {
    const periodLabel =
      currentFromDate || currentToDate
        ? `الفترة: من ${currentFromDate || "البداية"} إلى ${currentToDate || "اليوم"}`
        : "الفترة: جميع المعاملات حتى تاريخه";

    infoEl.innerHTML = `
      <div class="statement-info-row">
        <span class="statement-info-label">${activePersonType === "contractor" ? "المقاول" : "المورد"}:</span>
        <strong class="statement-info-val">${esc(person.name)}</strong>
        ${person.phone ? `<span class="statement-info-phone">(${esc(person.phone)})</span>` : ""}
      </div>
      <div class="statement-info-row">
        <span class="statement-info-label">${periodLabel}</span>
      </div>
      <div class="statement-info-row">
        <span class="statement-info-label">تاريخ إصدار الكشف:</span>
        <span>${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</span>
      </div>
    `;
  }

  // 2. Fetch Statement Data
  const statement = personAccountStatement({
    personId: activePersonId,
    personType: activePersonType,
    fromDate: currentFromDate,
    toDate: currentToDate,
  });

  // 3. Render Summary KPI Cards
  const kpisEl = document.getElementById("statementKpis");
  if (kpisEl) {
    const isDueToThem = statement.finalBalance >= 0;
    kpisEl.innerHTML = `
      <div class="statement-kpi-card">
        <span class="statement-kpi-title">${translate("statement.openingBalance") || "الرصيد الافتتاحي"}</span>
        <span class="statement-kpi-val">${formatMoney(statement.openingBalance)} ج.م</span>
      </div>
      <div class="statement-kpi-card is-dues">
        <span class="statement-kpi-title">${translate("statement.periodDues") || "مستحقات الفترة (أعمال/توريدات)"}</span>
        <span class="statement-kpi-val">${formatMoney(statement.periodDues)} ج.م</span>
      </div>
      <div class="statement-kpi-card is-paid">
        <span class="statement-kpi-title">${translate("statement.periodPaid") || "إجمالي المسدد"}</span>
        <span class="statement-kpi-val">${formatMoney(statement.periodPaid)} ج.م</span>
      </div>
      <div class="statement-kpi-card is-deduction">
        <span class="statement-kpi-title">${translate("statement.periodDeductions") || "إجمالي الخصومات"}</span>
        <span class="statement-kpi-val">${formatMoney(statement.periodDeductions)} ج.م</span>
      </div>
      <div class="statement-kpi-card is-final ${isDueToThem ? "is-due-them" : "is-due-us"}">
        <span class="statement-kpi-title">${isDueToThem ? (translate("statement.dueToThem") || "صافي المستحق له") : (translate("statement.dueToUs") || "مستحق عليه")}</span>
        <span class="statement-kpi-val">${formatMoney(Math.abs(statement.finalBalance))} ج.م</span>
      </div>
    `;
  }

  // 4. Render Table Rows
  const tbody = document.getElementById("statementTableBody");
  const tfoot = document.getElementById("statementTableFoot");
  if (tbody) {
    if (!statement.rows.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="row-empty">لا توجد معاملات في هذه الفترة الزمنية</td></tr>`;
    } else {
      tbody.innerHTML = statement.rows
        .map((r, idx) => {
          const isDeduction = r.type === "deduction";
          const isPayment = r.type === "payment";
          const isDeliveryOrWork = r.type === "delivery" || r.type === "work";
          return `
            <tr class="${isDeduction ? "is-deduction-row" : isPayment ? "is-payment-row" : ""}">
              <td>${esc(r.date || "—")}</td>
              <td><span class="statement-badge ${r.type}">${esc(r.typeLabel)}</span></td>
              <td class="statement-desc-cell">${esc(r.desc || "—")}</td>
              <td>${esc(r.projectName || "—")}</td>
              <td class="num-cell ${r.due > 0 ? "is-due" : ""}">${r.due > 0 ? formatMoney(r.due) : "—"}</td>
              <td class="num-cell ${r.paid > 0 ? "is-paid" : ""}">${r.paid > 0 ? formatMoney(r.paid) : "—"}</td>
              <td class="num-cell ${r.deduction > 0 ? "is-deduction" : ""}">${r.deduction > 0 ? formatMoney(r.deduction) : "—"}</td>
              <td class="num-cell statement-balance-cell"><strong>${formatMoney(r.balance)}</strong></td>
            </tr>
          `;
        })
        .join("");
    }
  }

  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="statement-total-row">
        <td colspan="4" class="text-start"><strong>الإجمالي الكلي للفترة</strong></td>
        <td class="num-cell"><strong>${formatMoney(statement.periodDues)}</strong></td>
        <td class="num-cell"><strong>${formatMoney(statement.periodPaid)}</strong></td>
        <td class="num-cell"><strong>${formatMoney(statement.periodDeductions)}</strong></td>
        <td class="num-cell statement-final-cell"><strong>${formatMoney(statement.finalBalance)} ج.م</strong></td>
      </tr>
    `;
  }

  window.lucide?.createIcons();
}

export function initStatementModal() {
  const modal = document.getElementById("personStatementModal");
  if (!modal) return;

  const closeBtn = document.getElementById("personStatementClose");
  if (closeBtn) closeBtn.addEventListener("click", () => hideModal(modal));

  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideModal(modal);
  });

  // Filter Buttons
  const applyBtn = document.getElementById("statementApplyFilterBtn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      currentFromDate = document.getElementById("statementFromDate")?.value || "";
      currentToDate = document.getElementById("statementToDate")?.value || "";
      renderStatement();
    });
  }

  const resetBtn = document.getElementById("statementResetFilterBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentFromDate = "";
      currentToDate = "";
      const f = document.getElementById("statementFromDate");
      const t = document.getElementById("statementToDate");
      if (f) f.value = "";
      if (t) t.value = "";
      renderStatement();
    });
  }

  // Print PDF Button
  const printBtn = document.getElementById("statementPrintBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  // Apply Deduction Form
  const dedForm = document.getElementById("statementDeductionForm");
  if (dedForm) {
    dedForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const amount = Number(document.getElementById("statementDeductionAmount")?.value) || 0;
      const reason = document.getElementById("statementDeductionReason")?.value?.trim() || "";

      if (!amount || amount <= 0) {
        toast("يرجى إدخال مبلغ خصم صالح", "danger");
        return;
      }
      if (!reason) {
        toast("يرجى إدخال سبب الخصم", "danger");
        return;
      }

      addDeduction({
        personId: activePersonId,
        personType: activePersonType,
        amount,
        reason,
        date: new Date().toISOString().slice(0, 10),
      });

      dedForm.reset();
      toast("تم تطبيق الخصم على كشف الحساب بنجاح", "success");
      renderStatement();
    });
  }
}
