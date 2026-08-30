/* ============================================
   Spark ERP — Settings Page Script
   Manual backup / restore and "delete all data"
   guarded by a double password confirmation.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore, wipeAll, deleteCategories } from "../modules/store.js";
import { api } from "../modules/api.js";
import { translate } from "../modules/i18n.js";
import { toast } from "../modules/toast.js";
import { showModal, hideModal } from "../modules/modal.js";
import { autoBackup, downloadBackup, restoreBackup, getLastBackupTime, getLastBackupInfo, buildBackupData, pushBackupToServer } from "../modules/backup.js";

const lang = () => document.documentElement.lang;

import { updatePassword } from "../modules/auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();

  const changePassForm = document.getElementById("changePasswordForm");
  const changeCurrPass = document.getElementById("changeCurrPass");
  const changeNewPass = document.getElementById("changeNewPass");
  const changeConfirmPass = document.getElementById("changeConfirmPass");
  const changePassNotif = document.getElementById("changePassNotif");
  const changePassBtn = document.getElementById("changePassSubmitBtn");

  const showPassNotif = (msg, isSuccess) => {
    if (!changePassNotif) return;
    changePassNotif.style.background = isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
    changePassNotif.style.color = isSuccess ? "#15803d" : "#b91c1c";
    changePassNotif.style.border = isSuccess ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)";
    changePassNotif.innerHTML = `
      <i data-lucide="${isSuccess ? "check-circle-2" : "alert-triangle"}" class="icon"></i>
      <span>${msg}</span>
    `;
    changePassNotif.hidden = false;
    window.lucide?.createIcons();
  };

  changePassForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (changePassNotif) changePassNotif.hidden = true;

    const curr = changeCurrPass.value;
    const next = changeNewPass.value;
    const confirm = changeConfirmPass.value;

    if (!curr) {
      showPassNotif("يرجى إدخال كلمة المرور الحالية", false);
      changeCurrPass.focus();
      return;
    }
    if (!next || next.length < 4) {
      showPassNotif("يرجى إدخال كلمة مرور جديدة مكونة من 4 خانات على الأقل", false);
      changeNewPass.focus();
      return;
    }
    if (next !== confirm) {
      showPassNotif("كلمة المرور الجديدة وتأكيدها غير متطابقين", false);
      changeConfirmPass.focus();
      return;
    }

    try {
      if (changePassBtn) changePassBtn.disabled = true;
      showPassNotif("جاري تحديث كلمة المرور...", true);

      await updatePassword(curr, next);

      showPassNotif("✅ تم تغيير كلمة المرور بنجاح! يمكن استخدامها الآن أونلاين وأوفلاين. 🔑", true);
      toast("🔑 <strong>تم تغيير كلمة المرور بنجاح!</strong>", "success");
      changePassForm.reset();
    } catch (err) {
      if (err.message === "wrong_current_password") {
        showPassNotif("❌ كلمة المرور الحالية غير صحيحة!", false);
        changeCurrPass.focus();
      } else {
        showPassNotif("❌ تعذر تغيير كلمة المرور: " + (err.message || "خطأ غير متوقع"), false);
      }
    } finally {
      if (changePassBtn) changePassBtn.disabled = false;
    }
  });

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
  const deleteConfirmText = document.getElementById("deleteConfirmText");
  const deleteCancel = document.getElementById("deleteCancel");
  const deleteClose = document.getElementById("deleteModalClose");

  // Category Multi-Select elements
  const catCheckboxes = [
    { el: document.getElementById("delCatFinance"), card: document.getElementById("cardCatFinance"), key: "finance" },
    { el: document.getElementById("delCatProjects"), card: document.getElementById("cardCatProjects"), key: "projects" },
    { el: document.getElementById("delCatSuppliers"), card: document.getElementById("cardCatSuppliers"), key: "suppliers" },
    { el: document.getElementById("delCatContractors"), card: document.getElementById("cardCatContractors"), key: "contractors" },
  ];
  const selectAllBtn = document.getElementById("selectAllCategoriesBtn");
  const selectAllText = document.getElementById("selectAllBtnText");

  const updateSelectAllBtnText = () => {
    const allChecked = catCheckboxes.every((c) => c.el && c.el.checked);
    if (selectAllText) {
      selectAllText.textContent = allChecked
        ? (translate("settings.deselectAll") || "إلغاء تحديد الكل")
        : (translate("settings.selectAll") || "تحديد الكل");
    }
  };

  catCheckboxes.forEach(({ el, card }) => {
    if (!el) return;
    el.addEventListener("change", () => {
      if (card) card.classList.toggle("is-selected", el.checked);
      updateSelectAllBtnText();
      if (deleteError && !deleteError.hidden) {
        deleteError.hidden = true;
      }
    });
  });

  selectAllBtn?.addEventListener("click", () => {
    const allChecked = catCheckboxes.every((c) => c.el && c.el.checked);
    const targetState = !allChecked;
    catCheckboxes.forEach(({ el, card }) => {
      if (el) el.checked = targetState;
      if (card) card.classList.toggle("is-selected", targetState);
    });
    updateSelectAllBtnText();
    if (deleteError && !deleteError.hidden) {
      deleteError.hidden = true;
    }
  });

  const showError = (key) => {
    deleteError.textContent = translate(key) || key;
    deleteError.hidden = false;
    if (key.toLowerCase().includes("password")) {
      password1.classList.add("is-invalid");
      password2.classList.add("is-invalid");
    }
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

    const dynamicDir = info.directory || "C:\\Users\\<username>\\Downloads";
    const dynamicPath = info.path || "C:\\Users\\<username>\\Downloads\\latest.json";

    if (dirText) {
      dirText.textContent = dynamicDir;
    }

    if (box && pathText) {
      pathText.textContent = dynamicPath;
      box.hidden = false;
    }
    window.lucide?.createIcons();
  };

  renderLastBackup();
  autoBackup(true).then(() => renderLastBackup());

  const notifBox = document.getElementById("backupStatusNotification");

  const showNotification = (msg, isSuccess = true) => {
    if (!notifBox) return;
    notifBox.style.background = isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
    notifBox.style.color = isSuccess ? "#15803d" : "#b91c1c";
    notifBox.style.border = isSuccess ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)";
    notifBox.innerHTML = `
      <i data-lucide="${isSuccess ? "check-circle-2" : "alert-triangle"}" class="icon"></i>
      <span>${msg}</span>
    `;
    notifBox.hidden = false;
    window.lucide?.createIcons();
  };

  backupNowBtn?.addEventListener("click", async () => {
    const originalText = backupNowBtn.innerHTML;
    try {
      backupNowBtn.disabled = true;
      backupNowBtn.innerHTML = `<span>⏳ جاري الحفظ والتنزيل...</span>`;

      const data = buildBackupData();
      await pushBackupToServer(data);
      downloadBackup();
      renderLastBackup();

      showNotification("✅ تم حفظ وتنزيل النسخة الاحتياطية بنجاح على جهازك (في مجلد التنزيلات)! 💾", true);
      toast("✅ <strong>تم حفظ وتنزيل النسخة الاحتياطية بنجاح على جهازك!</strong>", "success");
    } catch {
      showNotification("❌ حدث خطأ أثناء حفظ النسخة الاحتياطية، يرجى المحاولة مرة أخرى.", false);
      toast("❌ <strong>تعذر حفظ النسخة الاحتياطية — يرجى المحاولة مرة أخرى</strong>", "danger");
    } finally {
      backupNowBtn.disabled = false;
      backupNowBtn.innerHTML = originalText;
      window.lucide?.createIcons();
    }
  });

  restoreFile?.addEventListener("change", () => {
    const file = restoreFile.files && restoreFile.files[0];
    if (!file) return;
    restoreBackup(
      file,
      () => {
        showNotification("🎉 تم استعادة النسخة الاحتياطية بنجاح بنسبة 100%! جاري تحديث البيانات...", true);
        toast("🎉 تم استعادة النسخة الاحتياطية بنجاح بنسبة 100%! جاري تحديث البيانات...", "success");
        setTimeout(() => window.location.reload(), 1400);
      },
      () => {
        showNotification("❌ فشل استعادة النسخة الاحتياطية — يرجى اختيار ملف JSON صحيح", false);
        toast("❌ فشل استعادة النسخة الاحتياطية — يرجى اختيار ملف JSON صحيح", "danger");
      }
    );
    restoreFile.value = "";
  });

  /* ---------- Delete custom data ---------- */
  deleteAllBtn?.addEventListener("click", () => {
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");
    password1.value = "";
    password2.value = "";

    // Reset category checkboxes to unselected
    catCheckboxes.forEach(({ el, card }) => {
      if (el) el.checked = false;
      if (card) card.classList.remove("is-selected");
    });
    updateSelectAllBtnText();

    if (deleteConfirm) deleteConfirm.disabled = false;
    if (deleteConfirmText) deleteConfirmText.textContent = translate("settings.confirmDelete") || "حذف البيانات المحددة";

    showModal(deleteModal);
    window.lucide?.createIcons();
  });

  const closeDelete = () => {
    hideModal(deleteModal);
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");
    if (deleteConfirm) deleteConfirm.disabled = false;
  };

  deleteCancel?.addEventListener("click", closeDelete);
  deleteClose?.addEventListener("click", closeDelete);

  deleteForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    deleteError.hidden = true;
    password1.classList.remove("is-invalid");
    password2.classList.remove("is-invalid");

    // Gather selected categories
    const selected = {};
    catCheckboxes.forEach(({ el, key }) => {
      selected[key] = !!(el && el.checked);
    });

    const hasAnySelected = Object.values(selected).some(Boolean);
    if (!hasAnySelected) {
      showError("settings.noCategorySelected");
      return;
    }

    const p1 = password1.value;
    const p2 = password2.value;

    if (!p1 || !p2) {
      showError("settings.enterBothPasswords");
      if (!p1) password1.focus();
      else password2.focus();
      return;
    }
    if (p1 !== p2) {
      showError("settings.passwordsDontMatch");
      password2.focus();
      return;
    }

    try {
      if (navigator.onLine) {
        const verifyRes = await api.verifyPassword(p1);
        if (!verifyRes || !verifyRes.ok) {
          showError("settings.wrongPassword");
          password1.focus();
          return;
        }
      }
    } catch {
      if (navigator.onLine) {
        showError("settings.wrongPassword");
        password1.focus();
        return;
      }
    }

    try {
      if (deleteConfirm) deleteConfirm.disabled = true;
      if (deleteConfirmText) deleteConfirmText.textContent = translate("settings.deleting") || "جاري الحذف...";

      // Automatic safety backup before deletion
      const backupData = buildBackupData();
      await pushBackupToServer(backupData).catch(() => null);
      downloadBackup();

      // Delete the selected categories
      await deleteCategories(selected);

      renderLastBackup();
      closeDelete();

      const successMsg = translate("settings.deleted") || "تم حذف البيانات المحددة بنجاح.";
      toast(successMsg, "success");
      showNotification(`✅ ${successMsg} تم حفظ وتنزيل نسخة احتياطية مسبقاً لحماية بياناتك.`, true);

      // Reload page to refresh all data stores and views cleanly
      setTimeout(() => {
        window.location.reload();
      }, 1300);
    } catch (err) {
      showError(err.message || "settings.wrongPassword");
      if (deleteConfirm) deleteConfirm.disabled = false;
      if (deleteConfirmText) deleteConfirmText.textContent = translate("settings.confirmDelete") || "حذف البيانات المحددة";
    }
  });
});
