import { apiFetch } from "../../../lib/api/client";

export function initiatePayhereGymPayment(payload) {
  return apiFetch("/api/payhere/initiate-gym-payment", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
