import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_TEACHER_BADGE_SYNC_PATCHED__';

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  const BADGE_MAX = 20;
  const EMPTY_COUNTS = { S: 0, A: 0, I: 0, L: 0 };

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  const studentByName = new Map();
  const badgeCache = new Map();
  let syncRunning = false;
  let syncQueued = false;
  let lastIndexClassCode = '';

  function n(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeText(value) {
    return String(value ?? '').trim();
  }

  function compactText(value) {
    return normalizeText(value).replace(/\s+/g, '');
  }

  function currentClassCode() {
    return (
      normalizeText(localStorage.getItem('SAIL_TEACHER_CLASS_CODE')) ||
      normalizeText(localStorage.getItem('SAIL_CLASS_CODE')) ||
      'ALL'
    );
  }

  function normalizeDashboard(raw) {
    if (Array.isArray(raw)) return raw[0] || {};
    if (raw?.data && Array.isArray(raw.data)) return raw.data[0] || {};
    if (raw?.data && typeof raw.data === 'object') return raw.data;
    return raw || {};
  }

  function normalizeHome(raw) {
    if (Array.isArray(raw)) return raw[0] || {};
    if (raw?.data && Array.isArray(raw.data)) return raw.data[0] || {};
    if (raw?.data && typeof raw.data === 'object') return raw.data;
    return raw || {};
  }

  function extractStudents(data) {
    if (Array.isArray(data?.students)) return data.students;
    if (Array.isArray(data?.student_statuses)) return data.student_statuses;
    if (Array.isArray(data?.studentRows)) return data.studentRows;
    if (Array.isArray(data?.student_rows)) return data.student_rows;
    if (Array.isArray(data?.studentStatuses)) return data.studentStatuses;
    return [];
  }

  function getStudentName(row) {
    return normalizeText(row?.name || row?.student_name || row?.studentName || row?.student || '');
  }

  function getStudentId(row) {
    return normalizeText(row?.student_id || row?.studentId || row?.id || row?.user_id || row?.userId || '');
  }

  function cloneCounts(counts) {
    return {
      S: n(counts?.S),
      A: n(counts?.A),
      I: n(counts?.I),
      L: n(counts?.L)
    };
  }

  function countsFromStatus(status) {
    return {
      S: n(status?.s_count),
      A: n(status?.a_count),
      I: n(status?.i_count),
      L: n(status?.l_count)
    };
  }

  async function fetchJson(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    const json = text ? (() => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    })() : null;

    if (!res.ok) {
      throw new Error(json?.message || json?.error || `request failed (${res.status})`);
    }

    return json;
  }

  async function rpc(functionName, payload) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    return fetchJson(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload || {})
    });
  }

  async function buildStudentIndex(force = false) {
    const classCode = currentClassCode();
    if (!force && studentByName.size && lastIndexClassCode === classCode) return;

    studentByName.clear();
    lastIndexClassCode = classCode;

    const raw = await rpc('get_teacher_dashboard', { p_class_code: classCode || 'ALL' });
    const data = normalizeDashboard(raw);
    const students = extractStudents(data);

    students.forEach(row => {
      const name = getStudentName(row);
      const compact = compactText(name);
      if (!name) return;

      if (!studentByName.has(name)) studentByName.set(name, row);
      if (compact && !studentByName.has(compact)) studentByName.set(compact, row);
    });
  }

  async function fetchBadgeCounts(studentId) {
    const key = normalizeText(studentId);
    if (!key) return cloneCounts(EMPTY_COUNTS);

    if (badgeCache.has(key)) return cloneCounts(badgeCache.get(key));

    let counts = cloneCounts(EMPTY_COUNTS);

    try {
      const homeRaw = await rpc('get_student_home', { p_student_id: key });
      const home = normalizeHome(homeRaw);
      const status = home?.status || home?.student_status || {};
      counts = countsFromStatus(status);
    } catch {
      counts = cloneCounts(EMPTY_COUNTS);
    }

    badgeCache.set(key, counts);
    return cloneCounts(counts);
  }

  function getBadgeCard() {
    const cards = Array.from(document.querySelectorAll('.teacher-card'));
    return cards.find(card => {
      const title = card.querySelector('h2')?.textContent || '';
      return title.includes('학생별 배지 진행도');
    }) || null;
  }

  function updateRowCells(cells, counts) {
    if (cells.length < 6) return;

    cells[1].textContent = `${n(counts.S)}/${BADGE_MAX}`;
    cells[2].textContent = `${n(counts.A)}/${BADGE_MAX}`;
    cells[3].textContent = `${n(counts.I)}/${BADGE_MAX}`;
    cells[4].textContent = `${n(counts.L)}/${BADGE_MAX}`;

    const weakest = [
      { label: '안전', value: n(counts.S) },
      { label: '책임', value: n(counts.A) },
      { label: '윤리', value: n(counts.I) },
      { label: '소통', value: n(counts.L) }
    ].sort((a, b) => a.value - b.value)[0];

    cells[5].innerHTML = `<b>${weakest.label} ${weakest.value}/${BADGE_MAX}</b>`;
  }

  async function syncBadgeTableNow() {
    if (syncRunning) {
      syncQueued = true;
      return;
    }

    syncRunning = true;

    try {
      const badgeCard = getBadgeCard();
      if (!badgeCard) return;

      const tableRows = Array.from(badgeCard.querySelectorAll('tbody tr'));
      if (!tableRows.length) return;

      await buildStudentIndex();

      for (const tr of tableRows) {
        const cells = tr.querySelectorAll('td');
        if (cells.length < 6) continue;

        const rawName = normalizeText(cells[0].textContent);
        const compactName = compactText(rawName);
        const student = studentByName.get(rawName) || studentByName.get(compactName);
        if (!student) continue;

        const studentId = getStudentId(student);
        if (!studentId) continue;

        const counts = await fetchBadgeCounts(studentId);
        updateRowCells(cells, counts);
      }
    } catch {
      // Keep teacher screen stable even if sync fails.
    } finally {
      syncRunning = false;
      if (syncQueued) {
        syncQueued = false;
        setTimeout(() => { syncBadgeTableNow(); }, 0);
      }
    }
  }

  let timerId = 0;
  function scheduleSync(delay = 350) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = 0;
      syncBadgeTableNow();
    }, delay);
  }

  new MutationObserver(() => scheduleSync(250)).observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleSync(500);
  setInterval(() => {
    badgeCache.clear();
    scheduleSync(0);
  }, 15000);
}
