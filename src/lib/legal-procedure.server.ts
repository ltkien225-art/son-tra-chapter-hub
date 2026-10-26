import { parseHTML } from "linkedom";
import { extractText, getDocumentProxy } from "unpdf";
import { legalBytes, legalFetch } from "./legal-fetch.server";
import type { LegalSource } from "./legal-evidence";

/** Public primary-source alternatives to scanned statutes; no OCR/provider service is activated. */
export async function marriageProcedureSources(): Promise<Omit<LegalSource, "id">[]> {
  const sources: Omit<LegalSource, "id">[] = [];
  const retrievedAt = new Date().toISOString();
  const url = "https://xaydungchinhsach.chinhphu.vn/nghi-dinh-120-2025-nd-cp-trinh-tu-thu-tuc-dang-ky-ho-tich-tai-ubnd-cap-xa-119250612132316605.htm";
  try {
    const document = parseHTML(new TextDecoder().decode(await legalBytes(await legalFetch(url, {}, 12000)))).document;
    const content = document.querySelector(".detail-content") ?? document.querySelector(".detail__content");
    const text = content?.textContent?.trim();
    if (text && text.includes("120/2025") && text.includes("Ủy ban nhân dân cấp xã")) sources.push({ title: "Báo Điện tử Chính phủ: phân định thẩm quyền hộ tịch theo Nghị định 120/2025/NĐ-CP", url, text, retrievedAt, kind: "text" });
  } catch { /* An unavailable official page is not replaced with model knowledge. */ }
  const pdfUrl = "https://bana.danang.gov.vn/documents/2131766/4460881/bieu-mau-dang-ky-ket-hon.pdf/00b8c1bb-42b2-c87f-3b9a-cd02737bf9b6";
  try {
    const pdf = await getDocumentProxy(await legalBytes(await legalFetch(pdfUrl, {}, 12000)));
    try {
      if (pdf.numPages <= 12) {
        const { text } = await extractText(pdf, { mergePages: true });
        // Exclude the filled example form (names/IDs/addresses), never send it to AI.
        const end = text.indexOf("Hướng dẫn điền thông tin");
        const instructions = end >= 0 ? text.slice(0, end) : "";
        if (instructions.length > 500) sources.push({ title: "Cổng xã Bà Nà, Đà Nẵng: hướng dẫn hồ sơ kết hôn (tham khảo, không phải xác nhận thủ tục Sơn Trà)", url: pdfUrl, text: instructions, retrievedAt, kind: "text" });
      }
    } finally { await pdf.cleanup(); }
  } catch { /* Never invent OCR text for unreadable scans. */ }
  return sources;
}