import { getTeacherDashboard, isConfigured } from './api.js';

const root = document.querySelector('#teacherApp');
const LAST_CLASS_CODE_KEY = 'SAIL_TEACHER_CLASS_CODE';

const css = `
.app-shell.teacher-wide{width:min(1120px,100%)}
.teacher-dashboard{display:grid;gap:16px}
.teacher-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
.teacher-card h1,.teacher-card h2{margin:0 0 12px}
.teacher-top{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;padding:26px 28px;border-radius:26px;background:linear-gradient(135deg,#fff 0%,#f8fbff 100%)}
.teacher-title-wrap{display:grid;gap:10px}
.teacher-kicker{display:inline-flex;width:max-content;align-items:center;border-radius:999px;background:#eaf2ff;color:#3264df;font-size:13px;font-weight:900;padding:6px 12px}
.teacher-top h1{margin:0;color:#07192f;font-size:32px;letter-spacing:0;line-height:1.15}
.teacher-top p{margin:0;color:#60738d;font-size:15px;line-height:1.6}
.teacher-actions{display:flex;gap:10px;align-items:center}
.teacher-actions button{border:0;border-radius:16px;padding:13px 18px;font-weight:900;white-space:nowrap;cursor:pointer}
.teacher-refresh{background:#3264df;color:#fff}
.teacher-logout{background:#64748b;color:#fff}
.teacher-class-pill{display:inline-flex;align-items:center;gap:6px;width:max-content;border:1px solid #d9e5f4;background:#fff;color:#415a77;border-radius:999px;padding:7px 12px;font-weight:900;font-size:13px}
.teacher-admin-form{display:grid;grid-template-columns:minmax(150px,1fr) auto;gap:10px;min-width:300px}
.teacher-alert{border-radius:18px;padding:16px;background:#f8fbff;border:1px solid #d9e5f4}
.teacher-alert.danger{background:#fff1f2;border-color:#fecdd3}
.teacher-alert.warn{background:#fff7ed;border-color:#fed7aa}
.teacher-alert.good{background:#f0fdf4;border-color:#bbf7d0}
.teacher-alert strong{display:block;font-size:24px;color:#07192f}
.teacher-alert p{margin:6px 0 0;color:#415a77}
.teacher-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.teacher-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:16px;text-align:center}
.teacher-box strong{display:block;font-size:34px;color:#07192f}
.teacher-box span{font-weight:800;color:#60738d}
.teacher-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.not-participant-card{display:grid;gap:4px;background:#fff1f2;border:1px solid #fecdd3;color:#7f1d1d;border-radius:16px;padding:13px 14px;font-weight:900}
.not-participant-card strong{color:#7f1d1d}
.not-participant-card small{color:#991b1b;font-weight:700;line-height:1.55}
.empty-safe{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;border-radius:16px;padding:14px;font-weight:800}
.teacher-bars{display:grid;gap:10px}
.teacher-row{display:grid;grid-template-columns:70px 1fr 44px;gap:10px;align-items:center}
.teacher-track{height:14px;background:#e9f0f7;border-radius:999px;overflow:hidden}
.teacher-fill{display:block;height:100%;border-radius:999px}
.teacher-fill.s{background:#3b82f6}.teacher-fill.a{background:#f97316}.teacher-fill.i{background:#a855f7}.teacher-fill.l{background:#22c55e}
.choice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.choice-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;display:grid;gap:8px}
.choice-box span{font-weight:900;color:#60738d}
.choice-box strong{font-size:28px;color:#07192f}
.choice-box p{margin:0;color:#415a77;line-height:1.45;font-size:13px}
.choice-meter{height:10px;background:#e9f0f7;border-radius:999px;overflow:hidden}
.choice-meter i{display:block;height:100%;border-radius:999px;background:#3264df}
.choice-insight{margin-top:14px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;color:#07192f;line-height:1.55}
.choice-insight b{color:#3264df}
.teacher-list{display:grid;gap:8px}
.teacher-item{display:grid;grid-template-columns:1fr auto;gap:10px;background:#f8fbff;border-radius:14px;padding:12px;align-items:center}
.teacher-item small{grid-column:1/-1}
.teacher-badge{border-radius:999px;padding:5px 10px;font-size:12px;font-weight:900;background:#ffedd5;color:#c2410c}
.teacher-table{width:100%;border-collapse:collapse;min-width:720px}
.teacher-table th,.teacher-table td{padding:11px;border-bottom:1px solid #e5edf7;text-align:left}
.teacher-table th{color:#60738d}
.table-scroll{overflow-x:auto}
.state-red{color:#b91c1c;font-weight:900}.state-orange{color:#c2410c;font-weight:900}.state-green{color:#15803d;font-weight:900}
@media(max-width:720px){.teacher-summary,.teacher-grid,.choice-grid{grid-template-columns:1fr}.teacher-box strong{font-size:28px}.teacher-top{grid-template-columns:1fr;padding:22px}.teacher-top h1{font-size:26px}.teacher-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.teacher-actions button{width:100%}.teacher-admin-form{grid-template-columns:1fr}.teacher-row{grid-template-columns:58px 1fr 36px}}
`;

