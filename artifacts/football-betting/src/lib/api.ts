export const API_BASE = "/api";

export function apiFetch(path: string, init?: RequestInit) {
  const token = localStorage.getItem("goalbet_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
