import { getMissionChoices, getMonthlyHistory, getStudentHome, isConfigured, loginStudent, saveMissionResult, uploadProofPhoto } from './api.js';

const MAX_DAILY_COMPLETIONS = 2;
const appEl = document.querySelector('#app');
let state = { student: null, status: null, missions: [], todaySavedMissionIds: [], selectedMission: null };

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const typeLabel = type => ({ S: '안전', A: '책임', I: '윤리', L: '소통' }[type] || type || '미션');
function setState(next) { state = { ...state, ...next }; }
function renderShell(content) { appEl.innerHTML = content; }

function renderLogin(message = '') {
  renderShell(`
    <section class="login-wrap">
      <div class="login-panel">
        <div class="logo">SAIL</div>
        <h1>디지털 항해일지</h1>
        <p>개인코드를 입력하고 오늘의 실천을 기록하세요.</p>
        ${!isConfigured() ? '<div class="notice">Supabase 설정이 필요합니다.</div>' : ''}
        ${message ? `<div class="error">${esc(message)}</div>` : ''}
        <form id="loginForm" class="login-form">
          <input id="loginCode" autocomplete="one-time-code" placeholder="개인코드 입력">
          <button class="primary" type="submit">입장하기</button>
        </form>
      </div>
    </section>
  `);
  document.querySelector('#loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const loginCode = document.querySelector('#loginCode').value.trim();
    if (!loginCode) return renderLogin('개인코드를 입력해 주세요.');
    await withBusy(event.submitter, '확인 중...', async () => {
      const res = await loginStudent(loginCode);
      applyHome(res);
      localStorage.setItem('SAIL_LOGIN_CODE', loginCode);
      localStorage.setItem('SAIL_STUDENT_ID', res.student.student_id);
      renderHome();
    }, renderLogin);
  });
}

function applyHome(res) {
  setState({ student: res.student, status: res.status, missions: res.missions || [], todaySavedMissionIds: res.today_saved_mission_ids || [] });
}

function renderFrame(inner) {
  const status = state.status || {};
  renderShell(`
    <header class="topbar">
      <button class="ghost" id="homeBtn">홈</button>
      <div><strong>${esc(state.student?.name || '')}</strong><span>Lv.${status.level || 1} · ${status.total_score || 0}점 · ${status.coin || 0}코인</span></div>
      <button class="ghost" id="logoutBtn">로그아웃</button>
    </header>
    ${inner}
  `);
  document.querySelector('#homeBtn')?.addEventListener('click', renderHome);
  document.querySelector('#logoutBtn')?.addEventListener('click', logout);
}

function renderHome() {
  const status = state.status || {};
  renderFrame(`
    <section class="hero">
      <div><p class="eyebrow">오늘의 항해</p><h1>${esc(state.student?.name || '')}님의 실천 기록</h1></div>
      <div class="score-grid">
        <div><span>점수</span><strong>${status.total_score || 0}</strong></div>
        <div><span>코인</span><strong>${status.coin || 0}</strong></div>
        <div><span>연속</span><strong>${status.streak || 0}일</strong></div>
      </div>
    </section>
    <section class="menu-grid">
      <button data-view="missions">미션 보기</button>
      <button data-view="records">기록 보기</button>
      <button data-view="info">내 정보</button>
      <button data-view="stats">통계</button>
    </section>
  `);
  document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.view === 'missions') renderMissions();
    if (btn.dataset.view === 'records') renderRecords();
    if (btn.dataset.view === 'info') renderInfo();
    if (btn.dataset.view === 'stats') renderStats();
  }));
}

