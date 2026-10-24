import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('42 chapter seeds have unique IDs and valid household totals',()=>{
 const rows=read('../seed-chapters.sql').split('\n').filter(x=>x.startsWith('INSERT OR IGNORE INTO chapters('));
 assert.equal(rows.length,42);
 const ids=rows.map(x=>x.match(/VALUES \('(ch\d{2})'/)?.[1]);
 assert.equal(new Set(ids).size,42);
 assert.deepEqual(ids,Array.from({length:42},(_,i)=>'ch'+String(i+1).padStart(2,'0')));
 const nums=rows.map(x=>x.match(/, (\d+|NULL)\);$/)?.[1]);
 assert.equal(nums.filter(x=>x==='NULL').length,1);
 assert.equal(nums.reduce((s,x)=>s+(x==='NULL'?0:Number(x)),0),20943);
});
test('front end links only to existing API endpoints',()=>{
 const api=read('../src/worker.js'),front=read('../public/app.js'),html=read('../public/index.html');
 for(const route of ['/api/me','/api/chapters','/api/submissions','/api/member-counts'])assert.ok(api.includes(route),route);
 for(const id of ['identity','notice','app','chapter','chapterInfo','submission','counts','records','history','refresh','period','total','new','left','kind','subject','body'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(front.includes('created_by')&&api.includes('status,created_by,created_at'));
});
test('security boundaries and isolated Cloudflare resources',()=>{
 const src=read('../src/worker.js'),config=read('../wrangler.toml');
 assert.match(src,/jwtVerify\(/);
 assert.match(src,/permitted\(a,/);
 assert.match(src,/chapter_access/);
 assert.match(config,/name = "hoi-phu-nu-son-tra-office"/);
 assert.doesNotMatch(config,/d3c701ec-37bc-47c2-a081-d3b803f2dd7b/);
});

