/* ============================================
   Spark ERP — Reusable Quick Add component
   Opens a small modal (bottom sheet on mobile)
   to create a person (supplier / contractor /
   client / other) without leaving the current
   page. The person's type is chosen explicitly
   and stored as a roles[] array so the same
   person can later hold multiple roles.
   ============================================ */

import { save, uid } from "./store.js";
import { showModal, hideModal } from "./modal.js";
import { translate } from "./i18n.js";
import { CONTRACTOR_SPECIALTIES } from "./person-roles.js";

const MODAL_ID = "quickAddPersonModal";
const TITLE_ID = "qaPersonTitle";
const FORM_ID = "qaPersonForm";
const CLOSE_ID = "qaPersonClose";
const CANCEL_ID = "qaPersonCancel";

const COLLECTION_BY_TYPE = {
  supplier: "suppliers",
  contractor: "contractors",
  client: "clients",
  other: "others",
};

const TYPES = ["supplier", "contractor", "client", "other"];

let loaded = false;
let config = null;
let currentType = "supplier";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fieldHTML(f) {
  const required = f.required ? " required" : "";
  const star = f.required ? ` <span class="required-star" aria-hidden="true">*</span>` : "";
  if (f.type === "textarea") {
    return `
      <div class="form-field">
        <label class="form-label" for="${f.id}">${f.label}${star}</label>
        <textarea class="form-textarea" id="${f.id}" rows="2"${required} placeholder="${f.placeholder || ""}"></textarea>
      </div>`;
  }
  if (f.type === "select") {
    const options = (f.options || [])
      .map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`)
      .join("");
    return `
      <div class="form-field">
        <label class="form-label" for="${f.id}">${f.label}${star}</label>
        <select class="form-select" id="${f.id}"${required}>${options}</select>
      </div>`;
  }
  return `
    <div class="form-field">
      <label class="form-label" for="${f.id}">${f.label}${star}</label>
      <input class="form-input" id="${f.id}" type="text"${required} placeholder="${f.placeholder || ""}" />
    </div>`;
}

function extraFields() {
  if (currentType === "supplier" || currentType === "client") {
    return [
      { name: "address", label: translate("quickAdd.address"), placeholder: translate("quickAdd.addressPh"), id: "qaPersonAddress" },
      { name: "supplies", label: translate("quickAdd.supplies"), placeholder: translate("quickAdd.suppliesPh"), id: "qaPersonSupplies" },
      { name: "notes", label: translate("suppliers.formNotes"), type: "textarea", placeholder: "—", id: "qaPersonNotes" },
    ];
  }
  if (currentType === "contractor") {
    return [
      {
        name: "role",
        label: translate("quickAdd.contractorSpecialty"),
        type: "select",
        id: "qaPersonRole",
        options: CONTRACTOR_SPECIALTIES.map((s) => ({
          value: s.value,
          label: document.documentElement.lang === "ar" ? s.ar : s.en,
        })),
      },
    ];
  }
  return [];
}

function renderExtra() {
  document.getElementById("qaPersonExtra").innerHTML = extraFields()
    .map(fieldHTML)
    .join("");
}

function renderPersonType() {
  document.getElementById("qaPersonType").innerHTML = TYPES.map((t) => {
    const text =
      t === "supplier"
        ? translate("quickAdd.typeSupplier")
        : t === "contractor"
        ? translate("quickAdd.typeContractor")
        : t === "client"
        ? translate("quickAdd.typeClient")
        : translate("quickAdd.typeOther");
    return `<button class="chip${currentType === t ? " is-active" : ""}" type="button" data-type="${t}">${text}</button>`;
  }).join("");
}

function ensureLoaded() {
  if (loaded) return;
  const host = document.createElement("div");
  host.innerHTML = `
    <div class="modal-overlay is-sheet" id="${MODAL_ID}" hidden>
      <div class="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="${TITLE_ID}">
        <div class="modal-header">
          <h2 class="modal-title" id="${TITLE_ID}"></h2>
          <button class="btn btn-icon modal-close" id="${CLOSE_ID}" type="button" aria-label="Close">
            <i data-lucide="x" class="icon"></i>
          </button>
        </div>
        <form id="${FORM_ID}" class="modal-body form-stack" novalidate></form>
      </div>
    </div>`;
  document.body.appendChild(host.firstElementChild);

  const modal = document.getElementById(MODAL_ID);
  document.getElementById(CLOSE_ID).addEventListener("click", close);
  document.getElementById(FORM_ID).addEventListener("submit", submit);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  loaded = true;
}

function close() {
  hideModal(document.getElementById(MODAL_ID));
  document.getElementById(FORM_ID).innerHTML = "";
  config = null;
}

function submit(e) {
  e.preventDefault();
  if (!config) return;

  const nameEl = document.getElementById("qaPersonName");
  const name = nameEl.value.trim();
  if (!name) {
    nameEl.focus();
    return;
  }
  const phone = document.getElementById("qaPersonPhone").value.trim();

  const item = {
    id: uid(),
    name,
    phone,
    roles: [currentType],
    ...(config.defaults || {}),
  };

  for (const f of extraFields()) {
    item[f.name] = document.getElementById(f.id).value.trim();
  }

  if (item.supplies != null) {
    item.supplies = String(item.supplies)
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  save(COLLECTION_BY_TYPE[currentType], item);
  config.onCreated?.(item);
  close();
}

export function openQuickAddPerson({ title, defaults, onCreated, initialType = "supplier" }) {
  ensureLoaded();
  currentType = TYPES.includes(initialType) ? initialType : "supplier";
  config = { defaults, onCreated };

  document.getElementById(TITLE_ID).textContent = title;
  document.getElementById(FORM_ID).innerHTML = `
    <div class="form-field">
      <label class="form-label" for="qaPersonName">${translate("suppliers.formName")}<span class="required-star" aria-hidden="true">*</span></label>
      <input class="form-input" id="qaPersonName" type="text" required placeholder="${translate("suppliers.formNamePh")}" />
    </div>
    <div class="form-field">
      <label class="form-label" for="qaPersonPhone">${translate("suppliers.formPhone")}</label>
      <input class="form-input" id="qaPersonPhone" type="text" placeholder="${translate("suppliers.formPhonePh")}" />
    </div>
    <div class="form-field">
      <span class="form-label">${translate("quickAdd.personType")}<span class="required-star" aria-hidden="true">*</span></span>
      <div class="chip-row" id="qaPersonType" role="group" aria-label="${translate("quickAdd.personType")}"></div>
    </div>
    <div id="qaPersonExtra"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="${CANCEL_ID}" type="button">${translate("projects.cancel")}</button>
      <button class="btn btn-primary" type="submit">${translate("projects.save")}</button>
    </div>`;

  renderPersonType();
  renderExtra();

  document.getElementById("qaPersonType").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    currentType = chip.dataset.type;
    renderPersonType();
    renderExtra();
  });

  document.getElementById(CANCEL_ID).addEventListener("click", close);
  showModal(document.getElementById(MODAL_ID));
  window.lucide?.createIcons();
  document.getElementById("qaPersonName").focus();
}

export function openQuickAddSupplier({ onCreated }) {
  openQuickAddPerson({
    title: translate("quickAdd.addPerson"),
    defaults: { purchases: 0, paid: 0 },
    initialType: "supplier",
    onCreated,
  });
}
