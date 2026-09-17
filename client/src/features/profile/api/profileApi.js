import { apiFetch } from "../../../lib/api/client";

export function updateMyProfile(payload) {
  const formData = new FormData();

  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    if (key === "profileImageFile" && value instanceof File) {
      formData.append("profileImage", value);
      return;
    }

    formData.append(key, value);
  });

  return apiFetch("/api/profile/me", {
    method: "PATCH",
    body: formData
  });
}

export function updateMyWorkoutProgress(payload) {
  return apiFetch("/api/profile/me/workout-progress", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
