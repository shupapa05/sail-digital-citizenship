import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const app = document.querySelector('#app');
const role = localStorage.getItem('SAIL_ROLE');
const storedClassCode = localStorage.getItem('SAIL_CLASS_CODE') || '';
const classCode = role === 'admin' ? 'ALL' : storedClassCode;

const teacherStyle = document.createElement('style');
teacherStyle.textContent = `
.teacher-dashboard{display:grid;gap:16px}.teacher-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}.teacher-card h1,.teacher-card h2{margin:0 0 12px;color:#07192f}.teacher-top{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:26px 28px;border-radius:26px;background:linear-gradient(135deg,#fff 0%,#f8fbff 100%)}.teacher-title-wrap{display:grid;gap:10px}.teacher-kicker{display:inline-flex;width:max-content;align-items:center;border-radius:999px;background:#eaf2ff;color:#3264df;font-size:13px;font-weight:900;padding:6px 12px}.teacher-top h1{font-size:32px;letter-spacing:-.04em;line-height:1.15}.teacher-top p{margin:0;color:#60738d;font-size:15px;line-height:1.6}.teacher-actions{display:flex;gap:10px}.teacher-actions button,.teacher-refresh,.teacher-logout{border:0;border-radius:16px;padding:13px 18px;font-weight:900;cursor:pointer}.teacher-refresh{background:#3264df;color:#fff}.teacher-logout{background:#64748b;color:#fff}.teacher-class-pill{display:inline-flex;width:max-content;border:1px solid #d9e5f4;background:#fff;color:#415a77;border-radius:999px;padding:7px 12px;font-weight:900;font-size:13px}.teacher-alert{border-radius:18px;padding:16px;background:#f8fbff;border:1px solid #d9e5f4}.teacher-alert.danger{background:#fff1f2;border-color:#fecdd3}.teacher-alert.warn{background:#fff7ed;border-color:#fed7aa}.teacher-alert.good{background:#f0fdf4;border-color:#bbf7d0}.teacher-alert strong{display:block;font-size:24px;color:#07192f}.teacher-alert p{margin:6px 0 0;color:#415a77}.teacher-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.teacher-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:16px;text-align:center}.teacher-box strong{display:block;font-size:34px;color:#07192f}.teacher-box span{font-weight:800;color:#60738d}.teacher-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.not-participant-card{display:grid;gap:8px;background:#fff1f2;border:1px solid #fecdd3;color:#7f1d1d;border-radius:16px;padding:14px;font-weight:900}.not-participant-card small{color:#991b1b;font-weight:800;line-height:1.6}.empty-safe{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:16px;padding:14px;font-weight:800}.teacher-row{display:grid;grid-template-columns:70px 1fr 44px;gap:10px;align-items:center;margin:10px 0}.teacher-track{height:14px;background:#e9f0f7;border-radius:999px;overflow:hidden}.teacher-fill{display:block;height:100%;border-radius:999px}.teacher-fill.s{background:#3b82f6}.teacher-fill.a{background:#f97316}.teacher-fill.i{background:#a855f7}.teacher-fill.l{background:#22c55e}.teacher-table{width:100%;border-collapse:collapse;min-width:640px}.teacher-table th,.teacher-table td{padding:11px;border-bottom:1px solid #e5edf7;text-align:left}.teacher-table th{color:#60738d}.table-scroll{overflow-x:auto}@media(max-width:720px){.teacher-summary,.teacher-grid{grid-template-columns:1fr}.teacher-top{grid-template-columns:1fr;padding:22px}.teacher-top h1{font-size:26px}.teacher-actions{display:grid;grid-template-columns:1fr 1fr}.teacher-actions button{width:100%}}
`;
document.head.appendChild(teacherStyle);

