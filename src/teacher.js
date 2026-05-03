import { getTeacherDashboard, isConfigured } from './api.js';

const root = document.querySelector('#teacherApp');
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function render() {
  root.innerHTML = `
    <section class="teacher-head">
      <div>
        <p class="eyebrow">SAIL</p>
        <h1>교사용 통계</h1>
        <p>반 코드를 입력하면 오늘 참여와 학생별 현황을 확인할 수 있습니다.</p>
      </div>
      <form id="classForm" class="teacher-search">
        <input id="classCode" placeholder="예: 3-1">
        <button class="primary" type="submit">불러오기</button>
      </form>
    </section>
    ${!isConfigured() ? '<div class="notice">Supabase 설정이 필요합니다.</div>' : ''}
    <section id="dashboard"></section>
  `;

  document.querySelector('#classForm').addEventListener('submit', async event => {
    event.preventDefault();
    const classCode = document.querySelector('#classCode').value.trim();
    if (!classCode) return;
    await load(classCode, event.submitter);
  });
}

async function load(classCode, button) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = '불러오는 중...';
  try {
    const data = await getTeacherDashboard(classCode);
    renderDashboard(data);
  } catch (error) {
    document.querySelector('#dashboard').innerHTML = `<div class="error">${esc(error.message)}</div>`;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function renderDashboard(data) {
  const overview = data.overview || {};
  const typeStats = data.type_stats || {};
  const students = data.students || [];
  const proofLogs = data.proof_logs || [];

  document.querySelector('#dashboard').innerHTML = `
    <section class="score-grid teacher-stats">
      <div><span>전체 학생</span><strong>${overview.total_students || 0}</strong></div>
      <div><span>오늘 참여</span><strong>${overview.today_participants || 0}</strong></div>
      <div><span>오늘 완료</span><strong>${overview.today_completed || 0}</strong></div>
      <div><span>미참여</span><strong>${overview.today_not_participated || 0}</strong></div>
    </section>

    <section class="dashboard-grid">
      <article class="panel">
        <h2>영역별 실천</h2>
        ${['S', 'A', 'I', 'L'].map(type => {
          const row = typeStats[type] || {};
          const rate = Math.round(row.rate || 0);
          return `<div class="bar-row"><span>${type}</span><div><i style="width:${rate}%"></i></div><strong>${rate}%</strong></div>`;
        }).join('')}
      </article>
      <article class="panel">
        <h2>최근 증빙 기록</h2>
        <div class="proof-list">
          ${proofLogs.map(item => `<a href="${esc(item.photo_url || '#')}" target="_blank" rel="noreferrer"><strong>${esc(item.name)}</strong><span>${esc(item.date)} · ${esc(item.mission_title || item.mission_id)}</span></a>`).join('') || '<p class="empty">증빙 사진이 아직 없습니다.</p>'}
        </div>
      </article>
    </section>

    <section class="panel">
      <h2>학생별 현황</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>번호</th><th>이름</th><th>점수</th><th>코인</th><th>연속</th><th>S</th><th>A</th><th>I</th><th>L</th><th>오늘</th></tr></thead>
          <tbody>
            ${students.map(row => `<tr><td>${esc(row.number)}</td><td>${esc(row.name)}</td><td>${row.total_score || 0}</td><td>${row.coin || 0}</td><td>${row.streak || 0}</td><td>${row.s_count || 0}</td><td>${row.a_count || 0}</td><td>${row.i_count || 0}</td><td>${row.l_count || 0}</td><td>${row.today_count || 0}/2</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

render();
