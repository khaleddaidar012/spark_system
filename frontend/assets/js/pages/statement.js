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

function contractorOptions(selectedId) {
  return (
    `<option value="">—</option>` +
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
        <select class="form-input statement-row-contractor" data-field="contractorId">${contractorOptions(m.contractorId)}</select>
      </td>
      <td>
        <input class="form-input statement-row-workmanship" data-field="workmanship" type="number" min="0" step="0.01" value="${workmanship || ""}" placeholder="0" />
      </td>
      <td class="is-center">
        <input class="statement-row-client" data-field="clientBought" type="checkbox"${m.clientBought ? " checked" : ""} />
      </td>
      <td class="is-center">
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
  tr.innerHTML = rowHTML({ id: "", name: "", quantity: "", unit: "", unitPrice: "", total: 0, contractorId: null, workmanship: 0, clientBought: false });
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
    rows.push({
      id: tr.dataset.materialId || "",
      name: (tr.querySelector('[data-field="name"]')?.value || "").trim(),
      quantity,
      unit: (tr.querySelector('[data-field="unit"]')?.value || "").trim(),
      unitPrice,
      total: quantity * unitPrice,
      contractorId: tr.querySelector('[data-field="contractorId"]')?.value || null,
      workmanship: num(tr.querySelector('[data-field="workmanship"]')?.value),
      clientBought: !!tr.querySelector('[data-field="clientBought"]')?.checked,
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
        contractorId: r.contractorId,
        contractorName: contractorName(r.contractorId),
        workmanship: r.workmanship,
        clientBought: r.clientBought,
      });
    } else if (r.name) {
      materials.push({
        id: assignIds ? uid() : "",
        name: r.name,
        supplierId: null,
        supplierName: "",
        contractorId: r.contractorId,
        contractorName: contractorName(r.contractorId),
        quantity: r.quantity,
        unit: r.unit,
        unitPrice: r.unitPrice,
        total: r.total,
        workmanship: r.workmanship,
        clientBought: r.clientBought,
        date: today(),
      });
    }
  }
  return materials;
}

function applyStatementData() {
  const rows = collectRows();
  const percent = collectSupervision();
  const data = statementData({ materials: buildMaterials(rows), supervisionPercent: percent });
  document.getElementById("statementMaterialTotal").textContent = formatMoney(data.materialTotal);
  document.getElementById("statementWorkmanshipTotal").textContent = formatMoney(data.workmanshipTotal);
  document.getElementById("statementSupervisionAmount").textContent = formatMoney(data.supervision);
  document.getElementById("statementGrandTotal").textContent = formatMoney(data.grandTotal);
}

function saveStatement() {
  const project = get("projects", current.id);
  if (!project) return;
  project.materials = buildMaterials(collectRows(), true);
  project.supervisionPercent = collectSupervision();
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
  document.getElementById("statementSupervision").value = num(p.supervisionPercent) || "";
  applyStatementData();
}

document.addEventListener("DOMContentLoaded", async () => {
  initStore();
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
    const remove = e.target.closest("[data-remove]");
    if (remove) removeMaterialRow(remove.closest("tr"));
  });
  document.getElementById("statementSupervision").addEventListener("input", applyStatementData);
});
