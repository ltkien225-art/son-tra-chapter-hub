import { createRemoteJWKSet, jwtVerify } from 'jose';

const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
class ApiError extends Error{constructor(status,message){super(message);this.status=status}}
const validEmail=s=>/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s);
const isId=s=>/^ch(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(s);
async function bodyOf(req){
 if(req.headers.get('content-type')?.split(';')[0].trim()!=='application/json')throw new ApiError(415,'Expected JSON');
 const reader=req.body?.getReader();if(!reader)throw new ApiError(400,'Expected object');
 let size=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>10000){await reader.cancel();throw new ApiError(413,'Payload too large')}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new ApiError(400,'Invalid JSON')}
 if(!body||Array.isArray(body)||typeof body!=='object')throw new ApiError(400,'Expected object');return body;
}
export function createWorker({keySet=createRemoteJWKSet}={}){
 const keys=new Map();
 async function actor(req,env){
  const domain=String(env.CF_ACCESS_TEAM_DOMAIN||'').replace(/^https:\/\//,'').trim(),aud=String(env.CF_ACCESS_AUD||''),admin=String(env.ADMIN_EMAIL||'').trim().toLowerCase();
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain)||!/^[a-f0-9]{64}$/i.test(aud)||!validEmail(admin)||!env.DB)throw new ApiError(503,'Secure Access/D1 not configured');
  const token=req.headers.get('Cf-Access-Jwt-Assertion');if(!token)throw new ApiError(401,'Unauthorized');
  const issuer='https://'+domain;if(!keys.has(issuer))keys.set(issuer,keySet(new URL(issuer+'/cdn-cgi/access/certs')));
  let email;try{const {payload}=await jwtVerify(token,keys.get(issuer),{issuer,audience:aud,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});email=String(payload.email||'').toLowerCase();if(!validEmail(email))throw Error()}catch{throw new ApiError(401,'Unauthorized')}
  if(email===admin)return {email,admin:true,chapters:[]};
  const {results}=await env.DB.prepare('SELECT chapter_id FROM chapter_access WHERE email=?').bind(email).all();
  if(!results?.length)throw new ApiError(403,'No chapter access');
  return {email,admin:false,chapters:results.map(x=>x.chapter_id)};
 }
 function permitted(a,id){if(!a.admin&&!a.chapters.includes(id))throw new ApiError(403,'Forbidden')}
 function audit(env,a,action,type,id){return env.DB.prepare('INSERT INTO audit_log(actor,action,resource_type,resource_id) VALUES(?,?,?,?)').bind(a.email,action,type,id)}
 async function api(req,env,url,a){
  const p=url.pathname,m=req.method;
  if(p==='/api/me'&&m==='GET')return reply({email:a.email,admin:a.admin,chapters:a.chapters});
  if(p==='/api/chapters'&&m==='GET'){
   const {results}=a.admin?await env.DB.prepare('SELECT id,name,households FROM chapters ORDER BY id').all():await env.DB.prepare('SELECT c.id,c.name,c.households FROM chapters c JOIN chapter_access x ON x.chapter_id=c.id WHERE x.email=? ORDER BY c.id').bind(a.email).all();
   return reply({chapters:results});
  }
  if(p==='/api/submissions'&&m==='GET'){
   const id=url.searchParams.get('chapter_id');if(id&&!isId(id))throw new ApiError(400,'Invalid chapter');
   if(id)permitted(a,id);
   const {results}=a.admin?(id?await env.DB.prepare('SELECT id,chapter_id,kind,title,body,status,created_by,created_at FROM submissions WHERE chapter_id=? ORDER BY created_at DESC LIMIT 100').bind(id).all():await env.DB.prepare('SELECT id,chapter_id,kind,title,body,status,created_by,created_at FROM submissions ORDER BY created_at DESC LIMIT 100').all()):await env.DB.prepare('SELECT id,chapter_id,kind,title,body,status,created_by,created_at FROM submissions WHERE chapter_id IN (SELECT chapter_id FROM chapter_access WHERE email=?) ORDER BY created_at DESC LIMIT 100').bind(a.email).all();
   for(const row of results)if(row.status==='withdrawn'&&row.created_by!==a.email)row.body='';
   return reply({records:results});
  }
  if(p==='/api/submissions'&&m==='POST'){
   const b=await bodyOf(req);if(!isId(b.chapter_id)||!['report','activity','situation','feedback'].includes(b.kind)||typeof b.title!=='string'||!b.title.trim()||b.title.length>180||typeof b.body!=='string'||b.body.length>5000)throw new ApiError(400,'Invalid submission');
   permitted(a,b.chapter_id);const id=crypto.randomUUID();
   await env.DB.batch([env.DB.prepare('INSERT INTO submissions(id,chapter_id,kind,title,body,created_by) VALUES(?,?,?,?,?,?)').bind(id,b.chapter_id,b.kind,b.title.trim(),b.body,a.email),audit(env,a,'create','submission',id)]);return reply({id},201);
  }
  const withdraw=p.match(/^\/api\/submissions\/([0-9a-f-]{36})\/withdraw$/);
  if(withdraw&&m==='POST'){
   const row=await env.DB.prepare('SELECT id,chapter_id,created_by,status FROM submissions WHERE id=?').bind(withdraw[1]).first();if(!row)throw new ApiError(404,'Not found');
   permitted(a,row.chapter_id);if(!a.admin&&row.created_by!==a.email)throw new ApiError(403,'Forbidden');
   if(row.status!=='submitted')throw new ApiError(409,'Not withdrawable');
   const changes=await env.DB.batch([env.DB.prepare("UPDATE submissions SET status='withdrawn',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='submitted'").bind(row.id),env.DB.prepare("INSERT INTO audit_log(actor,action,resource_type,resource_id) SELECT ?,'withdraw','submission',? WHERE changes()>0").bind(a.email,row.id)]);if(!changes[0].meta.changes)throw new ApiError(409,'Not withdrawable');return reply({ok:true});
  }
  if(p==='/api/member-counts'&&m==='GET'){
   const id=url.searchParams.get('chapter_id');if(!id||!isId(id))throw new ApiError(400,'Invalid chapter');permitted(a,id);
   const {results}=await env.DB.prepare('SELECT chapter_id,period,members_total,members_new,members_left,updated_at FROM member_counts WHERE chapter_id=? ORDER BY period DESC LIMIT 24').bind(id).all();return reply({records:results});
  }
  if(p==='/api/member-counts'&&m==='PUT'){
   const b=await bodyOf(req);if(!isId(b.chapter_id)||typeof b.period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.period)||!['members_total','members_new','members_left'].every(k=>Number.isSafeInteger(b[k])&&b[k]>=0))throw new ApiError(400,'Invalid counts');
   permitted(a,b.chapter_id);
   await env.DB.batch([env.DB.prepare('INSERT INTO member_counts(chapter_id,period,members_total,members_new,members_left,updated_by) VALUES(?,?,?,?,?,?) ON CONFLICT(chapter_id,period) DO UPDATE SET members_total=excluded.members_total,members_new=excluded.members_new,members_left=excluded.members_left,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP').bind(b.chapter_id,b.period,b.members_total,b.members_new,b.members_left,a.email),audit(env,a,'upsert','member_counts',b.chapter_id+':'+b.period)]);return reply({ok:true});
  }
  throw new ApiError(404,'Not found');
 }
 return {async fetch(req,env){try{const url=new URL(req.url);if(url.pathname==='/health')return reply({status:'ok',service:'hoi-phu-nu-son-tra-office'});if(!url.pathname.startsWith('/api/')){if(!env.ASSETS)throw new ApiError(503,'Assets unavailable');return env.ASSETS.fetch(req)}const a=await actor(req,env);if(!['GET','HEAD'].includes(req.method)&&(req.headers.get('origin')!==url.origin||req.headers.get('sec-fetch-site')==='cross-site'))throw new ApiError(403,'Cross-origin writes forbidden');return await api(req,env,url,a)}catch(e){return reply({error:e instanceof ApiError?e.message:'Internal error'},e instanceof ApiError?e.status:500)}}};
}
export default createWorker();

