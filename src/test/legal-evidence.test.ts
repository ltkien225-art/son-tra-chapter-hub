import { describe, expect, it } from "vitest";
import { checkedClaims, futureEffectiveSource, officialLegalUrl, providerFailure, type LegalSource } from "@/lib/legal-evidence";
import { LEGAL_AI_DAILY_LIMIT, validateQuestion } from "@/lib/legal";

const quote = "Điều 19. Cá nhân có trách nhiệm báo tin về hành vi bạo lực gia đình.";
const source: LegalSource = { id: 1, title: "TEST", text: quote, url: "https://datafiles.chinhphu.vn/test.pdf", retrievedAt: "2026-10-26T00:00:00Z", kind: "text" };
const claim = { text: "Điều 19 đề cập trách nhiệm báo tin.", sourceId: 1, quote };
describe("official legal evidence boundaries", () => {
  it("keeps the owner's 10 daily requests", () => expect(LEGAL_AI_DAILY_LIMIT).toBe(10));
  it("accepts 500 characters and rejects 501 without truncating", () => {
    expect(validateQuestion("a".repeat(500))).toBeNull();
    expect(validateQuestion("a".repeat(501))).not.toBeNull();
  });
  it("requires an actually retrieved verbatim quote", () => {
    expect(checkedClaims([claim], [source])).toHaveLength(1);
    expect(checkedClaims([{ ...claim, quote: "Điều 19. Nội dung này không xuất hiện trong nguồn đã tải." }], [source])).toEqual([]);
  });
  it("rejects a fabricated article even with a genuine quote", () => expect(checkedClaims([{ ...claim, text: "Điều 22 quy định báo tin." }], [source])).toEqual([]));
  it("rejects model-supplied URLs", () => expect(checkedClaims([{ ...claim, text: "Xem https://example.com" }], [source])).toEqual([]));
  it("does not treat metadata as proof of legal articles", () => expect(checkedClaims([claim], [{ ...source, kind: "record" }])).toEqual([]));
  it("identifies a law not effective on the lookup date", () => {
    expect(futureEffectiveSource("Ngày có hiệu lực 01-03-2027", "2026-10-26")).toBe(true);
    expect(futureEffectiveSource("Ngày có hiệu lực 01-07-2023", "2026-10-26")).toBe(false);
  });
  it("rejects a genuine quote from a not-yet-effective source", () => expect(checkedClaims([claim], [{ ...source, text: "Ngày có hiệu lực 01-03-2027 " + quote }])).toEqual([]));
  it("rejects untrusted, credential-bearing and internal source URLs", () => {
    for (const u of ["http://vanban.chinhphu.vn/", "https://vanban.chinhphu.vn.evil.test/", "https://user@vanban.chinhphu.vn/", "https://127.0.0.1/", "https://vanban.chinhphu.vn:8080/"]) expect(officialLegalUrl(u)).toBe(false);
    expect(officialLegalUrl(source.url)).toBe(true);
  });
  it.each([402, 403, 429])("returns quota without paid fallback for %s", (status) => expect(providerFailure(status)).toBe("quota"));
  it("returns recoverable error on Google 503", () => expect(providerFailure(503)).toBe("error"));
});