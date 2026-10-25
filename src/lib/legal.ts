/** Pure helpers for "Hỏi đáp pháp luật" (Mức 1). Shared by browser and server. */

export const LEGAL_AI_DAILY_LIMIT = 10;
export const LEGAL_Q_MAX = 500;

export type FaqLite = { id: string; topic: string; question: string; answer: string; source_title: string; source_article: string };

const PII_RULES: { re: RegExp; label: string }[] = [
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, label: "địa chỉ email" },
  { re: /(?:\+?84|0)[\s.-]?\d(?:[\s.-]?\d){7,9}/, label: "số điện thoại" },
  { re: /\b\d{9}\b|\b\d{12}\b/, label: "số CMND/CCCD" },
  { re: /\b(số nhà|kiệt|hẻm|ngõ|tổ dân phố)\s*\d+/i, label: "địa chỉ cụ thể" },
  { re: /\b(tôi tên là|tên tôi là|họ tên|cháu tên|chị tên|em tên)\b/i, label: "họ tên người cụ thể" },
];

/** Returns the kinds of personal data found (empty = OK to send to AI). */
export function findPersonalData(text: string): string[] {
  return PII_RULES.filter((r) => r.re.test(text)).map((r) => r.label);
}

export function validateQuestion(text: string): string | null {
  const t = text.trim();
  if (t.length < 8) return "Câu hỏi quá ngắn.";
  if (t.length > LEGAL_Q_MAX) return `Câu hỏi tối đa ${LEGAL_Q_MAX} ký tự.`;
  const pii = findPersonalData(t);
  if (pii.length) return `Câu hỏi có vẻ chứa ${pii.join(", ")}. Hãy bỏ thông tin cá nhân hoặc dùng mục "Gửi câu hỏi riêng cho cán bộ".`;
  return null;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

/** Simple keyword ranking over approved FAQs (works with no AI at all). */
export function searchFaqs<T extends FaqLite>(faqs: T[], q: string, limit = 8): T[] {
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (!words.length) return faqs.slice(0, limit);
  return faqs
    .map((f) => {
      const hay = norm(`${f.topic} ${f.question} ${f.answer} ${f.source_title}`);
      return { f, s: words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0) };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.f);
}
