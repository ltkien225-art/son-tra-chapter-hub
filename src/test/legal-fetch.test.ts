import { afterEach, describe, expect, it, vi } from "vitest";
import { legalBytes, legalFetch, LEGAL_MAX_BYTES } from "@/lib/legal-fetch.server";
import { legalPassages } from "@/lib/legal-passages";
import type { LegalSource } from "@/lib/legal-evidence";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("bounded official retrieval", () => {
  it("retries 503 once with backoff then returns success", async () => {
    vi.useFakeTimers();
    const f = vi.fn().mockResolvedValueOnce(new Response("busy", { status: 503 })).mockResolvedValueOnce(new Response("ok"));
    vi.stubGlobal("fetch", f);
    const pending = legalFetch("https://vanban.chinhphu.vn/", {}, 1000);
    await vi.advanceTimersByTimeAsync(1001);
    expect((await pending).status).toBe(200); expect(f).toHaveBeenCalledTimes(2);
  });
  it.each([402, 403, 404])("never retries terminal status %s", async (status) => {
    const f = vi.fn().mockResolvedValue(new Response("denied", { status })); vi.stubGlobal("fetch", f);
    expect((await legalFetch("https://vanban.chinhphu.vn/", {}, 1000)).status).toBe(status);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("does not bypass a long Retry-After", async () => {
    const f = vi.fn().mockResolvedValue(new Response("limited", { status: 429, headers: { "retry-after": "60" } })); vi.stubGlobal("fetch", f);
    expect((await legalFetch("https://vanban.chinhphu.vn/", {}, 1000)).status).toBe(429); expect(f).toHaveBeenCalledTimes(1);
  });
  it("rejects a PDF beyond the four MB budget before parsing", async () => {
    await expect(legalBytes(new Response("x", { headers: { "content-length": String(LEGAL_MAX_BYTES + 1) } }))).rejects.toThrow();
  });
  it("ranks relevant contiguous passages and preserves exact normalized source content", () => {
    const s: LegalSource = { id: 1, title: "TEST", url: "https://datafiles.chinhphu.vn/test.pdf", kind: "text", retrievedAt: "2026-10-26", text: "khác ".repeat(4000) + "Điều 10. Giấy tờ đăng ký kết hôn. Người yêu cầu nộp tờ khai. ".repeat(5) };
    const p = legalPassages([s], "Khi cần đăng ký kết hôn thì làm gì?");
    expect(p.some((p) => p.quote.includes("đăng ký kết hôn"))).toBe(true);
    expect(p.every((p) => s.text.includes(p.quote))).toBe(true);
    expect(p.length).toBeLessThanOrEqual(10);
    expect(legalPassages([{ ...s, kind: "record" }], "kết hôn")).toEqual([]);
  });
});