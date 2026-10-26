import { parseHTML } from 'linkedom';
import { legalBytes, legalFetch } from './legal-fetch.server';
import { legalSearchTerm, normalizeEvidence, type LegalSource } from './legal-evidence';

// Fixed public primary sources, not prepared answers. Never accept a user URL.
const domesticSources = [
  ['Địa chỉ tiếp nhận tin báo, tố giác', 'https://xaydungchinhsach.chinhphu.vn/dia-chi-nao-tiep-nhan-tin-bao-to-giac-ve-hanh-vi-bao-luc-gia-dinh-119221201212722712.htm'],
  ['Biện pháp bảo vệ, hỗ trợ', 'https://xaydungchinhsach.chinhphu.vn/bien-phap-ngan-chan-hanh-vi-bao-luc-gia-dinh-va-bao-ve-ho-tro-nguoi-bi-bao-luc-gia-dinh-119221202080437536.htm'],
  ['Quyền và trách nhiệm', 'https://xaydungchinhsach.chinhphu.vn/quyen-cua-nguoi-bi-bao-luc-gia-dinh-trach-nhiem-cua-nguoi-co-hanh-vi-bao-luc-gia-dinh-119221201181631053.htm'],
  ['Hành vi bạo lực gia đình', 'https://xaydungchinhsach.chinhphu.vn/bao-luc-gia-dinh-la-gi-nhung-hanh-vi-nao-la-hanh-vi-bao-luc-gia-dinh-119221201175317803.htm'],
] as const;

export async function officialHtmlSources(question: string): Promise<Omit<LegalSource, 'id'>[]> {
  if (legalSearchTerm(question) !== 'bạo lực gia đình') return [];
  const sources: Omit<LegalSource, 'id'>[] = [];
  for (const [title, url] of domesticSources) {
    try {
      const response = await legalFetch(url, {}, 12000);
      if (!response.headers.get('content-type')?.includes('text/html')) continue;
      const document = parseHTML(new TextDecoder().decode(await legalBytes(response))).document;
      const content = document.querySelector('.detail-content') ?? document.querySelector('.detail__content');
      if (!content) continue;
      for (const node of content.querySelectorAll('script,style,iframe,.readmore,.VCSortableInPreviewMode')) node.remove();
      for (const node of content.querySelectorAll('p,div,li,h2,h3,br')) node.appendChild(document.createTextNode(' '));
      const text = normalizeEvidence(content.textContent ?? '').split('Tham khảo thêm')[0].trim();
      if (text.length < 300 || text.length > 100000 || !text.includes('bạo lực gia đình') || !/13\/2022|Luật/.test(text + ' ' + (document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''))) continue;
      sources.push({ title: `Báo Điện tử Chính phủ: ${title} — trích Luật 13/2022, chưa xác nhận mọi sửa đổi`, url, text, kind: 'text', retrievedAt: new Date().toISOString() });
    } catch { /* Unavailable sources never become model knowledge or invented text. */ }
  }
  return sources;
}
