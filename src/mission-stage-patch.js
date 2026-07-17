const TYPES = ['S', 'A', 'I', 'L'];
const PRACTICES_PER_STAGE = 4;
const PATCH_KEY = '__SAIL_MISSION_STAGE_PATCHED__';

function todayKst() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : '';
}

function missionDate(mission) {
  return mission?.mission_date ||
    mission?.date ||
    mission?.target_date ||
    mission?.assigned_date ||
    mission?.available_date ||
    mission?.display_date ||
    mission?.day_date ||
    '';
}

function missionLevel(mission) {
  return Number(
    mission?.level ||
    mission?.mission_level ||
    mission?.stage ||
    mission?.step ||
    mission?.mission_step ||
    1
  );
}

function typeCount(status, type) {
  return Number((status || {})[`${String(type).toLowerCase()}_count`] || 0);
}

function currentStage(status, type) {
  return Math.min(5, Math.floor(typeCount(status, type) / PRACTICES_PER_STAGE) + 1);
}

function isLessonQuestionPayload(payload) {
  return payload?.mission_selection?.mode === 'lesson' ||
    payload?.missions?.some(mission => mission?.lesson_mode || mission?.lesson_question_id);
}

function filterDailyStageMissions(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.missions)) {
    return payload;
  }

  if (isLessonQuestionPayload(payload)) {
    return {
      ...payload,
      daily_limit: Number(payload.daily_limit || 2)
    };
  }

  const today = todayKst();
  const candidates = payload.missions.filter(mission => {
    const d = dateOnly(missionDate(mission));
    return !d || d === today;
  });

  const missions = TYPES.map(type => {
    const stage = currentStage(payload.status, type);
    return candidates.find(m => m?.mission_type === type && missionLevel(m) === stage) ||
      candidates.find(m => m?.mission_type === type) ||
      null;
  }).filter(Boolean).slice(0, 4);

  return {
    ...payload,
    missions,
    daily_limit: Number(payload.daily_limit || 2)
  };
}

function rebuildJsonResponse(response, payload) {
  const headers = new Headers(response.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }

  return new Response(JSON.stringify(payload), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    const shouldPatch = url.includes('/rpc/login_student') ||
      url.includes('/rpc/get_student_home') ||
      url.includes('/rpc/save_mission_result');

    if (!shouldPatch || !response.ok) return response;

    try {
      const data = await response.clone().json();
      const patched = filterDailyStageMissions(data);
      return rebuildJsonResponse(response, patched);
    } catch {
      return response;
    }
  };
}