const TYPE_LABELS = {
  S: '안전',
  A: '책임',
  I: '윤리',
  L: '소통'
};

injectStyle();
root?.classList.add('teacher-wide');

function injectStyle() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function n(value) {
  return Number(value || 0);
}

function role() {
  return localStorage.getItem('SAIL_ROLE') || '';
}

function isTeacherSession() {
  return role() === 'teacher' || role() === 'admin';
}

function savedClassCode() {
  return localStorage.getItem(LAST_CLASS_CODE_KEY) || localStorage.getItem('SAIL_CLASS_CODE') || '';
}

function render() {
  if (!isTeacherSession()) {
    renderLocked();
    return;
  }

  if (!isConfigured()) {
    root.innerHTML = '<div class="notice">Supabase 설정 전입니다. src/config.js를 먼저 채워 주세요.</div>';
    return;
  }

  if (role() === 'admin') {
    const classCode = savedClassCode() || 'ALL';
    root.innerHTML = `${renderHeader(classCode)}<section id="dashboard"><div class="teacher-card">자료를 불러오는 중입니다.</div></section>`;
    bindHeader(classCode);
    load(classCode);
    return;
  }

  const classCode = savedClassCode();
  if (!classCode) {
    root.innerHTML = `
      ${renderHeader('반 코드 없음')}
      <section id="dashboard"><div class="error">교사 계정에 연결된 반 코드가 없습니다. teachers 테이블의 class_code 값을 확인해 주세요.</div></section>
    `;
    bindHeader('');
    return;
  }

  root.innerHTML = `${renderHeader(classCode)}<section id="dashboard"><div class="teacher-card">자료를 불러오는 중입니다.</div></section>`;
  bindHeader(classCode);
  load(classCode);
}

function renderHeader(classCode) {
  const isAdmin = role() === 'admin';
  const classLabel = isAdmin || classCode === 'ALL' ? '전체 학급' : `${classCode} 담당`;
  return `
    <section class="teacher-dashboard">
      <div class="teacher-card teacher-top">
        <div class="teacher-title-wrap">
          <span class="teacher-kicker">교사용 화면</span>
          <h1>개입 대시보드</h1>
          <p>학생 실천 기록을 바탕으로 오늘 확인할 학생과 학급 흐름을 정리합니다.</p>
          <span class="teacher-class-pill">현재 보기 · ${esc(classLabel)}</span>
        </div>
        <div class="teacher-actions">
          ${isAdmin ? `
            <form id="adminClassForm" class="teacher-admin-form">
              <input id="adminClassCode" value="${esc(classCode)}" placeholder="ALL 또는 3-1" autocomplete="off">
              <button class="teacher-refresh" type="submit">불러오기</button>
            </form>
          ` : '<button class="teacher-refresh" type="button" data-teacher-refresh>새로고침</button>'}
          <button class="teacher-logout" type="button" data-teacher-logout>로그아웃</button>
        </div>
      </div>
    </section>
  `;
}

function bindHeader(classCode) {
  document.querySelector('[data-teacher-refresh]')?.addEventListener('click', () => load(classCode));
  document.querySelector('[data-teacher-logout]')?.addEventListener('click', logoutTeacher);
  document.querySelector('#adminClassForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const nextClassCode = document.querySelector('#adminClassCode')?.value.trim() || 'ALL';
    localStorage.setItem(LAST_CLASS_CODE_KEY, nextClassCode);
    localStorage.setItem('SAIL_CLASS_CODE', nextClassCode);
    render();
  });
}