function renderMissions() {
  const saved = new Set(state.todaySavedMissionIds);
  const full = saved.size >= MAX_DAILY_COMPLETIONS;
  renderFrame(`
    <section class="section-head"><h1>미션 보기</h1><p>오늘은 최대 ${MAX_DAILY_COMPLETIONS}개까지 기록할 수 있습니다.</p></section>
    <section class="mission-grid">
      ${state.missions.map(mission => `<button class="mission-card" data-mission="${esc(mission.mission_id)}" ${saved.has(mission.mission_id) || full ? 'disabled' : ''}><span>${esc(typeLabel(mission.mission_type))}</span><strong>${esc(mission.mission_title)}</strong><small>${saved.has(mission.mission_id) ? '오늘 완료' : esc(mission.check_question || '실천을 기록해 주세요.')}</small></button>`).join('') || '<p class="empty">표시할 미션이 없습니다.</p>'}
    </section>
  `);
  document.querySelectorAll('[data-mission]').forEach(btn => btn.addEventListener('click', () => openMission(btn.dataset.mission)));
}

async function openMission(missionId) {
  const mission = state.missions.find(item => item.mission_id === missionId);
  if (!mission) return renderMissions();
  await withPageLoading(async () => {
    const choices = await getMissionChoices(missionId);
    setState({ selectedMission: mission });
    renderMissionForm(mission, groupChoices(choices));
  });
}

function groupChoices(rows) {
  return rows.reduce((acc, row) => {
    const key = row.choice_group || 'choice1';
    acc[key] ||= [];
    acc[key].push(row);
    return acc;
  }, {});
}

function renderMissionForm(mission, choices) {
  const choiceBlocks = ['choice1', 'choice2', 'choice3'].map((group, index) => {
    const rows = choices[group] || [];
    if (!rows.length) return '';
    return `<fieldset class="choice-group"><legend>${index + 1}. 선택해 주세요</legend>${rows.map(row => `<label><input type="radio" name="${group}" value="${esc(row.choice_code)}" data-text="${esc(row.choice_text)}"><span>${esc(row.choice_text)}</span></label>`).join('')}</fieldset>`;
  }).join('');
  renderFrame(`
    <section class="mission-form">
      <p class="eyebrow">${esc(typeLabel(mission.mission_type))}</p>
      <h1>${esc(mission.mission_title)}</h1>
      <p>${esc(mission.event_question || mission.check_question || '')}</p>
      <form id="missionForm">
        ${choiceBlocks}
        <label class="field"><span>오늘 실천했나요?</span><select name="success"><option value="1">네, 실천했어요</option><option value="0">아직 못했어요</option></select></label>
        <label class="field"><span>짧은 기록</span><textarea name="note" rows="4" placeholder="어떤 일이 있었는지 적어 주세요."></textarea></label>
        <label class="field"><span>사진 증빙</span><input name="photo" type="file" accept="image/*"></label>
        <div class="actions"><button class="primary" type="submit">저장</button><button type="button" id="backBtn">목록</button></div>
      </form>
    </section>
  `);
  document.querySelector('#backBtn').addEventListener('click', renderMissions);
  document.querySelector('#missionForm').addEventListener('submit', event => submitMission(event, mission));
}

async function submitMission(event, mission) {
  event.preventDefault();
  const formEl = event.currentTarget;
  const form = new FormData(formEl);
  const choices = collectChoices(formEl);
  await withBusy(event.submitter, '저장 중...', async () => {
    const file = form.get('photo');
    const proof = file && file.size ? await uploadProofPhoto(state.student.student_id, file) : { url: '', fileId: '' };
    const entry = {
      studentId: state.student.student_id,
      loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '',
      missionId: mission.mission_id,
      eventOccurred: 1,
      success: Number(form.get('success')),
      note: form.get('note') || '',
      photoUrl: proof.url,
      photoFileId: proof.fileId,
      choices
    };
    const res = await saveMissionResult(entry);
    applyHome(res);
    renderResult(res);
  }, message => renderMissionError(mission, message));
}

function collectChoices(form) {
  return ['choice1', 'choice2', 'choice3'].reduce((acc, group) => {
    const checked = form?.querySelector(`input[name="${group}"]:checked`);
    acc[group] = checked ? { code: checked.value, text: checked.dataset.text || '' } : { code: '', text: '' };
    return acc;
  }, {});
}

function renderMissionError(mission, message) {
  renderFrame(`<section class="result-card"><h1>저장하지 못했습니다</h1><p>${esc(message)}</p><button class="primary" id="retryBtn">다시 시도</button></section>`);
  document.querySelector('#retryBtn').addEventListener('click', () => openMission(mission.mission_id));
}

