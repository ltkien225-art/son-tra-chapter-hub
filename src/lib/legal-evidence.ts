import { findPersonalData } from "./legal";

export type LegalSource = { id: number; title: string; url: string; text: string; retrievedAt: string; kind: "record" | "text" };
export type LegalClaim = { text: string; sourceId: number; quote: string };
export const LEGAL_LOOKUP_LIMITATION = "Nguồn được tải tại thời điểm tra cứu, nhưng chưa xác nhận đầy đủ mọi sửa đổi, văn bản thay thế và thủ tục địa phương. Không coi ngày có hiệu lực ban đầu là xác nhận văn bản còn hiệu lực toàn bộ. Việc cụ thể cần đối chiếu với cơ quan có thẩm quyền.";

export function officialLegalUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && u.port === "" &&
      ["vanban.chinhphu.vn", "datafiles.chinhphu.vn", "xaydungchinhsach.chinhphu.vn", "bana.danang.gov.vn"].includes(u.hostname);
  } catch { return false; }
}

export const normalizeEvidence = (value: string) => value.normalize("NFC").replace(/\s+/g, " ").trim();

/** Reject invented links, unsupported articles and missing verbatim evidence. No model URLs are used. */
export function checkedClaims(input: unknown, sources: LegalSource[]): LegalClaim[] {
  if (!Array.isArray(input) || input.length > 7) return [];
  const result: LegalClaim[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return [];
    const c = item as { text?: unknown; quote?: unknown; sourceId?: unknown };
    if (typeof c.text !== "string" || typeof c.quote !== "string" || typeof c.sourceId !== "number") return [];
    const source = sources.find((s) => s.id === c.sourceId);
    const quote = normalizeEvidence(c.quote);
    if (!source || !officialLegalUrl(source.url) || futureEffectiveSource(source.text, source.retrievedAt.slice(0, 10)) || c.text.length > 1000 || quote.length < 25 || quote.length > 1600 ||
      !normalizeEvidence(source.text).includes(quote) || /https?:\/\/|www\./i.test(c.text) || findPersonalData(c.text).length) return [];
    const articles = [...c.text.matchAll(/điều\s+(\d+[a-z]?)/gi)];
    if (articles.some((m) => !new RegExp(`điều\\s+${m[1]}(?:\\D|$)`, "i").test(quote))) return [];
    // Metadata alone never supports a legal recommendation, however plausible the paraphrase.
    if (source.kind === "record") return [];
    result.push({ text: c.text.trim(), sourceId: c.sourceId, quote });
  }
  return result;
}

export function legalSearchTerm(question: string): string {
  const q = question.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  if (/ket hon|ho tich|khai sinh/.test(q)) return "hộ tịch";
  if (/bao luc gia dinh/.test(q)) return "bạo lực gia đình";
  if (/ly hon|hon nhan/.test(q)) return "hôn nhân và gia đình";
  if (/thua ke/.test(q)) return "dân sự";
  return question.replace(/[?!.,:;"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export function futureEffectiveSource(text: string, lookupDay: string): boolean {
  const m = text.match(/Ngày có hiệu lực\s+(\d{2})-(\d{2})-(\d{4})/);
  return Boolean(m && `${m[3]}-${m[2]}-${m[1]}` > lookupDay);
}

export function providerFailure(status: number): "quota" | "error" {
  return [402, 403, 429].includes(status) ? "quota" : "error";
}