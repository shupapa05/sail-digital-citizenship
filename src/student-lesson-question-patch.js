import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_STUDENT_LESSON_QUESTION_PATCHED__';
const PATCHED_RPC_PATHS = [
  '/rpc/login_student',
  '/rpc/get_student_home',
  '/rpc/save_mission_result'
];

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  patchStudentHome();
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function missionDate() {
  return todayKey();
}

function rotateRows(rows, seed, limit) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  if (!list.length) return [];
  const start = Math.abs(hash(seed)) % list.length;
  return list.slice(start).concat(list.slice(0, start)).slice(0, Math.max(1, limit || 2));
}

function hash(value) {
  return String(value || '').split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
}

function readBodyPayload(init) {
  try {
    if (!init?.body || typeof init.body !== 'string') return {};
    return JSON.parse(init.body) || {};
  } catch {
    return {};
  }
}

function getLoginCode(data, init) {
  const payload = readBodyPayload(init);
  return data?.student?.login_code || payload?.p_login_code || payload?.p_payload?.loginCode || localStorage.getItem('SAIL_LOGIN_CODE') || '';
}

function isPatchableRpc(url) {
  return PATCHED_RPC_PATHS.some(path => url.includes(path));
}

function toMission(row) {
  const areaCode = row?.area_code || 'S';
  const stage = Number(row?.stage || 1);
  const stageLabel = row?.stage_label || '수업 질문';
  return {
    mission_id: row?.base_mission_id || `M-${areaCode}-${String(stage).padStart(2, '0')}`,
    mission_type: areaCode,
    level: stage,
    mission_title: row?.activity_title || '수업 활동 질문',
    event_question: row?.question || '오늘 수업에서 배운 내용을 떠올려 볼까요?',
    check_question: `수업 질문 · ${stageLabel}`,
    mission_date: missionDate(),
    lesson_mode: true,
    lesson_activity_no: row?.activity_no || 0,
    lesson_question_id: row?.lesson_question_id || '',
    lesson_stage_label: stageLabel
  };
}

function patchStudentHome() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!isPatchableRpc(url)) return response;

    try {
      const data = await response.clone().json();
      const studentId = data?.student?.student_id || localStorage.getItem('SAIL_STUDENT_ID') || '';
      const loginCode = getLoginCode(data, init);
      if (!studentId || data?.student?.is_teacher) return response;

      const lesson = await getActiveLessonQuestions(studentId, loginCode);
      const questions = Array.isArray(lesson?.questions) ? lesson.questions : [];
      if (lesson?.mode !== 'lesson' || !questions.length) return response;

      const limit = Number(data?.daily_limit || 2) || 2;
      const selected = rotateRows(questions, `${studentId}:${todayKey()}:${lesson.area_code}:${lesson.activity_no}`, limit);
      data.missions = selected.map(toMission);
      data.mission_selection = {
        mode: 'lesson',
        date: todayKey(),
        class_code: lesson.class_code,
        area_code: lesson.area_code,
        area_label: lesson.area_label,
        activity_no: lesson.activity_no,
        activity_title: lesson.activity_title
      };

      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json');
      headers.delete('content-length');
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };
}

async function getActiveLessonQuestions(studentId, loginCode) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_active_lesson_questions`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_student_id: studentId, p_login_code: loginCode })
  });
  if (!res.ok) throw new Error('수업 질문을 불러오지 못했습니다.');
  return res.json();
}
