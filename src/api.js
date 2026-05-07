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

function normalizeTeacherRole(role) {
  const value = String(role || '').toLowerCase();
  return value === 'admin' || value === '관리자' ? 'admin' : 'teacher';
}

export async function loginStudent(loginCode) {
  try {
    const teachers = await request(
      `/rest/v1/teachers?login_code=eq.${encodeURIComponent(loginCode)}&select=teacher_id,name,login_code,class_code,role&limit=1`,
      { method: 'GET' }
    );

    if (Array.isArray(teachers) && teachers.length) {
      const teacher = teachers[0];
      const role = normalizeTeacherRole(teacher.role);
      const classCode = teacher.class_code || '';

      localStorage.setItem('SAIL_ROLE', role);
      localStorage.setItem('SAIL_CLASS_CODE', classCode);
      localStorage.setItem('SAIL_TEACHER_CLASS_CODE', classCode);

      return {
        student: {
          student_id: teacher.teacher_id,
          name: teacher.name,
          login_code: teacher.login_code,
          class_code: classCode,
          role,
          is_teacher: true
        },
        status: {
          level: 1,
          total_score: 0,
          coin: 0,
          streak: 0
        },
        missions: [],
        today_saved_mission_ids: [],
        today_saved_count: 0,
        daily_limit: 0,
        daily_limit_reasons: ['교사 계정']
      };
    }
  } catch {}

  localStorage.setItem('SAIL_ROLE', 'student');

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

export async function getShips() {
  return request('/rest/v1/ships?active=eq.true&select=ship_id,name,level,price,img_url,is_default&order=level.asc,price.asc,name.asc', {
    method: 'GET'
  });
}

export async function buyShip(studentId, shipId) {
  return request('/rest/v1/rpc/buy_ship', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_ship_id: shipId })
  });
}

export async function setEquippedShip(studentId, shipId) {
  return request('/rest/v1/rpc/set_equipped_ship', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_ship_id: shipId })
  });
}

export async function buyDecoration(studentId, decorationId) {
  return request('/rest/v1/rpc/buy_decoration', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_decoration_id: decorationId })
  });
}

export async function setEquippedDecoration(studentId, decorationId) {
  return request('/rest/v1/rpc/set_equipped_decoration', {
    method: 'POST',
    body: JSON.stringify({ p_student_id: studentId, p_decoration_id: decorationId })
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
