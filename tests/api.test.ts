import assert from 'node:assert/strict';
import http from 'node:http';
process.env.SUPABASE_URL='https://test.supabase.co';
process.env.SUPABASE_SECRET_KEY='sb_secret_test_only';
process.env.APP_DATA_SCOPE='ngoc-yen-test';
process.env.INITIAL_TEACHER_PASSWORD='TestOnlyPassword2026';
const realFetch=globalThis.fetch;
let row: any=null, failWrite=false, conflict=false;
globalThis.fetch=(async (input: any, init: any={})=>{
  const req=input instanceof Request?input:new Request(input,init);
  const u=new URL(req.url);
  if(u.hostname!=='test.supabase.co') return realFetch(input,init);
  const body=req.method==='GET'?null:await req.json();
  if(u.pathname.includes('/rpc/')) {
    if(failWrite) return Response.json({message:'offline'},{status:503});
    if(conflict || body.p_revision!==row.revision) return Response.json(false);
    row={payload:structuredClone(body.p_payload),revision:row.revision+1};
    return Response.json(true);
  }
  if(req.method==='POST') { if(!row) row={payload:body.payload,revision:0};return new Response(null,{status:201}); }
  return Response.json(row);
}) as typeof fetch;
let {default:app}=await import('../backend/app');
async function serve(){const s=http.createServer(app);await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));return s;}
let server=await serve();
async function call(path:string, method='GET', body?:any, token?:string){
 const port=(server.address() as any).port;
 const response=await realFetch(`http://127.0.0.1:${port}/api${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 assert.match(response.headers.get('content-type')||'',/application\/json/);
 return {status:response.status,data:await response.json()};
}
try {
 assert.equal((await call('/config')).status,200);
 assert.equal((await call('/auth/login','POST',{role:'teacher',password:'bad'})).status,401);
 const login=await call('/auth/login','POST',{role:'teacher',password:'TestOnlyPassword2026'});
 assert.equal(login.status,200);const token=login.data.token;
 assert.ok(row.payload._sessions[token]);
 assert.equal((await call('/config','POST',{className:'TEST'},token)).status,200);
 await new Promise<void>(r=>server.close(()=>r())); const restartModule = '../backend/app.ts?restart=1'; app=(await import(restartModule)).default; server=await serve();
 assert.equal((await call('/students','GET',undefined,token)).status,200);
 assert.equal((await call('/config')).data.className,'TEST');
 assert.equal((await call('/auth/change-password','POST',{currentPassword:'TestOnlyPassword2026',newPassword:'NewPassword2026',confirmPassword:'NewPassword2026'},token)).status,200);
 assert.equal((await call('/auth/login','POST',{role:'teacher',password:'TestOnlyPassword2026'})).status,401);
 assert.equal((await call('/auth/login','POST',{role:'teacher',password:'NewPassword2026'})).status,200);
 const add=await call('/students','POST',{code:'01',fullName:'Test student',gender:'Nữ',birthDate:'2013-10-02'},token);
 assert.equal(add.status,200);
 const studentLogin=await call('/auth/login','POST',{role:'student',username:'0102102013',password:'02102013'});
 assert.equal(studentLogin.status,200);
 assert.equal((await call('/students/other','GET',undefined,studentLogin.data.token)).status,403);
 assert.equal((await call('/config','POST',{className:'DENIED'},studentLogin.data.token)).status,403);
 failWrite=true;
 assert.equal((await call('/config','POST',{className:'UNSAVED'},token)).status,503);
 failWrite=false;
 assert.equal((await call('/config')).data.className,'TEST');
 conflict=true;
 assert.equal((await call('/config','POST',{className:'CONFLICT'},token)).status,409);
 conflict=false;
 assert.equal((await call('/config')).data.className,'TEST');
 assert.equal((await call('/nonexistent')).status,404);
 console.log('PASS: login, durable sessions/password/config, student permissions, failed saves, conflict protection, JSON 404. Supabase transport mocked.');
} finally {await new Promise<void>(r=>server.close(()=>r())); globalThis.fetch=realFetch;}
