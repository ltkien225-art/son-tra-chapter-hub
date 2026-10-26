export const OFFICE_OWNER = "ubmttqvnphuongsontra@gmail.com";
export function ownerVerificationOptions(origin: string) {
  const url = new URL(origin);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error("Địa chỉ xác minh không hợp lệ");
  if (url.username || url.password || url.origin !== origin) throw new Error("Địa chỉ xác minh không hợp lệ");
  return { email: OFFICE_OWNER, options: { shouldCreateUser: false, emailRedirectTo: `${url.origin}/cap-link-van-phong` } };
}
export function dailyTokenFromHash(hash: string): string | null {
  return /^#k=([A-Za-z0-9_-]{43})$/.exec(hash)?.[1] ?? null;
}