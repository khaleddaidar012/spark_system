/* ============================================
   Spark ERP — Project Statement of Account
   Standalone print document. Lists every project
   material with cost, lets the owner attach a
   contractor + workmanship per material, mark
   materials as client-purchased, set the company
   supervision percentage, and print as A4 PDF.
   ============================================ */

import { initStore, get, save, peopleWithRole } from "../modules/store.js";
import { statementData, formatMoney, num, TYPE_LABELS } from "../modules/calc.js";
import { translate, initI18n } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";

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
    </div>
    <div class="statement-meta-item">
      <span class="statement-meta-label">${translate("statement.materials")}</span>
      <span class="statement-meta-value">${esc(local(TYPE_LABELS[p.type]))}</span>
    </div>`;
}

function renderMaterials(p) {
  const tbody = document.querySelector("#statementMaterials tbody");
  const empty = document.getElementById("statementEmpty");
  const rows = p.materials || [];

  empty.hidden = rows.length > 0;
  tbody.innerHTML = rows
    .map((m, i) => {
      const contractorOptions =
        `<option value="">—</option>` +
        peopleWithRole("contractor")
          .map(
            (c) =>
              `<option value="${esc(c.id)}"${m.contractorId === c.id ? " selected" : ""}>${esc(c.name)}</option>`
          )
          .join("");
      return `
        <tr data-index="${i}" data-material-id="${esc(m.id)}">
          <td class="statement-cell-name">${esc(m.name)}</td>
          <td>${formatMoney(m.quantity)} ${esc(m.unit || "")}</td>
          <td>${formatMoney(m.total)}</td>
          <td>
            <select class="form-input statement-row-contractor" data-field="contractorId">
              ${contractorOptions}
            </select>
          </td>
          <td>
            <input class="form-input statement-row-workmanship" data-field="workmanship" type="number" min="0" step="0.01" value="${num(m.workmanship) || ""}" placeholder="0" />
          </td>
          <td class="is-center">
            <input class="statement-row-client" data-field="clientBought" type="checkbox"${m.clientBought ? " checked" : ""} />
          </td>
        </tr>`;
    })
    .join("");
}

function collectRows() {
  const rows = [];
  document.querySelectorAll("#statementMaterials tbody tr").forEach((tr) => {
    rows.push({
      id: tr.dataset.materialId,
      contractorId: tr.querySelector('[data-field="contractorId"]').value || null,
      workmanship: num(tr.querySelector('[data-field="workmanship"]').value),
      clientBought: tr.querySelector('[data-field="clientBought"]').checked,
    });
  });
  return rows;
}

function collectSupervision() {
  return num(document.getElementById("statementSupervision").value);
}

function applyStatementData() {
  const rows = collectRows();
  const percent = collectSupervision();
  const project = get("projects", current.id);
  if (!project) return;
  const patches = new Map(rows.filter((r) => r.id).map((r) => [r.id, r]));
  project.materials = (project.materials || []).map((m) => {
    const patch = patches.get(m.id);
    return patch
      ? {
          ...m,
          contractorId: patch.contractorId,
          workmanship: patch.workmanship,
          clientBought: patch.clientBought,
        }
      : m;
  });
  project.supervisionPercent = percent;
  const data = statementData(project);
  document.getElementById("statementMaterialTotal").textContent = formatMoney(data.materialTotal);
  document.getElementById("statementWorkmanshipTotal").textContent = formatMoney(data.workmanshipTotal);
  document.getElementById("statementGrandTotal").textContent = formatMoney(data.grandTotal);
}

function saveStatement() {
  const project = get("projects", current.id);
  if (!project) return;
  const rows = collectRows();
  const patches = new Map(rows.filter((r) => r.id).map((r) => [r.id, r]));
  project.materials = (project.materials || []).map((m) => {
    const patch = patches.get(m.id);
    return patch
      ? {
          ...m,
          contractorId: patch.contractorId,
          workmanship: patch.workmanship,
          clientBought: patch.clientBought,
        }
      : m;
  });
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
  document.querySelector("#statementMaterials tbody").addEventListener("input", applyStatementData);
  document.querySelector("#statementMaterials tbody").addEventListener("change", applyStatementData);
  document.getElementById("statementSupervision").addEventListener("input", applyStatementData);
});
