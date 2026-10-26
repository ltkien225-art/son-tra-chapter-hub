import { isLinkToken } from "./link-token";

export const CHAPTER_LINK_UNIT_RE = /^ch(0[1-9]|[1-3][0-9]|4[0-2])$/;
export function chapterTokenFromHash(hash: string): string | null {
  const match = /^#k=([A-Za-z0-9_-]{43})$/.exec(hash);
  return match?.[1] ?? null;
}
const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const decode = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
async function encryptionKey(secret: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
/** Bind encrypted recovery to its chapter; raw capability never persists in browser storage. */
export async function encryptChapterToken(token: string, chapter: string, secret: string) {
  if (!isLinkToken(token) || !CHAPTER_LINK_UNIT_RE.test(chapter) || !secret) throw new Error("Invalid capability");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(chapter) }, await encryptionKey(secret), new TextEncoder().encode(token));
  return encode(iv) + "." + encode(new Uint8Array(ciphertext));
}
export async function decryptChapterToken(cipher: string, chapter: string, secret: string) {
  const [iv, data] = cipher.split(".");
  if (!iv || !data || !secret || !CHAPTER_LINK_UNIT_RE.test(chapter)) throw new Error("Invalid capability");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv), additionalData: new TextEncoder().encode(chapter) }, await encryptionKey(secret), decode(data));
  const token = new TextDecoder().decode(plaintext);
  if (!isLinkToken(token)) throw new Error("Invalid capability");
  return token;
}