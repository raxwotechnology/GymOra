import { apiFetch } from "../../../lib/api/client";

export function getHealth() {
  return apiFetch("/api/health");
}