function esc(v){
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function n(v){ return Number(v || 0); }
function normalizeData(raw){
  if(Array.isArray(raw)) return raw[0] || {};
  if(raw && raw.data && Array.isArray(raw.data)) return raw.data[0] || {};
  if(raw && raw.data && typeof raw.data === 'object') return raw.data;
  return raw || {};
}
function logout(){
  localStorage.removeItem('SAIL_ROLE');
  localStorage.removeItem('SAIL_CLASS_CODE');
  localStorage.removeItem('SAIL_STUDENT_ID');
  localStorage.removeItem('SAIL_LOGIN_CODE');
  location.reload();
}
function areaLabel(t){ return {S:'안전',A:'책임',I:'윤리',L:'소통'}[String(t).toUpperCase()] || t; }
function getArea(area, key){ return n(area?.[key] || area?.[key.toLowerCase()] || 0); }

function requestDashboard(){
  return new Promise((resolve, reject) => {
    if(role === 'teacher' && !classCode){
      reject(new Error('교사 계정의 class_code가 비어 있습니다. teachers 테이블의 class_code 값을 확인해 주세요.'));
      return;
    }

    const xhr = new XMLHttpRequest();
    let finished = false;
    const timer = setTimeout(() => {
      if(finished) return;
      finished = true;
      try { xhr.abort(); } catch {}
      reject(new Error(`대시보드 요청 시간 초과. role=${role || '없음'}, classCode=${classCode || '비어 있음'}`));
    }, 8000);

    xhr.open('POST', `${SUPABASE_URL}/rest/v1/rpc/get_teacher_dashboard`, true);
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => {
      if(finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        if(xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data?.message || data?.error || `대시보드 요청 실패: ${xhr.status}`));
      } catch(error){ reject(error); }
    };
    xhr.onerror = () => {
      if(finished) return;
      finished = true;
      clearTimeout(timer);
      reject(new Error(`네트워크 오류. role=${role || '없음'}, classCode=${classCode || '비어 있음'}`));
    };
    xhr.send(JSON.stringify({ p_class_code: classCode }));
  });
}

function groupedNames(rows){
  const groups = {};
  (rows || []).forEach(x => {
    const grade = x.grade || x.student_grade || '';
    const cls = x.class || x.class_num || x.student_class || '';
    const key = grade && cls ? `${grade}-${cls}` : '기타';
    const number = x.number || x.student_number || '';
    const name = x.name || x.student_name || '학생';
    if(!groups[key]) groups[key] = [];
    groups[key].push(`${number ? `${number}번 ` : ''}${name}`);
  });
  if(role === 'admin'){
    return Object.entries(groups).map(([key, names]) => `<div><b>${esc(key)} (${names.length}명)</b><br>${names.map(esc).join(', ')}</div>`).join('<br>');
  }
  return Object.values(groups).flat().map(esc).join(', ');
}

