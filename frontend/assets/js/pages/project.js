/* ============================================
   Spark ERP — Project Detail Page Script
   Loads a project by id, renders general info,
   cost summary, analytics, contractors and
   materials. All totals are auto-calculated.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, get, save, peopleWithRole, findPersonById } from "../modules/store.js";
import { projectCosts, projectAnalytics, materialAnalytics, formatMoney, TYPE_LABELS, STATUS_LABELS, num, contractorBalance, balanceDirection, moneyIn, moneyOut, sortNewestFirst, projectProfit } from "../modules/calc.js";
import { addContractorToProject, addMaterialToProject, recordMoney } from "../modules/actions.js";
import { openQuickAddSupplier, openQuickAddPerson } from "../modules/quick-add-person.js";
import { personRolesLabel, personTypeLabel, contractorLabel, contractorSpecialty } from "../modules/person-roles.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";
import { openInvoiceLightbox } from "../modules/quick-add.js";
import {
  getProjectPhases,
  getActivePhases,
  activatePhase,
  completePhase,
  activateSubPhase,
  completeSubPhase,
  addCustomPhase,
  removeCustomPhase,
  getPhaseLog,
  addFinanceToPhaseLog,
  phaseCostSummary,
  getCompletionCandidates,
  getPendingPhasesAfter
} from "../modules/project-phases.js";

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

let current = null;

/* ---------- Invoice thumbnail helper ---------- */

