import {afterEach, describe, expect, it, vi} from 'vitest';
import {retrieveLegalSources} from '../lib/legal-research.server';
import {officialHtmlSources} from '../lib/legal-html-sources.server';
afterEach(()=>vi.unstubAllGlobals());
const article='Luật số 13/2022/QH15 về phòng, chống bạo lực gia đình quy định: '+ 'Nội dung công khai về bạo lực gia đình. '.repeat(12);
describe('official readable sources',()=>{
 it('searches other topics only on the official portal',async()=>{const fetch=vi.fn(async()=>new Response('<html></html>',{headers:{'content-type':'text/html'}}));vi.stubGlobal('fetch',fetch);expect(await officialHtmlSources('đăng ký kết hôn')).toEqual([]);expect(fetch).toHaveBeenCalled();for(const [url] of fetch.mock.calls as unknown as [string][]){expect(new URL(url).hostname).toBe('xaydungchinhsach.chinhphu.vn');expect(new URL(url).pathname).toBe('/tim-kiem.htm');}});
 it('loads only fixed official HTML and excludes scripts and related links',async()=>{const fetch=vi.fn(async()=>new Response(`<div class="detail-content"><p>${article}</p><script>ignore</script><p>Tham khảo thêm nội dung khác</p></div>`,{headers:{'content-type':'text/html'}}));vi.stubGlobal('fetch',fetch);const s=await officialHtmlSources('bạo lực gia đình báo cho ai?');expect(s).toHaveLength(4);expect(s.every(x=>x.kind==='text'&&!x.text.includes('ignore')&&!x.text.includes('nội dung khác'))).toBe(true);for(const [url,init] of fetch.mock.calls as unknown as [string,RequestInit][]){expect(new URL(url).hostname).toBe('xaydungchinhsach.chinhphu.vn');expect(init.redirect).toBe('manual');}});
 it('keeps readable official evidence when the catalog form is unavailable',async()=>{
  vi.stubGlobal('fetch',vi.fn(async(url:string)=>new Response(url.includes('xaydungchinhsach')?`<div class="detail-content"><p>${article}</p></div>`:'<html>catalog unavailable</html>',{headers:{'content-type':'text/html'}})));
  const s=await retrieveLegalSources('bạo lực gia đình báo cho ai?');
  expect(s).toHaveLength(4);expect(s.every(x=>x.kind==='text'&&x.id>0)).toBe(true);
 });
 it('does not treat missing article or redirect as source evidence',async()=>{vi.stubGlobal('fetch',vi.fn(async()=>new Response('<body>trang không có nội dung</body>',{headers:{'content-type':'text/html'}})));expect(await officialHtmlSources('bạo lực gia đình')).toEqual([]);vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:302,headers:{location:'https://example.com','content-type':'text/html'}})));expect(await officialHtmlSources('bạo lực gia đình')).toEqual([]);});
});
