import { parseHTML } from "linkedom";
import { checkedClaims, futureEffectiveSource, normalizeEvidence, officialLegalUrl, providerFailure, type LegalSource } from "./legal-evidence";
import { legalBytes, legalFetch } from "./legal-fetch.server";
import { legalPassages } from "./legal-passages";
import { createLegalSourceCache } from "./legal-source-cache.server";
import { legalGenerationConfig, legalResponseText } from "./legal-gemini";

const publicSources = createLegalSourceCache();

async function publicFetch(url: string, init?: RequestInit): Promise<Response> {
  if (!officialLegalUrl(url)) throw new Error("source_not_allowed");
  const r = await legalFetch(url, init ?? {}, 12_000);
  if (!r.ok) throw new Error("source_unavailable");
  return r;
}

const html = async (url: string) => parseHTML(new TextDecoder().decode(await legalBytes(await publicFetch(url)))).document;

async function planSearch(key: string, question: string): Promise<string[]> {
  const r = await legalFetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: "Trích xuất 2-3 cụm từ khóa pháp luật cốt lõi (tối đa 4 chữ/cụm) từ câu hỏi để tìm kiếm trên Cổng thông tin. Trả về JSON: { keywords: string[] }" }] },
      contents: [{ role: "user", parts: [{ text: question }] }],
      generationConfig: legalGenerationConfig(256),
    }),
  }, 10_000, false);
  
  const fallback = [question.replace(/[^\w\s]/gi, "").split(" ").slice(0, 4).join(" ")];
  if (!r.ok) return fallback;
  
  try {
    const raw = legalResponseText(await r.json());
    const parsed = JSON.parse(raw || "{}");
    return Array.isArray(parsed.keywords) && parsed.keywords.length ? parsed.keywords.slice(0, 3) : fallback;
  } catch { return fallback; }
}

async function retrieveDynamicSources(keywords: string[]): Promise<Omit<LegalSource, "id">[]> {
  const sources: Omit<LegalSource, "id">[] = [];
  const retrievedAt = new Date().toISOString();
  
  for (const kw of keywords) {
    if (sources.length >= 3) break;
    try {
      const searchUrl = `https://xaydungchinhsach.chinhphu.vn/tim-kiem.htm?keywords=${encodeURIComponent(kw)}`;
      const searchDoc = await html(searchUrl);
      const links = [...searchDoc.querySelectorAll(".timeline_list a.box-category-link-title")].slice(0, 2);
      
      for (const link of links) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const articleUrl = new URL(href, "https://xaydungchinhsach.chinhphu.vn").href;
        if (sources.some(s => s.url === articleUrl)) continue;

        const articleDoc = await html(articleUrl);
        const contentNode = articleDoc.querySelector(".detail-content") ?? articleDoc.querySelector(".detail__content");
        if (!contentNode) continue;

        for (const node of contentNode.querySelectorAll("script,style,iframe,.readmore,.VCSortableInPreviewMode")) node.remove();
        for (const node of contentNode.querySelectorAll("p,div,li,h2,h3,br")) node.appendChild(articleDoc.createTextNode(" "));
        
        const text = normalizeEvidence(contentNode.textContent ?? "").split("Tham khảo thêm")[0].trim();
        if (text.length > 300 && !/dự thảo|đề xuất/i.test(link.textContent ?? "")) {
          sources.push({ title: normalizeEvidence(link.textContent ?? ""), url: articleUrl, text, kind: "text", retrievedAt });
        }
      }
    } catch { continue; }
  }
  return sources;
  console.log("Đã tải thành công URL:", articleUrl);
}

export async function retrieveLegalSources(key: string, question: string): Promise<LegalSource[]> {
  const keywords = await planSearch(key, question);
  const cacheKey = keywords.join("-").slice(0, 50);
  const sources = await publicSources(cacheKey, () => retrieveDynamicSources(keywords));
  return sources.map((s, i) => ({ ...s, id: i + 1 }));
  console.log("Từ khóa Gemini tạo ra:", keywords);
}

export async function answerFromSources(key: string, question: string, sources: LegalSource[]) {
  const passages = legalPassages(sources, question);
  if (!passages.length) return { error: "no_source" } as const;
  
  const context = sources.map((s) => ({ id: s.id, kind: s.kind, title: s.title, futureEffective: futureEffectiveSource(s.text, new Date().toISOString().slice(0, 10)), metadata: s.text.slice(0, 350) }));
  
  const r = await legalFetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent", {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `Bạn là trợ lý pháp lý hỗ trợ người dân Sơn Trà. NGUYÊN TẮC TỐI THƯỢNG: Phải xác nhận nguồn thông tin chính xác từ văn bản trước khi đưa ra câu trả lời. Chỉ suy luận dựa trên dữ liệu do máy chủ cung cấp, không dùng kiến thức cũ. Nếu hỏi về bạo hành, hướng dẫn liên hệ Công an/UBND/Hội LHPN. Xuất JSON {claims:[{text,passageId}]}. Mỗi text là một nhận định độc lập, passageId là ID của đoạn văn bản gốc hỗ trợ nhận định đó. Ngày tra cứu: ${new Date().toISOString().slice(0, 10)}.` }] },
      contents: [{ role: "user", parts: [{ text: JSON.stringify({ question, sources: context, passages }) }] }],
      generationConfig: legalGenerationConfig(1800),
    }),
  }, 30_000, false);
  
  if (!r.ok) {
    console.warn("legal_provider_failure", r.status);
    return { error: providerFailure(r.status), status: r.status } as const;
  }
  
  const raw = legalResponseText(await r.json());
  if (!raw) return { error: "error", status: 200 } as const;
  
  try {
    const parsed = JSON.parse(raw) as { claims?: { text?: unknown; passageId?: unknown }[] };
    if (!Array.isArray(parsed.claims)) return { error: "no_source" } as const;
    const mapped = parsed.claims.map((c) => {
      const p = passages.find((p) => p.id === c.passageId);
      return { text: c.text, sourceId: p?.sourceId, quote: p?.quote };
    });
    
    const claims = checkedClaims(mapped, sources);
    return { claims, error: claims.length ? null : "no_source" } as const;
  } catch { return { error: "error", status: 200 } as const; }
}