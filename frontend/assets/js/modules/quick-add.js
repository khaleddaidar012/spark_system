/* ============================================
   Spark ERP — Quick Add Module
   Floating action button + Quick Money +
   Quick Materials. Everything auto-updates
   accounts via the actions module.
   ============================================ */

import { all, get, save, peopleWithRole, findPersonById } from "./store.js";
import { recordMoney, addMaterialToProject, consumeMaterial } from "./actions.js";
import { contractorWorksOnProject, num, formatMoney } from "./calc.js";
import { translate } from "./i18n.js";
import { toast } from "./toast.js";
import { showModal, hideModal } from "./modal.js";
import { openQuickAddSupplier, openQuickAddPerson } from "./quick-add-person.js";
import { personRolesLabel, personTypeLabel, contractorLabel, contractorSpecialty } from "./person-roles.js";
import { getActivePhases, getProjectPhases, addFinanceToPhaseLog } from "./project-phases.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const lang = () => document.documentElement.lang;

function openModal(id) {
  const el = document.getElementById(id);
  showModal(el);
  window.lucide?.createIcons();
  return el;
}

function closeModal(id) {
  hideModal(document.getElementById(id));
}

function bindSegmented(containerId, onChange) {
  const box = document.getElementById(containerId);
  box.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    box.querySelectorAll(".segmented-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    box.setAttribute("data-value-state", btn.dataset.value);
    onChange?.(btn.dataset.value);
  });
}

/* ---------- FAB ---------- */

let closeFabMenu;

function initFab() {
  const fab = document.getElementById("fab");
  const menu = document.getElementById("fabMenu");
  const root = document.getElementById("quickAdd");
  const CLOSE_MS = 250;
  let closeTimer = null;

  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const openMenu = () => {
    cancelClose();
    menu.classList.remove("is-closing");
    menu.hidden = false;
    root.classList.add("is-open");
  };

  const closeMenu = (instant = false) => {
    if (menu.hidden) return;
    cancelClose();
    if (instant) {
      menu.classList.remove("is-closing");
      menu.hidden = true;
      root.classList.remove("is-open");
      return;
    }
    if (menu.classList.contains("is-closing")) return;
    menu.classList.add("is-closing");
    closeTimer = setTimeout(() => {
      menu.hidden = true;
      menu.classList.remove("is-closing");
      root.classList.remove("is-open");
      closeTimer = null;
    }, CLOSE_MS);
  };

  const toggle = () => {
    const isOpen = root.classList.contains("is-open") && !menu.hidden;
    isOpen ? closeMenu() : openMenu();
  };

  fab.addEventListener("click", toggle);
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  closeFabMenu = closeMenu;
}

/* ---------- Invoice Attachment ---------- */

const INVOICE_MAX_WARN  = 3 * 1024 * 1024;  // 3 MB — warn
const INVOICE_MAX_BLOCK = 10 * 1024 * 1024; // 10 MB — reject

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "image/heic", "image/heif", "application/pdf",
];

// Module-level invoice state per modal
let moneyInvoice  = null;  // { data, type, name } or null
let matInvoice    = null;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function validateInvoiceFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast("يُسمح فقط بالصور وملفات PDF / Only images and PDFs are allowed", "danger");
    return false;
  }
  if (file.size > INVOICE_MAX_BLOCK) {
    toast("الملف أكبر من الحد المسموح (10 ميجا) / File too large — max 10 MB", "danger");
    return false;
  }
  if (file.size > INVOICE_MAX_WARN) {
    toast("الملف كبير — قد يؤثر على سرعة المزامنة / Large file — may slow sync", "info");
  }
  return true;
}

function showInvoicePreview({ previewId, thumbId, pdfIconId, pdfNameId, removeId }, invoice) {
  const preview = document.getElementById(previewId);
  const thumb   = document.getElementById(thumbId);
  const pdfIcon = document.getElementById(pdfIconId);
  const pdfName = document.getElementById(pdfNameId);
  if (!preview) return;

  const isImage = invoice.type.startsWith("image/");
  preview.hidden = false;
  if (isImage) {
    thumb.src    = invoice.data;
    thumb.hidden = false;
    pdfIcon.hidden = true;
  } else {
    thumb.hidden   = true;
    pdfIcon.hidden = false;
    pdfName.textContent = invoice.name.length > 28
      ? invoice.name.slice(0, 25) + "…"
      : invoice.name;
  }
  window.lucide?.createIcons();
}

function clearInvoicePreview({ previewId, thumbId, pdfIconId, fileId, cameraId }) {
  const preview = document.getElementById(previewId);
  if (preview) preview.hidden = true;
  const thumb = document.getElementById(thumbId);
  if (thumb) { thumb.src = ""; thumb.hidden = true; }
  const pdfIcon = document.getElementById(pdfIconId);
  if (pdfIcon) pdfIcon.hidden = true;
  const fileInput   = document.getElementById(fileId);
  const cameraInput = document.getElementById(cameraId);
  if (fileInput)   fileInput.value   = "";
  if (cameraInput) cameraInput.value = "";
}

