import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_TEACHER_LESSON_SELECTOR_PATCHED__';
const AREA_LABELS = { S: '안전', A: '책임', I: '윤리', L: '소통' };

let poolCache = null;
let loading = false;
let renderTimer = null;

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  injectStyle();
  new MutationObserver(() => scheduleRender()).observe(document.body, { childList: true, subtree: true });
  scheduleRender();
}

const TOPICS = [
  { keys: ['비밀번호', '보안', '금고', '인증', '계정'], name: '비밀번호와 계정 보호', action: '비밀번호나 계정을 안전하게 지키는 행동', risk: '다른 사람이 내 계정이나 개인정보에 접근할 수 있음', habit: '비밀번호를 공유하지 않고 주기적으로 점검하기' },
  { keys: ['개인정보', '사진', '위치', '얼굴', '주소', '전화번호', '공개'], name: '개인정보 보호', action: '공개 전 개인정보가 들어 있는지 확인하는 행동', risk: '한 번 공개된 정보가 빠르게 퍼질 수 있음', habit: '사진과 글을 올리기 전 정보 공개 범위 확인하기' },
  { keys: ['출처', '저작권', '자료', '작품', '인용', '복사', '창작자'], name: '출처와 저작권 존중', action: '자료의 출처와 사용 가능 여부를 확인하는 행동', risk: '다른 사람의 권리와 노력을 침해할 수 있음', habit: '자료를 사용할 때 출처를 함께 남기기' },
  { keys: ['댓글', '대화', '말', '표현', '존중', '배려', '감정'], name: '존중하는 온라인 대화', action: '상대가 어떻게 느낄지 생각하고 표현하는 행동', risk: '온라인 말도 실제 상처나 갈등으로 이어질 수 있음', habit: '보내기 전에 상대 입장에서 다시 읽어보기' },
  { keys: ['허위', '가짜', '뉴스', '정보', '사실', '검색', '확인'], name: '정보 확인과 판단', action: '정보의 출처와 근거를 확인하는 행동', risk: '틀린 정보가 퍼져 잘못된 판단을 만들 수 있음', habit: '공유하기 전 여러 자료와 비교하기' },
  { keys: ['알고리즘', '추천', 'AI', '인공지능', '자동', '데이터'], name: 'AI와 알고리즘 이해', action: '추천이나 AI 결과를 그대로 믿지 않고 확인하는 행동', risk: '추천 결과가 항상 정확하거나 공정하지 않을 수 있음', habit: 'AI 답변과 추천 정보의 근거 확인하기' },
  { keys: ['시간', '사용', '게임', '영상', '중독', '조절', '스마트폰'], name: '디지털 사용 조절', action: '사용 시간을 정하고 스스로 조절하는 행동', risk: '생활 균형과 해야 할 일이 흐트러질 수 있음', habit: '사용 시간과 쉬는 시간을 미리 정하기' },
  { keys: ['갈등', '오해', '다툼', '사과', '해결', '불편'], name: '온라인 갈등 해결', action: '상대의 말을 듣고 차분히 해결하려는 행동', risk: '오해가 커지고 관계가 나빠질 수 있음', habit: '바로 공격하지 않고 설명하거나 도움 요청하기' },
  { keys: ['공유', '전송', '게시', '업로드', '퍼뜨', '전달'], name: '책임 있는 공유', action: '보내기 전 내용과 대상을 확인하는 행동', risk: '보낸 내용이 빠르게 퍼져 피해가 생길 수 있음', habit: '공유 전 허락과 사실 여부 확인하기' },
  { keys: ['광고', '구매', '상업', '결제', '유료', '소비'], name: '광고와 소비 판단', action: '광고인지 정보인지 구분하고 필요성을 생각하는 행동', risk: '상업적 의도에 따라 충동적으로 선택할 수 있음', habit: '결제나 구매 전 보호자와 상의하기' }
];
const FALLBACK = { name: '디지털 시민 행동', action: '질문과 관련된 상황에서 책임 있게 판단하는 행동', risk: '나와 다른 사람 모두에게 영향을 줄 수 있음', habit: '행동하기 전에 한 번 더 생각하기' };

function scheduleRender() {
  if (renderTimer) clearTimeout(renderTimer);
  renderTimer = setTimeout(renderSelector, 160);
}

