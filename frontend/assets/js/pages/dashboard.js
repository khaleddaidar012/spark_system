/* ============================================
   Spark ERP — Dashboard Page Script
   Initializes the shared data store and layout
   (navbar, sidebar, FAB quick-add) so all
   Quick Money / Quick Materials modals work
   correctly from the dashboard.
   ============================================ */

import { initLayout } from "../modules/layout.js";
import { initStore } from "../modules/store.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initStore();
  await initLayout();
});
