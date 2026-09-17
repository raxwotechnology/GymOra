import { apiFetch } from "../../../lib/api/client";

export function listAttendance(gymId, params = {}) {
  const qs = new URLSearchParams({ gymId, ...params }).toString();
  return apiFetch(`/api/owner/attendance?${qs}`);
}

export function listCoachAttendance(gymId, params = {}) {
  const qs = new URLSearchParams({ gymId, ...params }).toString();
  return apiFetch(`/api/owner/attendance/coaches?${qs}`);
}

export function markCoachAttendance(payload) {
  return apiFetch("/api/owner/attendance/coaches/mark", { method: "POST", body: JSON.stringify(payload) });
}

export function createAttendanceCheckIn(payload) {
  return apiFetch("/api/owner/attendance/check-in", { method: "POST", body: JSON.stringify(payload) });
}

export function clockOutAttendance(id) {
  return apiFetch(`/api/owner/attendance/${id}/clock-out`, { method: "PATCH" });
}

export function startMemberBreak(id) {
  return apiFetch(`/api/owner/attendance/${id}/break-start`, { method: "PATCH" });
}

export function endMemberBreak(id) {
  return apiFetch(`/api/owner/attendance/${id}/break-end`, { method: "PATCH" });
}

export function importAttendanceExcel(gymId, file) {
  const formData = new FormData();
  formData.append("gymId", gymId);
  formData.append("file", file);
  return apiFetch("/api/owner/attendance/import", { method: "POST", body: formData });
}
