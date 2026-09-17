const defaultDevUrl = "http://localhost:5000";
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (isDev ? defaultDevUrl : "");
const TOKEN_KEY = "fitnesshub_token";
const SESSION_KEY = "fitnesshub_session";

function clearSessionAndRedirect() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const { rawResponse, headers: customHeaders, ...fetchOptions } = options;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders || {})
  };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...fetchOptions
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionAndRedirect();
    }

    const text = await response.text();
    let message = text;

    try {
      const parsed = JSON.parse(text);
      message = parsed.message || text;
    } catch {
      message = text;
    }

    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (rawResponse) return response;
  return response.json();
}

export async function downloadFile(path, filename) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });

  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
