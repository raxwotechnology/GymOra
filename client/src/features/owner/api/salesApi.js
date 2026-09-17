import { apiFetch } from "../../../lib/api/client";

function buildMultipartPayload(payload, fileFieldName, fileKey) {
  const formData = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (key === fileKey && value instanceof File) {
      formData.append(fileFieldName, value);
      return;
    }
    formData.append(key, value);
  });
  return formData;
}

export function createExpense(payload) {
  return apiFetch("/api/owner/expenses", { method: "POST", body: JSON.stringify(payload) });
}

export function updateExpense(id, payload) {
  return apiFetch(`/api/owner/expenses/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

// ─── Bank Details ────────────────────────────────────────────────────────────

export function listOwnerBankDetails() {
  return apiFetch("/api/owner/banks");
}

export function createOwnerBankDetail(payload) {
  return apiFetch("/api/owner/banks", { method: "POST", body: JSON.stringify(payload) });
}

export function updateOwnerBankDetail(id, payload) {
  return apiFetch(`/api/owner/banks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteOwnerBankDetail(id) {
  return apiFetch(`/api/owner/banks/${id}`, { method: "DELETE" });
}

// ─── Bank Transactions ───────────────────────────────────────────────────────

export function listOwnerBankTransactions(filters = {}) {
  const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  return apiFetch(`/api/owner/bank-transactions${qs ? "?" + qs : ""}`);
}

export function createOwnerBankTransaction(payload) {
  return apiFetch("/api/owner/bank-transactions", { method: "POST", body: JSON.stringify(payload) });
}

export function updateOwnerBankTransaction(id, payload) {
  return apiFetch(`/api/owner/bank-transactions/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteOwnerBankTransaction(id) {
  return apiFetch(`/api/owner/bank-transactions/${id}`, { method: "DELETE" });
}

export function createSupplement(payload) {
  return apiFetch("/api/owner/supplements", { method: "POST", body: buildMultipartPayload(payload, "supplementImage", "imageFile") });
}

export function updateSupplement(id, payload) {
  return apiFetch(`/api/owner/supplements/${id}`, { method: "PATCH", body: buildMultipartPayload(payload, "supplementImage", "imageFile") });
}

export function createSale(payload) {
  return apiFetch("/api/owner/sales", { method: "POST", body: JSON.stringify(payload) });
}

export function createSaleReturn(payload) {
  return apiFetch("/api/owner/returns", { method: "POST", body: JSON.stringify(payload) });
}

export function sendMessage(payload) {
  return apiFetch("/api/owner/messages", { method: "POST", body: JSON.stringify(payload) });
}

export function markMessagesRead(payload) {
  return apiFetch("/api/owner/messages/read", { method: "PATCH", body: JSON.stringify(payload) });
}
