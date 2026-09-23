// Web-account session token (nickname+password login). The token is an HMAC
// blob issued by the bot API; we only decode its payload locally to show the
// nickname and drop it when expired — verification happens server-side.
//
// Storage is a choice made once at sign-in ("remember me" on the login form):
// localStorage survives closing the browser (the token itself still expires
// after 90 days server-side); sessionStorage drops it the moment the tab
// closes, for a shared or public computer. Both are checked on read —
// whichever one the last sign-in chose to write to.

const TOKEN_KEY = 'hs_token';

export function getToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  // Drop expired tokens client-side so the UI falls back to guest cleanly.
  const p = decodePayload(t);
  if (!p || Date.now() > p.exp) {
    clearToken();
    return null;
  }
  return t;
}

/** `remember` picks where the token lives: localStorage (default — survives
 * closing the browser) or sessionStorage (cleared when the tab closes). */
export function setToken(token: string, remember = true): void {
  clearToken(); // never leave a stale copy in the other store
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthUsername(): string | null {
  const t = getToken();
  if (!t) return null;
  return decodePayload(t)?.u ?? null;
}

function decodePayload(token: string): { u: string; exp: number } | null {
  try {
    const b64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(atob(b64)) as { u?: unknown; exp?: unknown };
    if (typeof p.u !== 'string' || typeof p.exp !== 'number') return null;
    return { u: p.u, exp: p.exp };
  } catch {
    return null;
  }
}
