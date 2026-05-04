import { getTeacherDashboard } from './api.js';

const css = `
.teacher-dashboard{display:grid;gap:16px}
.teacher-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
.teacher-card h1,.teacher-card h2{margin:0 0 12px}
.teacher-top{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:26px 28px;border-radius:26px;background:linear-gradient(135deg,#fff 0%,#f8fbff 100%)}
.teacher-title-wrap{display:grid;gap:10px}
.teacher-kicker{display:inline-flex;width:max-content;align-items:center;border-radius:999px;background:#eaf2ff;color:#3264df;font-size:13px;font-weight:900;padding:6px 12px}
.teacher-top h1{margin:0;color:#07192f;font-size:32px;letter-spacing:-.04em;line-height:1.15}
.teacher-top p{margin:0;color:#60738d;font-size:15px;line-height:1.6}
.teacher-actions{display:flex;gap:10px;align-items:center}
.teacher-actions button{border:0;border-radius:16px;padding:13px 18px;font-weight:900;white-space:nowrap;cursor:pointer}
.teacher-actions button:hover{filter:brightness(.96)}
.teacher-refresh{background:#3264df;color:#fff}
.teacher-logout{background:#64748b;color:#fff}
.teacher-class-pill{display:inline-flex;align-items:center;gap:6px;width:max-content;border:1px solid #d9e5f4;background:#fff;color:#415a77;border-radius:999px;padding:7px 12px;font-weight:900;font-size:13px}
.teacher-alert{border-radius:18px;padding:16px;background:#f8fbff;border:1px solid #d9e5f4}
.teacher-alert.danger{background:#fff1f2;border-color:#fecdd3}
.teacher-alert.warn{background:#fff7ed;border-color:#fed7aa}
.teacher-alert.good{background:#f0fdf4;border-color:#bbf7d0}
.teacher-alert strong{display:block;font-size:24px;color:#07192f}
.teacher-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.teacher-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:16px;text-align:center}
.teacher-box strong{display:block;font-size:34px;color:#07192f}
.teacher-box span{font-weight:800;color:#60738d}
.teacher-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.teacher-list{display:grid;gap:8px}
.teacher-item{display:grid;grid-template-columns:1fr auto;gap:10px;background:#f8fbff;border-radius:14px;padding:12px;align-items:center}
.teacher-item small{grid-column:1/-1}
.teacher-badge{border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900}
.teacher-badge.red{background:#fee2e2;color:#b91c1c}
.teacher-badge.orange{background:#ffedd5;color:#c2410c}
.teacher-badge.green{background:#dcfce7;color:#15803d}
.not-participant-card{display:grid;gap:4px;background:#fff1f2;border:1px solid #fecdd3;color:#7f1d1d;border-radius:16px;padding:13px 14px;font-weight:900}
.not-participant-card strong{color:#7f1d1d}
.not-participant-card small{color:#991b1b;font-weight:700;line-height:1.45}
.empty-safe{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:16px;padding:14px;font-weight:800}
.teacher-bars{display:grid;gap:10px}
.teacher-row{display:grid;grid-template-columns:70px 1fr 44px;gap:10px;align-items:center}
.teacher-track{height:14px;background:#e9f0f7;border-radius:999px;overflow:hidden}
.teacher-fill{height:100%;border-radius:999px}
.teacher-fill.s{background:#3b82f6}.teacher-fill.a{background:#f97316}.teacher-fill.i{background:#a855f7}.teacher-fill.l{background:#22c55e}
.teacher-line{width:100%;height:auto;color:#3264df;background:#f8fbff;border-radius:16px;padding:8px}
.teacher-line text{font-size:10px;fill:#60738d}
.choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.choice-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;display:grid;gap:8px}
.choice-box span{font-weight:900;color:#60738d}
.choice-box strong{font-size:28px;color:#07192f}
.choice-box p{margin:0;color:#415a77;line-height:1.45;font-size:13px}
.choice-meter{height:10px;background:#e9f0f7;border-radius:999px;overflow:hidden}
.choice-meter i{display:block;height:100%;border-radius:999px;background:#3264df}
.choice-insight{margin-top:14px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;color:#07192f;line-height:1.55}
.choice-insight b{color:#3264df}
.choice-guide{display:grid;gap:6px;margin-top:10px;color:#60738d;font-size:13px;line-height:1.45}
.teacher-table{width:100%;border-collapse:collapse;min-width:720px}
.teacher-table th,.teacher-table td{padding:11px;border-bottom:1px solid #e5edf7;text-align:left}
.teacher-table th{color:#60738d}
.table-scroll{overflow-x:auto}
.state-red{color:#b91c1c;font-weight:900}.state-orange{color:#c2410c;font-weight:900}.state-green{color:#15803d;font-weight:900}
@media(max-width:720px){.teacher-summary,.teacher-grid,.choice-grid{grid-template-columns:1fr}.teacher-box strong{font-size:28px}.teacher-top{grid-template-columns:1fr;padding:22px}.teacher-top h1{font-size:26px}.teacher-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.teacher-actions button{width:100%}.teacher-item{grid-template-columns:1fr}.teacher-row{grid-template-columns:58px 1fr 36px}}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function n(v){return Number(v||0)}
function pct(v,total){return Math.round((n(v)/Math.max(1,n(total)))*100)}
function areaLabel(t){return {S:'안전',A:'책임',I:'윤리',L:'소통'}[String(t).toUpperCase()]||t}
function getRole(obj){const s=obj?.student||obj||{};return String(s.role||s.user_role||s.type||s.account_type||'').toLowerCase()}
function isTeacher(obj){const r=getRole(obj);return r==='teacher'||r==='admin'||r==='교사'||r==='관리자'||obj?.student?.is_teacher===true||obj?.is_teacher===true}
function isTeacherMode(){return localStorage.getItem('SAIL_ROLE')==='teacher'||localStorage.getItem('SAIL_ROLE')==='admin'}
function storeRoleFromResponse(data){
  if(isTeacher(data)){
    const role=getRole(data);
    const classCode=data?.student?.class_code||data?.student?.classCode||data?.class_code||'';
    localStorage.setItem('SAIL_ROLE',role==='admin'||role==='관리자'?'admin':'teacher');
    localStorage.setItem('SAIL_CLASS_CODE',classCode);
    setTimeout(forceTeacher,0);
  }else if(!isTeacherMode()){
    localStorage.setItem('SAIL_ROLE','student');
  }
}
const originalFetch=window.fetch.bind(window);
window.fetch=async(...args)=>{
  const res=await originalFetch(...args);
  const url=String(args[0]||'');
  if(!url.includes('/rpc/login_student')&&!url.includes('/rpc/get_student_home'))return res;
  try{const data=await res.clone().json();storeRoleFromResponse(data)}catch{}
  return res;
};
function logoutTeacher(){localStorage.removeItem('SAIL_STUDENT_ID');localStorage.removeItem('SAIL_LOGIN_CODE');localStorage.removeItem('SAIL_ROLE');localStorage.removeItem('SAIL_CLASS_CODE');location.reload()}
function last7Labels(){const today=new Date();return Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-(6-i));return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'}).format(d)})}
function lineChart(rows,target=5){const labels=last7Labels();const map={};(rows||[]).forEach(r=>{const key=String(r.date||r.day||'').slice(5,10);map[key]=n(r.count||r.participants||r.total)});const vals=labels.map(l=>map[l]||0);const max=Math.max(target,1,...vals);const pts=vals.map((v,i)=>`${28+i*48},${112-(v/max)*82}`).join(' ');const targetY=112-(target/max)*82;return `<svg class="teacher-line" viewBox="0 0 340 145"><line x1="24" x2="322" y1="${targetY}" y2="${targetY}" stroke="#f97316" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>${vals.map((v,i)=>`<circle cx="${28+i*48}" cy="${112-(v/max)*82}" r="5" fill="currentColor"></circle><text x="${28+i*48}" y="136" text-anchor="middle">${labels[i]}</text><text x="${28+i*48}" y="${102-(v/max)*82}" text-anchor="middle">${v}</text>`).join('')}</svg><p>주황 점선은 권장 참여 기준선입니다.</p>`}
function areaRows(area){return ['S','A','I','L'].map(t=>({t,v:n(area?.[t]||area?.[t.toLowerCase()]||0)}))}
function areaBars(area){const rows=areaRows(area);const max=Math.max(1,...rows.map(x=>x.v));return `<div class="teacher-bars">${rows.map(x=>`<div class="teacher-row"><b>${areaLabel(x.t)}</b><div class="teacher-track"><i class="teacher-fill ${x.t.toLowerCase()}" style="width:${Math.round(x.v/max*100)}%"></i></div><strong>${x.v}</strong></div>`).join('')}</div>`}
function weakestArea(area){return areaRows(area).sort((a,b)=>a.v-b.v)[0]}
function strongestArea(area){return areaRows(area).sort((a,b)=>b.v-a.v)[0]}
function list(title,items,empty,type='normal'){
  const rows=items||[];
  return `<div class="teacher-card"><h2>${title}</h2><div class="teacher-list">${rows.length?rows.slice(0,8).map(x=>{
    if(type==='risk'){
  if(document.querySelector('[data-risk-card]')) return '';

  const names = rows.map(x=>{
    const grade=x.grade||x.student_grade||'';
    const cls=x.class||x.class_num||x.student_class||'';
    const number=x.number||x.student_number||'';

    const prefix = grade && cls ? `${grade}-${cls} ` : '';
    const num = number ? `${number}번 ` : '';

    return `${prefix}${num}${x.name||x.student_name||''}`;
  });

  return `
    <div class="not-participant-card" data-risk-card="1">
      <strong>🔴 오늘 미참여 학생 (${names.length}명)</strong>
      <small style="line-height:1.6;">
        ${names.join(', ')}
      </small>
      <small style="margin-top:6px;display:block;">
        → 수업 중 참여 여부만 빠르게 확인하세요.
      </small>
    </div>
  `;
}
    return `<div class="teacher-item"><b>${esc(x.name||x.student_name||x.title||x.mission_title||'학생')}</b><span class="teacher-badge orange">${esc(x.reason||x.count||x.date||'확인')}</span><small>${esc(x.memo||x.note||x.detail||'')}</small></div>`;
  }).join(''):`<div class="empty-safe">${empty}</div>`}</div></div>`;
}
function choiceKind(row,index){
  const raw=String(row.choice_group||row.choiceGroup||row.group||row.category||row.type||row.kind||row.dimension||'').toLowerCase();
  if(raw.includes('행동')||raw.includes('action')||raw.includes('choice1'))return 'action';
  if(raw.includes('생각')||raw.includes('think')||raw.includes('thought')||raw.includes('choice2'))return 'think';
  if(raw.includes('마음')||raw.includes('감정')||raw.includes('heart')||raw.includes('emotion')||raw.includes('choice3'))return 'heart';
  return ['action','think','heart'][index%3];
}
function choiceText(row){return row.text||row.choice_text||row.choiceText||row.title||row.label||row.answer||'응답'}
function choiceCount(row){return n(row.count||row.total||row.value||row.cnt||1)}
function choiceSummary(choices){
  const rows=Array.isArray(choices)?choices:[];
  const groups={
    action:{name:'행동',desc:'실천으로 옮기려는 선택',total:0,items:[]},
    think:{name:'생각',desc:'상황을 판단하고 이해하는 선택',total:0,items:[]},
    heart:{name:'마음',desc:'감정·공감·관계를 살피는 선택',total:0,items:[]}
  };
  rows.forEach((row,index)=>{
    const key=choiceKind(row,index);
    const item={text:choiceText(row),count:choiceCount(row)};
    groups[key].total+=item.count;
    groups[key].items.push(item);
  });
  const ordered=Object.values(groups);
  const maxTotal=Math.max(1,...ordered.map(g=>g.total));
  const top=[...ordered].sort((a,b)=>b.total-a.total)[0];
  const low=[...ordered].sort((a,b)=>a.total-b.total)[0];
  const total=ordered.reduce((sum,g)=>sum+g.total,0);
  const insight=total===0
    ? '아직 선택 응답이 부족합니다. 학생들이 미션을 1회 이상 기록하면 학급 경향이 표시됩니다.'
    : `<b>${top.name}</b> 선택이 가장 많습니다. ${top.name==='행동'?'실천 의지는 높으므로 경험을 나누게 하면 좋습니다.':top.name==='생각'?'판단과 이해 중심 반응이 강하므로 실제 행동 연결 질문을 더하면 좋습니다.':'공감과 관계 인식이 잘 나타나므로 구체적인 실천 약속으로 이어가면 좋습니다.'} 상대적으로 <b>${low.name}</b> 선택이 낮아 이 부분을 다음 활동에서 보완하면 좋습니다.`;
  return `<div class="teacher-card"><h2>행동·생각·마음 선택 분석</h2><div class="choice-grid">${ordered.map(g=>`<div class="choice-box"><span>${g.name}</span><strong>${g.total}</strong><div class="choice-meter"><i style="width:${Math.round(g.total/maxTotal*100)}%"></i></div><p>${g.desc}</p><p>${g.items.length?g.items.sort((a,b)=>b.count-a.count).slice(0,2).map(x=>`${esc(x.text)} ${esc(x.count)}`).join('<br>'):'응답 부족'}</p></div>`).join('')}</div><div class="choice-insight">${insight}</div><div class="choice-guide"><span>행동: 바로 실천하려는 반응</span><span>생각: 기준을 세우고 판단하는 반응</span><span>마음: 공감과 감정을 살피는 반응</span></div></div>`;
}
function studentTable(rows){const data=(rows||[]).slice(0,30);return `<div class="teacher-card"><h2>학생별 개입 현황</h2><div class="table-scroll"><table class="teacher-table"><thead><tr><th>이름</th><th>상태</th><th>강점</th><th>보완</th><th>교사 행동</th></tr></thead><tbody>${data.length?data.map(s=>{const score=n(s.total_score||s.score||s.count);const state=score<=3?['🔴 위험','state-red','즉시 확인']:score<=8?['🟠 관찰','state-orange','균형 지도']:['🟢 안정','state-green','유지·칭찬'];return `<tr><td>${esc(s.name||s.student_name||'학생')}</td><td class="${state[1]}">${state[0]}</td><td>${esc(areaLabel(s.strong||s.best_area||''))}</td><td>${esc(areaLabel(s.weak||s.weak_area||''))}</td><td>${state[2]}</td></tr>`}).join(''):'<tr><td colspan="5">학생별 데이터가 아직 부족합니다.</td></tr>'}</tbody></table></div></div>`}
function renderTeacher(data){
  const total=n(data.total_students||data.totalStudents||data.students_total);
  const today=n(data.today_participants||data.todayParticipants||data.today_completed||data.todayCompleted);
  const done=n(data.today_completed||data.todayCompleted||today);
  const absent=Math.max(0,n(data.today_not_participated||data.todayNotParticipated||total-today));
  const area=data.area_counts||data.areaCounts||data.sail_counts||{};
  const trend=data.recent_7days||data.recent7days||data.daily_trend||[];
  const notParticipants=data.not_participated_students||data.notParticipants||data.absent_students||data.risk_students||data.riskStudents||[];
  const recent=data.recent_logs||data.recentLogs||data.logs||[];
  const choices=data.choice_top||data.choiceTop||data.choices||[];
  const students=data.students||data.student_statuses||data.studentRows||[];
  const rate=pct(today,total);
  const alertClass=rate<30?'danger':rate<70?'warn':'good';
  const alertText=rate<30?'오늘 참여가 매우 낮습니다. 미참여 학생을 먼저 확인해 주세요.':rate<70?'참여가 다소 부족합니다. 미참여 학생에게 짧게 안내해 주세요.':'참여 흐름이 안정적입니다. 긍정 사례를 공유하세요.';
  const weak=weakestArea(area), strong=strongestArea(area);
  const role=localStorage.getItem('SAIL_ROLE')||'teacher';
  const classCode=localStorage.getItem('SAIL_CLASS_CODE')||'ALL';
  const classLabel=role==='admin'||classCode==='ALL'?'전체 학급':`${classCode} 담임`;
  return `<section class="teacher-dashboard"><div class="teacher-card teacher-top"><div class="teacher-title-wrap"><span class="teacher-kicker">교사용 화면</span><h1>개입 대시보드</h1><p>학생 실천 기록을 바탕으로 오늘 확인할 학생과 학급 흐름을 정리합니다.</p><span class="teacher-class-pill">현재 보기 · ${esc(classLabel)}</span></div><div class="teacher-actions"><button class="teacher-refresh" data-teacher-refresh>새로고침</button><button class="teacher-logout" data-teacher-logout>로그아웃</button></div></div><div class="teacher-alert ${alertClass}"><strong>오늘 참여 ${today}/${total}명 (${rate}%)</strong><p>${alertText}</p></div><div class="teacher-summary"><div class="teacher-box"><strong>${total}</strong><span>전체 학생</span></div><div class="teacher-box"><strong>${today}</strong><span>오늘 참여</span></div><div class="teacher-box"><strong>${absent}</strong><span>미참여</span></div><div class="teacher-box"><strong>${done}</strong><span>완료</span></div></div><div class="teacher-grid"><div class="teacher-card"><h2>최근 7일 참여 흐름</h2>${lineChart(trend,Math.ceil(total*0.6))}</div><div class="teacher-card"><h2>S/A/I/L 영역 분석</h2>${areaBars(area)}<p>강점은 <b>${areaLabel(strong?.t)}</b>, 보완이 필요한 영역은 <b>${areaLabel(weak?.t)}</b>입니다.</p></div></div><div class="teacher-grid">${list('🔴 오늘 미참여 학생',notParticipants,'오늘은 모든 학생이 참여했습니다.','risk')}${choiceSummary(choices)}</div>${studentTable(students)}
