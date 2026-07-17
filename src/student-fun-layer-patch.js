import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_STUDENT_FUN_LAYER_PATCHED__';
const CACHE_KEY = 'SAIL_FUN_HOME_CACHE_V1';
const DASHBOARD_CACHE_KEY = 'SAIL_FUN_CLASS_CACHE_V1';
const RPC_PATHS = ['/rpc/login_student', '/rpc/get_student_home', '/rpc/save_mission_result'];

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  injectStyles();
  patchHomeResponses();
  observe();
  setTimeout(enhance, 250);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function hash(value) {
  return String(value || '').split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
}

function pick(list, seed) {
  return list[Math.abs(hash(seed)) % list.length];
}

function n(value) {
  return Number(value || 0) || 0;
}

function isStudentPayload(data) {
  return data?.student?.student_id && !data?.student?.is_teacher && Array.isArray(data?.missions);
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch { return {}; }
}

function writeCache(data) {
  if (!isStudentPayload(data)) return;
  localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, cached_at: Date.now() }));
}

function patchHomeResponses() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!RPC_PATHS.some(path => url.includes(path))) return response;

    try {
      const data = await response.clone().json();
      writeCache(data);
      setTimeout(enhance, 80);
    } catch {}

    return response;
  };
}

function statusOf(data) {
  return data?.status || {};
}

function totalRuns(status) {
  const areaTotal = n(status.s_count) + n(status.a_count) + n(status.i_count) + n(status.l_count);
  return n(status.total_count || status.mission_count || status.completed_count) || areaTotal || n(status.total_score);
}

function eventFor(data) {
  const studentId = data?.student?.student_id || localStorage.getItem('SAIL_STUDENT_ID') || '';
  return pick([
    { title: '순풍 항해', text: '오늘 미션을 완료하면 보물지도 조각이 더 빛납니다.', tag: '집중 보너스' },
    { title: '안개 해역', text: '생각을 한 문장 더 적으면 항해 기록이 더 선명해져요.', tag: '기록 도전' },
    { title: '보물섬 신호', text: '오늘의 첫 미션을 완료하면 보물섬에 한 칸 가까워집니다.', tag: '지도 발견' },
    { title: '등대 발견', text: '친구에게 도움이 될 만한 실천을 떠올려 보세요.', tag: '협동 항해' },
    { title: '푸른 파도', text: '짧게라도 꾸준히 기록하면 연속 항해가 이어집니다.', tag: '연속 항해' }
  ], `${todayKey()}:${studentId}`);
}

function titleFor(status) {
  const total = totalRuns(status);
  if (total >= 80) return '전설의 항해사';
  if (total >= 50) return '깊은 바다 탐험가';
  if (total >= 25) return '믿음직한 선장';
  if (total >= 10) return '성장하는 항해사';
  return '새내기 항해사';
}

function mapProgress(status) {
  const total = totalRuns(status);
  const current = total % 5;
  return {
    total,
    current,
    needed: current === 0 && total > 0 ? 0 : 5 - current,
    percent: Math.min(100, Math.round((current / 5) * 100)),
    ready: current === 0 && total > 0
  };
}

function missionTheme(mission) {
  const type = String(mission?.mission_type || '').toUpperCase();
  return ({ S: '안전 항해', A: '책임 항해', I: '윤리 항해', L: '소통 항해' }[type]) || '디지털 항해';
}

function levelLabel(level) {
  const value = n(level || 1);
  if (value >= 3) return '도전';
  if (value === 2) return '생각';
  return '쉬움';
}

