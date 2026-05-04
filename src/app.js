import { getShips, getMissionChoices, getMonthlyHistory, getStudentHome, isConfigured, loginStudent, saveMissionResult, uploadProofPhoto, buyShip, setEquippedShip } from './api.js';

const DEFAULT_DAILY_LIMIT = 2;
const appEl = document.querySelector('#app');
let state = { student: null, status: null, missions: [], todaySavedMissionIds: [], todaySavedCount: 0, dailyLimit: DEFAULT_DAILY_LIMIT, dailyLimitReasons: ['기본 2개'], ships: [] };

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const typeLabel = type => ({ S: '안전', A: '책임', I: '윤리', L: '소통' }[type] || type || '미션');
const typeQuestion = type => ({
  S: "오늘 활동 중 '이건 위험하겠다'라고 느낀 순간이 있었나요?",
  A: '오늘 글을 올리거나 전송하기 전에 한 번 더 생각했나요?',
  I: '오늘 사용한 자료가 누구의 것인지 확인해 보았나요?',
  L: '오늘 상대방의 글이나 말을 끝까지 읽고 이해하려 했나요?'
}[type] || '오늘의 실천을 기록해 볼까요?');

function setState(next) { state = { ...state, ...next }; }
function renderShell(content) { appEl.innerHTML = content; }

function getUserRole(res) {
  const user = res?.student || res || {};
  return String(user.role || user.user_role || user.type || user.account_type || '').toLowerCase();
}

function isTeacherLogin(res) {
  const role = getUserRole(res);
  return role === 'teacher' || role === 'admin' || role === '교사' || role === '관리자' || res?.student?.is_teacher === true || res?.is_teacher === true;
}

function getClassCode(res) {
  const user = res?.student || res || {};
  return user.class_code || user.classCode || res?.class_code || res?.classCode || '';
}

function enterTeacherMode(res, loginCode = '') {
  const user = res?.student || res || {};
  localStorage.setItem('SAIL_ROLE', getUserRole(res) === 'admin' || getUserRole(res) === '관리자' ? 'admin' : 'teacher');
  localStorage.setItem('SAIL_CLASS_CODE', getClassCode(res));
  localStorage.setItem('SAIL_LOGIN_CODE', loginCode);
  if (user.student_id) localStorage.setItem('SAIL_STUDENT_ID', user.student_id);
  location.reload();
}

