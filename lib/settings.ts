// Browser-local settings (stored in localStorage, never sent anywhere except
// to our own API routes which proxy them to Apify).

const APIFY_TOKEN_KEY = "ytlib_apify_token";

export function getApifyToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(APIFY_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setApifyToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = token.trim();
    if (t) localStorage.setItem(APIFY_TOKEN_KEY, t);
    else localStorage.removeItem(APIFY_TOKEN_KEY);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function hasApifyToken(): boolean {
  return getApifyToken().length > 0;
}
