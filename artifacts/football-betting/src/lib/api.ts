// VITE_API_URL is set in Render's frontend env vars (e.g. "https://goalbet-api.onrender.com").
// Vite bakes it into the bundle at build time. Falls back to relative path for local dev.
const _apiOrigin = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export const API_BASE = _apiOrigin ? `${_apiOrigin}/api` : "/api";

export function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("goalbet_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