async function handleInvoiceFileChange(file, setFn, uiIds) {
  if (!file) return;
  if (!validateInvoiceFile(file)) return;
  try {
    const data = await readFileAsDataURL(file);
    const invoice = { data, type: file.type, name: file.name };
    setFn(invoice);
    showInvoicePreview(uiIds, invoice);
  } catch {
    toast("فشل قراءة الملف — حاول مرة أخرى / Failed to read file", "danger");
  }
}

function initInvoiceInputs({ fileId, cameraId, removeId, previewId, thumbId, pdfIconId, pdfNameId }, setFn, getFn) {
  const uiIds = { previewId, thumbId, pdfIconId, pdfNameId, removeId, fileId, cameraId };

  document.getElementById(fileId)?.addEventListener("change", (e) => {
    handleInvoiceFileChange(e.target.files[0], setFn, uiIds);
  });
  document.getElementById(cameraId)?.addEventListener("change", (e) => {
    handleInvoiceFileChange(e.target.files[0], setFn, uiIds);
  });
  document.getElementById(removeId)?.addEventListener("click", () => {
    setFn(null);
    clearInvoicePreview(uiIds);
  });
}

// ---------- Invoice Lightbox ----------

export function openInvoiceLightbox({ data, type, name }) {
  const lb   = document.getElementById("invoiceLightbox");
  const body = document.getElementById("invoiceLightboxBody");
  const dl   = document.getElementById("invoiceLightboxDownload");
  if (!lb || !body || !dl) return;

  dl.href     = data;
  dl.download = name || "invoice";

  if (type && type.startsWith("image/")) {
    body.innerHTML = `<img src="${data}" alt="invoice" class="invoice-lightbox-img" />`;
  } else {
    // PDF — try embed, fallback to download prompt
    body.innerHTML = `
      <object data="${data}" type="application/pdf" class="invoice-lightbox-pdf">
        <p class="invoice-lightbox-fallback">
          تعذّر عرض PDF في المتصفح —
          <a href="${data}" download="${name || 'invoice.pdf'}" class="btn btn-primary btn-sm">تحميل PDF</a>
        </p>
      </object>`;
  }

  lb.hidden = false;
  window.lucide?.createIcons();
}

if (typeof window !== "undefined") {
  window.openInvoiceLightbox = openInvoiceLightbox;
}

function initInvoiceLightbox() {
  const lb = document.getElementById("invoiceLightbox");
  if (!lb) return;
  document.getElementById("invoiceLightboxClose")?.addEventListener("click", () => {
    lb.hidden = true;
    document.getElementById("invoiceLightboxBody").innerHTML = "";
  });
  lb.addEventListener("click", (e) => {
    if (e.target === lb) {
      lb.hidden = true;
      document.getElementById("invoiceLightboxBody").innerHTML = "";
    }
  });
}

/* ---------- Quick Money ---------- */

function fillPersonSelect() {
  const type = document.querySelector("#moneyPersonType .chip.is-active").dataset.value;
  const select = document.getElementById("moneyPersonSelect");
  const freeName = document.getElementById("moneyPersonName");
  const addBtn = document.getElementById("moneyAddPersonBtn");

  const collections = {
    supplier: all("suppliers"),
    contractor: all("contractors"),
    client: all("clients"),
  };

  if (type === "other") {
    select.hidden = true;
    addBtn.hidden = true;
    freeName.hidden = false;
    freeName.focus();
    return;
  }

  const list = collections[type] || [];
  freeName.hidden = true;
  select.hidden = false;
  addBtn.hidden = false;
  select.innerHTML =
    `<option value="">${translate("quick.choosePerson")}</option>` +
    list
      .map((p) => {
        const label =
          type === "contractor"
            ? contractorLabel(contractorSpecialty(p), p.name, lang())
            : p.name;
        return `<option value="${p.id}">${esc(label)}</option>`;
      })
      .join("");
}

function updateMoneyPhases() {
  const projSelect = document.getElementById("moneyProject");
  const phaseField = document.getElementById("moneyPhaseField");
  const phaseSelect = document.getElementById("moneyPhase");
  const subphaseField = document.getElementById("moneySubphaseField");
  const subphaseSelect = document.getElementById("moneySubphase");
  if (!projSelect || !phaseField || !phaseSelect) return;

  const projectId = projSelect.value;
  if (!projectId) {
    phaseField.hidden = true;
    if (subphaseField) subphaseField.hidden = true;
    phaseSelect.innerHTML = '<option value="">— اختر المرحلة —</option>';
    return;
  }

  const phases = getProjectPhases(projectId) || [];
  if (phases.length === 0) {
    phaseField.hidden = true;
    if (subphaseField) subphaseField.hidden = true;
    return;
  }

  phaseField.hidden = false;
  let activePhaseId = "";
  const activePhases = getActivePhases(projectId);
  if (activePhases.length > 0) {
    activePhaseId = activePhases[0].id;
  }

  phaseSelect.innerHTML =
    '<option value="">— اختر المرحلة —</option>' +
    phases
      .map((ph) => {
        const isAct = ph.status === "active";
        const tag = isAct ? " (نشطة حالياً)" : ph.status === "done" ? " (مكتملة)" : "";
        return `<option value="${ph.id}"${ph.id === activePhaseId ? " selected" : ""}>${esc(ph.label)}${tag}</option>`;
      })
      .join("");

  updateMoneySubphases(projectId, phaseSelect.value);
}

