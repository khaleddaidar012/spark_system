/* ============================================
   Spark ERP — Project Statement of Account
   Standalone print document. Lists every project
   material with cost, lets the owner attach a
   contractor + workmanship per material, mark
   materials as client-purchased, set the company
   supervision percentage, and print as A4 PDF.
   ============================================ */

import { initStore, get, save, uid, today, peopleWithRole } from "../modules/store.js";
import { statementData, formatMoney, num } from "../modules/calc.js";
import { translate, initI18n } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { requireAuth } from "../modules/auth.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function projectIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

let current = null;

function renderMeta(p) {
  document.getElementById("statementMeta").innerHTML = `
    <div class="statement-meta-item">
      <span class="statement-meta-label">${translate("statement.project")}</span>
      <span class="statement-meta-value">${esc(p.name)}</span>
    </div>
    <div class="statement-meta-item">
      <span class="statement-meta-label">${translate("statement.area")}</span>
      <span class="statement-meta-value">${formatMoney(p.area)} m²</span>
    </div>
    <div class="statement-meta-item">
      <span class="statement-meta-label">${translate("statement.date")}</span>
      <span class="statement-meta-value">${esc(p.createdAt || new Date().toISOString().slice(0, 10))}</span>
    </div>`;
}

function contractorName(id) {
  if (!id) return "";
  const c = peopleWithRole("contractor").find((x) => x.id === id);
  return c ? c.name : "";
}

function roleLabel(role) {
  const key = "project.role" + String(role || "other").charAt(0).toUpperCase() + String(role || "other").slice(1);
  const label = translate(key);
  return label && label !== key ? label : String(role || "");
}

function contractorOptions(selectedId) {
  return (
    `<option value="">اختيار...</option>` +
    peopleWithRole("contractor")
      .map(
        (c) =>
          `<option value="${esc(c.id)}"${selectedId === c.id ? " selected" : ""}>${esc(c.name)}</option>`
      )
      .join("")
  );
}

function rowHTML(m) {
  const workmanship = num(m.workmanship);
  return `
    <tr data-material-id="${esc(m.id || "")}"${m.clientBought ? ' class="is-client-bought"' : ""}>
      <td>
        <input class="form-input statement-row-name" data-field="name" type="text" value="${esc(m.name || "")}" placeholder="—" />
      </td>
      <td>
        <div class="statement-qty-cell">
          <input class="form-input statement-row-qty" data-field="quantity" type="number" min="0" step="0.001" value="${num(m.quantity) || ""}" />
          <input class="form-input statement-row-unit" data-field="unit" type="text" value="${esc(m.unit || "")}" placeholder="unit" />
        </div>
      </td>
      <td>
        <div class="statement-cost-cell">
          <input class="form-input statement-row-price" data-field="unitPrice" type="number" min="0" step="0.01" value="${num(m.unitPrice) || ""}" />
          <span class="statement-row-total">${formatMoney(m.total)}</span>
        </div>
      </td>
      <td>
        <div class="statement-workmanships">
          <div class="workmanships-list">
            ${(m.workmanships || []).map(w => `
              <div class="workmanship-row" style="display:flex; gap:4px; margin-bottom:4px;">
                <select class="form-input" data-field="contractorId">${contractorOptions(w.contractorId)}</select>
                <input class="form-input" data-field="amount" type="number" min="0" step="0.01" value="${num(w.amount) || ""}" placeholder="0" style="width:80px;" />
                <button class="btn btn-ghost btn-icon no-print" type="button" data-remove-workmanship title="${translate("statement.remove")}">
                  <i data-lucide="x" class="icon"></i>
                </button>
              </div>
            `).join("")}
          </div>
          <button class="btn btn-outline btn-sm no-print" type="button" data-add-workmanship style="margin-top:4px;">
            <i data-lucide="plus" class="icon"></i>
            <span data-i18n="project.addContractor">إضافة مقاول</span>
          </button>
        </div>
      </td>
      <td class="is-center">
        <input class="statement-row-client" data-field="clientBought" type="checkbox"${m.clientBought ? " checked" : ""} />
      </td>
      <td class="is-center no-print">
        <button class="btn btn-ghost btn-icon statement-row-remove no-print" type="button" data-remove title="${translate("statement.remove")}">
          <i data-lucide="trash-2" class="icon"></i>
        </button>
      </td>
    </tr>`;
}

