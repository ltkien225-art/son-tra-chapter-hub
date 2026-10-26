import { legalSearchTerm, normalizeEvidence, type LegalSource } from "./legal-evidence";

export type LegalPassage = { id: number; sourceId: number; quote: string };

/** Quote identity is assigned by the server, never rewritten by the model. */
export function legalPassages(sources: LegalSource[], question: string): LegalPassage[] {
  const normalizedQ = question.toLowerCase().replace(/\bbạo hành\b/g, "bạo lực");
  const specific = normalizedQ.match(/đăng ký kết hôn|bạo lực gia đình|khai sinh|ly hôn|thừa kế|chế độ thai sản|thai sản|nghỉ hằng năm|nghỉ phép/);
  const searchTerm = legalSearchTerm(question).toLowerCase();
  const rawWords = normalizedQ
    .replace(/[?!.,:;"<>()]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["liên", "quan", "như", "thế", "nào", "phải", "được"].includes(w));

  const keywords = [...new Set([
    ...(specific ? [specific[0]] : []),
    ...(searchTerm.length > 3 ? [searchTerm] : []),
    ...rawWords,
  ])];

  const reportQuestion = /bạo lực|bạo hành/i.test(question) && /báo|ai|tiếp nhận|liên hệ|cơ quan|ở đâu/i.test(question);
  const out: Omit<LegalPassage, "id">[] = [];

  for (const s of sources.filter((s) => s.kind === "text")) {
    const text = normalizeEvidence(s.text);
    const windows: { start: number; end: number; score: number }[] = [];
    for (let start = 0; start < text.length; start += 650) {
      const end = Math.min(text.length, start + 1000), quote = text.slice(start, end);
      const lower = quote.toLowerCase();
      const score = keywords.reduce((sum, k) => sum + (lower.includes(k) ? 10 : 0), 0)
        + (reportQuestion && /báo tin|tố giác|địa chỉ tiếp nhận|công an|ủy ban nhân dân|trưởng thôn|tổ trưởng/i.test(quote) ? 50 : 0)
        + (/điều\s+\d+/i.test(quote) ? 8 : 0)
        + (/hiệu lực|bãi bỏ|thay thế|sửa đổi/i.test(quote) ? 2 : 0);
      if (score > 0 && quote.length >= 25) windows.push({ start, end, score });
    }
    const selected: typeof windows = [];
    for (const w of windows.sort((a, b) => b.score - a.score)) {
      if (selected.every((other) => w.end <= other.start || w.start >= other.end)) selected.push(w);
      if (selected.length === 6) break;
    }
    for (const w of selected.sort((a, b) => a.start - b.start)) out.push({ sourceId: s.id, quote: text.slice(w.start, w.end) });
  }
  return out.slice(0, 12).map((p, i) => ({ ...p, id: i + 1 }));
}