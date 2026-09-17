import { apiFetch } from "../../../lib/api/client";

export function getDashboard() {
  return apiFetch("/api/dashboard");
}

export function markNotificationsReadApi(ids) {
  return apiFetch("/api/profile/me/notifications/read", {
    method: "PATCH",
    body: JSON.stringify({ ids }),
    headers: { "Content-Type": "application/json" }
  });
}
