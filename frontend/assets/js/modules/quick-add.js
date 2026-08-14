/* ============================================
   Spark ERP — Quick Add Module
   Floating action button + Quick Money +
   Quick Materials. Everything auto-updates
   accounts via the actions module.
   ============================================ */

import { all, get, peopleWithRole, findPersonById } from "./store.js";
import { recordMoney, addMaterialToProject, consumeMaterial } from "./actions.js";
import { contractorWorksOnProject } from "./calc.js";
import { translate } from "./i18n.js";
import { toast } from "./toast.js";
import { showModal, hideModal } from "./modal.js";
import { openQuickAddSupplier, openQuickAddPerson } from "./quick-add-person.js";
import { personRolesLabel, personTypeLabel, contractorLabel, contractorSpecialty } from "./person-roles.js";

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

function fillMoneyProjectSelect() {
  const select = document.getElementById("moneyProject");
  if (!select) return;
  const projects = all("projects");
  select.innerHTML =
    `<option value="">${translate("quick.noProject")}</option>` +
    projects
      .map((p) => `<option value="${p.id}">${esc(p.name)}</option>`)
      .join("");
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

function initQuickMoney() {
  document.getElementById("fabMoney").addEventListener("click", () => {
    closeFabMenu(true);
    openModal("quickMoneyModal");
    resetQuickMoney();
    const amount = document.getElementById("moneyAmount");
    if (amount) amount.focus();
  });

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
    if (type === "contractor" && projectId && personId && !contractorWorksOnProject(personId, projectId)) {
      toast(translate("quick.contractorNotOnProject").replace("{name}", personName), "info");
    }

    recordMoney({
      direction,
      personType: type,
      personId,
      personName,
      amount,
      projectId,
      note: document.getElementById("moneyNote").value.trim(),
    });

    document.getElementById("quickMoneyForm").reset();
    resetQuickMoney();
    closeModal("quickMoneyModal");
    toast(translate("common.saved"));
  });
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
  document.getElementById("qmPriceField").hidden = direction === "out";
  document.getElementById("qmContractorField").hidden = direction === "out";
  if (direction === "out") {
    document.getElementById("qmPrice").value = "";
  }
}

function initQuickMaterials() {
  document.getElementById("fabMaterials").addEventListener("click", () => {
    closeFabMenu(true);
    if (!fillProjectSelect()) {
      toast(translate("quick.noProjects"), "info");
      return;
    }
    fillSupplierSelect();
    fillContractorSelect();
    fillMaterialSuggestions();
    const modal = openModal("quickMatModal");
    const dirBox = modal.querySelector("#matDirection");
    dirBox.setAttribute("data-value-state", "in");
    modal.querySelectorAll("#matDirection .segmented-btn").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.value === "in")
    );
    applyMaterialDirection("in");
    document.getElementById("qmName").focus();
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
      addMaterialToProject(projectId, {
        name,
        supplierId: document.getElementById("qmSupplier").value || null,
        contractorId: document.getElementById("qmContractor").value || null,
        quantity: document.getElementById("qmQty").value,
        unit: document.getElementById("qmUnit").value,
        unitPrice: document.getElementById("qmPrice").value,
        date: new Date().toISOString().slice(0, 10),
      });
    } else {
      consumeMaterial(projectId, {
        name,
        quantity: document.getElementById("qmQty").value,
        unit: document.getElementById("qmUnit").value,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    document.getElementById("quickMatForm").reset();
    closeModal("quickMatModal");
    toast(translate("common.saved"));
  });
}

/* ---------- Init ---------- */

export function initQuickAdd() {
  if (!document.getElementById("quickAdd") || !document.getElementById("fab")) return;
  initFab();
  initQuickMoney();
  initQuickMaterials();
  bindSegmented("moneyDirection");
  bindSegmented("matDirection");
}
