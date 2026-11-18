"use client";

// Connection to the WePal platform API (the we-pal Laravel backend).
// Off by default: with no NEXT_PUBLIC_WEPAL_API set, the members area runs on its demo data.
// When set (e.g. https://wepal.ps/api), sign-in is real: email + password, then the
// two-factor code when the account requires it, and the members area requires a token.
//
// The server must allow this site's origin in its CORS settings (CORS_ALLOWED_ORIGINS).

export const API_BASE = (process.env.NEXT_PUBLIC_WEPAL_API ?? "").replace(/\/$/, "");
export const apiEnabled = API_BASE.length > 0;

const TOKEN = "wepal-token";
const EXPIRES = "wepal-token-expires";

export type ApiUser = { id: string; email: string; name: string; region?: string };
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

const store = () => (typeof window === "undefined" ? null : window.localStorage);
export function getToken(): string | null {
  try {
    const t = store()?.getItem(TOKEN); const exp = store()?.getItem(EXPIRES);
    if (!t) return null;
    if (exp && new Date(exp).getTime() < Date.now()) { clearToken(); return null; }
    return t;
  } catch { return null; }
}
function setToken(token: string, expiresAt?: string) {
  try { store()?.setItem(TOKEN, token); if (expiresAt) store()?.setItem(EXPIRES, expiresAt); } catch { /* storage blocked */ }
}
export function clearToken() {
  try { store()?.removeItem(TOKEN); store()?.removeItem(EXPIRES); } catch { /* storage blocked */ }
}

async function request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean; lang?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "X-Locale": init.lang ?? "ar" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth) { const t = getToken(); if (t) headers.Authorization = `Bearer ${t}`; }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  } catch {
    throw new ApiError(0, init.lang === "en" ? "Couldn't reach the server. Check your connection and try again." : "تعذّر الاتصال بالخادم. تحقّق من اتصالك وحاول مجددًا.");
  }
  const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  if (!res.ok) {
    if (res.status === 401 && init.auth) clearToken();
    throw new ApiError(res.status, data?.message ?? res.statusText, data?.error);
  }
  return data as T;
}

type TokenReply = { token: string; expiresAt?: string; user: ApiUser };
type LoginReply = TokenReply | { twoFactorRequired: true; challengeToken: string };

/** Step 1: email + password. Returns the user, or a challenge when a two-factor code is needed. */
export async function login(email: string, password: string, lang: string): Promise<{ user: ApiUser } | { challenge: string }> {
  const r = await request<LoginReply>("/auth/login", { method: "POST", body: { email, password }, lang });
  if ("twoFactorRequired" in r) return { challenge: r.challengeToken };
  setToken(r.token, r.expiresAt);
  return { user: r.user };
}

/** Step 2 (only when asked): the 6-digit code from the authenticator app. */
export async function completeTwoFactor(challengeToken: string, code: string, lang: string): Promise<ApiUser> {
  const r = await request<TokenReply>("/auth/2fa/challenge", { method: "POST", body: { challengeToken, code }, lang });
  setToken(r.token, r.expiresAt);
  return r.user;
}

export const me = (lang: string) => request<ApiUser>("/me", { auth: true, lang });

export async function logout(lang: string) {
  try { await request("/auth/logout", { method: "POST", auth: true, lang }); } finally { clearToken(); }
}