${renderBadgeProgressTable(students)}
${list('최근 실천 기록',recent,'최근 기록이 없습니다.')}</section>`;
}
async function loadTeacher(){
  const role=localStorage.getItem('SAIL_ROLE')||'teacher';
  const classCode=role==='admin'?'ALL':(localStorage.getItem('SAIL_CLASS_CODE')||'');
  const app=document.querySelector('#app');
  if(!app)return;
  app.dataset.teacherLoaded='1';
  app.innerHTML='<section class="teacher-card"><h1>교사용 대시보드</h1><p>자료를 불러오는 중입니다.</p></section>';
  try{
    const data=await getTeacherDashboard(classCode);
    app.innerHTML=renderTeacher(data||{});
    document.querySelector('[data-teacher-refresh]')?.addEventListener('click',loadTeacher);
    document.querySelector('[data-teacher-logout]')?.addEventListener('click',logoutTeacher);
  }catch(e){
    app.innerHTML=`<section class="teacher-card"><h1>교사용 대시보드 오류</h1><p>${esc(e.message||'불러오지 못했습니다.')}</p></section>`;
  }
}
function forceTeacher(){
  if(!isTeacherMode())return;
  const app=document.querySelector('#app');
  if(!app)return;
  const isDash=!!app.querySelector('.teacher-dashboard')||!!app.querySelector('.teacher-card');
  if(!isDash||app.querySelector('.bottom-nav')||app.querySelector('.home-title-card'))loadTeacher();
}
function maybeTeacher(){if(!isTeacherMode())return;forceTeacher()}
new MutationObserver(maybeTeacher).observe(document.body,{childList:true,subtree:true});
setInterval(maybeTeacher,700);
setTimeout(maybeTeacher,200);
function renderBadgeStats(rows){
  let stats = { S:0, A:0, I:0, L:0 };

  rows.forEach(r=>{
    const items = r.items || [];

    if(items.includes('badge_s')) stats.S++;
    if(items.includes('badge_a')) stats.A++;
    if(items.includes('badge_i')) stats.I++;
    if(items.includes('badge_l')) stats.L++;
  });

  return `
    <div class="teacher-card">
      <h2>배지 현황</h2>
      <div class="teacher-grid">
        <div>🟦 안전 ${stats.S}명</div>
        <div>🟧 책임 ${stats.A}명</div>
        <div>🟪 윤리 ${stats.I}명</div>
        <div>🟩 소통 ${stats.L}명</div>
      </div>
    </div>
  `;
}
function getProgressText(row){
  const s = Number(row.s_count || 0);
  const a = Number(row.a_count || 0);
  const i = Number(row.i_count || 0);
  const l = Number(row.l_count || 0);

  const arr = [
    {key:'안전', value:s},
    {key:'책임', value:a},
    {key:'윤리', value:i},
    {key:'소통', value:l},
  ];

  const min = arr.sort((a,b)=>a.value-b.value)[0];

  return `${min.key} ${min.value}/10`;
}

function renderBadgeProgressTable(rows){
  function num(v){ return Number(v||0); }

  function getRow(r){
    const s = num(r.s_count);
    const a = num(r.a_count);
    const i = num(r.i_count);
    const l = num(r.l_count);

    const arr = [
      {k:'안전', v:s},
      {k:'책임', v:a},
      {k:'윤리', v:i},
      {k:'소통', v:l}
    ];

    const min = arr.sort((a,b)=>a.v-b.v)[0];

    return `
      <tr>
        <td>${r.name || r.student_name || ''}</td>
        <td>${s}/10</td>
        <td>${a}/10</td>
        <td>${i}/10</td>
        <td>${l}/10</td>
        <td style="font-weight:900;color:#334155;">
          ${min.k} ${min.v}/10
        </td>
      </tr>
    `;
  }

  return `
    <div class="teacher-card">
      <h2>학생별 배지 진행도</h2>
      <div class="table-scroll">
        <table class="teacher-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>안전</th>
              <th>책임</th>
              <th>윤리</th>
              <th>소통</th>
              <th>집중 필요</th>
            </tr>
          </thead>
          <tbody>
            ${(rows||[]).map(getRow).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
