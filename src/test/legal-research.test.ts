import { beforeEach, describe, expect, it, vi } from "vitest";
import { legalPassages } from "@/lib/legal-passages";
import type { LegalSource } from "@/lib/legal-evidence";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("@/lib/legal-fetch.server", () => ({ legalFetch: fetchMock, legalBytes: vi.fn() }));
import { answerFromSources } from "@/lib/legal-research.server";
const source: LegalSource = { id: 1, kind: "text", title: "TEST", url: "https://datafiles.chinhphu.vn/test.pdf", retrievedAt: "2026-10-26", text: "Điều 19. Cá nhân khi phát hiện bạo lực gia đình báo tin cho cơ quan có thẩm quyền. " };
const answer = (value: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }));
beforeEach(() => fetchMock.mockReset());
describe("semantic gate after strict provenance", () => {
  it('sends no model-specific zero budget at either generation stage', async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: 'Cá nhân báo tin.', passageId: 1 }] })).mockResolvedValueOnce(answer({ supported: true }));
    await answerFromSources('TEST-NOT-A-KEY', 'Bạo lực gia đình báo cho ai?', [source]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse(call[1].body);
      expect(body.generationConfig).not.toHaveProperty('thinkingConfig');
      expect(body).not.toHaveProperty('tools');
    }
  });
  it('rejects a truncated semantic verdict rather than treating it as approval', async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: 'Cá nhân báo tin.', passageId: 1 }] })).mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"supported":true}' }] } }] })));
    expect((await answerFromSources('TEST-NOT-A-KEY', 'Bạo lực gia đình báo cho ai?', [source])).error).toBe('error');
  });
  it('returns a provider 400 without accepting claims or issuing another model call', async () => {
    fetchMock.mockResolvedValueOnce(new Response('invalid request', { status: 400 }));
    const result = await answerFromSources('TEST-NOT-A-KEY', 'Bạo lực gia đình báo cho ai?', [source]);
    expect(result.error).toBe('error'); expect('status' in result && result.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("accepts only server passages plus a positive independent verification pass", async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: "Cá nhân phát hiện bạo lực gia đình báo tin cho cơ quan có thẩm quyền.", passageId: 1 }] })).mockResolvedValueOnce(answer({ supported: true }));
    const r = await answerFromSources("TEST-NOT-A-KEY", "Bạo lực gia đình báo cho ai?", [source]);
    expect(r.error).toBeNull(); expect("claims" in r && r.claims?.[0]?.quote).toBe(legalPassages([source], "Bạo lực gia đình báo cho ai?")[0]?.quote);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("rejects unsupported meanings even when a quote really exists", async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: "Bắt buộc nộp hồ sơ trong 5 ngày.", passageId: 1 }] })).mockResolvedValueOnce(answer({ supported: false }));
    expect((await answerFromSources("TEST-NOT-A-KEY", "Bạo lực gia đình báo cho ai?", [source])).error).toBe("no_source");
  });
  it("rejects invented passage IDs without calling semantic verification", async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: "Báo cho cơ quan.", passageId: 99 }] }));
    expect((await answerFromSources("TEST-NOT-A-KEY", "Bạo lực gia đình báo cho ai?", [source])).error).toBe("no_source"); expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("returns no_source for an empty library without model call", async () => {
    expect((await answerFromSources("TEST-NOT-A-KEY", "Pháp luật Sao Hỏa là gì?", [])).error).toBe("no_source"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not bypass provider denial at the verification pass", async () => {
    fetchMock.mockResolvedValueOnce(answer({ claims: [{ text: "Cá nhân báo tin.", passageId: 1 }] })).mockResolvedValueOnce(new Response("denied", { status: 403 }));
    expect((await answerFromSources("TEST-NOT-A-KEY", "Bạo lực gia đình báo cho ai?", [source])).error).toBe("quota");
  });
});
