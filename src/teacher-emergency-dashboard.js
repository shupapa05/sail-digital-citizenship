import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const app = document.querySelector('#app');
const role = localStorage.getItem('SAIL_ROLE');
const storedClassCode = localStorage.getItem('SAIL_CLASS_CODE') || '';
const classCode = role === 'admin' ? 'ALL' : storedClassCode;

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
    xhr.send(JSON.stringify({ class_code: classCode }));
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
          ${notParticipants.length ? `<div class="not-participant-card"><strong>오늘 미참여 학생 (${notParticipants.length}명)</strong><small style="line-height:1.6;">${groupedNames(notParticipants)}</small><small style="margin-top:6px;display:block;">→ 수업 중 참여 여부만 빠르게 확인하세요.</small></div>` : '<div class="empty-safe">오늘은 모든 학생이 참여했습니다.</div>'}
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
  app.innerHTML = `<section class="teacher-card"><h1>교사용 대시보드</h1><p>비상 대시보드로 자료를 불러오는 중입니다. v7</p><p>role=${esc(role || '없음')} / classCode=${esc(classCode || '비어 있음')}</p></section>`;
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
