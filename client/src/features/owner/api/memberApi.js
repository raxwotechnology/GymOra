import { apiFetch } from "../../../lib/api/client";

export function createMember(payload) {
  return apiFetch("/api/owner/members", { method: "POST", body: JSON.stringify(payload) });
}

export function updateMember(id, payload) {
  return apiFetch(`/api/owner/members/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function updateMemberSubscription(id, payload) {
  return apiFetch(`/api/owner/members/${id}/subscription`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteMember(id) {
  return apiFetch(`/api/owner/members/${id}`, { method: "DELETE" });
}

export function resetMemberPassword(id) {
  return apiFetch(`/api/owner/members/${id}/reset-password`, { method: "POST" });
}

export function approveMemberRequest(id) {
  return apiFetch(`/api/owner/member-requests/${id}/approve`, { method: "PATCH" });
}

export function rejectMemberRequest(id) {
  return apiFetch(`/api/owner/member-requests/${id}/reject`, { method: "PATCH" });
}