function renderLocked() {
  root.innerHTML = `
    <section class="login-wrap">
      <div class="login-panel">
        <div class="logo">SAIL</div>
        <h1>교사용 확인이 필요합니다</h1>
        <p>메인 화면에서 교사용 코드를 입력하면 담당 반 현황으로 자동 이동합니다.</p>
        <button id="goLogin" class="primary" type="button">코드 입력으로 돌아가기</button>
      </div>
    </section>
  `;

  document.querySelector('#goLogin')?.addEventListener('click', () => {
    window.location.href = './';
  });
}

async function load(classCode) {
  const dashboard = document.querySelector('#dashboard');
  if (!dashboard) return;
  dashboard.innerHTML = '<div class="teacher-card">자료를 불러오는 중입니다.</div>';

  try {
    const data = await getTeacherDashboard(classCode);
    dashboard.innerHTML = renderDashboard(data, classCode);
    bindDashboardActions(classCode);
  } catch (error) {
    dashboard.innerHTML = `<div class="error">${esc(error.message || '현황을 불러오지 못했습니다.')}</div>`;
  }
}

function bindDashboardActions(classCode) {
  document.querySelector('[data-teacher-refresh-inline]')?.addEventListener('click', () => load(classCode));
}

function logoutTeacher() {
  localStorage.removeItem('SAIL_STUDENT_ID');
  localStorage.removeItem('SAIL_LOGIN_CODE');
  localStorage.removeItem('SAIL_ROLE');
  localStorage.removeItem('SAIL_CLASS_CODE');
  localStorage.removeItem(LAST_CLASS_CODE_KEY);
  window.location.href = './';
}

function normalizeData(raw) {
  if (Array.isArray(raw)) return raw[0] || {};
  if (raw?.data && Array.isArray(raw.data)) return raw.data[0] || {};
  if (raw?.data && typeof raw.data === 'object') return raw.data;
  return raw || {};
}

function renderDashboard(raw, classCode) {
  const data = normalizeData(raw);
  const overview = data.overview || data;
  const students = arrayValue(data.students, data.student_statuses, data.studentRows);
  const area = normalizeArea(data.type_stats || data.area_counts || data.areaCounts || data.sail_counts || {});
  const choices = arrayValue(data.choices, data.choice_top, data.choiceTop);
  const recent = arrayValue(data.logs, data.recent_logs, data.recentLogs, data.proof_logs);
  const notParticipants = arrayValue(
    data.not_participated_students,
    data.notParticipants,
    data.absent_students,
    data.risk_students,
    data.riskStudents
  );
  const absentRows = notParticipants.length ? notParticipants : students.filter(student => n(student.today_count || student.todayCount) === 0);
  const total = n(overview.total_students || overview.totalStudents || overview.students_total || students.length);
  const today = n(overview.today_participants || overview.todayParticipants || students.filter(student => n(student.today_count || student.todayCount) > 0).length);
  const done = n(overview.today_completed || overview.todayCompleted || students.filter(student => n(student.today_count || student.todayCount) >= 2).length);
  const absent = n(overview.today_not_participated || overview.todayNotParticipated || absentRows.length || Math.max(0, total - today));
  const rate = total ? Math.round(today / total * 100) : 0;
  const alertClass = rate < 30 ? 'danger' : rate < 70 ? 'warn' : 'good';
  const alertText = rate < 30
    ? '오늘 참여가 매우 낮습니다. 미참여 학생을 먼저 확인해 주세요.'
    : rate < 70
      ? '참여가 다소 부족합니다. 미참여 학생에게 짧게 안내해 주세요.'
      : '참여 흐름이 안정적입니다. 긍정 사례를 공유해 주세요.';

  return `
    <section class="teacher-dashboard">
      <div class="teacher-alert ${alertClass}">
        <strong>오늘 참여 ${today}/${total}명 (${rate}%)</strong>
        <p>${alertText}</p>
      </div>

      <div class="teacher-summary">
        <div class="teacher-box"><strong>${total}</strong><span>전체 학생</span></div>
        <div class="teacher-box"><strong>${today}</strong><span>오늘 참여</span></div>
        <div class="teacher-box"><strong>${absent}</strong><span>미참여</span></div>
        <div class="teacher-box"><strong>${done}</strong><span>완료</span></div>
      </div>

      <div class="teacher-grid">
        ${renderNotParticipants(absentRows)}
        ${renderAreaStats(area)}
      </div>

      <div class="teacher-grid">
        ${renderChoiceSummary(choices)}
        ${renderRecentLogs(recent)}
      </div>

      ${renderInterventionTable(students)}
      ${renderBadgeProgressTable(students)}
      <div class="teacher-actions"><button class="teacher-refresh" type="button" data-teacher-refresh-inline>${esc(classCode)} 다시 불러오기</button></div>
    </section>
  `;
}