function renderResult(res) {
  renderFrame(`<section class="result-card"><h1>기록 완료</h1><p>현재 점수는 ${res.status.total_score}점, 코인은 ${res.status.coin}개입니다.</p><div class="actions"><button class="primary" id="moreBtn">미션 더 보기</button><button id="infoBtn">내 정보</button></div></section>`);
  document.querySelector('#moreBtn').addEventListener('click', renderMissions);
  document.querySelector('#infoBtn').addEventListener('click', renderInfo);
}

async function renderRecords() {
  const now = new Date();
  renderFrame('<section class="section-head"><h1>기록 보기</h1><p>이번 달 기록을 불러오는 중입니다.</p></section>');
  await withPageLoading(async () => {
    const res = await getMonthlyHistory(state.student.student_id, now.getFullYear(), now.getMonth() + 1);
    renderFrame(`<section class="section-head"><h1>${now.getFullYear()}년 ${now.getMonth() + 1}월 기록</h1></section><section class="record-list">${(res.items || []).map(item => `<article><strong>${esc(item.date)}</strong><span>${esc(item.mission_title || item.mission_id)} · ${item.total_point || 0}점</span></article>`).join('') || '<p class="empty">이번 달 기록이 아직 없습니다.</p>'}</section>`);
  });
}

function renderInfo() {
  const status = state.status || {};
  renderFrame(`<section class="profile"><h1>내 정보</h1><div class="score-grid"><div><span>레벨</span><strong>${status.level || 1}</strong></div><div><span>배</span><strong>${esc(status.ship_type || '종이배')}</strong></div><div><span>연속 기록</span><strong>${status.streak || 0}일</strong></div></div><div class="sail-grid">${['S', 'A', 'I', 'L'].map(key => `<div><span>${key}</span><strong>${status[`${key.toLowerCase()}_count`] || 0}</strong><small>${typeLabel(key)}</small></div>`).join('')}</div></section>`);
}

function renderStats() {
  const status = state.status || {};
  const total = ['s_count', 'a_count', 'i_count', 'l_count'].reduce((sum, key) => sum + Number(status[key] || 0), 0) || 1;
  renderFrame(`<section class="profile"><h1>통계</h1>${[['S', 's_count'], ['A', 'a_count'], ['I', 'i_count'], ['L', 'l_count']].map(([label, key]) => { const value = Number(status[key] || 0); return `<div class="bar-row"><span>${label} ${typeLabel(label)}</span><div><i style="width:${Math.round(value / total * 100)}%"></i></div><strong>${value}</strong></div>`; }).join('')}</section>`);
}

async function autoLogin() {
  const studentId = localStorage.getItem('SAIL_STUDENT_ID');
  const loginCode = localStorage.getItem('SAIL_LOGIN_CODE');
  if (!studentId || !isConfigured()) return renderLogin();
  try {
    const res = await getStudentHome(studentId, loginCode);
    applyHome(res);
    renderHome();
  } catch {
    localStorage.removeItem('SAIL_STUDENT_ID');
    localStorage.removeItem('SAIL_LOGIN_CODE');
    renderLogin();
  }
}

function logout() {
  localStorage.removeItem('SAIL_STUDENT_ID');
  localStorage.removeItem('SAIL_LOGIN_CODE');
  setState({ student: null, status: null, missions: [], todaySavedMissionIds: [] });
  renderLogin();
}

async function withBusy(button, label, task, onError) {
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = label; }
  try { await task(); }
  catch (error) { onError(error.message || '오류가 발생했습니다.'); }
  finally { if (button) { button.disabled = false; button.textContent = original; } }
}

async function withPageLoading(task) {
  try { await task(); }
  catch (error) {
    renderFrame(`<section class="result-card"><h1>불러오지 못했습니다</h1><p>${esc(error.message)}</p><button id="backBtn">홈</button></section>`);
    document.querySelector('#backBtn')?.addEventListener('click', renderHome);
  }
}

autoLogin();
