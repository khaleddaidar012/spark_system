/* ============================================
   Spark ERP — Toast notifications
   ============================================ */

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = "success") {
  const host = getContainer();
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.innerHTML = message;
  host.appendChild(el);

  setTimeout(() => {
    el.classList.add("is-visible");
  }, 20);

  setTimeout(() => {
    el.classList.remove("is-visible");
    setTimeout(() => el.remove(), 400);
  }, 4000);
}