function arrayValue(...values) {
  return values.find(Array.isArray) || [];
}

function normalizeArea(area) {
  return ['S', 'A', 'I', 'L'].reduce((result, key) => {
    const source = area[key] || area[key.toLowerCase()] || {};
    result[key] = n(source.count ?? source.total ?? source.value ?? source);
    return result;
  }, {});
}

function renderNotParticipants(rows) {
  if (!rows.length) {
    return '<div class="teacher-card"><h2>오늘 미참여 학생</h2><div class="empty-safe">오늘은 모든 학생이 참여했습니다.</div></div>';
  }

  return `
    <div class="teacher-card">
      <h2>오늘 미참여 학생</h2>
      <div class="not-participant-card">
        <strong>오늘 미참여 학생 (${rows.length}명)</strong>
        <small>${groupedNames(rows)}</small>
        <small style="margin-top:6px;display:block;">수업 중 참여 여부만 빠르게 확인하세요.</small>
      </div>
    </div>
  `;
}

function groupedNames(rows) {
  const groups = {};
  rows.forEach(row => {
    const grade = row.grade || row.student_grade || '';
    const cls = row.class || row.class_num || row.student_class || '';
    const key = grade && cls ? `${grade}-${cls}` : '담당 반';
    const number = row.number || row.student_number || '';
    const name = row.name || row.student_name || '학생';
    if (!groups[key]) groups[key] = [];
    groups[key].push(`${number ? `${number}번 ` : ''}${name}`);
  });

  if (role() === 'admin') {
    return Object.entries(groups).map(([key, names]) => `<div><b>${esc(key)} (${names.length}명)</b><br>${names.map(esc).join(', ')}</div>`).join('<br>');
  }

  return Object.values(groups).flat().map(esc).join(', ');
}

function renderAreaStats(area) {
  const max = Math.max(1, ...Object.values(area).map(n));
  const rows = ['S', 'A', 'I', 'L'].map(key => `
    <div class="teacher-row">
      <b>${TYPE_LABELS[key]}</b>
      <div class="teacher-track"><i class="teacher-fill ${key.toLowerCase()}" style="width:${Math.round(n(area[key]) / max * 100)}%"></i></div>
      <strong>${n(area[key])}</strong>
    </div>
  `).join('');
  const weakest = ['S', 'A', 'I', 'L'].map(key => ({ key, value: n(area[key]) })).sort((a, b) => a.value - b.value)[0];
  const strongest = ['S', 'A', 'I', 'L'].map(key => ({ key, value: n(area[key]) })).sort((a, b) => b.value - a.value)[0];

  return `
    <div class="teacher-card">
      <h2>S/A/I/L 영역 분석</h2>
      <div class="teacher-bars">${rows}</div>
      <p>강점은 <b>${TYPE_LABELS[strongest.key]}</b>, 보완이 필요한 영역은 <b>${TYPE_LABELS[weakest.key]}</b>입니다.</p>
    </div>
  `;
}

function renderChoiceSummary(choices) {
  const groups = {
    action: { name: '행동', total: 0, items: [] },
    think: { name: '생각', total: 0, items: [] },
    heart: { name: '마음', total: 0, items: [] }
  };

  choices.forEach((row, index) => {
    const key = choiceKind(row, index);
    const item = { text: choiceText(row), count: choiceCount(row) };
    groups[key].total += item.count;
    groups[key].items.push(item);
  });

  const ordered = Object.values(groups);
  const maxTotal = Math.max(1, ...ordered.map(group => group.total));
  const total = ordered.reduce((sum, group) => sum + group.total, 0);
  const top = [...ordered].sort((a, b) => b.total - a.total)[0];
  const low = [...ordered].sort((a, b) => a.total - b.total)[0];
  const insight = total
    ? `<b>${top.name}</b> 선택이 가장 많고, <b>${low.name}</b> 선택이 상대적으로 낮습니다.`
    : '아직 선택 응답 데이터가 부족합니다. 학생들이 미션을 기록하면 학급 경향이 표시됩니다.';

  return `
    <div class="teacher-card">
      <h2>행동·생각·마음 선택 분석</h2>
      <div class="choice-grid">
        ${ordered.map(group => `
          <div class="choice-box">
            <span>${group.name}</span>
            <strong>${group.total}</strong>
            <div class="choice-meter"><i style="width:${Math.round(group.total / maxTotal * 100)}%"></i></div>
            <p>${group.items.length ? group.items.sort((a, b) => b.count - a.count).slice(0, 2).map(item => `${esc(item.text)} ${item.count}`).join('<br>') : '응답 부족'}</p>
          </div>
        `).join('')}
      </div>
      <div class="choice-insight">${insight}</div>
    </div>
  `;
}