function renderMaterials(p) {
  const tbody = document.querySelector("#statementMaterials tbody");
  const empty = document.getElementById("statementEmpty");
  const rows = p.materials || [];

  empty.hidden = rows.length > 0;
  tbody.innerHTML = rows.map((m) => rowHTML(m)).join("");
}

function addMaterialRow() {
  const tbody = document.querySelector("#statementMaterials tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = rowHTML({ id: "", name: "", quantity: "", unit: "", unitPrice: "", total: 0, clientBought: false, workmanships: [] });
  tbody.appendChild(tr);
  document.getElementById("statementEmpty").hidden = true;
  window.lucide?.createIcons();
  tr.querySelector('[data-field="name"]').focus();
  applyStatementData();
}

function removeMaterialRow(tr) {
  tr.remove();
  document.getElementById("statementEmpty").hidden =
    document.querySelectorAll("#statementMaterials tbody tr").length > 0;
  window.lucide?.createIcons();
  applyStatementData();
}

function collectRows() {
  const rows = [];
  document.querySelectorAll("#statementMaterials tbody tr").forEach((tr) => {
    const quantity = num(tr.querySelector('[data-field="quantity"]')?.value);
    const unitPrice = num(tr.querySelector('[data-field="unitPrice"]')?.value);
    const workmanships = [];
    tr.querySelectorAll('.workmanship-row').forEach(wRow => {
      const contractorId = wRow.querySelector('[data-field="contractorId"]')?.value;
      const amount = num(wRow.querySelector('[data-field="amount"]')?.value);
      if (contractorId || amount > 0) {
        workmanships.push({ contractorId, amount });
      }
    });

    rows.push({
      id: tr.dataset.materialId || "",
      name: (tr.querySelector('[data-field="name"]')?.value || "").trim(),
      quantity,
      unit: (tr.querySelector('[data-field="unit"]')?.value || "").trim(),
      unitPrice,
      total: quantity * unitPrice,
      clientBought: !!tr.querySelector('[data-field="clientBought"]')?.checked,
      workmanships,
    });
    const totalEl = tr.querySelector(".statement-row-total");
    if (totalEl) totalEl.textContent = formatMoney(quantity * unitPrice);
  });
  return rows;
}

function collectSupervision() {
  return num(document.getElementById("statementSupervision").value);
}

function buildMaterials(rows, assignIds = false) {
  const project = get("projects", current.id);
  const existing = project ? project.materials || [] : [];
  const materials = [];
  for (const r of rows) {
    if (r.id) {
      const m = existing.find((x) => x.id === r.id);
      if (!m) continue;
      materials.push({
        ...m,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        unitPrice: r.unitPrice,
        total: r.total,
        clientBought: r.clientBought,
        workmanships: r.workmanships,
      });
    } else if (r.name) {
      materials.push({
        id: assignIds ? uid() : "",
        name: r.name,
        supplierId: null,
        supplierName: "",
        quantity: r.quantity,
        unit: r.unit,
        unitPrice: r.unitPrice,
        total: r.total,
        clientBought: r.clientBought,
        workmanships: r.workmanships,
        date: today(),
      });
    }
  }
  return materials;
}

function applyStatementData() {
  const rows = collectRows();
  const data = statementData({ materials: buildMaterials(rows), supervisionAmount: collectSupervision() });
  document.getElementById("statementMaterialTotal").textContent = formatMoney(data.materialTotal);
  document.getElementById("statementWorkmanshipTotal").textContent = formatMoney(data.workmanshipTotal);
  document.getElementById("statementGrandTotal").textContent = formatMoney(data.grandTotal);
  renderWorkmanshipLines(data.materials);

  document.querySelectorAll("#statementMaterials select").forEach(sel => {
    if (!sel.value) sel.classList.add("is-empty");
    else sel.classList.remove("is-empty");
  });
}

function renderWorkmanshipLines(materials) {
  const host = document.getElementById("statementContractorLines");
  if (!host) return;
  const byContractor = new Map();
  for (const m of materials) {
    for (const w of m.workmanships || []) {
      const id = w.contractorId;
      if (!id || !num(w.amount)) continue;
      const c = peopleWithRole("contractor").find((x) => x.id === id);
      const entry =
        byContractor.get(id) ||
        { role: c ? c.role : "other", name: c ? c.name : "", total: 0 };
      entry.total += num(w.amount);
      byContractor.set(id, entry);
    }
  }
  const lines = Array.from(byContractor.values()).filter((e) => e.total > 0);
  host.innerHTML = lines.length
    ? lines
        .map(
          (e) => `
      <div class="statement-contractor-line">
        <span>${translate("statement.against")} ${roleLabel(e.role)} (${esc(e.name)})</span>
        <span>${formatMoney(e.total)}</span>
      </div>`
        )
        .join("")
    : `<p class="statement-empty">${translate("statement.noContractorWork")}</p>`;
}



function saveStatement() {
  const project = get("projects", current.id);
  if (!project) return;
  project.materials = buildMaterials(collectRows(), true);
  project.supervisionAmount = collectSupervision();
  delete project.supervisionPercent;
  save("projects", project);
  toast(translate("common.saved"));
}

function render() {
  if (!current) return;
  const p = get("projects", current.id);
  if (!p) {
    window.location.href = "./projects.html";
    return;
  }
  current = p;
  renderMeta(p);
  renderMaterials(p);
  document.getElementById("statementSupervision").value =
    num(p.supervisionAmount ?? p.supervisionPercent) || "";
  applyStatementData();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!requireAuth()) return;
  await initStore();
  await initI18n();

  current = get("projects", projectIdFromUrl());
  if (!current) {
    window.location.href = "./projects.html";
    return;
  }

  render();
  window.lucide?.createIcons();

  document.getElementById("statementSave").addEventListener("click", saveStatement);
  document.getElementById("statementPrint").addEventListener("click", () => window.print());
  document.getElementById("statementAddMaterial").addEventListener("click", addMaterialRow);
  document.querySelector("#statementMaterials tbody").addEventListener("input", applyStatementData);
  document.querySelector("#statementMaterials tbody").addEventListener("change", (e) => {
    if (e.target.matches('[data-field="clientBought"]')) {
      e.target.closest("tr").classList.toggle("is-client-bought", e.target.checked);
    }
    applyStatementData();
  });
  document.querySelector("#statementMaterials tbody").addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      removeMaterialRow(removeBtn.closest("tr"));
      return;
    }
    
    const addWorkmanshipBtn = e.target.closest("[data-add-workmanship]");
    if (addWorkmanshipBtn) {
      const list = addWorkmanshipBtn.previousElementSibling;
      const row = document.createElement("div");
      row.className = "workmanship-row";
      row.style.cssText = "display:flex; gap:4px; margin-bottom:4px;";
      row.innerHTML = `
        <select class="form-input" data-field="contractorId">${contractorOptions("")}</select>
        <input class="form-input" data-field="amount" type="number" min="0" step="0.01" value="" placeholder="0" style="width:80px;" />
        <button class="btn btn-ghost btn-icon no-print" type="button" data-remove-workmanship title="${translate("statement.remove")}">
          <i data-lucide="x" class="icon"></i>
        </button>
      `;
      list.appendChild(row);
      window.lucide?.createIcons();
      applyStatementData();
      return;
    }

    const removeWorkmanshipBtn = e.target.closest("[data-remove-workmanship]");
    if (removeWorkmanshipBtn) {
      removeWorkmanshipBtn.closest(".workmanship-row").remove();
      applyStatementData();
      return;
    }
  });
  document.getElementById("statementSupervision").addEventListener("input", applyStatementData);
});
