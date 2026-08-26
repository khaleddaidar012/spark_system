/* ============================================
   Spark ERP — Financial Accounts Page Script
   Summary (in / out / net) + period expense
   cards (today / week / month) + breakdown modal
   + transaction history.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all } from "../modules/store.js";
import { moneyIn, moneyOut, materialPurchases, sortNewestFirst, supplierProjectName, num, formatMoney, dailyExpenses, weeklyExpenses, monthlyExpenses, dailyIncome, weeklyIncome, monthlyIncome, expensesBetween } from "../modules/calc.js";
import { translate } from "../modules/i18n.js";
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

const PERSON_TYPE_LABELS = {
  supplier: { en: "Supplier", ar: "مورد" },
  contractor: { en: "Contractor", ar: "مقاول" },
  client: { en: "Client", ar: "عميل" },
  other: { en: "Other", ar: "أخرى" },
};

function renderSummary() {
  const txns = all("moneyTransactions");
  const material = all("materialTransactions");
  const incoming = moneyIn(txns);
  const outgoing = moneyOut(txns) + materialPurchases(material);
  document.getElementById("financeIn").textContent = formatMoney(incoming);
  document.getElementById("financeOut").textContent = formatMoney(outgoing);
  document.getElementById("financeNet").textContent = formatMoney(incoming - outgoing);
}

/* ---------- Income Summary Cards ---------- */

function renderIncomeCards() {
  const txns = all("moneyTransactions");
  const todayEl = document.getElementById("incomeToday");
  const weekEl = document.getElementById("incomeWeek");
  const monthEl = document.getElementById("incomeMonth");
  if (todayEl) todayEl.textContent = formatMoney(dailyIncome(txns));
  if (weekEl) weekEl.textContent = formatMoney(weeklyIncome(txns));
  if (monthEl) monthEl.textContent = formatMoney(monthlyIncome(txns));
}

/* ---------- Income Breakdown Modal ---------- */

function buildInvoiceBtnHTML(obj) {
  const invData = obj.invoiceData || obj.invoiceFile || obj.attachment || obj.receiptUrl || obj.file || "";
  const invType = obj.invoiceType || "image/png";
  const invName = obj.invoiceName || "invoice";
  const hasInvoice = !!(invData && invData !== "undefined" && invData !== "null" && String(invData).trim() !== "");
  const txnId = obj.id || "";

  if (hasInvoice) {
    return `<button class="btn btn-soft btn-xs view-invoice-btn is-has-invoice" 
                    type="button" 
                    data-inv-data="${esc(invData)}" 
                    data-inv-type="${esc(invType)}" 
                    data-inv-name="${esc(invName)}" 
                    data-txn-id="${esc(txnId)}"
                    style="background:rgba(59,130,246,0.18);color:var(--primary);font-weight:700;margin-top:4px;">
              <i data-lucide="file-text" class="icon"></i>
              <span>عرض الفاتورة</span>
            </button>`;
  }

  return `<button class="btn btn-soft btn-xs view-invoice-btn is-upload-btn" 
                  type="button" 
                  data-txn-id="${esc(txnId)}"
                  style="background:rgba(234,179,8,0.15);color:#b45309;font-weight:600;margin-top:4px;" title="انقر لإرفاق صورة أو ملف فاتورة لهذه العملية">
            <i data-lucide="paperclip" class="icon"></i>
            <span>إرفاق فاتورة</span>
          </button>`;
}

function promptAttachInvoice(txnId, onDone) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,application/pdf";
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result;
      const invType = file.type;
      const invName = file.name;
      let updated = false;

      // 1. moneyTransactions
      const moneyTxns = all("moneyTransactions");
      const mTxn = moneyTxns.find((t) => String(t.id) === String(txnId));
      if (mTxn) {
        mTxn.invoiceData = data;
        mTxn.invoiceType = invType;
        mTxn.invoiceName = invName;
        save("moneyTransactions", mTxn);
        updated = true;
      }

      // 2. materialTransactions
      if (!updated) {
        const matTxns = all("materialTransactions");
        const matTxn = matTxns.find((t) => String(t.id) === String(txnId));
        if (matTxn) {
          matTxn.invoiceData = data;
          matTxn.invoiceType = invType;
          matTxn.invoiceName = invName;
          save("materialTransactions", matTxn);
          updated = true;
        }
      }

      toast("تم رفع وإرفاق الفاتورة بالمعاملة بنجاح!", "success");
      window.dispatchEvent(new CustomEvent("spark:data-changed"));
      onDone?.();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function initInvoiceClicks() {
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".view-invoice-btn");
    if (!btn) return;
    if (btn.classList.contains("is-upload-btn")) {
      const txnId = btn.dataset.txnId;
      promptAttachInvoice(txnId, () => {
        renderSummary();
        renderIncomeCards();
        renderExpenseCards();
        renderHistory();
      });
      return;
    }

    const invData = btn.dataset.invData;
    if (invData && invData !== "undefined" && invData !== "null" && invData.trim() !== "") {
      if (typeof window.openInvoiceLightbox === "function") {
        window.openInvoiceLightbox({
          data: invData,
          type: btn.dataset.invType || "image/png",
          name: btn.dataset.invName || "invoice"
        });
      } else {
        toast("تعذر فتح استعراض الفاتورة", "danger");
      }
    } else {
      const txnId = btn.dataset.txnId;
      promptAttachInvoice(txnId, () => {
        renderSummary();
        renderIncomeCards();
        renderExpenseCards();
        renderHistory();
      });
    }
  });
}

