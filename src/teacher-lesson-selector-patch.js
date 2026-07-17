import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_TEACHER_LESSON_SELECTOR_PATCHED__';
const AREA_LABELS = { S: '안전', A: '책임', I: '윤리', L: '소통' };

let poolCache = null;
let loading = false;

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  injectStyle();
  new MutationObserver(() => scheduleRender()).observe(document.body, { childList: true, subtree: true });
  scheduleRender();
}

function scheduleRender() {
  if (loading) return;
  setTimeout(renderSelector, 120);
}

function injectStyle() {
  if (document.querySelector('#teacherLessonSelectorStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherLessonSelectorStyles';
  style.textContent = `
    .lesson-selector-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
    .lesson-selector-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}
    .lesson-selector-head h2{margin:0;color:#07192f}
    .lesson-selector-head p{margin:4px 0 0;color:#60738d;line-height:1.45}
    .lesson-mode-pill{display:inline-flex;align-items:center;border-radius:999px;background:#eaf2ff;color:#3264df;font-weight:900;padding:7px 12px;white-space:nowrap}
    .lesson-selector-form{display:grid;grid-template-columns:140px minmax(220px,1fr) 150px auto auto;gap:10px;align-items:end}
    .lesson-selector-form label{display:grid;gap:6px;color:#415a77;font-size:13px;font-weight:900}
    .lesson-selector-form select,.lesson-selector-form input{min-height:46px}
    .lesson-selector-form button{min-height:46px;border:0;border-radius:14px;padding:10px 14px;font-weight:900}
    .lesson-save-btn{background:#3264df;color:white}
    .lesson-daily-btn{background:#64748b;color:white}
    .lesson-selector-note{margin:12px 0 0;color:#415a77;line-height:1.5;font-size:14px}
    @media(max-width:900px){.lesson-selector-form{grid-template-columns:1fr 1fr}.lesson-selector-form button{width:100%}}
    @media(max-width:640px){.lesson-selector-head,.lesson-selector-form{display:grid;grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function isTeacherMode() {
  return localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin';
}

function currentClassCode() {
  const role = localStorage.getItem('SAIL_ROLE') || '';
  const code = localStorage.getItem('SAIL_TEACHER_CLASS_CODE') || localStorage.getItem('SAIL_CLASS_CODE') || '';
  if (role === 'admin') return code && code !== 'ALL' ? code : '';
  return code;
}

function today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
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

async function loadPool() {
  if (poolCache) return poolCache;
  const rows = await getLessonQuestionPool();
  const map = new Map();
  rows.forEach(row => {
    const key = `${row.area_code}:${row.activity_no}`;
    if (!map.has(key)) {
      map.set(key, {
        area_code: row.area_code,
        area_label: row.area_label || AREA_LABELS[row.area_code] || row.area_code,
        activity_no: Number(row.activity_no),
        activity_title: row.activity_title
      });
    }
  });
  poolCache = [...map.values()].sort((a, b) => {
    const areaOrder = ['S', 'A', 'I', 'L'].indexOf(a.area_code) - ['S', 'A', 'I', 'L'].indexOf(b.area_code);
    return areaOrder || a.activity_no - b.activity_no;
  });
  return poolCache;
}

function renderOptions(pool, selectedArea, selectedActivity) {
  const areaOptions = ['S', 'A', 'I', 'L'].map(code =>
    `<option value="${code}" ${code === selectedArea ? 'selected' : ''}>${AREA_LABELS[code]}</option>`
  ).join('');
  const activities = pool.filter(item => item.area_code === selectedArea);
  const activityOptions = activities.map(item =>
    `<option value="${item.activity_no}" ${Number(item.activity_no) === Number(selectedActivity) ? 'selected' : ''}>${item.activity_no}. ${esc(item.activity_title)}</option>`
  ).join('');
  return { areaOptions, activityOptions };
}

async function renderSelector() {
  if (!isTeacherMode()) return;
  const dashboard = document.querySelector('#dashboard .teacher-dashboard') || document.querySelector('#dashboard');
  if (!dashboard || document.querySelector('[data-lesson-selector]')) return;

  const classCode = currentClassCode();
  if (!classCode) return;

  loading = true;
  try {
    const [pool, setting] = await Promise.all([
      loadPool(),
      getClassLessonSetting(classCode).catch(() => ({ mode: 'daily' }))
    ]);
    const selectedArea = setting?.area_code || 'S';
    const selectedActivity = Number(setting?.activity_no || 1);
    const options = renderOptions(pool, selectedArea, selectedActivity);
    const modeText = setting?.mode === 'lesson'
      ? `${AREA_LABELS[setting.area_code] || setting.area_code} ${setting.activity_no}번 활동 적용 중`
      : '일상생활 전체 랜덤';

    dashboard.insertAdjacentHTML('afterbegin', `
      <section class="lesson-selector-card" data-lesson-selector>
        <div class="lesson-selector-head">
          <div>
            <h2>오늘 질문 범위</h2>
            <p>수업한 영역과 활동을 선택하면 학생 미션 질문이 해당 활동 질문으로 바뀝니다.</p>
          </div>
          <span class="lesson-mode-pill">${esc(modeText)}</span>
        </div>
        <form class="lesson-selector-form" data-lesson-form>
          <label>영역
            <select name="area">${options.areaOptions}</select>
          </label>
          <label>활동
            <select name="activity">${options.activityOptions}</select>
          </label>
          <label>적용 종료일
            <input name="activeUntil" type="date" value="${esc(setting?.active_until || today())}">
          </label>
          <button class="lesson-save-btn" type="submit">수업 질문 적용</button>
          <button class="lesson-daily-btn" type="button" data-lesson-daily>일상 랜덤</button>
        </form>
        <p class="lesson-selector-note">현재 학급: ${esc(classCode)}. 기존 점수, 배지, 랭킹은 그대로 유지됩니다.</p>
      </section>
    `);

    bindSelector(pool, classCode);
  } finally {
    loading = false;
  }
}

function bindSelector(pool, classCode) {
  const form = document.querySelector('[data-lesson-form]');
  const areaSelect = form?.elements.area;
  const activitySelect = form?.elements.activity;
  if (!form || !areaSelect || !activitySelect) return;

  areaSelect.addEventListener('change', () => {
    const options = renderOptions(pool, areaSelect.value, 1);
    activitySelect.innerHTML = options.activityOptions;
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await setClassLessonSetting({
      loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '',
      classCode,
      mode: 'lesson',
      areaCode: areaSelect.value,
      activityNo: activitySelect.value,
      activeUntil: form.elements.activeUntil.value || today()
    });
    document.querySelector('[data-lesson-selector]')?.remove();
    await renderSelector();
  });

  document.querySelector('[data-lesson-daily]')?.addEventListener('click', async () => {
    await setClassLessonSetting({
      loginCode: localStorage.getItem('SAIL_LOGIN_CODE') || '',
      classCode,
      mode: 'daily',
      activeUntil: today()
    });
    document.querySelector('[data-lesson-selector]')?.remove();
    await renderSelector();
  });
}

async function request(path, payload = null) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: payload ? 'POST' : 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || data?.error || '수업 질문 설정을 처리하지 못했습니다.');
  return data;
}

function getLessonQuestionPool() {
  return request('/rest/v1/lesson_question_pool?active=eq.true&select=area_code,area_label,activity_no,activity_title,stage,stage_label,question,source_page&order=area_code.asc,activity_no.asc,stage.asc');
}

function getClassLessonSetting(classCode) {
  return request('/rest/v1/rpc/get_class_lesson_setting', { p_class_code: classCode });
}

function setClassLessonSetting(payload) {
  return request('/rest/v1/rpc/set_class_lesson_setting', {
    p_login_code: payload.loginCode || '',
    p_class_code: payload.classCode || '',
    p_mode: payload.mode || 'daily',
    p_area_code: payload.areaCode || null,
    p_activity_no: payload.activityNo ? Number(payload.activityNo) : null,
    p_active_until: payload.activeUntil || null
  });
}
