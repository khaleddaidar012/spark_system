/* ============================================
   Spark ERP — Project Detail Page Script
   Loads a project by id, renders general info,
   cost summary, analytics, contractors and
   materials. All totals are auto-calculated.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, all, get, save, peopleWithRole, findPersonById } from "../modules/store.js";
import { projectCosts, projectAnalytics, materialAnalytics, formatMoney, TYPE_LABELS, STATUS_LABELS, num, contractorBalance } from "../modules/calc.js";
import { addContractorToProject, addMaterialToProject } from "../modules/actions.js";
import { openQuickAddSupplier, openQuickAddPerson } from "../modules/quick-add-person.js";
import { personRolesLabel, personTypeLabel, contractorLabel, contractorSpecialty } from "../modules/person-roles.js";
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

let current = null;

/* ---------- URL ---------- */

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
              <span class="row-stat-label">${translate("project.remaining")}</span>
              <span class="row-stat-value is-remaining">${formatMoney(b.remaining)}</span>
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
  renderGeneral(p);
  renderCost(p);
  renderAnalytics(p);
  renderContractors(p);
  renderMaterials(p);
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
  closeMaterialModal();
  renderAll();
  toast(translate("common.saved"));
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
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

  document.getElementById("matSupplier").addEventListener("change", (e) => {
    applySupplierSupplies(e.target.value);
  });
});