function invoiceThumbnailHTML(txn, context) {
  if (!txn.invoiceData) return "";
  const isImage = txn.invoiceType && txn.invoiceType.startsWith("image/");
  const safeName = (txn.invoiceName || "invoice").replace(/"/g, "&quot;");
  const dataAttr = `data-invoice-ctx="${context}" data-invoice-id="${txn.id}"`;
  if (isImage) {
    return `<button type="button" class="invoice-row-thumb" ${dataAttr} aria-label="View invoice">
      <img src="${txn.invoiceData}" alt="" class="invoice-thumb-img" />
    </button>`;
  }
  return `<button type="button" class="invoice-row-thumb invoice-row-thumb--pdf" ${dataAttr} aria-label="View PDF invoice">
    <i data-lucide="file-text" class="icon"></i>
    <span class="invoice-pdf-row-name">${safeName.length > 18 ? safeName.slice(0, 16) + "…" : safeName}</span>
  </button>`;
}

/* ---------- Project Phases Section ---------- */

const PHASE_STATUS_LABELS = {
  pending: { ar: "قيد الانتظار", en: "Pending" },
  active:  { ar: "جاري",         en: "In Progress" },
  done:    { ar: "مكتمل",        en: "Completed" },
};

function renderPhasesList(p) {
  const container = document.getElementById("phasesList");
  if (!container) return;

  const phases = getProjectPhases(p.id) || [];
  if (!phases.length) {
    container.innerHTML = `<p class="row-empty">لا توجد مراحل محددة / No phases defined</p>`;
    return;
  }

  const costMap = {};
  for (const item of phaseCostSummary(p.id)) {
    costMap[item.phaseId] = item.totalCost;
  }

  // Sort: active first, then pending, then done
  const rank = (s) => (s === "active" ? 0 : s === "pending" ? 1 : 2);
  const sorted = [...phases].sort((a, b) => rank(a.status) - rank(b.status) || a.order - b.order);

  container.innerHTML = sorted.map((phase) => {
    const isDone = phase.status === "done";
    const isActive = phase.status === "active";
    const isPending = phase.status === "pending";
    const phaseColor = phase.color || "#6366f1";
    const statusLabel = local(PHASE_STATUS_LABELS[phase.status]) || phase.status;
    const cost = costMap[phase.id] || 0;
    const phaseLabel = lang() === "en" && phase.labelEn ? phase.labelEn : phase.label;

    let subPhasesHTML = "";
    if (Array.isArray(phase.subPhases) && phase.subPhases.length > 0) {
      const subsHTML = phase.subPhases.map((sub) => {
        const subIsDone = sub.status === "done";
        const subIsActive = sub.status === "active";
        const subLabel = lang() === "en" && sub.labelEn ? sub.labelEn : sub.label;
        const subStatusLabel = local(PHASE_STATUS_LABELS[sub.status]) || sub.status;

        let subActions = "";
        if (isActive) {
          if (sub.status === "pending") {
            subActions = `<button type="button" class="btn btn-ghost btn-xs sub-activate-btn" data-phase-id="${esc(phase.id)}" data-sub-id="${esc(sub.id)}">تفعيل</button>`;
          } else if (subIsActive) {
            subActions = `<button type="button" class="btn btn-soft btn-xs sub-done-btn" data-phase-id="${esc(phase.id)}" data-sub-id="${esc(sub.id)}"><i data-lucide="check" class="icon"></i> تم</button>`;
          }
        }

        return `
          <div class="phase-sub-row ${subIsActive ? "phase-sub-row--active" : subIsDone ? "phase-sub-row--done" : ""}">
            <span class="phase-sub-dot" style="background-color: ${esc(sub.color || phaseColor)}"></span>
            <span class="phase-sub-label">${esc(subLabel)}</span>
            <span class="phase-badge-more" style="font-size:0.65rem;">${esc(subStatusLabel)}</span>
            <div class="phase-sub-actions">${subActions}</div>
          </div>`;
      }).join("");

      subPhasesHTML = `<div class="phase-sub-list">${subsHTML}</div>`;
    }

    let actionsHTML = "";
    if (isPending) {
      actionsHTML = `<button type="button" class="btn btn-soft btn-xs phase-activate-btn" data-phase-id="${esc(phase.id)}"><i data-lucide="play" class="icon"></i> تفعيل</button>`;
      if (phase.isCustom) {
        actionsHTML += `<button type="button" class="btn btn-ghost btn-xs phase-delete-btn" data-phase-id="${esc(phase.id)}" style="color:var(--danger)"><i data-lucide="trash-2" class="icon"></i></button>`;
      }
    } else if (isActive) {
      actionsHTML = `<button type="button" class="btn btn-primary btn-xs phase-done-btn" data-phase-id="${esc(phase.id)}"><i data-lucide="check" class="icon"></i> تم</button>`;
    }

    return `
      <div class="phase-row ${isActive ? "phase-row--active" : isPending ? "phase-row--pending" : "phase-row--done"}" style="--phase-color: ${esc(phaseColor)}" data-phase-id="${esc(phase.id)}">
        <div class="phase-row-header">
          <span class="phase-row-dot"></span>
          <div class="phase-row-title-wrap">
            <span class="phase-row-label">${esc(phaseLabel)}</span>
            <span class="phase-row-order">#${phase.order}${phase.isCustom ? " · مخصصة" : ""}</span>
          </div>
          ${cost > 0 ? `<span class="phase-row-cost" title="إجمالي تكلفة المرحلة">تكلفة المرحلة: <strong>${formatMoney(cost)} ج.م</strong></span>` : `<span class="phase-row-cost phase-row-cost--zero" style="opacity:0.6;font-size:0.8rem;">0 ج.م</span>`}
          <div class="phase-row-actions">${actionsHTML}</div>
          <span class="phase-row-status-badge ${isActive ? "status-badge--active" : isPending ? "status-badge--pending" : "status-badge--done"}">
            ${isDone ? '<i data-lucide="check" class="icon"></i>' : ""} ${esc(statusLabel)}
          </span>
        </div>
        ${subPhasesHTML}
      </div>`;
  }).join("");

  // Wire phase buttons
  container.querySelectorAll(".phase-activate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const res = activatePhase(p.id, btn.dataset.phaseId);
      if (res.success) {
        toast("تم تفعيل المرحلة");
        renderAll();
      } else {
        toast(res.error || "تعذّر التفعيل", "danger");
      }
    });
  });

  container.querySelectorAll(".phase-done-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      openCompletePhaseModal(btn.dataset.phaseId);
    });
  });

  container.querySelectorAll(".phase-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const res = removeCustomPhase(p.id, btn.dataset.phaseId);
      if (res.success) {
        toast("تم حذف المرحلة");
        renderAll();
      } else {
        toast(res.error || "تعذّر الحذف", "danger");
      }
    });
  });

  container.querySelectorAll(".sub-activate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const res = activateSubPhase(p.id, btn.dataset.phaseId, btn.dataset.subId);
      if (res.success) {
        toast("تم تفعيل المرحلة الفرعية");
        renderAll();
      } else {
        toast(res.error || "تعذّر التفعيل", "danger");
      }
    });
  });

  container.querySelectorAll(".sub-done-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const res = completeSubPhase(p.id, btn.dataset.phaseId, btn.dataset.subId);
      if (res.success) {
        toast("تم إتمام المرحلة الفرعية");
        if (res.allSubsDone) {
          toast("اكتملت جميع المراحل الفرعية لهذه المرحلة", "info");
        }
        renderAll();
      } else {
        toast(res.error || "تعذّر الإتمام", "danger");
      }
    });
  });

  window.lucide?.createIcons();
}

/* ---------- Phase History Log ---------- */