function render(raw){
  const data = normalizeData(raw);
  const students = data.students || data.student_statuses || data.studentRows || [];
  const logs = data.logs || data.recent_logs || data.recentLogs || [];
  const choices = data.choices || data.choice_top || data.choiceTop || [];
  const total = n(data.total_students || data.totalStudents || data.students_total || students.length);
  const today = n(data.today_participants || data.todayParticipants || data.today_completed || data.todayCompleted || students.filter(s => n(s.today_count) > 0).length);
  const done = n(data.today_completed || data.todayCompleted || today);
  const absent = Math.max(0, n(data.today_not_participated || data.todayNotParticipated || total - today));
  const area = data.area_counts || data.areaCounts || data.sail_counts || {};
  const notParticipants = data.not_participated_students || data.notParticipants || data.absent_students || data.risk_students || data.riskStudents || students.filter(s => n(s.today_count) === 0);
  const rate = total ? Math.round(today / total * 100) : 0;
  const classLabel = role === 'admin' || classCode === 'ALL' ? '전체 학급' : `${classCode} 담임`;

  app.innerHTML = `
    <section class="teacher-dashboard">
      <div class="teacher-card teacher-top">
        <div class="teacher-title-wrap">
          <span class="teacher-kicker">교사용 화면</span>
          <h1>개입 대시보드</h1>
          <p>학생 실천 기록을 바탕으로 오늘 확인할 학생과 학급 흐름을 정리합니다.</p>
          <span class="teacher-class-pill">현재 보기 · ${esc(classLabel)}</span>
        </div>
        <div class="teacher-actions">
          <button class="teacher-refresh" data-emergency-refresh>새로고침</button>
          <button class="teacher-logout" data-emergency-logout>로그아웃</button>
        </div>
      </div>

      <div class="teacher-alert ${rate < 30 ? 'danger' : rate < 70 ? 'warn' : 'good'}">
        <strong>오늘 참여 ${today}/${total}명 (${rate}%)</strong>
        <p>${rate < 30 ? '오늘 참여가 매우 낮습니다. 미참여 학생을 먼저 확인해 주세요.' : rate < 70 ? '참여가 다소 부족합니다.' : '참여 흐름이 안정적입니다.'}</p>
      </div>

      <div class="teacher-summary">
        <div class="teacher-box"><strong>${total}</strong><span>전체 학생</span></div>
        <div class="teacher-box"><strong>${today}</strong><span>오늘 참여</span></div>
        <div class="teacher-box"><strong>${absent}</strong><span>미참여</span></div>
        <div class="teacher-box"><strong>${done}</strong><span>완료</span></div>
      </div>

      <div class="teacher-grid">
        <div class="teacher-card">
          <h2>🔴 오늘 미참여 학생</h2>
          ${notParticipants.length ? `<div class="not-participant-card"><strong>오늘 미참여 학생 (${notParticipants.length}명)</strong><small>${groupedNames(notParticipants)}</small><small>→ 수업 중 참여 여부만 빠르게 확인하세요.</small></div>` : '<div class="empty-safe">오늘은 모든 학생이 참여했습니다.</div>'}
        </div>
        <div class="teacher-card">
          <h2>S/A/I/L 영역 분석</h2>
          ${['S','A','I','L'].map(k => `<div class="teacher-row"><b>${areaLabel(k)}</b><div class="teacher-track"><i class="teacher-fill ${k.toLowerCase()}" style="width:${Math.min(100, getArea(area,k) * 10)}%"></i></div><strong>${getArea(area,k)}</strong></div>`).join('')}
        </div>
      </div>

      <div class="teacher-grid">
        <div class="teacher-card"><h2>행동·생각·마음 선택 분석</h2><p>${choices.length ? '선택 응답 데이터가 수집되었습니다.' : '아직 선택 응답이 부족합니다.'}</p></div>
        <div class="teacher-card"><h2>최근 실천 기록</h2><p>${logs.length ? `${logs.length}개의 최근 기록이 있습니다.` : '최근 기록이 없습니다.'}</p></div>
      </div>

      <div class="teacher-card">
        <h2>학생별 배지 진행도</h2>
        <div class="table-scroll"><table class="teacher-table">
          <thead><tr><th>이름</th><th>안전</th><th>책임</th><th>윤리</th><th>소통</th><th>집중 필요</th></tr></thead>
          <tbody>${students.length ? students.map(s => {
            const S = n(s.s_count), A = n(s.a_count), I = n(s.i_count), L = n(s.l_count);
            const min = [{k:'안전',v:S},{k:'책임',v:A},{k:'윤리',v:I},{k:'소통',v:L}].sort((a,b)=>a.v-b.v)[0];
            return `<tr><td>${esc(s.name || s.student_name || '학생')}</td><td>${S}/10</td><td>${A}/10</td><td>${I}/10</td><td>${L}/10</td><td>${min.k} ${min.v}/10</td></tr>`;
          }).join('') : '<tr><td colspan="6">학생별 데이터가 아직 부족합니다.</td></tr>'}</tbody>
        </table></div>
      </div>
    </section>
  `;

  document.querySelector('[data-emergency-refresh]')?.addEventListener('click', load);
  document.querySelector('[data-emergency-logout]')?.addEventListener('click', logout);
}

async function load(){
  if(!app || (role !== 'teacher' && role !== 'admin')) return;
  app.innerHTML = `<section class="teacher-card"><h1>교사용 대시보드</h1><p>비상 대시보드로 자료를 불러오는 중입니다.</p><p>role=${esc(role || '없음')} / classCode=${esc(classCode || '비어 있음')}</p></section>`;
  try{
    const raw = await requestDashboard();
    render(raw);
  }catch(error){
    app.innerHTML = `<section class="teacher-card"><h1>교사용 대시보드 오류</h1><p>${esc(error.message || '불러오지 못했습니다.')}</p><button class="teacher-refresh" data-emergency-refresh>다시 불러오기</button><button class="teacher-logout" data-emergency-logout>로그아웃</button></section>`;
    document.querySelector('[data-emergency-refresh]')?.addEventListener('click', load);
    document.querySelector('[data-emergency-logout]')?.addEventListener('click', logout);
  }
}

setTimeout(load, 300);