function openIncomeBreakdown(period) {
  const { from, to, label } = getDateRange(period, "income");
  const titleEl = document.getElementById("incomeBreakdownTitle");
  if (titleEl) {
    titleEl.textContent = `${translate("finance.incomeBreakdownTitle")} — ${label}`;
  }

  const txns = all("moneyTransactions").filter(
    (t) => t.direction === "in" && t.date >= from && t.date <= to
  );
  const sorted = sortNewestFirst(txns);

  const total = sorted.reduce((s, t) => s + num(t.amount), 0);
  const totalEl = document.getElementById("incomeBreakdownTotal");
  if (totalEl) totalEl.textContent = formatMoney(total);

  const list = document.getElementById("incomeBreakdownList");
  const empty = document.getElementById("incomeBreakdownEmpty");
  if (!list || !empty) return;

  if (!sorted.length) {
    list.innerHTML = "";
    empty.hidden = false;
    showModal(document.getElementById("incomeBreakdownModal"));
    window.lucide?.createIcons();
    return;
  }
  empty.hidden = true;

  list.innerHTML = sorted
    .map((t) => {
      const typeLabel = (PERSON_TYPE_LABELS[t.personType] || PERSON_TYPE_LABELS.other)[lang()] || "";
      const project = supplierProjectName(t.projectId);
      const sub = [typeLabel, project ? translate("suppliers.project") + ": " + project : "", t.note]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(t.personName || "—")}</div>
            <div class="row-item-sub">${esc(sub)}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${esc(t.date || "")}</span>
              <span class="row-stat-value is-paid">+${formatMoney(t.amount)}</span>
            </div>
            ${buildInvoiceBtnHTML(t)}
          </div>
        </div>`;
    })
    .join("");

  showModal(document.getElementById("incomeBreakdownModal"));
  window.lucide?.createIcons();
}

function initIncomeCards() {
  ["incomeCardToday", "incomeCardWeek", "incomeCardMonth"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      const period = e.currentTarget.dataset.period;
      openIncomeBreakdown(period);
    });
  });

  const closeModal = () => hideModal(document.getElementById("incomeBreakdownModal"));
  document.getElementById("incomeBreakdownClose")?.addEventListener("click", closeModal);
  document.getElementById("incomeBreakdownModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

/* ---------- Expense Summary Cards ---------- */

function renderExpenseCards() {
  const txns = all("moneyTransactions");
  document.getElementById("expenseToday").textContent = formatMoney(dailyExpenses(txns));
  document.getElementById("expenseWeek").textContent = formatMoney(weeklyExpenses(txns));
  document.getElementById("expenseMonth").textContent = formatMoney(monthlyExpenses(txns));
}

/* ---------- Expense Breakdown Modal ---------- */

function getDateRange(period, type = "expense") {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const str = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const prefix = type === "income" ? "finance.income" : "finance.expense";

  if (period === "today") {
    const d = str(now);
    return { from: d, to: d, label: translate(`${prefix}Today`) || (type === "income" ? "اليوم" : "اليوم") };
  }
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: str(mon), to: str(sun), label: translate(`${prefix}Week`) || (type === "income" ? "هذا الأسبوع" : "هذا الأسبوع") };
  }
  // month
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${pad(lastDay)}`,
    label: translate(`${prefix}Month`) || (type === "income" ? "هذا الشهر" : "هذا الشهر"),
  };
}