function renderPhaseLog(p) {
  const container = document.getElementById("phaseLogList");
  if (!container) return;

  const log = getPhaseLog(p.id);
  if (!log || !log.length) {
    container.innerHTML = `<p class="row-empty">لا توجد سجلات للمراحل بعد / No phase history yet</p>`;
    return;
  }

  const phases = getProjectPhases(p.id) || [];
  const phaseMap = {};
  for (const ph of phases) phaseMap[ph.id] = ph;

  container.innerHTML = log.map((entry) => {
    const ph = phaseMap[entry.phaseId] || { label: entry.phaseId, color: "#6366f1" };
    const phLabel = lang() === "en" && ph.labelEn ? ph.labelEn : ph.label;
    const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleString(lang() === "ar" ? "ar-EG" : "en-US", { dateStyle: "short", timeStyle: "short" }) : "";

    if (entry.type === "finance") {
      const isOut = entry.direction === "out";
      return `
        <div class="phase-log-item">
          <span class="phase-log-dot is-finance" style="background:${esc(ph.color || 'var(--accent)')}"></span>
          <div class="phase-log-content">
            <div class="phase-log-head">
              <span class="phase-log-title">${esc(phLabel)}</span>
              <span class="phase-log-amount ${isOut ? "is-out" : "is-in"}">${isOut ? "-" : "+"}${formatMoney(entry.amount)}</span>
            </div>
            <div class="phase-log-desc">${isOut ? "مصروفات" : "مقبوضات"}${entry.note ? " · " + esc(entry.note) : ""}</div>
            <div class="phase-log-time">${esc(timeStr)}</div>
          </div>
        </div>`;
    }

    // Status change
    const fromLabel = local(PHASE_STATUS_LABELS[entry.fromStatus]) || entry.fromStatus;
    const toLabel = local(PHASE_STATUS_LABELS[entry.toStatus]) || entry.toStatus;
    const isDone = entry.toStatus === "done";

    return `
      <div class="phase-log-item">
        <span class="phase-log-dot ${isDone ? "is-done" : ""}" style="background:${esc(ph.color || 'var(--primary)')}"></span>
        <div class="phase-log-content">
          <div class="phase-log-head">
            <span class="phase-log-title">${esc(phLabel)}</span>
            <span class="phase-log-time">${esc(timeStr)}</span>
          </div>
          <div class="phase-log-desc">تغيير الحالة: من <b>${esc(fromLabel)}</b> إلى <b>${esc(toLabel)}</b>${entry.note ? " · " + esc(entry.note) : ""}</div>
        </div>
      </div>`;
  }).join("");

  window.lucide?.createIcons();
}

/* ---------- Phase Completion Modal ---------- */

let completingPhaseId = null;

function openCompletePhaseModal(phaseId) {
  completingPhaseId = phaseId;
  const project = current;
  if (!project) return;

  const phases = getProjectPhases(project.id) || [];
  const phase = phases.find((ph) => ph.id === phaseId);
  if (!phase) return;

  const phaseLabel = lang() === "en" && phase.labelEn ? phase.labelEn : phase.label;
  document.getElementById("phaseCompleteDesc").textContent = `هل أنت متأكد من إتمام مرحلة "${phaseLabel}"؟`;

  // List other active phases
  const otherActives = getCompletionCandidates(project.id, phaseId);
  const activeListEl = document.getElementById("phaseCompleteActiveList");
  if (otherActives.length > 0) {
    activeListEl.innerHTML = `
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">المراحل النشطة الأخرى:</div>
      ${otherActives.map((o) => `<span class="phase-active-chip" style="border-color:${esc(o.color)}">${esc(lang() === "en" && o.labelEn ? o.labelEn : o.label)}</span>`).join("")}
    `;
    activeListEl.hidden = false;
  } else {
    activeListEl.innerHTML = "";
    activeListEl.hidden = true;
  }

  // Populate next phase select
  const nextSelect = document.getElementById("phaseCompleteNextSelect");
  const pendingPhases = getPendingPhasesAfter(project.id, phaseId);
  nextSelect.innerHTML = `<option value="">— لا شيء (بدون تفعيل تلقائي) —</option>` +
    pendingPhases.map((p) => `<option value="${p.id}">${esc(lang() === "en" && p.labelEn ? p.labelEn : p.label)}</option>`).join("");

  showModal(document.getElementById("phaseCompleteModal"));
  window.lucide?.createIcons();
}

function closeCompletePhaseModal() {
  completingPhaseId = null;
  hideModal(document.getElementById("phaseCompleteModal"));
}

function confirmCompletePhase() {
  if (!completingPhaseId || !current) return;
  const nextId = document.getElementById("phaseCompleteNextSelect").value || undefined;
  const res = completePhase(current.id, completingPhaseId, nextId);
  if (res.success) {
    toast("تم إتمام المرحلة بنجاح");
    closeCompletePhaseModal();
    renderAll();
  } else {
    toast(res.error || "تعذّر إتمام المرحلة", "danger");
  }
}

/* ---------- Add Custom Phase Modal ---------- */

function openAddPhaseModal() {
  const modal = document.getElementById("addPhaseModal");
  document.getElementById("addPhaseForm").reset();
  document.getElementById("customSubPhasesContainer").innerHTML = "";
  showModal(modal);
  document.getElementById("customPhaseName").focus();
  window.lucide?.createIcons();
}

function closeAddPhaseModal() {
  hideModal(document.getElementById("addPhaseModal"));
  document.getElementById("addPhaseForm").reset();
  document.getElementById("customSubPhasesContainer").innerHTML = "";
}

