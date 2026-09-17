import { apiFetch } from "../../../lib/api/client";

export function createMembershipPlan(payload) {
  return apiFetch("/api/owner/plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateMembershipPlan(id, payload) {
  return apiFetch(`/api/owner/plans/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function createWorkoutPlan(payload) {
  return apiFetch("/api/owner/workout-plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateWorkoutPlan(id, payload) {
  return apiFetch(`/api/owner/workout-plans/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteWorkoutPlan(id) {
  return apiFetch(`/api/owner/workout-plans/${id}`, { method: "DELETE" });
}

export function assignWorkoutPlanToMember(id, payload) {
  return apiFetch(`/api/owner/members/${id}/workout-plan`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function removeWorkoutPlanFromMember(id) {
  return apiFetch(`/api/owner/members/${id}/workout-plan`, { method: "DELETE" });
}

export function createMealPlan(payload) {
  return apiFetch("/api/owner/meal-plans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateMealPlan(id, payload) {
  return apiFetch(`/api/owner/meal-plans/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteMealPlan(id) {
  return apiFetch(`/api/owner/meal-plans/${id}`, { method: "DELETE" });
}

export function assignMealPlanToMember(id, payload) {
  return apiFetch(`/api/owner/members/${id}/meal-plan`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function removeMealPlanFromMember(id) {
  return apiFetch(`/api/owner/members/${id}/meal-plan`, { method: "DELETE" });
}
