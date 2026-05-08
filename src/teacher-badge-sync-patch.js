import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const PATCH_KEY = '__SAIL_TEACHER_BADGE_SYNC_PATCHED__';

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  const BADGE_MAX = 20;
  const AREAS = [
    { code: 'S', label: '안전' },
    { code: 'A', label: '책임' },
    { code: 'I', label: '윤리' },
    { code: 'L', label: '소통' }
  ];

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };

  const studentByName = new Map();
  const badgeCache = new Map();
  let syncRunning = false;
  let syncQueued = false;

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

  function normalizeDashboard(raw) {
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

  async function buildStudentIndex() {
    studentByName.clear();

    const classCode =
      normalizeText(localStorage.getItem('SAIL_TEACHER_CLASS_CODE')) ||
      normalizeText(localStorage.getItem('SAIL_CLASS_CODE')) ||
      'ALL';

    const raw = await rpc('get_teacher_dashboard', { p_class_code: classCode });
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

  function areaCodeOf(item) {
    const raw = String(item?.mission_type || item?.type || item?.missionType || '').toUpperCase();
    if (raw === 'S' || raw === 'A' || raw === 'I' || raw === 'L') return raw;
    return '';
  }

  function countItems(items) {
    const counts = { S: 0, A: 0, I: 0, L: 0 };

    (items || []).forEach(item => {
      const code = areaCodeOf(item);
      if (!code) return;
      counts[code] += 1;
    });

    return counts;
  }

  async function fetchYearCounts(studentId) {
    if (!studentId) return { S: 0, A: 0, I: 0, L: 0 };

    if (badgeCache.has(studentId)) return badgeCache.get(studentId);

    const now = new Date();
    const year = now.getFullYear();
    const monthMax = now.getMonth() + 1;

    const total = { S: 0, A: 0, I: 0, L: 0 };

    for (let month = 1; month <= monthMax; month += 1) {
      try {
        const history = await rpc('get_monthly_history', {
          p_student_id: studentId,
          p_year: year,
          p_month: month
        });

        const monthly = countItems(Array.isArray(history?.items) ? history.items : []);
        total.S += monthly.S;
        total.A += monthly.A;
        total.I += monthly.I;
        total.L += monthly.L;
      } catch {
        // Ignore month-level failures and continue.
      }
    }

    badgeCache.set(studentId, total);
    return total;
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

        const counts = await fetchYearCounts(studentId);
        updateRowCells(cells, counts);
      }
    } catch {
      // Silent to avoid blocking teacher screen.
    } finally {
      syncRunning = false;
      if (syncQueued) {
        syncQueued = false;
        setTimeout(() => { syncBadgeTableNow(); }, 0);
      }
    }
  }

  let timerId = 0;
  function scheduleSync(delay = 400) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = 0;
      syncBadgeTableNow();
    }, delay);
  }

  new MutationObserver(() => scheduleSync(300)).observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleSync(600);
  setInterval(() => scheduleSync(0), 15000);
}