function updateMoneySubphases(projectId, phaseId) {
  const subphaseField = document.getElementById("moneySubphaseField");
  const subphaseSelect = document.getElementById("moneySubphase");
  if (!subphaseField || !subphaseSelect) return;

  if (!projectId || !phaseId) {
    subphaseField.hidden = true;
    subphaseSelect.innerHTML = '<option value="">— اختر المرحلة الفرعية —</option>';
    return;
  }

  const phases = getProjectPhases(projectId) || [];
  const phase = phases.find((p) => p.id === phaseId);
  const subs = (phase && phase.subPhases) || [];

  if (subs.length === 0) {
    subphaseField.hidden = true;
    subphaseSelect.innerHTML = '<option value="">— اختر المرحلة الفرعية —</option>';
    return;
  }

  subphaseField.hidden = false;
  const activeSubId = phase.activeSubPhaseId || "";
  subphaseSelect.innerHTML =
    '<option value="">— بدون مرحلة فرعية —</option>' +
    subs
      .map((s) => {
        const isAct = s.status === "active";
        const tag = isAct ? " (نشطة)" : s.status === "done" ? " (مكتملة)" : "";
        return `<option value="${s.id}"${s.id === activeSubId ? " selected" : ""}>${esc(s.label)}${tag}</option>`;
      })
      .join("");
}

function fillMoneyProjectSelect() {
  const select = document.getElementById("moneyProject");
  if (!select) return;
  const projects = all("projects");
  select.innerHTML =
    `<option value="">${translate("quick.noProject")}</option>` +
    projects
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join("");
  updateMoneyPhases();
}

/* Reset every dynamic part of the Quick Money modal so a fresh,
   predictable state is shown each time it opens. Without this the
   direction / person / amount from the previous use carry over and
   money can be recorded in the wrong direction without any warning. */
function resetQuickMoney() {
  const dir = document.getElementById("moneyDirection");
  if (dir) {
    dir.setAttribute("data-value-state", "out");
    dir.querySelectorAll(".segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.value === "out")
    );
  }
  const typeBox = document.getElementById("moneyPersonType");
  if (typeBox) {
    typeBox.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("is-active", c.dataset.value === "supplier")
    );
  }
  const form = document.getElementById("quickMoneyForm");
  if (form) form.reset();
  const nameInput = document.getElementById("moneyPersonName");
  const select = document.getElementById("moneyPersonSelect");
  const addBtn = document.getElementById("moneyAddPersonBtn");
  if (nameInput) nameInput.hidden = true;
  if (select) {
    select.hidden = false;
    select.value = "";
  }
  if (addBtn) addBtn.hidden = false;
  fillMoneyProjectSelect();
  fillPersonSelect();
}

export function openQuickMoney(options = {}) {
  const { direction = "out", projectId = null } = options;
  if (typeof closeFabMenu === "function") closeFabMenu(true);
  openModal("quickMoneyModal");
  resetQuickMoney();
  
  if (direction) {
    const dir = document.getElementById("moneyDirection");
    if (dir) {
      dir.setAttribute("data-value-state", direction);
      dir.querySelectorAll(".segmented-btn").forEach((b) =>
        b.classList.toggle("is-active", b.dataset.value === direction)
      );
    }
  }

  if (projectId) {
    const projSelect = document.getElementById("moneyProject");
    if (projSelect) {
      projSelect.value = projectId;
      updateMoneyPhases();
    }
  }

  const amount = document.getElementById("moneyAmount");
  if (amount) amount.focus();
}

if (typeof window !== "undefined") {
  window.openQuickMoney = openQuickMoney;
}

