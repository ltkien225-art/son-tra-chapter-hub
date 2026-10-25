import { describe, expect, it } from "vitest";
import { hashToken, isLinkToken, newLinkToken, normalizeOfficeCode, tokenFromHash } from "@/lib/link-token";
import { identityLabel, OFFICE_CODE_EMAIL, HANDOVER_EMAIL } from "@/lib/units";

describe("link tokens & office code", () => {
  it("generates 43-char base64url tokens", () => {
    for (let i = 0; i < 20; i++) expect(isLinkToken(newLinkToken())).toBe(true);
  });
  it("rejects malformed tokens", () => {
    expect(isLinkToken("short")).toBe(false);
    expect(isLinkToken("a".repeat(43) + "!")).toBe(false);
    expect(isLinkToken(null)).toBe(false);
  });
  it("hashes to 64-char lowercase hex", async () => {
    const h = await hashToken("abc");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashToken("abc")).toBe(h);
  });
  it("reads token only from the URL fragment", () => {
    const t = newLinkToken();
    expect(tokenFromHash(`#t=${t}`)).toBe(t);
    expect(tokenFromHash(`#x=1&t=${t}&y=2`)).toBe(t);
    expect(tokenFromHash("")).toBe(null);
    expect(tokenFromHash("#t=tooshort")).toBe(null);
  });
  it("normalises the office code (6–40 chars, trimmed)", () => {
    expect(normalizeOfficeCode("  abcdef ")).toBe("abcdef");
    expect(() => normalizeOfficeCode("12345")).toThrow();
    expect(() => normalizeOfficeCode("x".repeat(41))).toThrow();
  });
  it("labels synthetic identities", () => {
    expect(identityLabel(OFFICE_CODE_EMAIL)).toContain("mã bảo vệ Văn phòng");
    expect(identityLabel(HANDOVER_EMAIL)).toContain("Tiếp nhận");
    expect(identityLabel("ch07-vmh2k-abc123@ma-truy-cap.hoisontra.app")).toContain("Thành Vinh");
    expect(identityLabel("ubmttqvnphuongsontra@gmail.com")).toBe(null);
  });
});
