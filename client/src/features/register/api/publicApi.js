import { apiFetch } from "../../../lib/api/client";

export const getPublicPlans = () =>
  apiFetch("/api/public/plans");

export const registerTrial = (body) =>
  apiFetch("/api/public/register-trial", { method: "POST", body: JSON.stringify(body) });

export const initiateRegistration = (body) =>
  apiFetch("/api/public/initiate-registration", { method: "POST", body: JSON.stringify(body) });

export const getRegistrationStatus = (orderId) =>
  apiFetch(`/api/public/registration-status/${orderId}`);
