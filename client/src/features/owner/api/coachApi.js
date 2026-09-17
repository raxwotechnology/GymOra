import { apiFetch } from "../../../lib/api/client";

export function createCoach(payload) {
  return apiFetch("/api/owner/coaches", { method: "POST", body: JSON.stringify(payload) });
}

export function updateCoach(id, payload) {
  return apiFetch(`/api/owner/coaches/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteCoach(id) {
  return apiFetch(`/api/owner/coaches/${id}`, { method: "DELETE" });
}

export function resetCoachPassword(id) {
  return apiFetch(`/api/owner/coaches/${id}/reset-password`, { method: "POST" });
}

export function clockInCoachAttendance() {
  return apiFetch("/api/owner/coach-attendance/clock-in", { method: "POST" });
}

export function clockOutCoachAttendance(id) {
  return apiFetch(`/api/owner/coach-attendance/${id}/clock-out`, { method: "PATCH" });
}

export function startCoachBreak(id) {
  return apiFetch(`/api/owner/coach-attendance/${id}/break-start`, { method: "POST" });
}

export function endCoachBreak(id) {
  return apiFetch(`/api/owner/coach-attendance/${id}/break-end`, { method: "PATCH" });
}

export function getMyCoachAttendance() {
  return apiFetch("/api/owner/coach-attendance/my");
}

export function listSalaryAdvances(coachId) {
  return apiFetch(`/api/owner/coaches/${coachId}/salary-advances`);
}

export function createSalaryAdvance(coachId, payload) {
  return apiFetch(`/api/owner/coaches/${coachId}/salary-advances`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateSalaryAdvance(coachId, advId, payload) {
  return apiFetch(`/api/owner/coaches/${coachId}/salary-advances/${advId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteSalaryAdvance(coachId, advId) {
  return apiFetch(`/api/owner/coaches/${coachId}/salary-advances/${advId}`, { method: "DELETE" });
}

export function getMyAdvances() {
  return apiFetch("/api/owner/salary-advances/my");
}

export function getMyPayroll() {
  return apiFetch("/api/owner/payroll/my");
}

export function listPayroll(month) {
  return apiFetch(`/api/owner/payroll${month ? `?month=${month}` : ""}`);
}

export function generatePayroll(month) {
  return apiFetch("/api/owner/payroll/generate", { method: "POST", body: JSON.stringify({ month }) });
}

export function updatePayrollRecord(id, payload) {
  return apiFetch(`/api/owner/payroll/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function approvePayrollRecord(id) {
  return apiFetch(`/api/owner/payroll/${id}/approve`, { method: "PATCH" });
}

export function markPayrollPaid(id, payload) {
  return apiFetch(`/api/owner/payroll/${id}/pay`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deletePayrollRecord(id) {
  return apiFetch(`/api/owner/payroll/${id}`, { method: "DELETE" });
}
