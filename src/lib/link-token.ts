/** Capability tokens: 32 random bytes, base64url (43 chars). Only SHA-256 hex hashes are stored. */
export function newLinkToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function isLinkToken(t: unknown): t is string { return typeof t === "string" && /^[A-Za-z0-9_-]{43}$/.test(t); }
export async function hashToken(t: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
}
/** Office protection code: 6–40 chars after trim; only its SHA-256 hash leaves the device. */
export function normalizeOfficeCode(c: unknown): string {
  const s = String(c ?? "").trim();
  if (s.length < 6 || s.length > 40) throw new Error("Mã Văn phòng gồm 6–40 ký tự");
  return s;
}
/** Read the token from the URL fragment (never sent to the server, logs or Referer). */
export function tokenFromHash(hash: string) { const m = /(?:^#|&)t=([A-Za-z0-9_-]{43})(?:&|$)/.exec(hash); return m?.[1] ?? null; }