function todayKst() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dateOnly(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function getMissionDate(mission) {
  return mission.mission_date || mission.date || mission.target_date || mission.assigned_date || mission.available_date || mission.display_date || mission.day_date || '';
}

function todayMissions() {
  const today = todayKst();
  return (state.missions || []).filter(mission => {
    const d = dateOnly(getMissionDate(mission));
    return !d || d === today;
  });
}

function normalizeOwned(ids) {
  if (!ids) return [];
  if (Array.isArray(ids)) return ids.map(String);
  return String(ids).split(',').map(s => s.trim()).filter(Boolean);
}

function applyHome(res) {
  const savedIds = res.today_saved_mission_ids || [];
  setState({
    student: res.student,
    status: res.status,
    missions: res.missions || [],
    todaySavedMissionIds: savedIds,
    todaySavedCount: Number(res.today_saved_count || savedIds.length || 0),
    dailyLimit: Number(res.daily_limit || DEFAULT_DAILY_LIMIT),
    dailyLimitReasons: Array.isArray(res.daily_limit_reasons) ? res.daily_limit_reasons : ['기본 2개']
  });
}

function renderLogin(message = '') {
  renderShell(`
    <section class="login-wrap">
      <div class="login-panel">
        <div class="logo">SAIL</div>
        <h1>디지털 항해일지</h1>
        <p>개인코드를 입력하면 학생용 또는 교사용 화면으로 자동 이동합니다.</p>
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
      if (isTeacherLogin(res)) {
        enterTeacherMode(res, loginCode);
        return;
      }
      localStorage.setItem('SAIL_ROLE', 'student');
      localStorage.removeItem('SAIL_CLASS_CODE');
      applyHome(res);
      localStorage.setItem('SAIL_LOGIN_CODE', loginCode);
      localStorage.setItem('SAIL_STUDENT_ID', res.student.student_id);
      renderHome();
    }, renderLogin);
  });
}

function renderFrame(inner) {
  const status = state.status || {};
  renderShell(`
    <header class="topbar">
      <div><strong>${esc(state.student?.name || '')}</strong></div>
      <span class="level-pill">Lv.${status.level || 1}</span>
    </header>
    ${inner}
  `);
}

function bottomNav(active) {
  const item = (id, label) => `<button class="${active === id ? 'active' : ''}" data-nav="${id}">${label}</button>`;
  return `<nav class="bottom-nav">${item('home', '내정보')}${item('missions', '미션')}${item('records', '기록')}${item('info', '상점')}<button data-nav="logout">나가기</button></nav>`;
}

function bindNav() {
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'home') renderHome();
    if (nav === 'missions') renderMissions();
    if (nav === 'records') renderRecords();
    if (nav === 'info') renderInfo();
    if (nav === 'logout') logout();
  }));
}

async function renderHome() {
  const status = state.status || {};
  await ensureShipsLoaded();
  const ship = getEquippedShip();
  const limit = Number(state.dailyLimit || DEFAULT_DAILY_LIMIT);
  const savedCount = Number(state.todaySavedCount || 0);
  const nextScore = nextLevelScore(status.total_score || 0);
  const progress = nextScore ? Math.min(100, Math.round((Number(status.total_score || 0) / nextScore) * 100)) : 100;

  renderFrame(`
    <section class="home-title-card student-home-main">
      <div class="ship-profile">
        <div>
          ${ship?.img_url ? `<img class="ship-image" src="${esc(ship.img_url)}" alt="${esc(ship.name || status.ship_type || '현재 배')}">` : '<div class="ship-placeholder">배 이미지</div>'}
          <h1>${esc(state.student?.name || '')}의 디지털 항해</h1>
          <p>${esc(ship?.name || status.ship_type || '종이배')}로 항해 중</p>
        </div>
        <div class="level-progress-card">
          <span>현재 레벨</span>
          <strong>Lv.${status.level || 1}</strong>
          <div class="progress-track"><i style="width:${progress}%"></i></div>
          <small>${nextScore ? `다음 레벨까지 ${Math.max(0, nextScore - Number(status.total_score || 0))}점` : '최고 레벨'}</small>
        </div>
      </div>
      <div class="reward-row">
        <span>점수 ${status.total_score || 0}</span>
        <span>코인 ${status.coin || 0}</span>
        <span>연속 ${status.streak || 0}일</span>
      </div>
    </section>

    <section class="today-title-card">
      <h2>오늘의 항해 현황</h2>
      <p>오늘 미션 완료 ${savedCount}/${limit}개</p>
    </section>

    <section class="home-action-grid">
      <button class="primary" data-home-action="missions">오늘 미션 하러 가기</button>
      <button data-home-action="records">나의 기록</button>
      <button data-home-action="info">상점</button>
    </section>

    ${bottomNav('home')}
  `);
  bindNav();
  document.querySelector('[data-home-action="missions"]')?.addEventListener('click', renderMissions);
  document.querySelector('[data-home-action="records"]')?.addEventListener('click', renderRecords);
  document.querySelector('[data-home-action="info"]')?.addEventListener('click', renderInfo);
}

function renderMissions() {
  const saved = new Set(state.todaySavedMissionIds);
  const limit = Number(state.dailyLimit || DEFAULT_DAILY_LIMIT);
  const savedCount = Number(state.todaySavedCount || saved.size || 0);
  const full = savedCount >= limit;
  const reasonText = (state.dailyLimitReasons || ['기본 2개']).join(' + ');
  const missions = todayMissions();
  renderFrame(`
    <section class="section-head"><h1>미션 보기</h1><p>오늘 기록 가능: ${savedCount}/${limit}개 · ${esc(reasonText)} · 최대 4개</p></section>
    <section class="mission-grid">
      ${missions.map(mission => `<button class="mission-card ${esc(String(mission.mission_type || '').toLowerCase())}" data-mission="${esc(mission.mission_id)}" ${saved.has(mission.mission_id) || full ? 'disabled' : ''}><span>${esc(typeLabel(mission.mission_type))}</span><strong>${esc(mission.mission_title)}</strong><small>${saved.has(mission.mission_id) ? '오늘 완료' : esc(mission.check_question || '실천을 기록해 주세요.')}</small></button>`).join('') || '<p class="empty">오늘 표시할 미션이 없습니다.</p>'}
    </section>
    ${bottomNav('missions')}
  `);
  bindNav();
  document.querySelectorAll('[data-mission]').forEach(btn => btn.addEventListener('click', () => openMission(btn.dataset.mission)));
}

async function openMission(missionId) {
  const mission = state.missions.find(item => item.mission_id === missionId);
  if (!mission) return renderMissions();
  await withPageLoading(async () => {
    const choices = await getMissionChoices(missionId);
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
    ${bottomNav('missions')}
  `);
  bindNav();
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
    const entry = { studentId: state.student.student_id, loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '', missionId: mission.mission_id, eventOccurred: 1, success: Number(form.get('success')), note: form.get('note') || '', photoUrl: proof.url, photoFileId: proof.fileId, choices };
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
  renderFrame(`<section class="result-card"><h1>저장하지 못했습니다</h1><p>${esc(message)}</p><button class="primary" id="retryBtn">다시 시도</button></section>${bottomNav('missions')}`);
  bindNav();
  document.querySelector('#retryBtn').addEventListener('click', () => openMission(mission.mission_id));
}

function renderResult(res) {
  renderFrame(`<section class="result-card"><h1>기록 완료</h1><p>현재 점수는 ${res.status.total_score}점, 코인은 ${res.status.coin}개입니다.</p><div class="actions"><button class="primary" id="homeBtn">내정보로</button><button id="moreBtn">미션 더 보기</button></div></section>${bottomNav('missions')}`);
  bindNav();
  document.querySelector('#homeBtn').addEventListener('click', renderHome);
  document.querySelector('#moreBtn').addEventListener('click', renderMissions);
}

async function renderRecords() {
  const now = new Date();
  renderFrame('<section class="section-head"><h1>기록 보기</h1><p>이번 달 기록을 불러오는 중입니다.</p></section>');
  await withPageLoading(async () => {
    const res = await getMonthlyHistory(state.student.student_id, now.getFullYear(), now.getMonth() + 1);
    renderFrame(`<section class="section-head"><h1>${now.getFullYear()}년 ${now.getMonth() + 1}월 기록</h1></section><section class="record-list">${(res.items || []).map(item => `<article><strong>${esc(item.date)}</strong><span>${esc(item.mission_title || item.mission_id)} · ${item.total_point || 0}점</span></article>`).join('') || '<p class="empty">이번 달 기록이 아직 없습니다.</p>'}</section>${bottomNav('records')}`);
    bindNav();
  });
}

async function renderInfo() {
  const status = state.status || {};
  await ensureShipsLoaded();
  const ship = getEquippedShip();
  const ownedShipIds = normalizeOwned(status.owned_ship_ids);
  const nextScore = nextLevelScore(status.total_score || 0);
  const progress = nextScore ? Math.min(100, Math.round((Number(status.total_score || 0) / nextScore) * 100)) : 100;
  renderFrame(`
    <section class="profile">
      <div class="ship-profile">
        <div>${ship?.img_url ? `<img class="ship-image" src="${esc(ship.img_url)}" alt="${esc(ship.name || status.ship_type || '현재 배')}">` : '<div class="ship-placeholder">배 이미지</div>'}<h1>${esc(ship?.name || status.ship_type || '종이배')}</h1><p>현재 사용 중인 배</p></div>
        <div class="level-progress-card"><span>다음 레벨까지</span><strong>${nextScore ? `${Math.max(0, nextScore - Number(status.total_score || 0))}점` : '최고 레벨'}</strong><div class="progress-track"><i style="width:${progress}%"></i></div><small>진행도 ${progress}%</small><small>연속 ${status.streak || 0}일</small></div>
      </div>
    </section>
    <section class="ship-shop">
      <div class="section-head"><h1>배 상점</h1><p>보유한 배는 선택하고, 조건을 만족한 배는 구매할 수 있습니다.</p></div>
      <div class="ship-grid">
        ${state.ships.map(shopShip => shipCard(shopShip, status, ownedShipIds)).join('') || '<p class="empty">배 목록이 없습니다.</p>'}
      </div>
    </section>
    ${bottomNav('info')}
  `);
  bindNav();
  bindShipButtons();
}

function shipCard(ship, status, ownedShipIds) {
  const isOwned = ownedShipIds.includes(String(ship.ship_id));
  const isEquipped = String(status.equipped_ship_id || '') === String(ship.ship_id);
  const canBuy = !isOwned && Number(status.level || 1) >= Number(ship.level || 1) && Number(status.coin || 0) >= Number(ship.price || 0);
  const button = isEquipped
    ? '<button class="ship-btn equipped" disabled>사용 중</button>'
    : isOwned
      ? `<button class="ship-btn select" data-equip-ship="${esc(ship.ship_id)}">선택하기</button>`
      : canBuy
        ? `<button class="ship-btn buy" data-buy-ship="${esc(ship.ship_id)}">구매하기</button>`
        : `<button class="ship-btn locked" disabled>${Number(status.level || 1) < Number(ship.level || 1) ? `Lv.${esc(ship.level)} 필요` : '코인 부족'}</button>`;

  return `<article class="ship-card">
    ${ship.img_url ? `<img class="shop-ship-image" src="${esc(ship.img_url)}" alt="${esc(ship.name)}">` : '<div class="shop-ship-image empty">배 이미지</div>'}
    <h2>${esc(ship.name)}</h2>
    <p>Lv.${esc(ship.level)} · ${esc(ship.price)}코인</p>
    ${button}
  </article>`;
}

function bindShipButtons() {
  document.querySelectorAll('[data-buy-ship]').forEach(btn => btn.addEventListener('click', async () => {
    await withBusy(btn, '구매 중...', async () => {
      const res = await buyShip(state.student.student_id, btn.dataset.buyShip);
      if (res && res.ok === false) throw new Error(res.message || '구매하지 못했습니다.');
      await reloadHomeAndInfo();
    }, alert);
  }));
  document.querySelectorAll('[data-equip-ship]').forEach(btn => btn.addEventListener('click', async () => {
    await withBusy(btn, '선택 중...', async () => {
      const res = await setEquippedShip(state.student.student_id, btn.dataset.equipShip);
      if (res && res.ok === false) throw new Error(res.message || '선택하지 못했습니다.');
      await reloadHomeAndInfo();
    }, alert);
  }));
}

async function reloadHomeAndInfo() {
  const res = await getStudentHome(state.student.student_id, localStorage.getItem('SAIL_LOGIN_CODE') || '');
  applyHome(res);
  renderInfo();
}

function renderStats() {
  const status = state.status || {};
  const total = ['s_count', 'a_count', 'i_count', 'l_count'].reduce((sum, key) => sum + Number(status[key] || 0), 0) || 1;
  renderFrame(`<section class="profile"><h1>나의 통계</h1><div class="sail-grid">${['S', 'A', 'I', 'L'].map(key => `<div class="sail-stat ${key.toLowerCase()}"><span>${typeLabel(key)} (${key})</span><strong>${status[`${key.toLowerCase()}_count`] || 0}</strong></div>`).join('')}</div><div class="total-stat-card"><span>전체 실천 수</span><strong>${total}</strong></div><div class="growth-card"><h2>성장 정보</h2><div class="growth-grid"><div><span>연속 실천일</span><strong>${status.streak || 0}일</strong></div><div><span>현재 레벨</span><strong>Lv.${status.level || 1}</strong></div><div><span>현재 점수</span><strong>${status.total_score || 0}점</strong></div></div></div></section>${bottomNav('info')}`);
  bindNav();
}

async function ensureShipsLoaded() {
  if (state.ships.length) return;
  try { setState({ ships: await getShips() }); } catch { setState({ ships: [] }); }
}

function getEquippedShip() {
  const status = state.status || {};
  return state.ships.find(ship => String(ship.ship_id) === String(status.equipped_ship_id)) || state.ships.find(ship => ship.name === status.ship_type) || state.ships.find(ship => ship.is_default) || state.ships[0] || null;
}

function nextLevelScore(score) {
  if (score < 25) return 25;
  if (score < 50) return 50;
  if (score < 80) return 80;
  if (score < 120) return 120;
  return null;
}

async function autoLogin() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;
  const studentId = localStorage.getItem('SAIL_STUDENT_ID');
  const loginCode = localStorage.getItem('SAIL_LOGIN_CODE');
  if (!studentId || !isConfigured()) return renderLogin();
  try {
    const res = await getStudentHome(studentId, loginCode);
    if (isTeacherLogin(res)) {
      enterTeacherMode(res, loginCode);
      return;
    }
    localStorage.setItem('SAIL_ROLE', 'student');
    applyHome(res);
    renderHome();
  }
  catch { localStorage.removeItem('SAIL_STUDENT_ID'); localStorage.removeItem('SAIL_LOGIN_CODE'); localStorage.removeItem('SAIL_ROLE'); renderLogin(); }
}

function logout() {
  localStorage.removeItem('SAIL_STUDENT_ID');
  localStorage.removeItem('SAIL_LOGIN_CODE');
  localStorage.removeItem('SAIL_ROLE');
  localStorage.removeItem('SAIL_CLASS_CODE');
  setState({ student: null, status: null, missions: [], todaySavedMissionIds: [], todaySavedCount: 0, dailyLimit: DEFAULT_DAILY_LIMIT, dailyLimitReasons: ['기본 2개'], ships: [] });
  renderLogin();
}

async function withBusy(button, label, task, onError) {
  const original = button?.textContent;
  if (button) { button.disabled = true; button.textContent = label; }
  try { await task(); } catch (error) { onError(error.message || '오류가 발생했습니다.'); }
  finally { if (button) { button.disabled = false; button.textContent = original; } }
}

async function withPageLoading(task) {
  try { await task(); }
  catch (error) { renderFrame(`<section class="result-card"><h1>불러오지 못했습니다</h1><p>${esc(error.message)}</p><button id="backBtn">내정보</button></section>${bottomNav('home')}`); bindNav(); document.querySelector('#backBtn')?.addEventListener('click', renderHome); }
}

autoLogin();
