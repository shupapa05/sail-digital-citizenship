import { SUPABASE_ANON_KEY, SUPABASE_URL, STORAGE_BUCKET } from './config.js';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

async function request(path, options = {}) {
  if (!isConfigured()) {
    throw new Error('Supabase 설정이 필요합니다.');
  }

  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message || data?.error || '요청을 처리하지 못했습니다.');
  }

  return data;
}

export async function loginStudent(loginCode) {
  return request('/rest/v1/rpc/login_student', {
    method: 'POST',
    body: JSON.stringify({ p_login_code: loginCode })
  });
}

export async function getStudentHome(studentId, loginCode) {
  return request('/rest/v1/rpc/get_student_home', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_login_code: loginCode })
  });
}

export async function getMissionChoices(missionId) {
  return request(`/rest/v1/mission_choices?mission_id=eq.${encodeURIComponent(missionId)}&active=eq.true&order=choice_group.asc,sort_order.asc`, {
    method: 'GET'
  });
}

export async function saveMissionResult(payload) {
  return request('/rest/v1/rpc/save_mission_result', {
    method: 'POST',
    body: JSON.stringify({ p_payload: payload })
  });
}

export async function getMonthlyHistory(studentId, year, month) {
  return request('/rest/v1/rpc/get_monthly_history', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_year: year, p_month: month })
  });
}

export async function getTeacherDashboard(classCode) {
  return request('/rest/v1/rpc/get_teacher_dashboard', {
    method: 'POST',
    body: JSON.stringify({ p_class_code: classCode })
  });
}

export async function uploadProofPhoto(studentId, file) {
  if (!file) return { url: '', fileId: '' };

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${studentId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const uploadHeaders = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': file.type || 'application/octet-stream',
    'x-upsert': 'false'
  };

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: uploadHeaders,
    body: file
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || '사진 업로드에 실패했습니다.');
  }

  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`,
    fileId: path
  };
}
