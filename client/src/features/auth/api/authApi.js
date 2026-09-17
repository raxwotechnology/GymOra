import { apiFetch } from "../../../lib/api/client";

export function loginRequest(email, password, rememberMe = false) {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, rememberMe })
  });
}

export function changePasswordRequest(payload) {
  return apiFetch("/api/auth/change-password", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function requestForgotPasswordOtpRequest(email) {
  return apiFetch("/api/auth/forgot-password/request-otp", {
    method: "POST",
    body: JSON.stringify({ email })
  });
}

export function resetPasswordWithOtpRequest(payload) {
  return apiFetch("/api/auth/forgot-password/reset", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
