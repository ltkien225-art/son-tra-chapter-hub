import { parseHTML } from "linkedom";
import { legalBytes, legalFetch } from "./legal-fetch.server";
import { legalSearchTerm, normalizeEvidence, officialLegalUrl, type LegalSource } from "./legal-evidence";

const SEARCH_BASE = "https://xaydungchinhsach.chinhphu.vn";

// Fallback official primary sources for domestic violence
const domesticSources = [
  ["Địa chỉ tiếp nhận tin báo, tố giác", "https://xaydungchinhsach.chinhphu.vn/dia-chi-nao-tiep-nhan-tin-bao-to-giac-ve-hanh-vi-bao-luc-gia-dinh-119221201212722712.htm"],
  ["Biện pháp bảo vệ, hỗ trợ", "https://xaydungchinhsach.chinhphu.vn/bien-phap-ngan-chan-hanh-vi-bao-luc-gia-dinh-va-bao-ve-ho-tro-nguoi-bi-bao-luc-gia-dinh-119221202080437536.htm"],
  ["Quyền và trách nhiệm", "https://xaydungchinhsach.chinhphu.vn/quyen-cua-nguoi-bi-bao-luc-gia-dinh-trach-nhiem-cua-nguoi-co-hanh-vi-bao-luc-gia-dinh-119221201181631053.htm"],
  ["Hành vi bạo lực gia đình", "https://xaydungchinhsach.chinhphu.vn/bao-luc-gia-dinh-la-gi-nhung-hanh-vi-nao-la-hanh-vi-bao-luc-gia-dinh-119221201175317803.htm"],
] as const;

const DRAFT_PATTERN = /\b(dự thảo|đề xuất|lấy ý kiến|đề nghị xây dựng|sắp có hiệu lực)\b/i;

async function fetchPolicyArticle(titleHint: string, url: string, allowDraft: boolean): Promise<Omit<LegalSource, "id"> | null> {
  if (!officialLegalUrl(url)) return null;
  try {
    const response = await legalFetch(url, {}, 12_000);
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const document = parseHTML(new TextDecoder().decode(await legalBytes(response))).document;
    const heading = normalizeEvidence(
      document.querySelector("h1")?.textContent ??
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
      titleHint,
    );
    if (!allowDraft && DRAFT_PATTERN.test(heading)) return null;

    const content = document.querySelector(".detail-content") ?? document.querySelector(".detail__content");
    if (!content) return null;
    for (const node of content.querySelectorAll("script,style,iframe,.readmore,.VCSortableInPreviewMode")) node.remove();
    for (const node of content.querySelectorAll("p,div,li,h2,h3,br")) node.appendChild(document.createTextNode(" "));
    const text = normalizeEvidence(content.textContent ?? "").split("Tham khảo thêm")[0].trim();
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    if (text.length < 300 || text.length > 100_000) return null;
    if (!/Luật|Bộ luật|Nghị định|Thông tư|Điều\s+\d+/i.test(`${heading} ${metaDesc} ${text}`)) return null;

    return {
      title: `Báo Điện tử Chính phủ: ${heading || titleHint} — chưa xác nhận mọi sửa đổi`,
      url,
      text,
      kind: "text",
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function officialHtmlSources(question: string, plannedQueries?: string[]): Promise<Omit<LegalSource, "id">[]> {
  const allowDraft = DRAFT_PATTERN.test(question);
  const baseTerm = legalSearchTerm(question);
  const queries = [...new Set([...(plannedQueries ?? []), baseTerm])].filter((q) => q && q.trim().length >= 3).slice(0, 3);
  const candidateLinks: { title: string; url: string }[] = [];

  for (const query of queries) {
    try {
      const searchUrl = `${SEARCH_BASE}/tim-kiem.htm?keywords=${encodeURIComponent(query)}`;
      const response = await legalFetch(searchUrl, {}, 10_000);
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) continue;
      const doc = parseHTML(new TextDecoder().decode(await legalBytes(response))).document;
      const links = [...doc.querySelectorAll(".timeline_list a.box-category-link-title, a.box-category-link-title")];
      for (const a of links) {
        const href = a.getAttribute("href");
        const title = normalizeEvidence(a.textContent ?? a.getAttribute("title") ?? "");
        if (!href || !title) continue;
        if (!allowDraft && DRAFT_PATTERN.test(title)) continue;
        const fullUrl = new URL(href, SEARCH_BASE).href;
        if (officialLegalUrl(fullUrl) && !candidateLinks.some((c) => c.url === fullUrl)) {
          candidateLinks.push({ title, url: fullUrl });
        }
        if (candidateLinks.length >= 4) break;
      }
    } catch {
      /* Continue to next query or fallback */
    }
    if (candidateLinks.length >= 4) break;
  }

  if (baseTerm === "bạo lực gia đình" || queries.some((q) => /bạo lực gia đình/i.test(q))) {
    for (const [title, url] of domesticSources) {
      if (!candidateLinks.some((c) => c.url === url)) candidateLinks.push({ title, url });
    }
  }

  const sources: Omit<LegalSource, "id">[] = [];
  for (const candidate of candidateLinks.slice(0, 4)) {
    const source = await fetchPolicyArticle(candidate.title, candidate.url, allowDraft);
    if (source) sources.push(source);
  }
  return sources;
}