function homePanel(data) {
  const status = statusOf(data);
  const event = eventFor(data);
  const map = mapProgress(status);
  const streak = n(status.streak);
  const title = titleFor(status);
  const classCode = data?.student?.class_code || localStorage.getItem('SAIL_CLASS_CODE') || '';

  return `<section class="fun-panel" data-fun-home>
    <div class="fun-event">
      <span class="fun-kicker">오늘의 항해 이벤트</span>
      <h2>${esc(event.title)}</h2>
      <p>${esc(event.text)}</p>
      <b>${esc(event.tag)}</b>
    </div>
    <div class="fun-grid">
      <div class="fun-box">
        <span>나의 칭호</span>
        <strong>${esc(title)}</strong>
        <small>누적 항해 ${map.total}회</small>
      </div>
      <div class="fun-box">
        <span>보물지도</span>
        <strong>${map.ready ? '상자 준비' : `${map.current}/5 조각`}</strong>
        <div class="fun-progress"><i style="width:${map.ready ? 100 : map.percent}%"></i></div>
        <small>${map.ready ? '미션을 계속하면 다음 지도가 시작돼요' : `${map.needed}조각 남음`}</small>
      </div>
      <div class="fun-box" data-class-quest="${esc(classCode)}">
        <span>우리 반 항해</span>
        <strong>확인 중</strong>
        <div class="fun-progress"><i style="width:12%"></i></div>
        <small>오늘 참여 목표를 불러오는 중</small>
      </div>
      <div class="fun-box">
        <span>연속 항해</span>
        <strong>${streak}일</strong>
        <small>${streak >= 3 ? '좋은 흐름이에요' : '3일 연속에 도전'}</small>
      </div>
    </div>
  </section>`;
}

function missionQuestPanel(data) {
  const event = eventFor(data);
  const missions = Array.isArray(data?.missions) ? data.missions : [];
  const next = missions[0] || {};
  return `<section class="fun-mission-strip" data-fun-missions>
    <div>
      <span>오늘의 도전</span>
      <strong>${esc(event.title)} · ${esc(missionTheme(next))}</strong>
      <small>${esc(event.text)}</small>
    </div>
    <div class="fun-challenge-set">
      <b>쉬움</b><b>생각</b><b>도전</b>
    </div>
  </section>`;
}

function resultPanel(data) {
  const map = mapProgress(statusOf(data));
  return `<section class="fun-result" data-fun-result>
    <span>보물지도 진행</span>
    <strong>${map.ready ? '새 보물상자에 도착했어요' : `${map.current}/5 조각 수집`}</strong>
    <div class="fun-progress"><i style="width:${map.ready ? 100 : map.percent}%"></i></div>
  </section>`;
}

function enhanceHome(data) {
  const home = document.querySelector('.home-title-card');
  if (!home || document.querySelector('[data-fun-home]')) return;
  home.insertAdjacentHTML('afterend', homePanel(data));
  loadClassQuest(data);
}

function enhanceMissions(data) {
  const grid = document.querySelector('.mission-grid');
  if (grid && !document.querySelector('[data-fun-missions]')) {
    grid.insertAdjacentHTML('beforebegin', missionQuestPanel(data));
  }

  document.querySelectorAll('.mission-card[data-mission]').forEach(card => {
    if (card.querySelector('.fun-card-badge')) return;
    const missionId = card.getAttribute('data-mission');
    const mission = (data.missions || []).find(item => String(item.mission_id) === String(missionId)) || {};
    const badge = document.createElement('em');
    badge.className = 'fun-card-badge';
    badge.textContent = levelLabel(mission.level || mission.stage);
    card.appendChild(badge);
  });
}

function enhanceResult(data) {
  const result = document.querySelector('.result-card');
  if (!result || document.querySelector('[data-fun-result]')) return;
  result.insertAdjacentHTML('beforeend', resultPanel(data));
}

function enhance() {
  const data = readCache();
  if (!isStudentPayload(data)) return;
  enhanceHome(data);
  enhanceMissions(data);
  enhanceResult(data);
}

function observe() {
  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(enhance, 120);
  }).observe(document.body, { childList: true, subtree: true });
}

