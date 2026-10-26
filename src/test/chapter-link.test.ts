import { describe, expect, it } from "vitest";
import { CHAPTER_LINK_UNIT_RE, chapterTokenFromHash, encryptChapterToken, decryptChapterToken } from "@/lib/chapter-link";
import { newLinkToken } from "@/lib/link-token";

describe("private reusable chapter links", () => {
  it("accepts exactly the 42 chapter ids, never office", () => {
    expect(Array.from({ length: 42 }, (_, i) => `ch${String(i + 1).padStart(2, "0")}`).every((id) => CHAPTER_LINK_UNIT_RE.test(id))).toBe(true);
    for (const id of ["office", "ch00", "ch43"]) expect(CHAPTER_LINK_UNIT_RE.test(id)).toBe(false);
  });
  it("requires a complete private fragment, rejects query or appended parameters", () => {
    const token = newLinkToken();
    expect(chapterTokenFromHash(`#k=${token}`)).toBe(token);
    for (const hash of [`?k=${token}`, `#k=${token}&unit=ch02`, "#k=short"]) expect(chapterTokenFromHash(hash)).toBeNull();
  });
  it("recovers the same link repeatedly without rotation", async () => {
    const token = newLinkToken();
    const cipher = await encryptChapterToken(token, "ch01", "unit-test-only-key");
    expect(cipher).not.toContain(token);
    expect(await decryptChapterToken(cipher, "ch01", "unit-test-only-key")).toBe(token);
    expect(await decryptChapterToken(cipher, "ch01", "unit-test-only-key")).toBe(token);
  });
  it("cannot recover another chapter's secret", async () => {
    const cipher = await encryptChapterToken(newLinkToken(), "ch01", "unit-test-only-key");
    await expect(decryptChapterToken(cipher, "ch02", "unit-test-only-key")).rejects.toThrow();
  });
  it("rejects ciphertext tampering or wrong encryption key", async () => {
    const cipher = await encryptChapterToken(newLinkToken(), "ch01", "unit-test-only-key");
    await expect(decryptChapterToken(cipher, "ch01", "wrong-key")).rejects.toThrow();
    await expect(decryptChapterToken(cipher.slice(0, -8) + "AAAAAAAA", "ch01", "unit-test-only-key")).rejects.toThrow();
  });
});