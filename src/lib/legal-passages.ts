import { normalizeEvidence, type LegalSource } from "./legal-evidence";

export type LegalPassage = { id: number; sourceId: number; quote: string };

export function legalPassages(sources: LegalSource[], question: string, dynamicKeywords: string[] = []): LegalPassage[] {
  const baseWords = question.toLowerCase().replace(/[?.,]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const keywords = [...new Set([...baseWords, ...dynamicKeywords.map(k => k.toLowerCase())])];
  const out: Omit<LegalPassage, "id">[] = [];
  
  for (const s of sources) {
    if (!s.text || s.text.length < 50) continue;
    const text = normalizeEvidence(s.text);
    const windows: { start: number; end: number; score: number }[] = [];
    
    for (let start = 0; start < text.length; start += 650) {
      const end = Math.min(text.length, start + 1000), quote = text.slice(start, end);
      const lowerQuote = quote.toLowerCase();
      let score = keywords.reduce((sum, k) => sum + (lowerQuote.includes(k) ? 10 : 0), 0);
      
      // Ưu tiên các đoạn chứa điều luật, thẩm quyền và hiệu lực để tăng độ chính xác của nguồn
      if (/điều \d+|khoản \d+|thẩm quyền|cơ quan|liên hệ/i.test(lowerQuote)) score += 20;
      if (/hiệu lực|bãi bỏ|thay thế|sửa đổi/i.test(lowerQuote)) score += 15;
      
      if (score > 10 && quote.length >= 25) windows.push({ start, end, score });
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