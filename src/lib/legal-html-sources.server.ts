import { parseHTML } from "linkedom";
import { legalBytes, legalFetch } from "./legal-fetch.server";
import { legalSearchQueries, legalSearchTerm, normalizeEvidence, officialLegalUrl, type LegalSource } from "./legal-evidence";

const SEARCH_BASE = "https://xaydungchinhsach.chinhphu.vn";

// Fallback official articles for domestic violence when search results are sparse
const domesticSources = [
  ["Địa chỉ tiếp nhận tin báo, tố giác", "https://xaydungchinhsach.chinhphu.vn/dia-chi-nao-tiep-nhan-tin-bao-to-giac-ve-hanh-vi-bao-luc-gia-dinh-119221201212722712.htm"],
  ["Biện pháp bảo vệ, hỗ trợ", "https://xaydungchinhsach.chinhphu.vn/bien-phap-ngan-chan-hanh-vi-bao-luc-gia-dinh-va-bao-ve-ho-tro-nguoi-bi-bao-luc-gia-dinh-119221202080437536.htm"],
  ["Quyền và trách nhiệm", "https://xaydungchinhsach.chinhphu.vn/quyen-cua-nguoi-bi-bao-luc-gia-dinh-trach-nhiem-cua-nguoi-co-hanh-vi-bao-luc-gia-dinh-119221201181631053.htm"],
  ["Hành vi bạo lực gia đình", "https://xaydungchinhsach.chinhphu.vn/bao-luc-gia-dinh-la-gi-nhung-hanh-vi-nao-la-hanh-vi-bao-luc-gia-dinh-119221201175317803.htm"],
] as const;

const DRAFT_OR_PROPOSAL = /\b(dự thảo|đề xuất|lấy ý kiến|sắp có hiệu lực|đề nghị xây dựng)\b/i;

async function fetchReadableArticle(titleHint: string, url: string, allowDraft: boolean): Promise<Omit<LegalSource, "id"> | null> {
  if (!officialLegalUrl(url)) return null;
  try {
    const response = await legalFetch(url, {}, 12_000);
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return null;
    const document = parseHTML(new TextDecoder().decode(await legalBytes(response))).document;
    const pageTitle = normalizeEvidence(
      document.querySelector("h1")?.textContent ??
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
      titleHint,
    );
    if (!allowDraft && DRAFT_OR_PROPOSAL.test(pageTitle)) return null;

    const content = document.querySelector(".detail-content") ?? document.querySelector(".detail__content");
    if (!content) return null;
    for (const node of content.querySelectorAll("script,style,iframe,.readmore,.VCSortableInPreviewMode")) node.remove();
    for (const node of content.querySelectorAll("p,div,li,h2,h3,br")) node.appendChild(document.createTextNode(" "));
    const text = normalizeEvidence(content.textContent ?? "").split("Tham khảo thêm")[0].trim();
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    if (text.length < 300 || text.length > 100_000) return null;
    if (!/Luật|Bộ luật|Nghị định|Thông tư|Điều\s+\d+/i.test(`${pageTitle} ${metaDesc} ${text}`)) return null;

    return {
      title: `Cổng TTĐT Chính phủ (Xây dựng chính sách): ${pageTitle || titleHint} — chưa xác nhận mọi sửa đổi`,
      url,
      text,
      kind: "text",
      retrievedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function officialHtmlSources(question: string): Promise<Omit<LegalSource, "id">[]> {
  const allowDraft = DRAFT_OR_PROPOSAL.test(question);
  const queries = legalSearchQueries(question);
  const candidateLinks: { title: string; url: string }[] = [];

  for (const q of queries) {
    try {
      const searchUrl = `${SEARCH_BASE}/tim-kiem.htm?keywords=${encodeURIComponent(q)}`;
      const response = await legalFetch(searchUrl, {}, 10_000);
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) continue;
      const doc = parseHTML(new TextDecoder().decode(await legalBytes(response))).document;
      const anchors = [...doc.querySelectorAll(".timeline_list a.box-category-link-title, a.box-category-link-title")];
      for (const a of anchors) {
        const href = a.getAttribute("href");
        const title = normalizeEvidence(a.textContent ?? a.getAttribute("title") ?? "");
        if (!href || !title) continue;
        if (!allowDraft && DRAFT_OR_PROPOSAL.test(title)) continue;
        const fullUrl = new URL(href, SEARCH_BASE).href;
        if (officialLegalUrl(fullUrl) && !candidateLinks.some((c) => c.url === fullUrl)) {
          candidateLinks.push({ title, url: fullUrl });
        }
        if (candidateLinks.length >= 4) break;
      }
    } catch {
      /* Search page failure does not block fallback or catalog lookup */
    }
    if (candidateLinks.length >= 4) break;
  }

  if (legalSearchTerm(question) === "bạo lực gia đình") {
    for (const [title, url] of domesticSources) {
      if (!candidateLinks.some((c) => c.url === url)) {
        candidateLinks.push({ title, url });
      }
    }
  }

  const sources: Omit<LegalSource, "id">[] = [];
  for (const item of candidateLinks.slice(0, 4)) {
    const article = await fetchReadableArticle(item.title, item.url, allowDraft);
    if (article) sources.push(article);
  }
  return sources;
}