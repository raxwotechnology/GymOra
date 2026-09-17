import { apiFetch } from "../../../lib/api/client";

export function createEquipment(payload) {
  return apiFetch("/api/owner/equipment", { method: "POST", body: JSON.stringify(payload) });
}

export function updateEquipment(id, payload) {
  return apiFetch(`/api/owner/equipment/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function serviceEquipment(id, payload = {}) {
  return apiFetch(`/api/owner/equipment/${id}/service`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function reportBreakage(id, payload) {
  return apiFetch(`/api/owner/equipment/${id}/breakage`, { method: "POST", body: JSON.stringify(payload) });
}

export function resolveBreakage(equipmentId, breakageId, payload = {}) {
  return apiFetch(`/api/owner/equipment/${equipmentId}/breakage/${breakageId}/resolve`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function listSuppliers(gymId) {
  return apiFetch(`/api/owner/suppliers?gymId=${gymId}`);
}

export function createSupplier(payload) {
  return apiFetch("/api/owner/suppliers", { method: "POST", body: JSON.stringify(payload) });
}

export function updateSupplier(id, payload) {
  return apiFetch(`/api/owner/suppliers/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSupplier(id) {
  return apiFetch(`/api/owner/suppliers/${id}`, { method: "DELETE" });
}

export function addSupplierProduct(supplierId, payload) {
  return apiFetch(`/api/owner/suppliers/${supplierId}/products`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateSupplierProduct(supplierId, productId, payload) {
  return apiFetch(`/api/owner/suppliers/${supplierId}/products/${productId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function removeSupplierProduct(supplierId, productId) {
  return apiFetch(`/api/owner/suppliers/${supplierId}/products/${productId}`, { method: "DELETE" });
}

export function createAnnouncement(payload) {
  return apiFetch("/api/owner/announcements", { method: "POST", body: JSON.stringify(payload) });
}

export function updateAnnouncement(id, payload) {
  return apiFetch(`/api/owner/announcements/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteAnnouncement(id) {
  return apiFetch(`/api/owner/announcements/${id}`, { method: "DELETE" });
}
