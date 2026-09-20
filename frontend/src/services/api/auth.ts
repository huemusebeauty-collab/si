const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const AUTH_TOKEN_KEY = "silku_session_token";
const REFRESH_TOKEN_KEY = "silku_refresh_token";
const EXPIRY_KEY = "silku_session_expires_at";

let refreshPromise: Promise<string | null> | null = null;

function isBrowser(): boolean { return typeof window !== "undefined"; }

export function getAccessToken(): string | null {
  return isBrowser() ? window.sessionStorage.getItem(AUTH_TOKEN_KEY) : null;
}

export function getRefreshToken(): string | null {
  return isBrowser() ? window.sessionStorage.getItem(REFRESH_TOKEN_KEY) : null;
}

export function storeSession(sessionToken: string, refreshToken?: string, expiresAt?: string): void {
  if (!isBrowser()) return;
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, sessionToken);
  if (refreshToken) window.sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  if (expiresAt) window.sessionStorage.setItem(EXPIRY_KEY, expiresAt);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  window.sessionStorage.removeItem(EXPIRY_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
          cache: "no-store",
        });
        if (!response.ok) { clearSession(); return null; }
        const body = (await response.json()) as { data?: { sessionToken?: string; expiresAt?: string }; sessionToken?: string; expiresAt?: string };
        const result = body.data ?? body;
        if (!result.sessionToken) { clearSession(); return null; }
        storeSession(result.sessionToken, refreshToken, result.expiresAt);
        return result.sessionToken;
      } catch { return null; }
      finally { refreshPromise = null; }
    })();
  }
  return refreshPromise;
}

export async function authenticatedFetch(path: string, init?: RequestInit): Promise<Response> {
  const makeRequest = (token: string | null) => fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  let response = await makeRequest(getAccessToken());
  if (response.status === 401 && getRefreshToken()) {
    const token = await refreshAccessToken();
    if (token) response = await makeRequest(token);
  }
  return response;
}

export async function logoutSession(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) await fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  } finally { clearSession(); }
}