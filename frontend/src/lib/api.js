// Thin client for the backend REST API. Stores the JWT in localStorage and
// attaches it as a Bearer token. A 401 clears the token and bounces to /login.

export const BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TOKEN_KEY = "wad_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window !== "undefined") window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(TOKEN_KEY);
}

export function logout() {
  clearToken();
  if (typeof window !== "undefined") window.location.href = "/login";
}

function qs(params) {
  const entries = Object.entries(params || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries).toString();
}

async function apiFetch(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (res.status === 401 && auth) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok || (json && json.success === false)) {
    throw new Error((json && json.message) || `Request failed (${res.status})`);
  }
  return json;
}

// --- auth ---
export async function login(email, password) {
  const json = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false
  });
  setToken(json.token);
  return json;
}

// --- stats ---
export const getStats = () => apiFetch("/api/stats").then((r) => r.data);

// --- conversations --- (list returns { data, pagination })
export const getConversations = (params) =>
  apiFetch(`/api/conversations${qs(params)}`);
export const getConversation = (id) =>
  apiFetch(`/api/conversations/${id}`).then((r) => r.data);
export const updateConversation = (id, patch) =>
  apiFetch(`/api/conversations/${id}`, { method: "PATCH", body: patch }).then(
    (r) => r.data
  );
export const sendReply = (id, body) =>
  apiFetch(`/api/conversations/${id}/reply`, {
    method: "POST",
    body: { body }
  }).then((r) => r.data);

// --- contacts / leads --- (list returns { data, pagination })
export const getContacts = (params) => apiFetch(`/api/contacts${qs(params)}`);

export async function downloadLeadsCsv() {
  const token = getToken();
  const res = await fetch(`${BASE}/api/contacts/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leads.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// --- whatsapp ---
export const getWhatsAppStatus = () =>
  apiFetch("/api/whatsapp/status").then((r) => r.data);

// --- templates ---
export const getTemplates = () => apiFetch("/api/templates").then((r) => r.data);
export const createTemplate = (body) =>
  apiFetch("/api/templates", { method: "POST", body }).then((r) => r.data);
export const updateTemplate = (id, body) =>
  apiFetch(`/api/templates/${id}`, { method: "PUT", body }).then((r) => r.data);
export const deleteTemplate = (id) =>
  apiFetch(`/api/templates/${id}`, { method: "DELETE" });

// --- quick replies ---
export const getQuickReplies = () =>
  apiFetch("/api/quick-replies").then((r) => r.data);
export const createQuickReply = (body) =>
  apiFetch("/api/quick-replies", { method: "POST", body }).then((r) => r.data);
export const updateQuickReply = (id, body) =>
  apiFetch(`/api/quick-replies/${id}`, { method: "PUT", body }).then((r) => r.data);
export const deleteQuickReply = (id) =>
  apiFetch(`/api/quick-replies/${id}`, { method: "DELETE" });

// --- flows ---
export const getFlows = () => apiFetch("/api/flows").then((r) => r.data);
export const createFlow = (body) =>
  apiFetch("/api/flows", { method: "POST", body }).then((r) => r.data);
export const updateFlow = (id, body) =>
  apiFetch(`/api/flows/${id}`, { method: "PUT", body }).then((r) => r.data);
export const activateFlow = (id) =>
  apiFetch(`/api/flows/${id}/activate`, { method: "POST" }).then((r) => r.data);
export const deleteFlow = (id) =>
  apiFetch(`/api/flows/${id}`, { method: "DELETE" });