function addCustomSubRow() {
  const container = document.getElementById("customSubPhasesContainer");
  const row = document.createElement("div");
  row.className = "custom-sub-row";
  row.innerHTML = `
    <input type="text" class="form-input custom-sub-name" placeholder="اسم المرحلة الفرعية (عربي)" required />
    <input type="text" class="form-input custom-sub-name-en" placeholder="Sub-phase name (EN)" />
    <button type="button" class="btn btn-icon btn-soft custom-sub-remove" style="color:var(--danger)" aria-label="Remove">
      <i data-lucide="trash-2" class="icon"></i>
    </button>
  `;
  row.querySelector(".custom-sub-remove").addEventListener("click", () => row.remove());
  container.appendChild(row);
  window.lucide?.createIcons();
}

function submitAddPhase(event) {
  event.preventDefault();
  if (!current) return;

  const label = document.getElementById("customPhaseName").value.trim();
  const labelEn = document.getElementById("customPhaseNameEn").value.trim();
  const color = document.querySelector('input[name="phaseColor"]:checked')?.value || "#6366f1";

  if (!label) {
    document.getElementById("customPhaseName").focus();
    return;
  }

  const subPhases = [];
  document.querySelectorAll("#customSubPhasesContainer .custom-sub-row").forEach((row) => {
    const sLabel = row.querySelector(".custom-sub-name").value.trim();
    const sLabelEn = row.querySelector(".custom-sub-name-en").value.trim();
    if (sLabel) {
      subPhases.push({ label: sLabel, labelEn: sLabelEn, color });
    }
  });

  const res = addCustomPhase(current.id, { label, labelEn, color, subPhases });
  if (res.success) {
    toast("تمت إضافة المرحلة بنجاح");
    closeAddPhaseModal();
    renderAll();
  } else {
    toast(res.error || "تعذّر إضافة المرحلة", "danger");
  }
}


function projectIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

/* ---------- Header ---------- */

function renderHeader(p) {
  const status = p.status || "active";
  const statusLabel = local(STATUS_LABELS[status]);
  const statusClass = status === "done" ? "status-done" : status === "paused" ? "status-paused" : "status-active";

  document.getElementById("detailHeader").innerHTML = `
    <h1 class="detail-title">${esc(p.name)}</h1>
    <div class="detail-meta">
      <span class="badge badge-primary">${local(TYPE_LABELS[p.type])}</span>
      <span class="project-card-status ${statusClass}">${statusLabel}</span>
      <span class="badge badge-outline">${formatMoney(p.area)} m²</span>
    </div>`;
}

/* ---------- Project Summary ---------- */

function renderProjectSummary(p) {
  const txns = sortNewestFirst(
    all("moneyTransactions").filter((t) => t.projectId === p.id)
  );
  // الدفعة الاولية تُحتسب ضمن الوارد
  const incoming = moneyIn(txns) + num(p.advancePayment);
  const outgoing = moneyOut(txns);
  const diff = incoming - outgoing;
  const expectedProfit = num(p.expectedProfit || 0);
  const actualProfit = expectedProfit + diff;
  const actualProfitClass = actualProfit > 0 ? "is-positive" : actualProfit < 0 ? "is-negative" : "is-zero";

  document.getElementById("projectSummary").innerHTML = `
    <div class="project-summary-grid">
      <div class="project-summary-card is-in">
        <span class="project-summary-icon" aria-hidden="true"><i data-lucide="arrow-down-circle" class="icon"></i></span>
        <span class="project-summary-label">إجمالي الوارد</span>
        <span class="project-summary-value">${formatMoney(incoming)}</span>
      </div>
      <div class="project-summary-card is-out">
        <span class="project-summary-icon" aria-hidden="true"><i data-lucide="arrow-up-circle" class="icon"></i></span>
        <span class="project-summary-label">إجمالي الصادر</span>
        <span class="project-summary-value">${formatMoney(outgoing)}</span>
      </div>
      <div class="project-summary-card is-net ${diff > 0 ? "is-positive" : diff < 0 ? "is-negative" : "is-zero"}">
        <span class="project-summary-icon" aria-hidden="true"><i data-lucide="scale" class="icon"></i></span>
        <span class="project-summary-label">الفرق</span>
        <span class="project-summary-value">${(diff > 0 ? "+" : "") + formatMoney(diff)}</span>
      </div>
      <div class="project-summary-card is-profit">
        <span class="project-summary-icon" aria-hidden="true"><i data-lucide="target" class="icon"></i></span>
        <span class="project-summary-label">الربح المتوقع</span>
        <input type="number" class="project-summary-input" id="expectedProfitInput" value="${expectedProfit}" step="0.01" min="0" placeholder="0" />
      </div>
      <div class="project-summary-card is-actual ${actualProfitClass}" title="الربح الفعلي = الربح المتوقع + (الوارد - الصادر)">
        <span class="project-summary-icon" aria-hidden="true"><i data-lucide="trending-up" class="icon"></i></span>
        <span class="project-summary-label">الربح الفعلي</span>
        <span class="project-summary-value">${formatMoney(actualProfit)}</span>
      </div>
    </div>`;

  document.getElementById("expectedProfitInput").addEventListener("change", (e) => {
    const project = get("projects", p.id);
    if (project) {
      project.expectedProfit = num(e.target.value);
      save("projects", project);
      renderProjectSummary(project);
    }
  });
}