async function loadClassQuest(data) {
  const box = document.querySelector('[data-class-quest]');
  if (!box) return;
  const classCode = data?.student?.class_code || box.getAttribute('data-class-quest') || '';
  if (!classCode) {
    box.querySelector('strong').textContent = '학급 준비 중';
    box.querySelector('small').textContent = '학급 정보가 확인되면 표시돼요';
    return;
  }

  const cached = readClassCache(classCode);
  if (cached) renderClassQuest(box, cached);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_teacher_dashboard`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_class_code: classCode })
    });
    if (!res.ok) throw new Error('class quest failed');
    const dashboard = await res.json();
    const total = n(dashboard.total_students || dashboard.students_total || dashboard.totalStudents);
    const today = n(dashboard.today_participants || dashboard.todayParticipants || dashboard.today_completed || dashboard.todayCompleted);
    const goal = Math.max(3, Math.ceil(total * 0.7));
    const quest = { classCode, total, today, goal, cachedAt: Date.now() };
    localStorage.setItem(`${DASHBOARD_CACHE_KEY}:${classCode}`, JSON.stringify(quest));
    renderClassQuest(box, quest);
  } catch {
    if (!cached) {
      box.querySelector('strong').textContent = '함께 항해';
      box.querySelector('small').textContent = '친구들이 참여하면 목표가 채워져요';
    }
  }
}

function readClassCache(classCode) {
  try {
    const data = JSON.parse(localStorage.getItem(`${DASHBOARD_CACHE_KEY}:${classCode}`) || 'null');
    if (!data || Date.now() - n(data.cachedAt) > 5 * 60 * 1000) return null;
    return data;
  } catch { return null; }
}

function renderClassQuest(box, quest) {
  const percent = quest.goal ? Math.min(100, Math.round((quest.today / quest.goal) * 100)) : 0;
  box.querySelector('strong').textContent = `${quest.today}/${quest.goal}명`;
  box.querySelector('.fun-progress i').style.width = `${percent}%`;
  box.querySelector('small').textContent = percent >= 100 ? '오늘 협동 목표 달성' : `${Math.max(0, quest.goal - quest.today)}명 더 참여하면 달성`;
}

function injectStyles() {
  if (document.querySelector('#studentFunLayerStyles')) return;
  const style = document.createElement('style');
  style.id = 'studentFunLayerStyles';
  style.textContent = `
    .fun-panel,.fun-mission-strip,.fun-result{background:#fff;border:1px solid #d9e5f4;border-radius:20px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 10%);margin:16px 0;color:#07192f}
    .fun-event{background:linear-gradient(135deg,#e0f2fe,#fff7ed);border:1px solid #bfdbfe;border-radius:16px;padding:16px;display:grid;gap:6px}
    .fun-kicker,.fun-box span,.fun-mission-strip span,.fun-result span{font-size:12px;font-weight:900;color:#3264df;letter-spacing:0}
    .fun-event h2{margin:0;font-size:24px}.fun-event p{margin:0;color:#415a77;line-height:1.45}.fun-event b{width:max-content;background:#07192f;color:#fff;border-radius:999px;padding:5px 10px;font-size:12px}
    .fun-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.fun-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:14px;padding:13px;display:grid;gap:7px;min-width:0}.fun-box strong{font-size:20px;color:#07192f}.fun-box small{color:#60738d;font-weight:800;line-height:1.35}.fun-progress{height:9px;background:#e2e8f0;border-radius:999px;overflow:hidden}.fun-progress i{display:block;height:100%;background:linear-gradient(90deg,#2563eb,#f59e0b);border-radius:999px;transition:width .25s ease}
    .fun-mission-strip{display:flex;align-items:center;justify-content:space-between;gap:12px}.fun-mission-strip div:first-child{display:grid;gap:4px}.fun-mission-strip strong{font-size:18px}.fun-mission-strip small{color:#60738d;font-weight:800}.fun-challenge-set{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.fun-challenge-set b,.fun-card-badge{background:#eef2ff;color:#1d4ed8;border:1px solid #c7d2fe;border-radius:999px;padding:5px 9px;font-size:12px;font-style:normal;font-weight:900}.fun-card-badge{align-self:flex-end;background:#fff7ed;color:#c2410c;border-color:#fed7aa}.mission-card{position:relative}.mission-card .fun-card-badge{position:absolute;right:12px;bottom:12px}.fun-result{display:grid;gap:8px}.fun-result strong{font-size:18px}
    @media(max-width:720px){.fun-grid{grid-template-columns:1fr 1fr}.fun-mission-strip{align-items:flex-start;flex-direction:column}.fun-event h2{font-size:21px}.fun-box strong{font-size:17px}}
  `;
  document.head.appendChild(style);
}
