/* ============================================
   Spark ERP — Settings Page Script
   Manual backup / restore and "delete all data"
   guarded by a double password confirmation.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, wipeAll } from "../modules/store.js";
import { api } from "../modules/api.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";
import { downloadBackup, restoreBackup, getLastBackupTime, getLastBackupInfo, buildBackupData, pushBackupToServer } from "../modules/backup.js";

const lang = () => document.documentElement.lang;

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();

  const lastBackupEl = document.getElementById("lastBackupTime");
  const backupNowBtn = document.getElementById("backupNowBtn");
  const restoreFile = document.getElementById("restoreFile");
  const deleteAllBtn = document.getElementById("deleteAllBtn");
  const deleteModal = document.getElementById("deleteModal");
  const deleteForm = document.getElementById("deleteForm");
  const deleteError = document.getElementById("deleteError");
  const password1 = document.getElementById("delPassword1");
  const password2 = document.getElementById("delPassword2");
  const deleteConfirm = document.getElementById("deleteConfirm");
  const deleteCancel = document.getElementById("deleteCancel");
  const deleteClose = document.getElementById("deleteModalClose");

  const showError = (key) => {
    deleteError.textContent = translate(key);
    deleteError.hidden = false;
    password1.classList.add("is-invalid");
    password2.classList.add("is-invalid");
  };

  const renderLastBackup = () => {
    let info = getLastBackupInfo();
    if (lastBackupEl) {
      lastBackupEl.textContent = info.time
        ? new Date(info.time).toLocaleString(lang() === "ar" ? "ar-EG" : "en-GB")
        : new Date().toLocaleString(lang() === "ar" ? "ar-EG" : "en-GB");
    }

    const dirText = document.getElementById("backupDirText");
    const box = document.getElementById("backupPathBox");
    const pathText = document.getElementById("backupPathText");

    const defaultDir = "C:\\Users\\ghost\\Downloads";
    const defaultPath = "C:\\Users\\ghost\\Downloads\\latest.json";

    if (dirText) {
      dirText.textContent = (info.directory && !info.directory.includes("webDevelopmet"))
        ? info.directory
        : defaultDir;
    }

    if (box && pathText) {
      const validPath = (info.path && !info.path.includes("webDevelopmet")) ? info.path : defaultPath;
      pathText.textContent = validPath;
      box.hidden = false;
    }
  };

  renderLastBackup();
  autoBackup(true).then(() => renderLastBackup());

  /* ---------- Manual backup ---------- */
  backupNowBtn?.addEventListener("click", async () => {
    const data = buildBackupData();
    await pushBackupToServer(data);
    downloadBackup();
    renderLastBackup();

    const info = getLastBackupInfo();
    const pathMsg = info.path ? `تم الحفظ في: ${info.path}` : "تم تنزيل النسخة الاحتياطية بنجاح";
    toast(`تم حفظ النسخة الاحتياطية بنجاح!\n${pathMsg}`, "success");
  });

  restoreFile?.addEventListener("change", () => {
    const file = restoreFile.files && restoreFile.files[0];
    if (!file) return;
    restoreBackup(
      file,
      () => {
        toast(translate("settings.restoreSuccess"));
        setTimeout(() => window.location.reload(), 800);
      },
      () => {
        toast(translate("settings.restoreError"), "danger");
      }
    );
    restoreFile.value = "";
  });

  /* ---------- Delete all data ---------- */
  deleteAllBtn?.addEventListener("click", () => {
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");
    password1.value = "";
    password2.value = "";
    showModal(deleteModal);
  });

  const closeDelete = () => {
    hideModal(deleteModal);
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");
  };

  deleteCancel?.addEventListener("click", closeDelete);
  deleteClose?.addEventListener("click", closeDelete);

  deleteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");

    const p1 = password1.value;
    const p2 = password2.value;

    if (!p1 || !p2) {
      showError("settings.enterBothPasswords");
      return;
    }
    if (p1 !== p2) {
      showError("settings.passwordsDontMatch");
      password2.focus();
      return;
    }
    if (!(await api.verifyPassword(p1)).ok) {
      showError("settings.wrongPassword");
      password1.focus();
      return;
    }

    deleteConfirm.disabled = true;
    downloadBackup();
    await wipeAll();
    toast(translate("settings.deleted"));
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 1200);
  });
});