function openBreakdown(period) {
  const { from, to, label } = getDateRange(period, "expense");
  const titleEl = document.getElementById("expenseBreakdownTitle");
  if (titleEl) {
    titleEl.textContent = `${translate("finance.breakdownTitle")} — ${label}`;
  }

  const txns = all("moneyTransactions").filter(
    (t) => t.direction === "out" && t.date >= from && t.date <= to
  );
  const sorted = sortNewestFirst(txns);

  const total = sorted.reduce((s, t) => s + num(t.amount), 0);
  const totalEl = document.getElementById("expenseBreakdownTotal");
  if (totalEl) totalEl.textContent = formatMoney(total);

  const list = document.getElementById("expenseBreakdownList");
  const empty = document.getElementById("expenseBreakdownEmpty");

  if (!sorted.length) {
    list.innerHTML = "";
    empty.hidden = false;
    showModal(document.getElementById("expenseBreakdownModal"));
    window.lucide?.createIcons();
    return;
  }
  empty.hidden = true;

  list.innerHTML = sorted
    .map((t) => {
      const typeLabel = (PERSON_TYPE_LABELS[t.personType] || PERSON_TYPE_LABELS.other)[lang()] || "";
      const project = supplierProjectName(t.projectId);
      const sub = [typeLabel, project ? translate("suppliers.project") + ": " + project : "", t.note]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(t.personName || "—")}</div>
            <div class="row-item-sub">${esc(sub)}</div>
          </div>
          <div class="row-item-stats">
            <div class="row-stat">
              <span class="row-stat-label">${esc(t.date || "")}</span>
              <span class="row-stat-value is-remaining">−${formatMoney(t.amount)}</span>
            </div>
            ${buildInvoiceBtnHTML(t)}
          </div>
        </div>`;
    })
    .join("");

  showModal(document.getElementById("expenseBreakdownModal"));
  window.lucide?.createIcons();
}

function initExpenseCards() {
  ["expenseCardToday", "expenseCardWeek", "expenseCardMonth"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", (e) => {
      const period = e.currentTarget.dataset.period;
      openBreakdown(period);
    });
  });

  const closeModal = () => hideModal(document.getElementById("expenseBreakdownModal"));
  document.getElementById("expenseBreakdownClose")?.addEventListener("click", closeModal);
  document.getElementById("expenseBreakdownModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

/* ---------- Transaction History ---------- */

function renderHistory() {
  const list = document.getElementById("financeList");
  const empty = document.getElementById("financeEmpty");

  const moneyRows = all("moneyTransactions").map((t) => {
    const typeLabel = PERSON_TYPE_LABELS[t.personType] || PERSON_TYPE_LABELS.other;
    return {
      createdAt: t.createdAt,
      isIn: t.direction === "in",
      amount: (t.direction === "in" ? "+" : "-") + formatMoney(t.amount),
      title: esc(t.personName),
      sub: `${typeLabel[lang()] || typeLabel.en}${t.note ? " · " + esc(t.note) : ""}`,
      dateLabel: t.date || "",
      invoiceData: t.invoiceData || t.invoiceFile || t.attachment || t.receiptUrl || t.file || "",
      invoiceType: t.invoiceType || "image/png",
      invoiceName: t.invoiceName || "invoice",
    };
  });

  const purchaseRows = all("materialTransactions")
    .filter((t) => t.direction === "in" && num(t.total) > 0)
    .map((t) => {
      const project = supplierProjectName(t.projectId);
      return {
        createdAt: t.createdAt,
        isIn: false,
        amount: "-" + formatMoney(t.total),
        title: esc(t.materialName),
        sub: `${translate("finance.purchase")} · ${formatMoney(t.quantity)} ${esc(t.unit || "")}${project ? " · " + translate("suppliers.project") + ": " + esc(project) : ""}`,
        dateLabel: t.date || "",
        invoiceData: t.invoiceData || t.invoiceFile || t.attachment || t.receiptUrl || t.file || "",
        invoiceType: t.invoiceType || "image/png",
        invoiceName: t.invoiceName || "invoice",
      };
    });

  const rows = sortNewestFirst([...moneyRows, ...purchaseRows]);

  if (!rows.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = rows
    .map((r) => `
      <div class="row-item">
        <div class="row-item-main">
          <div class="row-item-title">${r.title}</div>
          <div class="row-item-sub">${r.sub}</div>
        </div>
        <div class="row-item-stats">
          <div class="row-stat">
            <span class="row-stat-label">${esc(r.dateLabel)}</span>
            <span class="row-stat-value ${r.isIn ? "is-paid" : "is-remaining"}">${r.amount}</span>
          </div>
          ${buildInvoiceBtnHTML(r)}
        </div>
      </div>`)
    .join("");
  window.lucide?.createIcons();
}

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  renderSummary();
  renderIncomeCards();
  renderExpenseCards();
  renderHistory();
  initIncomeCards();
  initExpenseCards();
  initInvoiceClicks();
  window.addEventListener("spark:data-changed", () => {
    renderSummary();
    renderIncomeCards();
    renderExpenseCards();
    renderHistory();
  });
});