/* ---------- General info ---------- */

function renderGeneral(p) {
  document.getElementById("generalFields").innerHTML = `
    <div class="detail-field">
      <span class="detail-field-label">${translate("project.fieldName")}</span>
      <span class="detail-field-value">${esc(p.name)}</span>
    </div>
    <div class="detail-field">
      <span class="detail-field-label">${translate("project.fieldType")}</span>
      <span class="detail-field-value">${local(TYPE_LABELS[p.type])}</span>
    </div>
    <div class="detail-field">
      <span class="detail-field-label">${translate("project.fieldArea")}</span>
      <span class="detail-field-value">${formatMoney(p.area)} m²</span>
    </div>
    <div class="detail-field">
      <span class="detail-field-label">${translate("project.fieldAdvance")}</span>
      <span class="detail-field-value">${formatMoney(p.advancePayment)}</span>
    </div>
    <div class="detail-field is-wide">
      <span class="detail-field-label">${translate("project.fieldProgress")} — ${Math.round(num(p.progress))}%</span>
      <div class="project-progress">
        <div class="project-progress-track"><span class="project-progress-bar" style="width:${Math.min(100, Math.max(0, Math.round(num(p.progress))))}%"></span></div>
      </div>
    </div>`;
}

/* ---------- Cost summary ---------- */

function renderCost(p) {
  const c = projectCosts(p);
  document.getElementById("costSummary").innerHTML = `
    <div class="cost-summary-row">
      <span>${translate("project.costMaterials")}</span>
      <span class="cost-summary-value">${formatMoney(c.material)}</span>
    </div>
    <div class="cost-summary-row">
      <span>${translate("project.costContractors")}</span>
      <span class="cost-summary-value">${formatMoney(c.contractors)}</span>
    </div>
    <div class="cost-summary-row">
      <span>${translate("project.costOther")}</span>
      <span class="cost-summary-value">${formatMoney(c.other)}</span>
    </div>
    <div class="cost-summary-row is-total">
      <span>${translate("project.costTotal")}</span>
      <span class="cost-summary-value">${formatMoney(c.total)}</span>
    </div>`;
}

/* ---------- Analytics ---------- */

function renderAnalytics(p) {
  const a = projectAnalytics(p);
  const perMaterial = materialAnalytics(p);
  const consumed = (p.materials || [])
    .slice()
    .reverse()
    .slice(0, 6)
    .map((m) => `<span class="badge badge-outline">${esc(m.name)} · ${formatMoney(m.quantity)} ${esc(m.unit || "")}</span>`)
    .join(" ");

  document.getElementById("analyticsGrid").innerHTML = `
    <div class="analytics-item">
      <div class="analytics-item-label">${translate("project.area")}</div>
      <div class="analytics-item-value">${formatMoney(a.area)} m²</div>
    </div>
    <div class="analytics-item">
      <div class="analytics-item-label">${translate("project.materialTotal")}</div>
      <div class="analytics-item-value">${formatMoney(a.materialTotal)}</div>
    </div>
    <div class="analytics-item">
      <div class="analytics-item-label">${translate("project.materialPerM2")}</div>
      <div class="analytics-item-value">${formatMoney(a.materialPerM2)}</div>
    </div>
    <div class="analytics-item">
      <div class="analytics-item-label">${translate("project.laborPerM2")}</div>
      <div class="analytics-item-value">${formatMoney(a.laborPerM2)}</div>
    </div>
    <div class="analytics-item">
      <div class="analytics-item-label">${translate("project.totalPerM2")}</div>
      <div class="analytics-item-value">${formatMoney(a.totalPerM2)}</div>
    </div>
    <div class="analytics-item is-wide">
      <div class="analytics-item-label">${translate("project.consumed")}</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">${consumed || `<span class="badge badge-outline">—</span>`}</div>
    </div>`;

  const rows = perMaterial.length
    ? perMaterial
        .map(
          (m) => `
        <tr>
          <td>${esc(m.name)}</td>
          <td>${formatMoney(m.quantity)} ${esc(m.unit || "")}</td>
          <td>${formatMoney(m.unitPrice)}</td>
          <td>${formatMoney(m.total)}</td>
          <td>${formatMoney(m.totalPerM2)}</td>
        </tr>`
        )
        .join("")
    : `<tr><td class="analytics-table-empty" colspan="5">${translate("project.noMaterials")}</td></tr>`;

  document.getElementById("analyticsTableBody").innerHTML = rows;
}

/* ---------- Contractors ---------- */