function injectStyle() {
  if (document.querySelector('#teacherLessonSelectorStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherLessonSelectorStyles';
  style.textContent = `
    .lesson-selector-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
    .lesson-selector-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
    .lesson-selector-head h2{margin:0;color:#07192f}.lesson-selector-head p{margin:4px 0 0;color:#60738d;line-height:1.45}
    .lesson-mode-pill{display:inline-flex;align-items:center;border-radius:999px;background:#eaf2ff;color:#3264df;font-weight:900;padding:7px 12px;white-space:nowrap}
    .lesson-selector-form{display:grid;grid-template-columns:140px minmax(220px,1fr) 150px auto auto;gap:10px;align-items:end}
    .lesson-selector-form label{display:grid;gap:6px;color:#415a77;font-size:13px;font-weight:900}
    .lesson-selector-form select,.lesson-selector-form input{min-height:46px}.lesson-selector-form button{min-height:46px;border:0;border-radius:14px;padding:10px 14px;font-weight:900}
    .lesson-save-btn{background:#3264df;color:white}.lesson-daily-btn{background:#64748b;color:white}.lesson-selector-note{margin:12px 0 0;color:#415a77;line-height:1.5;font-size:14px}
    .lesson-preview{margin-top:16px;border-top:1px solid #d9e5f4;padding-top:16px}.lesson-preview-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.lesson-preview-head h3{margin:0;color:#07192f;font-size:18px}.lesson-preview-head span{font-weight:900;color:#3264df;background:#eaf2ff;border-radius:999px;padding:6px 10px;font-size:12px}
    .lesson-preview-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lesson-preview-item{background:#f8fbff;border:1px solid #d9e5f4;border-radius:16px;padding:12px;display:grid;gap:8px}.lesson-preview-item b{color:#3264df}.lesson-preview-item strong{color:#07192f;line-height:1.45}.lesson-preview-item ul{margin:0;padding-left:18px;color:#415a77;display:grid;gap:4px;font-size:13px;line-height:1.35}.lesson-preview-empty{color:#64748b;font-weight:800;background:#f8fbff;border:1px solid #d9e5f4;border-radius:14px;padding:12px}
    @media(max-width:900px){.lesson-selector-form{grid-template-columns:1fr 1fr}.lesson-selector-form button{width:100%}.lesson-preview-grid{grid-template-columns:1fr}}
    @media(max-width:640px){.lesson-selector-head,.lesson-selector-form,.lesson-preview-head{display:grid;grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function isTeacherMode() { return localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin'; }
function currentClassCode() { const role = localStorage.getItem('SAIL_ROLE') || ''; const code = localStorage.getItem('SAIL_TEACHER_CLASS_CODE') || localStorage.getItem('SAIL_CLASS_CODE') || ''; return role === 'admin' ? (code && code !== 'ALL' ? code : '') : code; }
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }
function selectorCards() { return [...document.querySelectorAll('[data-lesson-selector], .lesson-selector-card')].filter((card, index, list) => list.indexOf(card) === index); }
function removeDuplicateSelectors() { const cards = selectorCards(); cards.forEach(card => card.setAttribute('data-lesson-selector', '1')); cards.slice(1).forEach(card => card.remove()); return cards[0] || null; }
function hasSelector() { return Boolean(removeDuplicateSelectors()); }

function hash(value) { return String(value || '').split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0); }
function rotate(list, seed) { if (!list.length) return list; const start = Math.abs(hash(seed)) % list.length; return list.slice(start).concat(list.slice(0, start)); }
function topicFor(text) { const value = String(text || ''); return TOPICS.find(topic => topic.keys.some(key => value.includes(key))) || FALLBACK; }
function questionFocus(question, topic) { const text = String(question || '').replace(/[?!.]/g, '').trim(); const matchedKey = TOPICS.flatMap(t => t.keys).find(key => text.includes(key)); if (matchedKey) return matchedKey; const chunks = text.split(/\s+/).filter(word => word.length >= 2 && !['무엇인가요', '어떤', '왜', '어떻게', '필요한가요', '있나요'].includes(word)); return chunks.slice(-2).join(' ') || topic.name; }
function choicesForQuestion(row) {
  const question = row?.question || '';
  const stage = Number(row?.stage || 1);
  const topic = topicFor(`${question} ${row?.activity_title || ''} ${row?.stage_label || ''}`);
  const focus = questionFocus(question, topic);
  const seed = `${row?.area_code}:${row?.activity_no}:${stage}:${question}`;
  const packs = {
    1: { titles: ['무엇을 발견했나요?', '왜 눈에 띄었나요?', '어떤 선택을 했나요?'], rows: [[`${focus}와 관련된 위험 신호를 찾았다`, `${topic.action}을 떠올렸다`, `내 경험에서 비슷한 상황을 떠올렸다`], [`쉽게 지나치면 ${topic.risk}기 때문이다`, `${topic.name}은 작은 선택에서 시작되기 때문이다`, `친구에게도 영향을 줄 수 있다고 생각했기 때문이다`], [`오늘부터 ${topic.habit}`, `${focus} 상황에서는 먼저 멈추고 확인하기`, `비슷한 일이 생기면 어른이나 친구와 상의하기`]] },
    2: { titles: ['어떤 판단을 했나요?', '그 이유는 무엇인가요?', '무엇을 조심해야 하나요?'], rows: [[`${focus}는 그냥 넘기면 안 된다고 판단했다`, `먼저 사실과 상황을 확인해야 한다고 생각했다`, `상대방과 나 모두에게 영향을 생각해야 한다고 보았다`], [`${topic.risk}기 때문이다`, `${topic.name}은 신중한 판단이 필요하기 때문이다`, `잘못된 선택이 온라인에서 빠르게 커질 수 있기 때문이다`], [`확인 없이 바로 행동하지 않기`, `${topic.habit}`, `친구에게 설명할 수 있을 만큼 근거를 확인하기`]] },
    3: { titles: ['앞으로 어떻게 할까요?', '실천 약속은 무엇인가요?', '친구에게 권할 방법은?'], rows: [[`${topic.habit}`, `${focus} 상황에서 먼저 확인하고 행동하기`, `내가 할 수 있는 안전한 방법을 정하기`], [`나와 친구를 함께 지키는 약속이기 때문이다`, `${topic.risk}기 때문이다`, `${topic.name}을 꾸준히 실천해야 하기 때문이다`], [`친구에게 ${topic.name}의 이유를 설명하기`, `우리 반 약속으로 ${topic.habit}`, `비슷한 상황을 보면 멈추고 확인하자고 말하기`]] }
  };
  const pack = packs[Math.min(3, Math.max(1, stage))] || packs[1];
  return { titles: pack.titles, rows: pack.rows.map((choices, index) => rotate(choices, `${seed}:${index}`).slice(0, 3)) };
}

async function loadPool() {
  if (poolCache) return poolCache;
  const rows = await getLessonQuestionPool();
  const map = new Map();
  rows.forEach(row => {
    const key = `${row.area_code}:${row.activity_no}`;
    if (!map.has(key)) {
      map.set(key, { area_code: row.area_code, area_label: row.area_label || AREA_LABELS[row.area_code] || row.area_code, activity_no: Number(row.activity_no), activity_title: row.activity_title, questions: [] });
    }
    map.get(key).questions.push({ ...row, activity_no: Number(row.activity_no), stage: Number(row.stage) });
  });
  poolCache = [...map.values()].map(item => ({ ...item, questions: item.questions.sort((a, b) => a.stage - b.stage) })).sort((a, b) => {
    const areaOrder = ['S', 'A', 'I', 'L'].indexOf(a.area_code) - ['S', 'A', 'I', 'L'].indexOf(b.area_code);
    return areaOrder || a.activity_no - b.activity_no;
  });
  return poolCache;
}

function renderOptions(pool, selectedArea, selectedActivity) {
  const areaOptions = ['S', 'A', 'I', 'L'].map(code => `<option value="${code}" ${code === selectedArea ? 'selected' : ''}>${AREA_LABELS[code]}</option>`).join('');
  const activities = pool.filter(item => item.area_code === selectedArea);
  const activityOptions = activities.map(item => `<option value="${item.activity_no}" ${Number(item.activity_no) === Number(selectedActivity) ? 'selected' : ''}>${item.activity_no}. ${esc(item.activity_title)}</option>`).join('');
  return { areaOptions, activityOptions };
}

function findActivity(pool, areaCode, activityNo) { return pool.find(item => item.area_code === areaCode && Number(item.activity_no) === Number(activityNo)) || null; }
function previewHtml(activity) {
  if (!activity?.questions?.length) return '<div class="lesson-preview-empty">이 활동의 질문을 불러오지 못했습니다.</div>';
  return `<div class="lesson-preview-head"><h3>질문 미리보기</h3><span>${esc(activity.area_label)} ${activity.activity_no}번</span></div><div class="lesson-preview-grid">${activity.questions.map(row => { const choices = choicesForQuestion(row); return `<article class="lesson-preview-item"><b>${row.stage}단계 · ${esc(row.stage_label || '수업 질문')}</b><strong>${esc(row.question)}</strong><ul>${choices.rows.map((group, i) => `<li><em>${esc(choices.titles[i])}</em> ${esc(group[0])}</li>`).join('')}</ul></article>`; }).join('')}</div>`;
}
function updatePreview(pool) {
  const form = document.querySelector('[data-lesson-form]');
  const preview = document.querySelector('[data-lesson-preview]');
  if (!form || !preview) return;
  const activity = findActivity(pool, form.elements.area.value, form.elements.activity.value);
  preview.innerHTML = previewHtml(activity);
}

async function renderSelector() {
  renderTimer = null;
  removeDuplicateSelectors();
  if (loading || !isTeacherMode()) return;
  const dashboard = document.querySelector('#dashboard .teacher-dashboard') || document.querySelector('#dashboard');
  if (!dashboard || hasSelector() || dashboard.dataset.lessonSelectorLoading === '1') return;
  const classCode = currentClassCode();
  if (!classCode) return;
  loading = true;
  dashboard.dataset.lessonSelectorLoading = '1';
  try {
    const [pool, setting] = await Promise.all([loadPool(), getClassLessonSetting(classCode).catch(() => ({ mode: 'daily' }))]);
    if (hasSelector()) return;
    const selectedArea = setting?.area_code || 'S';
    const selectedActivity = Number(setting?.activity_no || 1);
    const options = renderOptions(pool, selectedArea, selectedActivity);
    const modeText = setting?.mode === 'lesson' ? `${AREA_LABELS[setting.area_code] || setting.area_code} ${setting.activity_no}번 활동 적용 중` : '일상생활 전체 랜덤';
    const selected = findActivity(pool, selectedArea, selectedActivity);
    dashboard.insertAdjacentHTML('afterbegin', `
      <section class="lesson-selector-card" data-lesson-selector="1">
        <div class="lesson-selector-head"><div><h2>오늘 질문 범위</h2><p>수업한 영역과 활동을 선택하면 학생 미션 질문이 해당 활동 질문으로 바뀝니다.</p></div><span class="lesson-mode-pill">${esc(modeText)}</span></div>
        <form class="lesson-selector-form" data-lesson-form>
          <label>영역<select name="area">${options.areaOptions}</select></label>
          <label>활동<select name="activity">${options.activityOptions}</select></label>
          <label>적용 종료일<input name="activeUntil" type="date" value="${esc(setting?.active_until || today())}"></label>
          <button class="lesson-save-btn" type="submit">수업 질문 적용</button>
          <button class="lesson-daily-btn" type="button" data-lesson-daily>일상 랜덤</button>
        </form>
        <p class="lesson-selector-note">현재 학급: ${esc(classCode)}. 기존 점수, 배지, 랭킹은 그대로 유지됩니다.</p>
        <div class="lesson-preview" data-lesson-preview>${previewHtml(selected)}</div>
      </section>
    `);
    removeDuplicateSelectors();
    bindSelector(pool, classCode);
  } finally {
    loading = false;
    delete dashboard.dataset.lessonSelectorLoading;
    removeDuplicateSelectors();
  }
}

function bindSelector(pool, classCode) {
  const form = document.querySelector('[data-lesson-form]');
  const areaSelect = form?.elements.area;
  const activitySelect = form?.elements.activity;
  if (!form || !areaSelect || !activitySelect || form.dataset.bound === '1') return;
  form.dataset.bound = '1';
  areaSelect.addEventListener('change', () => { const options = renderOptions(pool, areaSelect.value, 1); activitySelect.innerHTML = options.activityOptions; updatePreview(pool); });
  activitySelect.addEventListener('change', () => updatePreview(pool));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    await setClassLessonSetting({ loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '', classCode, mode: 'lesson', areaCode: areaSelect.value, activityNo: activitySelect.value, activeUntil: form.elements.activeUntil.value || today() });
    selectorCards().forEach(card => card.remove());
    scheduleRender();
  });
  document.querySelector('[data-lesson-daily]')?.addEventListener('click', async () => {
    await setClassLessonSetting({ loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '', classCode, mode: 'daily', activeUntil: today() });
    selectorCards().forEach(card => card.remove());
    scheduleRender();
  }, { once: true });
}

async function request(path, payload = null) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { method: payload ? 'POST' : 'GET', headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || '수업 질문 설정을 처리하지 못했습니다.');
  return data;
}
function getLessonQuestionPool() { return request('/rest/v1/lesson_question_pool?active=eq.true&select=area_code,area_label,activity_no,activity_title,stage,stage_label,question,source_page&order=area_code.asc,activity_no.asc,stage.asc'); }
function getClassLessonSetting(classCode) { return request('/rest/v1/rpc/get_class_lesson_setting', { p_class_code: classCode }); }
function setClassLessonSetting(payload) { return request('/rest/v1/rpc/set_class_lesson_setting', { p_login_code: payload.loginCode || '', p_class_code: payload.classCode || '', p_mode: payload.mode || 'daily', p_area_code: payload.areaCode || null, p_activity_no: payload.activityNo ? Number(payload.activityNo) : null, p_active_until: payload.activeUntil || null }); }
