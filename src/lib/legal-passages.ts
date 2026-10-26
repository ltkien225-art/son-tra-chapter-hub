import { normalizeEvidence, type LegalSource } from "./legal-evidence";

export type LegalPassage = { id: number; sourceId: number; quote: string };
/** Quote identity is assigned by the server, never rewritten by the model. */
export function legalPassages(sources: LegalSource[], question: string): LegalPassage[] {
  const specific = question.toLowerCase().match(/đăng ký kết hôn|bạo lực gia đình|khai sinh|ly hôn|thừa kế/);
  const keywords = specific ? [specific[0]] : question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const out: Omit<LegalPassage, "id">[] = [];
  for (const s of sources.filter((s) => s.kind === "text")) {
    const text = normalizeEvidence(s.text);
    const windows: { start: number; end: number; score: number }[] = [];
    for (let start = 0; start < text.length; start += 650) {
      const end = Math.min(text.length, start + 1400), quote = text.slice(start, end);
      const score = keywords.reduce((sum, k) => sum + (quote.toLowerCase().includes(k) ? 10 : 0), 0) + (/hiệu lực|bãi bỏ|thay thế/i.test(quote) ? 1 : 0);
      if (score > 0 && quote.length >= 25) windows.push({ start, end, score });
    }
    // A bounded evidence budget, ranked by actual question matches, not generic 'hộ tịch'.
    for (const w of windows.sort((a, b) => b.score - a.score).slice(0, 10).sort((a, b) => a.start - b.start)) out.push({ sourceId: s.id, quote: text.slice(w.start, w.end) });
  }
  return out.slice(0, 30).map((p, i) => ({ ...p, id: i + 1 }));
}