function renderContractors(p) {
  const list = document.getElementById("contractorsList");
  const rows = p.contractors || [];
  if (!rows.length) {
    list.innerHTML = `<p class="row-empty">${translate("project.noContractors")}</p>`;
    return;
  }
  list.innerHTML = rows
    .map((c) => {
      const b = contractorBalance(c);
      const direction = balanceDirection(b);
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(contractorLabel(c.role, c.name, lang()))}</div>
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
        </div>`;
    })
    .join("");
}

/* ---------- Materials ---------- */

function renderMaterials(p) {
  const list = document.getElementById("materialsList");
  const rows = p.materials || [];
  if (!rows.length) {
    list.innerHTML = `<p class="row-empty">${translate("project.noMaterials")}</p>`;
    return;
  }
  list.innerHTML = rows
    .slice()
    .reverse()
    .map((m) => `
      <div class="row-item">
        <div class="row-item-main">
          <div class="row-item-title">${esc(m.name)}</div>
          <div class="row-item-sub">${esc(m.supplierName || "—")}${m.contractorName ? ` · ${translate("project.formMatContractor")}: ${esc(m.contractorName)}` : ""} · ${esc(m.date || "")}</div>
        </div>
        <div class="row-item-stats">
          ${invoiceThumbnailHTML(m, "material")}
          <div class="row-stat">
            <span class="row-stat-label">${translate("project.qty")}</span>
            <span class="row-stat-value">${formatMoney(m.quantity)} ${esc(m.unit || "")}</span>
          </div>
          <div class="row-stat">
            <span class="row-stat-label">${translate("project.unitPrice")}</span>
            <span class="row-stat-value">${formatMoney(m.unitPrice)}</span>
          </div>
          <div class="row-stat">
            <span class="row-stat-label">${translate("project.total")}</span>
            <span class="row-stat-value">${formatMoney(m.total)}</span>
          </div>
        </div>
      </div>`)
    .join("");

  // Wire lightbox clicks on material invoice thumbnails
  list.querySelectorAll(".invoice-row-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const txnId = btn.dataset.invoiceId;
      const mat   = (p.materials || []).find((m) => m.id === txnId);
      if (mat && mat.invoiceData) openInvoiceLightbox({ data: mat.invoiceData, type: mat.invoiceType, name: mat.invoiceName });
    });
  });
  window.lucide?.createIcons();
}

/* ---------- Money ---------- */

function renderMoney(p) {
  const txns = sortNewestFirst(
    all("moneyTransactions").filter((t) => t.projectId === p.id)
  );
  // الدفعة الاولية تُحتسب ضمن الوارد
  const incoming = moneyIn(txns) + num(p.advancePayment);
  const outgoing = moneyOut(txns);
  document.getElementById("moneyIn").textContent = formatMoney(incoming);
  document.getElementById("moneyOut").textContent = formatMoney(outgoing);
  document.getElementById("moneyNet").textContent = formatMoney(incoming - outgoing);

  const list = document.getElementById("moneyList");
  if (!txns.length) {
    list.innerHTML = `<p class="row-empty">${translate("project.noMoney")}</p>`;
    return;
  }

  list.innerHTML = txns
    .map((t) => {
      const isIn = t.direction === "in";
      const typeLabel = personTypeLabel(t.personType, lang());
      const amount = (isIn ? "+" : "-") + formatMoney(t.amount);
      return `
        <div class="row-item">
          <div class="row-item-main">
            <div class="row-item-title">${esc(t.personName)}</div>
            <div class="row-item-sub">${esc(typeLabel)}${t.note ? " · " + esc(t.note) : ""}</div>
          </div>
          <div class="row-item-stats">
            ${invoiceThumbnailHTML(t, "money")}
            <div class="row-stat">
              <span class="row-stat-label">${esc(t.date || "")}</span>
              <span class="row-stat-value ${isIn ? "is-paid" : "is-remaining"}">${amount}</span>
            </div>
          </div>
        </div>`;
    })
    .join("");

  // Wire lightbox clicks
  list.querySelectorAll(".invoice-row-thumb").forEach((btn) => {
    btn.addEventListener("click", () => {
      const txnId  = btn.dataset.invoiceId;
      const txn    = all("moneyTransactions").find((t) => t.id === txnId);
      if (txn && txn.invoiceData) openInvoiceLightbox({ data: txn.invoiceData, type: txn.invoiceType, name: txn.invoiceName });
    });
  });
  window.lucide?.createIcons();
}

/* ---------- Full render ---------- */

function renderAll() {
  if (!current) return;
  const p = get("projects", current.id);
  if (!p) {
    window.location.href = "./projects.html";
    return;
  }
  current = p;
  renderHeader(p);
  renderProjectSummary(p);
  renderGeneral(p);
  renderCost(p);
  renderAnalytics(p);
  renderContractors(p);
  renderMaterials(p);
  renderMoney(p);
  renderPhasesList(p);
  renderPhaseLog(p);
}

/* ---------- Contractor modal ---------- */

function pickContractorRole(person) {
  const options = [...document.getElementById("conRole").options].map((o) => o.value);
  if (person.role && options.includes(person.role)) return person.role;
  if (Array.isArray(person.roles)) {
    for (const r of person.roles) {
      if (options.includes(r)) return r;
    }
  }
  return "other";
}

function fillContractorSelect() {
  const select = document.getElementById("conChoose");
  if (!select) return;
  const currentVal = select.value;
  const people = peopleWithRole("contractor");
  select.innerHTML =
    `<option value="">${translate("project.formConChooseNone")}</option>` +
    people
      .map((c) => {
        const label = contractorLabel(contractorSpecialty(c), c.name, lang());
        return `<option value="${c.id}">${esc(label)}</option>`;
      })
      .join("");
  select.value = currentVal;
}

function openContractorModal() {
  fillContractorSelect();
  showModal(document.getElementById("contractorModal"));
  document.getElementById("conName").focus();
  window.lucide?.createIcons();
}

function closeContractorModal() {
  hideModal(document.getElementById("contractorModal"));
  document.getElementById("contractorForm").reset();
}

function submitContractor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const chooseId = form.elements["choose"].value;
  const name = form.elements["name"].value.trim();
  if (!chooseId && !name) {
    form.elements["name"].focus();
    return;
  }
  let contractorId = null;
  let finalName = name;
  let finalRole = form.role.value;
  if (chooseId) {
    const ref = findPersonById(chooseId);
    if (ref) {
      contractorId = ref.person.id;
      finalName = ref.person.name;
      finalRole = pickContractorRole(ref.person);
    }
  }
  addContractorToProject(current.id, {
    name: finalName,
    role: finalRole,
    total: form.total.value,
    paid: form.paid.value,
    contractorId,
  });
  closeContractorModal();
  renderAll();
  toast(translate("common.saved"));
}

/* ---------- Material modal ---------- */

function fillMaterialSuppliers() {
  const select = document.getElementById("matSupplier");
  const currentVal = select.value;
  const people = peopleWithRole("supplier");
  select.innerHTML =
    `<option value="">${translate("project.formMatSupplierNone")}</option>` +
    people
      .map((s) => {
        const roles = personRolesLabel(s, lang());
        const label = roles ? `${esc(s.name)} — ${roles}` : esc(s.name);
        return `<option value="${s.id}">${label}</option>`;
      })
      .join("");
  select.value = currentVal;
}

function fillMaterialContractors() {
  const select = document.getElementById("matContractor");
  if (!select) return;
  const currentVal = select.value;
  const people = peopleWithRole("contractor");
  select.innerHTML =
    `<option value="">${translate("project.formMatContractorNone")}</option>` +
    people
      .map((c) => {
        const label = contractorLabel(contractorSpecialty(c), c.name, lang());
        return `<option value="${c.id}">${esc(label)}</option>`;
      })
      .join("");
  select.value = currentVal;
}

function fillMaterialSuggestions() {
  const datalist = document.getElementById("matSuggestions");
  const names = [...new Set(all("materials").map((m) => m.name))].concat(
    (current.materials || []).map((m) => m.name)
  );
  datalist.innerHTML = [...new Set(names)]
    .map((n) => `<option value="${esc(n)}"></option>`)
    .join("");
}

function applySupplierSupplies(supplierId) {
  if (!supplierId) return;
  const ref = findPersonById(supplierId);
  const supplies = ref && Array.isArray(ref.person.supplies) ? ref.person.supplies : [];
  if (supplies.length) document.getElementById("matName").value = supplies[0];
}

function openMaterialModal() {
  fillMaterialSuppliers();
  fillMaterialContractors();
  fillMaterialSuggestions();
  const dateInput = document.getElementById("matDate");
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  showModal(document.getElementById("materialModal"));
  document.getElementById("matName").focus();
  window.lucide?.createIcons();
}

function closeMaterialModal() {
  hideModal(document.getElementById("materialModal"));
  document.getElementById("materialForm").reset();
}

function submitMaterial(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements["name"].value.trim();
  if (!name) {
    form.elements["name"].focus();
    return;
  }
  addMaterialToProject(current.id, {
    name,
    supplierId: form.supplierId.value || null,
    contractorId: form.contractorId.value || null,
    quantity: form.quantity.value,
    unit: form.unit.value,
    unitPrice: form.unitPrice.value,
    date: form.date.value,
  });

  // Task 08: Link material cost to active phases
  const activePhases = getActivePhases(current.id);
  const totalAmount = Number(form.quantity.value) * Number(form.unitPrice.value);
  for (const ph of activePhases) {
    addFinanceToPhaseLog(current.id, {
      transactionId: "mat_" + Date.now(),
      phaseId: ph.id,
      subPhaseId: ph.activeSubPhaseId || null,
      direction: "out",
      amount: totalAmount,
      note: `${name} (${form.quantity.value} ${form.unit.value})`,
    });
  }

  closeMaterialModal();
  renderAll();
  toast(translate("common.saved"));
}

/* ---------- Client Payment modal ---------- */

function openClientPaymentModal() {
  const dateInput = document.getElementById("clientPaymentDate");
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
  showModal(document.getElementById("clientPaymentModal"));
  document.getElementById("clientPaymentAmount").focus();
  window.lucide?.createIcons();
}

function closeClientPaymentModal() {
  hideModal(document.getElementById("clientPaymentModal"));
  document.getElementById("clientPaymentForm").reset();
}

function submitClientPayment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = num(form.amount.value);
  const date = form.date.value;
  const note = form.note.value.trim();

  if (!amount || amount <= 0) {
    form.amount.focus();
    return;
  }

  // Find or create a client for this project
  // For now, we'll use a generic "Client" entry
  // In the future, we could link to a specific client
  recordMoney({
    direction: "in",
    personType: "client",
    personId: null,
    personName: current.name + " - Client",
    amount,
    projectId: current.id,
    note: note || `Payment received on ${date}`,
  });

  // Update the date of the transaction
  const txns = all("moneyTransactions");
  const lastTxn = txns[txns.length - 1];
  if (lastTxn) {
    lastTxn.date = date;
    save("moneyTransactions", lastTxn);
  }

  // Task 08: Link client payment to active phases
  const activePhases = getActivePhases(current.id);
  for (const ph of activePhases) {
    addFinanceToPhaseLog(current.id, {
      transactionId: lastTxn ? lastTxn.id : "txn_" + Date.now(),
      phaseId: ph.id,
      subPhaseId: ph.activeSubPhaseId || null,
      direction: "in",
      amount,
      note: note || `Payment received on ${date}`,
    });
  }

  closeClientPaymentModal();
  renderAll();
  toast(translate("common.saved"));
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
  current = get("projects", projectIdFromUrl());
  if (!current) {
    window.location.href = "./projects.html";
    return;
  }
  renderAll();

  document.getElementById("addContractorBtn").addEventListener("click", openContractorModal);
  document.getElementById("contractorModalClose").addEventListener("click", closeContractorModal);
  document.getElementById("contractorFormCancel").addEventListener("click", closeContractorModal);
  document.getElementById("contractorModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeContractorModal();
  });
  document.getElementById("contractorForm").addEventListener("submit", submitContractor);

  document.getElementById("conChoose").addEventListener("change", (e) => {
    const id = e.target.value;
    if (!id) return;
    const ref = findPersonById(id);
    if (!ref) return;
    document.getElementById("conName").value = ref.person.name;
    document.getElementById("conRole").value = pickContractorRole(ref.person);
  });

  document.getElementById("conAddBtn").addEventListener("click", () => {
    openQuickAddPerson({
      title: translate("quickAdd.addPerson"),
      initialType: "contractor",
      onCreated: (person) => {
        fillContractorSelect();
        document.getElementById("conChoose").value = person.id;
        document.getElementById("conName").value = person.name;
        document.getElementById("conRole").value = pickContractorRole(person);
        toast(translate("common.saved"));
      },
    });
  });

  document.getElementById("addMaterialBtn").addEventListener("click", openMaterialModal);
  document.getElementById("materialModalClose").addEventListener("click", closeMaterialModal);
  document.getElementById("materialFormCancel").addEventListener("click", closeMaterialModal);
  document.getElementById("materialModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeMaterialModal();
  });
  document.getElementById("materialForm").addEventListener("submit", submitMaterial);

  document.getElementById("matSupplier").addEventListener("change", (e) => {
    applySupplierSupplies(e.target.value);
  });

  document.getElementById("addClientPaymentBtn").addEventListener("click", openClientPaymentModal);
  document.getElementById("clientPaymentModalClose").addEventListener("click", closeClientPaymentModal);
  document.getElementById("clientPaymentFormCancel").addEventListener("click", closeClientPaymentModal);
  document.getElementById("clientPaymentModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeClientPaymentModal();
  });
  document.getElementById("clientPaymentForm").addEventListener("submit", submitClientPayment);

  // Phase modals
  document.getElementById("addPhaseBtn").addEventListener("click", openAddPhaseModal);
  document.getElementById("addPhaseModalClose").addEventListener("click", closeAddPhaseModal);
  document.getElementById("addPhaseCancel").addEventListener("click", closeAddPhaseModal);
  document.getElementById("addPhaseModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeAddPhaseModal();
  });
  document.getElementById("addCustomSubBtn").addEventListener("click", addCustomSubRow);
  document.getElementById("addPhaseForm").addEventListener("submit", submitAddPhase);

  document.getElementById("phaseCompleteClose").addEventListener("click", closeCompletePhaseModal);
  document.getElementById("phaseCompleteCancel").addEventListener("click", closeCompletePhaseModal);
  document.getElementById("phaseCompleteConfirm").addEventListener("click", confirmCompletePhase);

  document.getElementById("matAddSupplierBtn").addEventListener("click", () => {
    openQuickAddSupplier({
      onCreated: (person) => {
        fillMaterialSuppliers();
        if (person.roles.includes("supplier")) {
          document.getElementById("matSupplier").value = person.id;
          toast(translate("common.saved"));
        } else {
          const type = personTypeLabel(person.roles[0], lang());
          toast(translate("quickAdd.notSupplierMessage").replace("{type}", type), "info");
        }
      },
    });
  });

  window.addEventListener("spark:data-changed", renderAll);
});
