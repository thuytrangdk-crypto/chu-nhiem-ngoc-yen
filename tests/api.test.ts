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
  const studentId = add.data.student.id;
  const studentLogin=await call('/auth/login','POST',{role:'student',username:'0102102013',password:'02102013'});
  assert.equal(studentLogin.status,200);
  assert.equal((await call('/students/other','GET',undefined,studentLogin.data.token)).status,403);
  assert.equal((await call('/config','POST',{className:'DENIED'},studentLogin.data.token)).status,403);

  // --- Conduct Semester Tests ---
  const now = new Date();
  const y = now.getFullYear();
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todayStr = toIso(now);
  const minusDays = (days: number) => toIso(new Date(now.getTime() - days * 86400000));
  const plusDays = (days: number) => toIso(new Date(now.getTime() + days * 86400000));
  const testSchoolYear = '2026-2027';

  // Invalid overlapping semester config rejected
  assert.equal((await call('/config','POST',{
    schoolYear: testSchoolYear,
    semesterConfigs: {
      [testSchoolYear]: {
        schoolYear: testSchoolYear,
        hk1: { startDate: minusDays(30), endDate: plusDays(5) },
        hk2: { startDate: plusDays(5), endDate: plusDays(30) },
      }
    }
  }, token)).status, 400);

  // Scenario 1: Configure HK1 to include today, record -2 -> HK1 = 198
  const hk1ActiveConfig = {
    [testSchoolYear]: {
      schoolYear: testSchoolYear,
      hk1: { startDate: minusDays(60), endDate: plusDays(10) },
      hk2: { startDate: plusDays(11), endDate: plusDays(90) },
    },
    '2027-2028': {
      schoolYear: '2027-2028',
      hk1: { startDate: `${y + 1}-09-05`, endDate: `${y + 2}-01-17` },
      hk2: { startDate: `${y + 2}-01-18`, endDate: `${y + 2}-05-31` },
    }
  };
  assert.equal((await call('/config','POST',{ schoolYear: testSchoolYear, semesterConfigs: hk1ActiveConfig }, token)).status, 200);

  const hk1IncidentRes = await call('/conduct/incidents', 'POST', {
    studentId,
    date: todayStr,
    ruleName: 'Đi học muộn',
    category: 'violation',
    points: 2,
    content: 'Muộn 5 phút HK1',
  }, token);
  assert.equal(hk1IncidentRes.status, 200);
  assert.equal(hk1IncidentRes.data.incident.schoolYear, testSchoolYear);
  assert.equal(hk1IncidentRes.data.incident.semester, 'HK1');
  assert.equal(hk1IncidentRes.data.isWithinConfiguredRange, true);

  const sumHk1Active = await call(`/conduct/summary?studentId=${studentId}`, 'GET', undefined, token);
  assert.equal(sumHk1Active.status, 200);
  assert.equal(sumHk1Active.data.activeSemester.semester, 'HK1');
  assert.equal(sumHk1Active.data.summaries[0].summary.finalScore, 198);
  assert.equal(sumHk1Active.data.summaries[0].summary.rank, 'Tốt');

  // Scenario 2: Transition to HK2 via configurable dates -> HK2 starts at 200, HK1 remains 198
  const hk1Date = minusDays(20);
  const hk2ActiveConfig = {
    ...hk1ActiveConfig,
    [testSchoolYear]: {
      schoolYear: testSchoolYear,
      hk1: { startDate: minusDays(60), endDate: minusDays(5) },
      hk2: { startDate: minusDays(4), endDate: plusDays(90) },
    }
  };
  assert.equal((await call('/config','POST',{ schoolYear: testSchoolYear, semesterConfigs: hk2ActiveConfig }, token)).status, 200);

  const sumHk2Before = await call(`/conduct/summary?studentId=${studentId}`, 'GET', undefined, token);
  assert.equal(sumHk2Before.data.activeSemester.semester, 'HK2');
  assert.equal(sumHk2Before.data.summaries[0].summary.finalScore, 200);
  assert.equal(sumHk2Before.data.summaries[0].summary.initialScore, 200);

  // Scenario 3 & 4: Record -5 in HK2 -> HK2 = 195, HK1 still = 198
  const hk2IncidentRes = await call('/conduct/incidents', 'POST', {
    studentId,
    date: todayStr,
    ruleName: 'Nghỉ học không phép',
    category: 'violation',
    points: 5,
    content: 'Nghỉ không phép HK2',
  }, token);
  assert.equal(hk2IncidentRes.status, 200);
  assert.equal(hk2IncidentRes.data.incident.semester, 'HK2');

  const fullYearRes = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, token);
  assert.equal(fullYearRes.status, 200);
  assert.equal(fullYearRes.data.summaries[0].hk1.finalScore, 198);
  assert.equal(fullYearRes.data.summaries[0].hk2.finalScore, 195);

  // Scenario 5: Persist cleanly across server restart
  await new Promise<void>(r=>server.close(()=>r()));
  const restartModule2 = '../backend/app.ts?restart=2';
  app = (await import(restartModule2)).default;
  server = await serve();

  const afterRestartAll = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, token);
  assert.equal(afterRestartAll.data.summaries[0].hk1.finalScore, 198);
  assert.equal(afterRestartAll.data.summaries[0].hk2.finalScore, 195);
  assert.equal((await call(`/conduct/incidents?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=HK1`, 'GET', undefined, token)).data.length, 1);
  assert.equal((await call(`/conduct/incidents?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=HK2`, 'GET', undefined, token)).data.length, 1);

  // Student RBAC on summary: querying another studentId only returns logged-in student's summary
  const stuSummary = await call(`/conduct/summary?studentId=someone_else&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, studentLogin.data.token);
  assert.equal(stuSummary.status, 200);
  assert.equal(stuSummary.data.summaries.length, 1);
  assert.equal(stuSummary.data.summaries[0].studentId, studentId);

  // Out-of-range warning check
  const outRangeRes = await call('/conduct/incidents', 'POST', {
    studentId,
    date: minusDays(120),
    schoolYear: testSchoolYear,
    semester: 'HK1',
    ruleName: 'Khác',
    category: 'reward',
    points: 3,
    content: 'Thưởng ngoài khung ngày',
  }, token);
  assert.equal(outRangeRes.status, 200);
  assert.equal(outRangeRes.data.isWithinConfiguredRange, false);
  assert.ok(outRangeRes.data.warning);

  // Scenario 7: Edit cross-semester & delete HK1 without affecting HK2
  // Move the out-of-range +3 reward incident into HK1 by date, then move it to HK2, then verify both semesters recalculate
  const moveToHk1 = await call(`/conduct/incidents/${outRangeRes.data.incident.id}`, 'PUT', {
    date: hk1Date,
    points: 3,
  }, token);
  assert.equal(moveToHk1.status, 200);
  assert.equal(moveToHk1.data.currentSemester.semester, 'HK1');
  let checkBoth = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, token);
  assert.equal(checkBoth.data.summaries[0].hk1.finalScore, 201); // 200 - 2 + 3
  assert.equal(checkBoth.data.summaries[0].hk2.finalScore, 195);

  const moveToHk2 = await call(`/conduct/incidents/${outRangeRes.data.incident.id}`, 'PUT', {
    date: todayStr,
    points: 4,
  }, token);
  assert.equal(moveToHk2.status, 200);
  assert.equal(moveToHk2.data.previousSemester.semester, 'HK1');
  assert.equal(moveToHk2.data.currentSemester.semester, 'HK2');
  checkBoth = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, token);
  assert.equal(checkBoth.data.summaries[0].hk1.finalScore, 198);
  assert.equal(checkBoth.data.summaries[0].hk2.finalScore, 199); // 200 - 5 + 4

  // Delete HK1 violation -> HK1 becomes 200, HK2 stays 199
  assert.equal((await call(`/conduct/incidents/${hk1IncidentRes.data.incident.id}`, 'DELETE', undefined, token)).status, 200);
  checkBoth = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=ALL`, 'GET', undefined, token);
  assert.equal(checkBoth.data.summaries[0].hk1.finalScore, 200);
  assert.equal(checkBoth.data.summaries[0].hk2.finalScore, 199);

  // Switch to new school year 2027-2028 -> HK1 initialized to 200, old school year history preserved
  const nextYearSum = await call(`/conduct/summary?studentId=${studentId}&schoolYear=2027-2028&semester=HK1`, 'GET', undefined, token);
  assert.equal(nextYearSum.data.summaries[0].summary.finalScore, 200);
  const oldYearSum = await call(`/conduct/summary?studentId=${studentId}&schoolYear=${testSchoolYear}&semester=HK2`, 'GET', undefined, token);
  assert.equal(oldYearSum.data.summaries[0].summary.finalScore, 199);

  failWrite=true;
  assert.equal((await call('/config','POST',{className:'UNSAVED'},token)).status,503);
  failWrite=false;
  assert.equal((await call('/config')).data.className,'TEST');
  conflict=true;
  assert.equal((await call('/config','POST',{className:'CONFLICT'},token)).status,409);
  conflict=false;
  assert.equal((await call('/config')).data.className,'TEST');
  assert.equal((await call('/nonexistent')).status,404);
  console.log('PASS: login, durable sessions/password/config, student permissions, conduct semesters (HK1/HK2 isolation, transitions, cross-semester edit, persistence), failed saves, conflict protection, JSON 404. Supabase transport mocked.');
 } finally {await new Promise<void>(r=>server.close(()=>r())); globalThis.fetch=realFetch;}
