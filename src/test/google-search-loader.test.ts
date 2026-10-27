import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  document.getElementById("hoi-google-search-element")?.remove();
  delete (window as unknown as Record<string, unknown>)["__gcse"];
  delete (window as unknown as Record<string, unknown>)["google"];
  vi.resetModules();
});
describe("Google Search Element loader", () => {
  it("rejects URLs and Google API keys passed instead of an engine identifier", async () => {
    const { validSearchEngineId, loadGoogleSearch } = await import("@/lib/google-search-element");
    expect(validSearchEngineId("https://evil.example/script.js")).toBe("");
    expect(validSearchEngineId("AIzaSyExampleKeyDoNotSendToSearchElement")).toBe("");
    expect(validSearchEngineId("017123456789012345678:exampleID")).toBeTruthy();
    await expect(loadGoogleSearch("https://evil.example/script.js")).rejects.toThrow();
    expect(document.getElementById("hoi-google-search-element")).toBeNull();
  });
  it("loads only Google's supported script once and initializes explicit rendering", async () => {
    const { loadGoogleSearch } = await import("@/lib/google-search-element");
    const promise = loadGoogleSearch("preview-search-id");
    expect(loadGoogleSearch("preview-search-id")).toBe(promise);
    const script = document.getElementById("hoi-google-search-element") as HTMLScriptElement;
    expect(script.src).toBe("https://cse.google.com/cse.js?cx=preview-search-id&hl=vi");
    expect(script.referrerPolicy).toBe("origin");
    const api = { render: vi.fn(), getElement: vi.fn() };
    const w = window as unknown as {
      google: object;
      __gcse: { parsetags: string; initializationCallback: () => void };
    };
    expect(w.__gcse.parsetags).toBe("explicit");
    w.google = { search: { cse: { element: api } } };
    w.__gcse.initializationCallback();
    await expect(promise).resolves.toBe(api);
  });
  it("fails within a bounded time if the Google script never initializes", async () => {
    vi.useFakeTimers();
    const { loadGoogleSearch } = await import("@/lib/google-search-element");
    const failure = expect(loadGoogleSearch("preview-search-id")).rejects.toThrow("Chưa tải được");
    await vi.advanceTimersByTimeAsync(15_000);
    await failure;
  });
});
