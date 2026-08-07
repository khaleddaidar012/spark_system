/* ============================================
   Spark ERP — Reusable Quick Add component
   Opens a small modal (bottom sheet on mobile)
   to create a person (supplier / client /
   contractor) without leaving the current page.
   Generic, config-driven — extend for other
   collections (material, project, ...).
   ============================================ */

import { save, uid } from "./store.js";
import { showModal, hideModal } from "./modal.js";
import { translate } from "./i18n.js";
import { toast } from "./toast.js";

const MODAL_ID = "quickAddPersonModal";
const TITLE_ID = "qaPersonTitle";
const FORM_ID = "qaPersonForm";
const CLOSE_ID = "qaPersonClose";
const CANCEL_ID = "qaPersonCancel";

let loaded = false;
let config = null;

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
  return `
    <div class="form-field">
      <label class="form-label" for="${f.id}">${f.label}${star}</label>
      <input class="form-input" id="${f.id}" type="text"${required} placeholder="${f.placeholder || ""}" />
    </div>`;
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
  const data = {};
  let firstInvalid = null;
  for (const f of config.fields) {
    const el = document.getElementById(f.id);
    const value = el.value.trim();
    if (f.required && !value) {
      firstInvalid = firstInvalid || el;
      continue;
    }
    data[f.name] = value;
  }
  if (firstInvalid) {
    firstInvalid.focus();
    return;
  }
  const item = { id: uid(), ...(config.defaults || {}), ...data };
  save(config.collection, item);
  config.onCreated?.(item);
  close();
  toast(translate("common.saved"));
}

export function openQuickAddPerson({ collection, title, fields, defaults, onCreated }) {
  ensureLoaded();
  config = { collection, fields, defaults, onCreated };
  document.getElementById(TITLE_ID).textContent = title;
  document.getElementById(FORM_ID).innerHTML =
    fields.map(fieldHTML).join("") +
    `
      <div class="modal-actions">
        <button class="btn btn-ghost" id="${CANCEL_ID}" type="button">${translate("projects.cancel")}</button>
        <button class="btn btn-primary" type="submit">${translate("projects.save")}</button>
      </div>`;
  document.getElementById(CANCEL_ID).addEventListener("click", close);
  showModal(document.getElementById(MODAL_ID));
  window.lucide?.createIcons();
  document.getElementById(fields[0].id).focus();
}

export function openQuickAddSupplier({ onCreated }) {
  openQuickAddPerson({
    collection: "suppliers",
    title: translate("quickAdd.addSupplier"),
    defaults: { purchases: 0, paid: 0 },
    fields: [
      { name: "name", label: translate("suppliers.formName"), placeholder: translate("suppliers.formNamePh"), required: true, id: "qaSupName" },
      { name: "phone", label: translate("suppliers.formPhone"), placeholder: translate("suppliers.formPhonePh"), id: "qaSupPhone" },
      { name: "address", label: translate("quickAdd.address"), placeholder: "—", id: "qaSupAddress" },
      { name: "notes", label: translate("suppliers.formNotes"), type: "textarea", placeholder: "—", id: "qaSupNotes" },
    ],
    onCreated,
  });
}
