import { afterEach, expect, it, vi } from "vitest";
import { createLegalSourceCache, LEGAL_SOURCE_TTL_MS } from "@/lib/legal-source-cache.server";

const source = { title: "TEST public", url: "https://vanban.chinhphu.vn/", text: "TEST public text", kind: "text" as const, retrievedAt: "2026-10-26T08:00:00Z" };
afterEach(() => vi.useRealTimers());
it("shares only public topic retrieval for ten minutes without changing retrieval time", async () => {
  vi.useFakeTimers();
  const cache = createLegalSourceCache(), load = vi.fn(async () => [source]);
  await cache("marriage", load);
  expect((await cache("marriage", load))[0]?.retrievedAt).toBe(source.retrievedAt);
  expect(load).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(LEGAL_SOURCE_TTL_MS + 1);
  await cache("marriage", load);
  expect(load).toHaveBeenCalledTimes(2);
});
it("does not cache unknown topics, failed loads or metadata-only responses", async () => {
  const cache = createLegalSourceCache(), load = vi.fn(async () => [source]);
  await cache("private question", load); await cache("private question", load);
  expect(load).toHaveBeenCalledTimes(2);
  const failed = vi.fn(async () => { throw new Error("offline"); });
  await expect(cache("marriage", failed)).rejects.toThrow("offline");
  await expect(cache("marriage", failed)).rejects.toThrow("offline");
  expect(failed).toHaveBeenCalledTimes(2);
  const metadata = vi.fn(async () => [{ ...source, kind: "record" as const }]);
  await cache("marriage", metadata); await cache("marriage", metadata);
  expect(metadata).toHaveBeenCalledTimes(2);
});
it("coalesces simultaneous public loads and prevents caller mutations", async () => {
  const cache = createLegalSourceCache(), load = vi.fn(async () => [source]);
  const [a, b] = await Promise.all([cache("marriage", load), cache("marriage", load)]);
  if (a[0]) a[0].text = "modified";
  expect(b[0]?.text).toBe(source.text);
  expect((await cache("marriage", load))[0]?.text).toBe(source.text);
  expect(load).toHaveBeenCalledTimes(1);
});