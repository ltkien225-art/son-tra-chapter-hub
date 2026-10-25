// Public, non-secret unit directory (names match the chapters seed). Used for access-code login pages.
export const CHAPTER_NAMES: Record<string, string> = {
  ch01: "Thành Vinh 1", ch02: "Thành Vinh 2", ch03: "Thành Vinh 3", ch04: "Thành Vinh 4", ch05: "Thành Vinh 5",
  ch06: "Thành Vinh 6", ch07: "Lộc Phước 1", ch08: "Lộc Phước 2", ch09: "Thọ Quang", ch10: "Mân Quang 1",
  ch11: "Mân Quang 2", ch12: "Thọ An 1", ch13: "Thọ An 2", ch14: "Nam Thọ", ch15: "Quang Cư 1", ch16: "Quang Cư 2",
  ch17: "Tân Thái", ch18: "Tân An", ch19: "Tân Thuận", ch20: "Tân Phú", ch21: "Tân Lập", ch22: "Mân Lập Đông",
  ch23: "Mân Thái", ch24: "Mân Lập Tây", ch25: "Mân Quang 3", ch26: "Cổ Mân", ch27: "Vũng Thùng 1", ch28: "Vũng Thùng 2",
  ch29: "Vũng Thùng 3", ch30: "Vũng Thùng 4", ch31: "Nại Hiên Đông", ch32: "Nại Thịnh 1", ch33: "Nại Thịnh 2",
  ch34: "Nại Hưng 1", ch35: "Nại Hưng 2", ch36: "Nại Hưng 3", ch37: "Nại Hưng 4", ch38: "Nại Hưng 5", ch39: "Nại Hưng 6",
  ch40: "Nại Hưng 7", ch41: "Nại Hưng 8", ch42: "Công An",
};
export const UNIT_RE = /^(office|ch(0[1-9]|[1-3][0-9]|4[0-2]))$/;
export const CODE_LOGIN_DOMAIN = "ma-truy-cap.hoisontra.app";
export const unitLabel = (u: string) => (u === "office" ? "Văn phòng Hội" : `Chi hội ${CHAPTER_NAMES[u] ?? u}`);
/** Synthetic identity of a code login → unit id (or null for personal emails). */
export function codeLoginUnit(email: string | null | undefined): string | null {
  const m = /^(office|ch\d\d)-v\d+-[a-z0-9]+@/.exec(email ?? "");
  return m && (email ?? "").endsWith("@" + CODE_LOGIN_DOMAIN) ? m[1]! : null;
}
export const PIN_RE = /^\d{8}$/;
export function newPin(): string {
  const a = new Uint32Array(1);
  let s = "";
  while (s.length < 8) { crypto.getRandomValues(a); if (a[0]! < 4294967290) s += String(a[0]! % 10); }
  return s;
}