function initQuickMoney() {
  document.getElementById("fabMoney").addEventListener("click", () => {
    openQuickMoney();
  });

  const moneyProjSelect = document.getElementById("moneyProject");
  if (moneyProjSelect) {
    moneyProjSelect.addEventListener("change", () => {
      updateMoneyPhases();
    });
  }

  const moneyPhaseSelect = document.getElementById("moneyPhase");
  if (moneyPhaseSelect) {
    moneyPhaseSelect.addEventListener("change", () => {
      const projId = document.getElementById("moneyProject")?.value;
      updateMoneySubphases(projId, moneyPhaseSelect.value);
    });
  }

  document.getElementById("moneyPersonType").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#moneyPersonType .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
    fillPersonSelect();
  });

  document.getElementById("moneyAddPersonBtn").addEventListener("click", () => {
    const type = document.querySelector("#moneyPersonType .chip.is-active").dataset.value;
    openQuickAddPerson({
      title: translate("quickAdd.addPerson"),
      defaults: type === "supplier" ? { purchases: 0, paid: 0 } : type === "client" ? { paid: 0, remaining: 0 } : { total: 0, paid: 0 },
      initialType: type,
      onCreated: (person) => {
        fillPersonSelect();
        const expected = type;
        if (person.roles.includes(expected)) {
          document.getElementById("moneyPersonSelect").value = person.id;
          toast(translate("common.saved"));
        } else {
          const label = personTypeLabel(person.roles[0], lang());
          toast(translate("quickAdd.notSupplierMessage").replace("{type}", label), "info");
        }
      },
    });
  });

  document.getElementById("quickMoneyClose").addEventListener("click", () => closeModal("quickMoneyModal"));
  document.getElementById("quickMoneyCancel").addEventListener("click", () => closeModal("quickMoneyModal"));
  document.getElementById("quickMoneyModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("quickMoneyModal");
  });

  document.getElementById("quickMoneyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.querySelector("#moneyPersonType .chip.is-active").dataset.value;
    const direction = document.getElementById("moneyDirection").getAttribute("data-value-state") || "in";
    const amount = document.getElementById("moneyAmount").value;

    let personId = null;
    let personName = "";
    if (type === "other") {
      personName = document.getElementById("moneyPersonName").value.trim();
      if (!personName) {
        document.getElementById("moneyPersonName").focus();
        return;
      }
    } else {
      personId = document.getElementById("moneyPersonSelect").value;
      const person = get(
        type === "supplier" ? "suppliers" : type === "contractor" ? "contractors" : "clients",
        personId
      );
      if (!person) {
        toast(translate("quick.choosePerson"), "danger");
        return;
      }
      personName = person.name;
    }

    const projectId = document.getElementById("moneyProject").value || null;
    if (type === "contractor" && projectId && personId) {
      const project = get("projects", projectId);
      if (project) {
        project.contractors = project.contractors || [];
        let pCont = project.contractors.find((c) => c.id === personId);
        if (!pCont) {
          const person = get("contractors", personId);
          pCont = {
            id: personId,
            name: personName,
            role: person ? (person.role || "contractor") : "contractor",
            total: 0,
            paid: 0,
          };
          project.contractors.push(pCont);
          save("projects", project);
          toast(`تمت إضافة المقاول ${personName} تلقائياً إلى المشروع`, "success");
        }
      }
    }

    const phaseId = document.getElementById("moneyPhase")?.value || null;
    const subPhaseId = document.getElementById("moneySubphase")?.value || null;

    const txnData = {
      direction,
      personType: type,
      personId,
      personName,
      amount,
      projectId,
      phaseId,
      subPhaseId,
      note: document.getElementById("moneyNote").value.trim(),
    };
    if (moneyInvoice) {
      txnData.invoiceData = moneyInvoice.data;
      txnData.invoiceType = moneyInvoice.type;
      txnData.invoiceName = moneyInvoice.name;
    }

    recordMoney(txnData);

    // Link money transaction to selected phase or active phase
    if (projectId && phaseId) {
      const txns = all("moneyTransactions");
      const savedTxn = txns[txns.length - 1];
      addFinanceToPhaseLog(projectId, {
        transactionId: savedTxn ? savedTxn.id : "txn_" + Date.now(),
        phaseId,
        subPhaseId,
        direction,
        amount: Number(amount) || 0,
        note: document.getElementById("moneyNote").value.trim() || `${personName} (${type})`,
      });
    } else if (projectId) {
      const activePhases = getActivePhases(projectId);
      if (activePhases.length > 0) {
        const ph = activePhases[0];
        const txns = all("moneyTransactions");
        const savedTxn = txns[txns.length - 1];
        addFinanceToPhaseLog(projectId, {
          transactionId: savedTxn ? savedTxn.id : "txn_" + Date.now(),
          phaseId: ph.id,
          subPhaseId: ph.activeSubPhaseId || null,
          direction,
          amount: Number(amount) || 0,
          note: document.getElementById("moneyNote").value.trim() || `${personName} (${type})`,
        });
      }
    }

    // Reset invoice state
    moneyInvoice = null;
    clearInvoicePreview({ previewId: "moneyInvoicePreview", thumbId: "moneyInvoiceThumb", pdfIconId: "moneyInvoicePdfIcon", fileId: "moneyInvoiceFile", cameraId: "moneyInvoiceCamera" });

    document.getElementById("quickMoneyForm").reset();
    resetQuickMoney();
    closeModal("quickMoneyModal");
    toast(translate("common.saved"));
  });

  // Also clear invoice state when modal is dismissed without saving
  document.getElementById("quickMoneyClose").addEventListener("click", () => {
    moneyInvoice = null;
    clearInvoicePreview({ previewId: "moneyInvoicePreview", thumbId: "moneyInvoiceThumb", pdfIconId: "moneyInvoicePdfIcon", fileId: "moneyInvoiceFile", cameraId: "moneyInvoiceCamera" });
  }, { capture: true });
  document.getElementById("quickMoneyCancel").addEventListener("click", () => {
    moneyInvoice = null;
    clearInvoicePreview({ previewId: "moneyInvoicePreview", thumbId: "moneyInvoiceThumb", pdfIconId: "moneyInvoicePdfIcon", fileId: "moneyInvoiceFile", cameraId: "moneyInvoiceCamera" });
  }, { capture: true });

  // Wire invoice file inputs for Quick Money
  initInvoiceInputs(
    { fileId: "moneyInvoiceFile", cameraId: "moneyInvoiceCamera", removeId: "moneyInvoiceRemove",
      previewId: "moneyInvoicePreview", thumbId: "moneyInvoiceThumb",
      pdfIconId: "moneyInvoicePdfIcon", pdfNameId: "moneyInvoicePdfName" },
    (v) => { moneyInvoice = v; },
    () => moneyInvoice
  );
}

/* ---------- Quick Materials ---------- */

function fillProjectSelect() {
  const select = document.getElementById("qmProject");
  const projects = all("projects");
  select.innerHTML = projects
    .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
    .join("");
  return projects.length > 0;
}