function choiceKind(row, index) {
  const raw = String(row.choice_group || row.choiceGroup || row.group || row.category || row.type || row.kind || '').toLowerCase();
  if (raw.includes('행동') || raw.includes('action') || raw.includes('choice1')) return 'action';
  if (raw.includes('생각') || raw.includes('think') || raw.includes('thought') || raw.includes('choice2')) return 'think';
  if (raw.includes('마음') || raw.includes('감정') || raw.includes('heart') || raw.includes('emotion') || raw.includes('choice3')) return 'heart';
  return ['action', 'think', 'heart'][index % 3];
}

function choiceText(row) {
  return row.text || row.choice_text || row.choiceText || row.title || row.label || row.answer || '응답';
}

function choiceCount(row) {
  return n(row.count || row.total || row.value || row.cnt || 1);
}

function renderRecentLogs(rows) {
  return `
    <div class="teacher-card">
      <h2>최근 실천 기록</h2>
      <div class="teacher-list">
        ${rows.length ? rows.slice(0, 8).map(row => `
          <div class="teacher-item">
            <b>${esc(row.name || row.student_name || row.title || row.mission_title || '학생')}</b>
            <span class="teacher-badge">${esc(row.date || row.created_at || row.count || '확인')}</span>
            <small>${esc(row.memo || row.note || row.detail || row.mission_title || '')}</small>
          </div>
        `).join('') : '<div class="empty-safe">최근 기록이 없습니다.</div>'}
      </div>
    </div>
  `;
}

function renderInterventionTable(rows) {
  return `
    <div class="teacher-card">
      <h2>학생별 개입 현황</h2>
      <div class="table-scroll">
        <table class="teacher-table">
          <thead><tr><th>이름</th><th>상태</th><th>오늘</th><th>점수</th><th>교사 행동</th></tr></thead>
          <tbody>${rows.length ? rows.map(student => {
            const today = n(student.today_count || student.todayCount);
            const score = n(student.total_score || student.score || student.count);
            const state = today === 0
              ? ['확인 필요', 'state-red', '참여 안내']
              : today < 2
                ? ['참여 중', 'state-orange', '마무리 독려']
                : ['완료', 'state-green', '칭찬 유지'];
            return `<tr><td>${esc(student.name || student.student_name || '학생')}</td><td class="${state[1]}">${state[0]}</td><td>${today}/2</td><td>${score}</td><td>${state[2]}</td></tr>`;
          }).join('') : '<tr><td colspan="5">학생별 데이터가 아직 부족합니다.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderBadgeProgressTable(rows) {
  return `
    <div class="teacher-card">
      <h2>학생별 배지 진행도</h2>
      <div class="table-scroll">
        <table class="teacher-table">
          <thead><tr><th>이름</th><th>안전</th><th>책임</th><th>윤리</th><th>소통</th><th>집중 필요</th></tr></thead>
          <tbody>${rows.length ? rows.map(student => {
            const counts = [
              { key: '안전', value: n(student.s_count) },
              { key: '책임', value: n(student.a_count) },
              { key: '윤리', value: n(student.i_count) },
              { key: '소통', value: n(student.l_count) }
            ];
            const min = [...counts].sort((a, b) => a.value - b.value)[0];
            return `
              <tr>
                <td>${esc(student.name || student.student_name || '학생')}</td>
                <td>${counts[0].value}/10</td>
                <td>${counts[1].value}/10</td>
                <td>${counts[2].value}/10</td>
                <td>${counts[3].value}/10</td>
                <td><b>${min.key} ${min.value}/10</b></td>
              </tr>
            `;
          }).join('') : '<tr><td colspan="6">학생별 데이터가 아직 부족합니다.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

render();
