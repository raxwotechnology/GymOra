import { apiFetch, downloadFile } from "../../../lib/api/client";

// ─── Gyms ────────────────────────────────────────────────────────────────────

export function createGym(payload) {
  return apiFetch("/api/admin/gyms", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateGym(id, payload) {
  return apiFetch(`/api/admin/gyms/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function uploadGymLogo(id, file) {
  const formData = new FormData();
  formData.append("logo", file);
  return apiFetch(`/api/admin/gyms/${id}/logo`, {
    method: "POST",
    body: formData,
    isFormData: true
  });
}

export function suspendGym(id) {
  return apiFetch(`/api/admin/gyms/${id}/suspend`, { method: "PATCH" });
}

export function reactivateGym(id) {
  return apiFetch(`/api/admin/gyms/${id}/reactivate`, { method: "PATCH" });
}

export function resetOwnerPassword(id) {
  return apiFetch(`/api/admin/gyms/${id}/reset-owner-password`, { method: "POST" });
}

export function getGymDetails(id) {
  return apiFetch(`/api/admin/gyms/${id}`);
}

export function downloadGymsExcel() {
  const today = new Date().toISOString().slice(0, 10);
  return downloadFile("/api/admin/gyms/export/excel", `gyms-${today}.xlsx`);
}

export function backupGymData(id, gymName) {
  const today = new Date().toISOString().slice(0, 10);
  const safe = (gymName || "gym").replace(/\s+/g, "-");
  return downloadFile(`/api/admin/gyms/${id}/backup`, `gym-backup-${safe}-${today}.json`);
}

export function backupPlatformData() {
  const today = new Date().toISOString().slice(0, 10);
  return downloadFile("/api/admin/backup/platform", `platform-backup-${today}.json`);
}

// ─── Multi-Owner ─────────────────────────────────────────────────────────────

export function listGymOwners(gymId) {
  return apiFetch(`/api/admin/gyms/${gymId}/owners`);
}

export function addGymOwner(gymId, payload) {
  return apiFetch(`/api/admin/gyms/${gymId}/owners`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function removeGymOwner(gymId, userId) {
  return apiFetch(`/api/admin/gyms/${gymId}/owners/${userId}`, { method: "DELETE" });
}

// ─── Subscription Plans ──────────────────────────────────────────────────────

export function createSubscriptionPlan(payload) {
  return apiFetch("/api/admin/subscription-plans", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateSubscriptionPlan(planId, payload) {
  return apiFetch(`/api/admin/subscription-plans/${planId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteSubscriptionPlan(planId) {
  return apiFetch(`/api/admin/subscription-plans/${planId}`, { method: "DELETE" });
}

export function assignGymSubscription(gymId, payload) {
  return apiFetch(`/api/admin/gyms/${gymId}/subscription`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function recordGymPayment(gymId, payload) {
  return apiFetch(`/api/admin/gyms/${gymId}/billing/record-payment`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// ─── Trial Actions ───────────────────────────────────────────────────────────

export function extendGymTrial(gymId, payload) {
  return apiFetch(`/api/admin/gyms/${gymId}/trial/extend`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function sendTrialReminder(gymId) {
  return apiFetch(`/api/admin/gyms/${gymId}/trial/remind`, { method: "POST" });
}

// ─── Bank Details ────────────────────────────────────────────────────────────

export function createBankDetail(payload) {
  return apiFetch("/api/admin/bank-details", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateBankDetail(id, payload) {
  return apiFetch(`/api/admin/bank-details/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteBankDetail(id) {
  return apiFetch(`/api/admin/bank-details/${id}`, { method: "DELETE" });
}

// ─── Cheque Payments ─────────────────────────────────────────────────────────

export function listCheques(gymId) {
  const qs = gymId ? `?gymId=${gymId}` : "";
  return apiFetch(`/api/admin/cheques${qs}`);
}

export function createCheque(payload) {
  return apiFetch("/api/admin/cheques", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateCheque(id, payload) {
  return apiFetch(`/api/admin/cheques/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteCheque(id) {
  return apiFetch(`/api/admin/cheques/${id}`, { method: "DELETE" });
}

// ─── Platform Expenses ───────────────────────────────────────────────────────

export function createPlatformExpense(payload) {
  return apiFetch("/api/admin/platform-expenses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updatePlatformExpense(id, payload) {
  return apiFetch(`/api/admin/platform-expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deletePlatformExpense(id) {
  return apiFetch(`/api/admin/platform-expenses/${id}`, { method: "DELETE" });
}

// ─── Bank Transactions ────────────────────────────────────────────────────────

export function listBankTransactions(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  return apiFetch(`/api/admin/bank-transactions${qs ? "?" + qs : ""}`);
}

export function createBankTransaction(payload) {
  return apiFetch("/api/admin/bank-transactions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateBankTransaction(id, payload) {
  return apiFetch(`/api/admin/bank-transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteBankTransaction(id) {
  return apiFetch(`/api/admin/bank-transactions/${id}`, { method: "DELETE" });
}

// ─── SMS Logs ─────────────────────────────────────────────────────────────────

export function listSmsLogs(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  return apiFetch(`/api/admin/sms-logs${qs ? "?" + qs : ""}`);
}

export function createSmsLog(payload) {
  return apiFetch("/api/admin/sms-logs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteSmsLog(id) {
  return apiFetch(`/api/admin/sms-logs/${id}`, { method: "DELETE" });
}

// ─── Email Logs ───────────────────────────────────────────────────────────────

export function listEmailLogs(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  return apiFetch(`/api/admin/email-logs${qs ? "?" + qs : ""}`);
}

export function createEmailLog(payload) {
  return apiFetch("/api/admin/email-logs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function deleteEmailLog(id) {
  return apiFetch(`/api/admin/email-logs/${id}`, { method: "DELETE" });
}

// ─── System Settings ─────────────────────────────────────────────────────────

export function getSystemSettings() {
  return apiFetch("/api/admin/system-settings");
}

export function updateSystemSettings(payload) {
  return apiFetch("/api/admin/system-settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function uploadSystemLogo(file) {
  const formData = new FormData();
  formData.append("logo", file);
  return apiFetch("/api/admin/system-settings/logo", {
    method: "POST",
    body: formData,
    isFormData: true
  });
}

export function uploadSystemHero(file) {
  const formData = new FormData();
  formData.append("hero", file);
  return apiFetch("/api/admin/system-settings/hero", {
    method: "POST",
    body: formData,
    isFormData: true
  });
}