function fillSupplierSelect() {
  const select = document.getElementById("qmSupplier");
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
}

function applySupplierSupplies(supplierId) {
  if (!supplierId) return;
  const ref = findPersonById(supplierId);
  const supplies = ref && Array.isArray(ref.person.supplies) ? ref.person.supplies : [];
  if (supplies.length) document.getElementById("qmName").value = supplies[0];
}

function fillMaterialSuggestions() {
  const datalist = document.getElementById("qmSuggestions");
  datalist.innerHTML = [...new Set(all("materials").map((m) => m.name))]
    .map((n) => `<option value="${esc(n)}"></option>`)
    .join("");
}

function fillContractorSelect() {
  const select = document.getElementById("qmContractor");
  const people = peopleWithRole("contractor");
  select.innerHTML =
    `<option value="">${translate("project.formMatContractorNone")}</option>` +
    people
      .map((c) => {
        const label = contractorLabel(contractorSpecialty(c), c.name, lang());
        return `<option value="${c.id}">${esc(label)}</option>`;
      })
      .join("");
}

function applyMaterialDirection(direction) {
  document.getElementById("qmSupplierField").hidden = direction === "out";
  // We keep qmPriceField visible so the user can enter the material's cost value for the project
  document.getElementById("qmPriceField").hidden = false;
  document.getElementById("qmContractorField").hidden = direction === "out";
}

export function openQuickMaterials() {
  if (typeof closeFabMenu === "function") closeFabMenu(true);
  if (!fillProjectSelect()) {
    toast(translate("quick.noProjects"), "info");
    return;
  }
  fillSupplierSelect();
  fillContractorSelect();
  fillMaterialSuggestions();
  const modal = openModal("quickMatModal");
  const dirBox = modal.querySelector("#matDirection");
  if (dirBox) {
    dirBox.setAttribute("data-value-state", "in");
    modal.querySelectorAll("#matDirection .segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.value === "in")
    );
    applyMaterialDirection("in");
  }
  const nameField = document.getElementById("qmName");
  if (nameField) nameField.focus();
}

if (typeof window !== "undefined") {
  window.openQuickMaterials = openQuickMaterials;
}

