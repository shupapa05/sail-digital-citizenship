import { getTeacherDashboard, isConfigured } from './api.js';

const root = document.querySelector('#teacherApp');
const LAST_CLASS_CODE_KEY = 'SAIL_TEACHER_CLASS_CODE';

const TYPE_LABELS = {
  S: '안전',
  A: '책임',
  I: '진실',
  L: '존중'
};

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

function render() {
  const savedClassCode = localStorage.getItem(LAST_CLASS_CODE_KEY) || '';

  root.innerHTML = `
    <section class="teacher-head">
      <div>
        <p class="eyebrow">SAIL</p>
        <h1>교사용 현황</h1>
        <p>반 코드를 입력하면 오늘 참여 현황과 학생별 실천 기록을 확인할 수 있습니다.</p>
      </div>
      <form id="classForm" class="teacher-search">
        <input id="classCode" value="${esc(savedClassCode)}" placeholder="예: 3-1" autocomplete="off">
        <button class="primary" type="submit">불러오기</button>
      </form>
    </section>
    ${!isConfigured() ? '<div class="notice">Supabase 설정 전입니다. src/config.js를 먼저 채워 주세요.</div>' : ''}
    <section id="dashboard">
      <div class="teacher-empty">반 코드를 입력하면 현황이 표시됩니다.</div>
    </section>
  `;

  document.querySelector('#classForm').addEventListener('submit', async event => {
    event.preventDefault();
    const classCode = document.querySelector('#classCode').value.trim();
    if (!classCode) {
      renderMessage('반 코드를 입력해 주세요.', 'error');
      return;
    }

    localStorage.setItem(LAST_CLASS_CODE_KEY, classCode);
    await load(classCode, event.submitter);
  });
}

async function load(classCode, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '불러오는 중...';
  renderMessage('현황을 불러오는 중입니다.', 'teacher-empty');

  try {
    const data = await getTeacherDashboard(classCode);
    renderDashboard(data);
  } catch (error) {
    renderMessage(error.message || '현황을 불러오지 못했습니다.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function renderMessage(message, className) {
  document.querySelector('#dashboard').innerHTML = `<div class="${className}">${esc(message)}</div>`;
}

function renderDashboard(data) {
  const overview = data?.overview || {};
  const typeStats = data?.type_stats || {};
  const students = Array.isArray(data?.students) ? data.students : [];
  const proofLogs = Array.isArray(data?.proof_logs) ? data.proof_logs : [];

  document.querySelector('#dashboard').innerHTML = `
    ${renderOverview(overview)}
    <section class="dashboard-grid teacher-dashboard">
      ${renderTypeStats(typeStats)}
      ${renderProofLogs(proofLogs)}
    </section>
    ${renderStudentTable(students)}
  `;
}

function renderOverview(overview) {
  const cards = [
    ['전체 학생', overview.total_students || 0],
    ['오늘 참여', overview.today_participants || 0],
    ['오늘 완료', overview.today_completed || 0],
    ['미참여', overview.today_not_participated || 0]
  ];

  return `
    <section class="score-grid teacher-stats">
      ${cards.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('')}
    </section>
  `;
}

function renderTypeStats(typeStats) {
  return `
    <article class="panel">
      <h2>영역별 실천</h2>
      ${['S', 'A', 'I', 'L'].map(type => {
        const row = typeStats[type] || {};
        const rate = clampPercent(row.rate || 0);
        const count = Number(row.count || 0);
        return `
          <div class="bar-row">
            <span>${TYPE_LABELS[type]} (${type})</span>
            <div><i style="width:${rate}%"></i></div>
            <strong>${count}회</strong>
          </div>
        `;
      }).join('')}
    </article>
  `;
}

function renderProofLogs(proofLogs) {
  return `
    <article class="panel">
      <h2>최근 증빙 사진</h2>
      <div class="proof-list">
        ${proofLogs.map(item => `
          <a href="${esc(item.photo_url)}" target="_blank" rel="noreferrer">
            <strong>${esc(item.name)}</strong>
            <span>${esc(item.date)} · ${esc(item.mission_title || item.mission_id || '미션')}</span>
          </a>
        `).join('') || '<p class="empty">최근 증빙 사진이 없습니다.</p>'}
      </div>
    </article>
  `;
}

function renderStudentTable(students) {
  const body = students.length
    ? students.map(row => `
      <tr>
        <td>${esc(row.number)}</td>
        <td>${esc(row.name)}</td>
        <td>${row.total_score || 0}</td>
        <td>${row.coin || 0}</td>
        <td>${row.streak || 0}일</td>
        <td>${row.s_count || 0}</td>
        <td>${row.a_count || 0}</td>
        <td>${row.i_count || 0}</td>
        <td>${row.l_count || 0}</td>
        <td>${row.today_count || 0}/2</td>
      </tr>
    `).join('')
    : '<tr><td colspan="10" class="teacher-table-empty">표시할 학생이 없습니다.</td></tr>';

  return `
    <section class="panel">
      <h2>학생별 현황</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>이름</th>
              <th>점수</th>
              <th>코인</th>
              <th>연속</th>
              <th>S</th>
              <th>A</th>
              <th>I</th>
              <th>L</th>
              <th>오늘</th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

function clampPercent(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

render();
