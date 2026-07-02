// Web-account session token (nickname+password login). The token is an HMAC
// blob issued by the bot API; we only decode its payload locally to show the
// nickname and drop it when expired — verification happens server-side.

const TOKEN_KEY = 'hs_token';

export function getToken(): string | null {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) return null;
  // Drop expired tokens client-side so the UI falls back to guest cleanly.
  const p = decodePayload(t);
  if (!p || Date.now() > p.exp) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return t;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
