/* ============================================
   Spark ERP — Auth Module
   Single source of truth for the admin account.
   ============================================ */

export const ADMIN = { username: "admin", password: "Spark@2026#ERP" };

export function verifyAdminPassword(password) {
  return typeof password === "string" && password === ADMIN.password;
}