function initQuickMaterials() {
  document.getElementById("fabMaterials").addEventListener("click", () => {
    openQuickMaterials();
  });

  document.getElementById("matDirection").addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    document.querySelectorAll("#matDirection .segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b === btn)
    );
    document.getElementById("matDirection").setAttribute("data-value-state", btn.dataset.value);
    applyMaterialDirection(btn.dataset.value);
  });

  document.getElementById("quickMatClose").addEventListener("click", () => closeModal("quickMatModal"));
  document.getElementById("quickMatCancel").addEventListener("click", () => closeModal("quickMatModal"));
  document.getElementById("quickMatModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("quickMatModal");
  });

  document.getElementById("qmAddSupplierBtn").addEventListener("click", () => {
    openQuickAddSupplier({
      onCreated: (person) => {
        fillSupplierSelect();
        if (person.roles.includes("supplier")) {
          document.getElementById("qmSupplier").value = person.id;
          toast(translate("common.saved"));
        } else {
          const type = personTypeLabel(person.roles[0], lang());
          toast(translate("quickAdd.notSupplierMessage").replace("{type}", type), "info");
        }
      },
    });
  });

  document.getElementById("qmSupplier").addEventListener("change", (e) => {
    applySupplierSupplies(e.target.value);
  });

  const qmQty = document.getElementById("qmQty");
  const qmPrice = document.getElementById("qmPrice");
  const qmTotal = document.getElementById("qmTotal");

  function updateQmTotal() {
    const q = num(qmQty.value);
    const p = num(qmPrice.value);
    if (qmTotal) qmTotal.value = formatMoney(q * p);
  }

  if (qmQty) qmQty.addEventListener("input", updateQmTotal);
  if (qmPrice) qmPrice.addEventListener("input", updateQmTotal);

  document.getElementById("quickMatForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const direction = document.getElementById("matDirection").getAttribute("data-value-state") || "in";
    const projectId = document.getElementById("qmProject").value;
    const name = document.getElementById("qmName").value.trim();
    if (!projectId || !name) {
      document.getElementById("qmName").focus();
      return;
    }

    if (direction === "in") {
      const matData = {
        name,
        supplierId: document.getElementById("qmSupplier").value || null,
        contractorId: document.getElementById("qmContractor").value || null,
        quantity: document.getElementById("qmQty").value,
        unit: document.getElementById("qmUnit").value,
        unitPrice: document.getElementById("qmPrice").value,
        date: new Date().toISOString().slice(0, 10),
      };
      if (matInvoice) {
        matData.invoiceData = matInvoice.data;
        matData.invoiceType = matInvoice.type;
        matData.invoiceName = matInvoice.name;
      }
      const savedMat = addMaterialToProject(projectId, matData);

      const qmPayNow = document.getElementById("qmPayNow")?.checked;
      if (qmPayNow && savedMat) {
        let payPersonId = matData.supplierId;
        let payPersonType = "supplier";
        
        if (!payPersonId && matData.contractorId) {
          payPersonId = matData.contractorId;
          payPersonType = "contractor";
        }

        if (payPersonId) {
          const personInfo = findPersonById(payPersonId);
          if (personInfo) {
            recordMoney({
              direction: "out",
              personType: payPersonType,
              personId: payPersonId,
              personName: personInfo.person.name,
              amount: savedMat.total,
              projectId: projectId,
              note: `سداد قيمة الخامات: ${name} (${matData.quantity} ${matData.unit})`,
            });
          }
        }
      }
    } else {
      consumeMaterial(projectId, {
        name,
        quantity: document.getElementById("qmQty").value,
        unit: document.getElementById("qmUnit").value,
        unitPrice: document.getElementById("qmPrice").value,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    // Reset invoice and fields state
    matInvoice = null;
    clearInvoicePreview({ previewId: "matInvoicePreview", thumbId: "matInvoiceThumb", pdfIconId: "matInvoicePdfIcon", fileId: "matInvoiceFile", cameraId: "matInvoiceCamera" });

    document.getElementById("quickMatForm").reset();
    if (qmTotal) qmTotal.value = "";
    const dirBox = document.getElementById("matDirection");
    dirBox.setAttribute("data-value-state", "in");
    document.querySelectorAll("#matDirection .segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.value === "in")
    );
    applyMaterialDirection("in");
    closeModal("quickMatModal");
    toast(translate("common.saved"));
  });

  // Clear invoice state on modal dismiss
  document.getElementById("quickMatClose").addEventListener("click", () => {
    matInvoice = null;
    clearInvoicePreview({ previewId: "matInvoicePreview", thumbId: "matInvoiceThumb", pdfIconId: "matInvoicePdfIcon", fileId: "matInvoiceFile", cameraId: "matInvoiceCamera" });
  }, { capture: true });
  document.getElementById("quickMatCancel").addEventListener("click", () => {
    matInvoice = null;
    clearInvoicePreview({ previewId: "matInvoicePreview", thumbId: "matInvoiceThumb", pdfIconId: "matInvoicePdfIcon", fileId: "matInvoiceFile", cameraId: "matInvoiceCamera" });
  }, { capture: true });

  // Wire invoice file inputs for Quick Materials
  initInvoiceInputs(
    { fileId: "matInvoiceFile", cameraId: "matInvoiceCamera", removeId: "matInvoiceRemove",
      previewId: "matInvoicePreview", thumbId: "matInvoiceThumb",
      pdfIconId: "matInvoicePdfIcon", pdfNameId: "matInvoicePdfName" },
    (v) => { matInvoice = v; },
    () => matInvoice
  );
}

/* ---------- Quick Money Split ---------- */

function fillMoneySplitPersonSelect() {
  const type = document.querySelector("#moneySplitPersonType .chip.is-active")?.dataset.value || "supplier";
  const select = document.getElementById("moneySplitPersonSelect");
  const freeName = document.getElementById("moneySplitPersonName");
  const addBtn = document.getElementById("moneySplitAddPersonBtn");

  const collections = {
    supplier: all("suppliers"),
    contractor: all("contractors"),
    client: all("clients"),
  };

  if (type === "other") {
    select.hidden = true;
    addBtn.hidden = true;
    freeName.hidden = false;
    freeName.focus();
    return;
  }

  const list = collections[type] || [];
  freeName.hidden = true;
  select.hidden = false;
  addBtn.hidden = false;
  select.innerHTML =
    `<option value="">${translate("quick.choosePerson")}</option>` +
    list
      .map((p) => {
        const label =
          type === "contractor"
            ? contractorLabel(contractorSpecialty(p), p.name, lang())
            : p.name;
        return `<option value="${p.id}">${esc(label)}</option>`;
      })
      .join("");
}

function fillMoneySplitProjects() {
  const container = document.getElementById("moneySplitProjectsContainer");
  const projects = all("projects");
  const rows = container.querySelectorAll(".split-project-row");
  
  // Save current values
  const savedValues = [];
  rows.forEach((row) => {
    const projectId = row.querySelector(".split-project-select").value;
    const amount = row.querySelector(".split-project-amount").value;
    if (projectId) savedValues.push({ projectId, amount });
  });

  if (projects.length === 0) {
    container.innerHTML = `<p class="split-empty">${translate("quick.noProjects")}</p>`;
    return;
  }

  const projectOptions = projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");

  // Rebuild with saved values or one empty row
  if (savedValues.length > 0) {
    container.innerHTML = savedValues.map((v, i) => `
      <div class="split-project-row" data-index="${i}">
        <select class="form-input split-project-select" required>${projectOptions}</select>
        <input class="form-input split-project-amount" type="number" min="0" step="0.01" placeholder="${translate("quick.amountPh")}" required />
        <button type="button" class="btn btn-soft btn-icon split-project-remove" aria-label="${translate("quick.remove")}"><i data-lucide="trash-2" class="icon"></i></button>
      </div>
    `).join("");
    // Restore values
    savedValues.forEach((v, i) => {
      const row = container.querySelector(`[data-index="${i}"]`);
      if (row) {
        row.querySelector(".split-project-select").value = v.projectId;
        row.querySelector(".split-project-amount").value = v.amount;
      }
    });
    
    // Add one empty row
    const newIndex = savedValues.length;
    container.insertAdjacentHTML("beforeend", `
      <div class="split-project-row" data-index="${newIndex}">
        <select class="form-input split-project-select" required>${projectOptions}</select>
        <input class="form-input split-project-amount" type="number" min="0" step="0.01" placeholder="${translate("quick.amountPh")}" required />
        <button type="button" class="btn btn-soft btn-icon split-project-remove" aria-label="${translate("quick.remove")}"><i data-lucide="trash-2" class="icon"></i></button>
      </div>
    `);
  } else {
    container.innerHTML = `
      <div class="split-project-row" data-index="0">
        <select class="form-input split-project-select" required>${projectOptions}</select>
        <input class="form-input split-project-amount" type="number" min="0" step="0.01" placeholder="${translate("quick.amountPh")}" required />
        <button type="button" class="btn btn-soft btn-icon split-project-remove" aria-label="${translate("quick.remove")}"><i data-lucide="trash-2" class="icon"></i></button>
      </div>`;
  }

  updateMoneySplitSummary();
  window.lucide?.createIcons();
}

function updateMoneySplitSummary() {
  const totalAmount = num(document.getElementById("moneySplitTotalAmount").value);
  const rows = document.querySelectorAll("#moneySplitProjectsContainer .split-project-row");
  let allocated = 0;
  rows.forEach((row) => {
    allocated += num(row.querySelector(".split-project-amount").value);
  });
  const remaining = totalAmount - allocated;

  const summary = document.getElementById("moneySplitSummary");
  const allocatedEl = document.getElementById("moneySplitAllocated");
  const remainingEl = document.getElementById("moneySplitRemaining");

  allocatedEl.textContent = formatMoney(allocated);
  remainingEl.textContent = formatMoney(remaining);
  remainingEl.classList.toggle("is-remaining", remaining > 0);
  remainingEl.classList.toggle("is-negative", remaining < 0);
  remainingEl.classList.toggle("is-zero", remaining === 0);

  if (rows.length > 0) summary.hidden = false;
}

function resetQuickMoneySplit() {
  const dir = document.getElementById("moneySplitDirection");
  if (dir) {
    dir.setAttribute("data-value-state", "out");
    dir.querySelectorAll(".segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.value === "out")
    );
  }
  const typeBox = document.getElementById("moneySplitPersonType");
  if (typeBox) {
    typeBox.querySelectorAll(".chip").forEach((c) =>
      c.classList.toggle("is-active", c.dataset.value === "supplier")
    );
  }
  const form = document.getElementById("quickMoneySplitForm");
  if (form) form.reset();
  const nameInput = document.getElementById("moneySplitPersonName");
  const select = document.getElementById("moneySplitPersonSelect");
  const addBtn = document.getElementById("moneySplitAddPersonBtn");
  if (nameInput) nameInput.hidden = true;
  if (select) {
    select.hidden = false;
    select.value = "";
  }
  if (addBtn) addBtn.hidden = false;
  fillMoneySplitPersonSelect();
  fillMoneySplitProjects();
}

export function openQuickMoneySplit() {
  if (typeof closeFabMenu === "function") closeFabMenu(true);
  openModal("quickMoneySplitModal");
  resetQuickMoneySplit();
  const amount = document.getElementById("moneySplitTotalAmount");
  if (amount) amount.focus();
}

if (typeof window !== "undefined") {
  window.openQuickMoneySplit = openQuickMoneySplit;
}

function initQuickMoneySplit() {
  document.getElementById("fabMoneySplit")?.addEventListener("click", () => {
    openQuickMoneySplit();
  });

  document.getElementById("moneySplitPersonType").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#moneySplitPersonType .chip").forEach((c) => c.classList.toggle("is-active", c === chip));
    fillMoneySplitPersonSelect();
  });

  document.getElementById("moneySplitAddPersonBtn").addEventListener("click", () => {
    const type = document.querySelector("#moneySplitPersonType .chip.is-active").dataset.value;
    openQuickAddPerson({
      title: translate("quickAdd.addPerson"),
      defaults: type === "supplier" ? { purchases: 0, paid: 0 } : type === "client" ? { paid: 0, remaining: 0 } : { total: 0, paid: 0 },
      initialType: type,
      onCreated: (person) => {
        fillMoneySplitPersonSelect();
        const expected = type;
        if (person.roles.includes(expected)) {
          document.getElementById("moneySplitPersonSelect").value = person.id;
          toast(translate("common.saved"));
        } else {
          const label = personTypeLabel(person.roles[0], lang());
          toast(translate("quickAdd.notSupplierMessage").replace("{type}", label), "info");
        }
      },
    });
  });

  document.getElementById("quickMoneySplitClose").addEventListener("click", () => closeModal("quickMoneySplitModal"));
  document.getElementById("quickMoneySplitCancel").addEventListener("click", () => closeModal("quickMoneySplitModal"));
  document.getElementById("quickMoneySplitModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal("quickMoneySplitModal");
  });

  document.getElementById("moneySplitAddProject").addEventListener("click", () => {
    const container = document.getElementById("moneySplitProjectsContainer");
    const projects = all("projects");
    const projectOptions = projects.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
    const newIndex = container.querySelectorAll(".split-project-row").length;
    container.insertAdjacentHTML("beforeend", `
      <div class="split-project-row" data-index="${newIndex}">
        <select class="form-input split-project-select" required>${projectOptions}</select>
        <input class="form-input split-project-amount" type="number" min="0" step="0.01" placeholder="${translate("quick.amountPh")}" required />
        <button type="button" class="btn btn-soft btn-icon split-project-remove" aria-label="${translate("quick.remove")}"><i data-lucide="trash-2" class="icon"></i></button>
      </div>
    `);
    window.lucide?.createIcons();
  });

  document.getElementById("moneySplitProjectsContainer").addEventListener("input", (e) => {
    if (e.target.matches(".split-project-amount")) {
      updateMoneySplitSummary();
    }
  });

  document.getElementById("moneySplitProjectsContainer").addEventListener("change", (e) => {
    if (e.target.matches(".split-project-select")) {
      updateMoneySplitSummary();
    }
  });

  document.getElementById("moneySplitProjectsContainer").addEventListener("click", (e) => {
    const btn = e.target.closest(".split-project-remove");
    if (btn) {
      const row = btn.closest(".split-project-row");
      const container = document.getElementById("moneySplitProjectsContainer");
      const rows = container.querySelectorAll(".split-project-row");
      if (rows.length > 1) {
        row.remove();
        // Re-index
        container.querySelectorAll(".split-project-row").forEach((r, i) => r.dataset.index = i);
      } else {
        // Clear the single row
        row.querySelector(".split-project-select").value = "";
        row.querySelector(".split-project-amount").value = "";
      }
      updateMoneySplitSummary();
    }
  });

  document.getElementById("moneySplitTotalAmount").addEventListener("input", updateMoneySplitSummary);

  document.getElementById("quickMoneySplitForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const direction = document.getElementById("moneySplitDirection").getAttribute("data-value-state") || "out";
    const type = document.querySelector("#moneySplitPersonType .chip.is-active").dataset.value;
    const totalAmount = num(document.getElementById("moneySplitTotalAmount").value);

    let personId = null;
    let personName = "";
    if (type === "other") {
      personName = document.getElementById("moneySplitPersonName").value.trim();
      if (!personName) {
        document.getElementById("moneySplitPersonName").focus();
        return;
      }
    } else {
      personId = document.getElementById("moneySplitPersonSelect").value;
      const person = get(
        type === "supplier" ? "suppliers" : type === "contractor" ? "contractors" : "clients",
        personId
      );
      if (!person) {
        toast(translate("quick.choosePerson"), "danger");
        return;
      }
      personName = person.name;
    }

    const note = document.getElementById("moneySplitNote").value.trim();

    // Collect project splits
    const rows = document.querySelectorAll("#moneySplitProjectsContainer .split-project-row");
    const splits = [];
    let allocated = 0;
    rows.forEach((row) => {
      const projectId = row.querySelector(".split-project-select").value;
      const amount = num(row.querySelector(".split-project-amount").value);
      if (projectId && amount > 0) {
        splits.push({ projectId, amount });
        allocated += amount;
      }
    });

    if (splits.length === 0) {
      toast(translate("quick.splitRequired"), "danger");
      return;
    }

    if (allocated !== totalAmount) {
      toast(translate("quick.splitMismatch").replace("{allocated}", formatMoney(allocated)).replace("{total}", formatMoney(totalAmount)), "danger");
      return;
    }

    // Auto-add contractor to project if applicable
    if (type === "contractor" && personId) {
      for (const split of splits) {
        const project = get("projects", split.projectId);
        if (project) {
          project.contractors = project.contractors || [];
          let pCont = project.contractors.find((c) => c.id === personId);
          if (!pCont) {
            const personInfo = get("contractors", personId);
            pCont = {
              id: personId,
              name: personName,
              role: personInfo ? (personInfo.role || "contractor") : "contractor",
              total: 0,
              paid: 0,
            };
            project.contractors.push(pCont);
            save("projects", project);
            toast(`تمت إضافة المقاول ${personName} تلقائياً إلى المشروع`, "success");
          }
        }
      }
    }

    // Record money for each split
    splits.forEach((split) => {
      recordMoney({
        direction,
        personType: type,
        personId,
        personName,
        amount: split.amount,
        projectId: split.projectId,
        note,
      });

      // Task 08: Link money transaction to active phases
      if (split.projectId) {
        const activePhases = getActivePhases(split.projectId);
        const txns = all("moneyTransactions");
        const savedTxn = txns[txns.length - 1];
        for (const ph of activePhases) {
          addFinanceToPhaseLog(split.projectId, {
            transactionId: savedTxn ? savedTxn.id : "txn_" + Date.now(),
            phaseId: ph.id,
            subPhaseId: ph.activeSubPhaseId || null,
            direction,
            amount: Number(split.amount) || 0,
            note: note || `${personName} (${type})`,
          });
        }
      }
    });

    document.getElementById("quickMoneySplitForm").reset();
    resetQuickMoneySplit();
    closeModal("quickMoneySplitModal");
    toast(translate("common.saved"));
  });
}

export function initQuickAdd() {
  if (!document.getElementById("quickAdd") || !document.getElementById("fab")) return;
  initFab();
  initQuickMoney();
  initQuickMoneySplit();
  initQuickMaterials();
  initInvoiceLightbox();
  bindSegmented("moneyDirection");
  bindSegmented("moneySplitDirection");
  bindSegmented("matDirection");
}
