import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {createWorker} from '../src/worker.js';
const {publicKey,privateKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);
jwk.kid='test';const issuer='https://women-test.cloudflareaccess.com',aud='a'.repeat(64);
const worker=createWorker({keySet:()=>createLocalJWKSet({keys:[jwk]})});
function setup(){const db=new DatabaseSync(':memory:');for(const file of ['schema.sql','seed-chapters.sql'])db.exec(readFileSync(new URL('../'+file,import.meta.url),'utf8'));
 db.exec("INSERT INTO chapter_access(chapter_id,email) VALUES('ch01','one@example.test'),('ch02','two@example.test')");
 const DB={prepare(sql){return {bind(...args){const stmt=db.prepare(sql);return {all:async()=>({results:stmt.all(...args)}),first:async()=>stmt.get(...args),run:async()=>({meta:stmt.run(...args)}),execute:()=>({meta:stmt.run(...args)})}},all:async()=>({results:db.prepare(sql).all()})}},async batch(items){db.exec('BEGIN');try{const results=items.map(x=>x.execute());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}}};
 return {db,DB,ADMIN_EMAIL:'admin@example.test',CF_ACCESS_TEAM_DOMAIN:'women-test.cloudflareaccess.com',CF_ACCESS_AUD:aud};}
async function call(env,email,path,method='GET',body,origin='https://women.example.test'){
 const jwt=await new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer(issuer).setAudience(aud).setSubject(email).setIssuedAt().setExpirationTime('5m').sign(privateKey);
 return worker.fetch(new Request('https://women.example.test'+path,{method,headers:{'Cf-Access-Jwt-Assertion':jwt,origin,'content-type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})}),env);
}
test('signed identities cannot read/write another chapter; forged identity and cross-origin writes fail',async()=>{
 const env=setup(),payload={chapter_id:'ch01',kind:'report',title:'[TEST]',body:'private'};
 assert.equal((await call(env,'outsider@example.test','/api/me')).status,403);
 assert.equal((await call(env,'two@example.test','/api/submissions','POST',payload)).status,403);
 assert.equal((await call(env,'one@example.test','/api/submissions','POST',payload,'https://evil.example')).status,403);
 assert.equal((await worker.fetch(new Request('https://women.example.test/api/me',{headers:{'Cf-Access-Jwt-Assertion':'fake'}}),env)).status,401);
 const created=await call(env,'one@example.test','/api/submissions','POST',payload);assert.equal(created.status,201);
 assert.equal((await (await call(env,'two@example.test','/api/submissions')).json()).records.length,0);
 const {id}=await created.json();assert.equal((await call(env,'two@example.test','/api/submissions/'+id+'/withdraw','POST',{})).status,403);
 assert.equal((await call(env,'one@example.test','/api/submissions/'+id+'/withdraw','POST',{})).status,200);
 assert.equal((await call(env,'one@example.test','/api/submissions/'+id+'/withdraw','POST',{})).status,409);
 assert.equal((await (await call(env,'admin@example.test','/api/submissions')).json()).records[0].body,'');
 assert.equal(env.db.prepare("SELECT count(*) n FROM audit_log WHERE action='withdraw'").get().n,1);
});
test('failed audit rolls back creation and member counts; streamed byte limit enforced',async()=>{
 const env=setup();env.db.exec('DROP TABLE audit_log');
 assert.equal((await call(env,'one@example.test','/api/submissions','POST',{chapter_id:'ch01',kind:'report',title:'[TEST]',body:'x'})).status,500);
 assert.equal(env.db.prepare('SELECT count(*) n FROM submissions').get().n,0);
 assert.equal((await call(env,'one@example.test','/api/member-counts','PUT',{chapter_id:'ch01',period:'2026-10',members_total:1,members_new:0,members_left:0})).status,500);
 assert.equal(env.db.prepare('SELECT count(*) n FROM member_counts').get().n,0);
 assert.equal((await call(env,'one@example.test','/api/submissions','POST',{body:'ệ'.repeat(5000)})).status,413);
});
