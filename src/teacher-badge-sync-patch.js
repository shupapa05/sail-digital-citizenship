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

  const ALIAS_BY_AREA = {
    S: ['safe', 'safety', 'security', '안전'],
    A: ['accountable', 'accountability', 'responsible', 'responsibility', '책임'],
    I: ['ethic', 'ethics', 'ethical', 'integrity', '윤리'],
    L: ['listen', 'listening', 'communication', 'communicate', '소통']
  };

  const statusCache = new Map();
  const statusPending = new Set();

  let dashboardData = {};
  let primaryStudents = [];
  let namedCandidates = new Map();
  let rafId = 0;

  const originalFetch = window.fetch?.bind(window);
  if (originalFetch) {
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = String(args[0] || '');

      if (url.includes('/rpc/get_teacher_dashboard')) {
        try {
          const json = await response.clone().json();
          updateDashboardIndex(json);
          scheduleSync();
        } catch {
          // Keep original response when parsing fails.
        }
      }

      return response;
    };
  }

  function scheduleSync() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      syncBadgeTable();
    });
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

  function normalizeKey(value) {
    return String(value ?? '').trim();
  }

  function compactName(value) {
    return normalizeKey(value).replace(/\s+/g, '');
  }

  function getStudentName(row) {
    return normalizeKey(row?.name || row?.student_name || row?.studentName || row?.student || '');
  }

  function getStudentId(row) {
    return normalizeKey(row?.student_id || row?.studentId || row?.id || row?.user_id || row?.userId || '');
  }

  function getLoginCode(row) {
    return normalizeKey(row?.login_code || row?.loginCode || row?.code || row?.student_code || row?.studentCode || '');
  }

  function pushCandidate(map, key, row) {
    if (!key || !row) return;
    const list = map.get(key) || [];
    if (!list.includes(row)) list.push(row);
    map.set(key, list);
  }

  function collectObjectsDeep(value, out, depth = 0) {
    if (!value || depth > 3) return;

    if (Array.isArray(value)) {
      value.forEach(item => collectObjectsDeep(item, out, depth + 1));
      return;
    }

    if (typeof value !== 'object') return;

    out.push(value);

    Object.values(value).forEach(next => {
      if (next && typeof next === 'object') {
        collectObjectsDeep(next, out, depth + 1);
      }
    });
  }

  function updateDashboardIndex(raw) {
    dashboardData = normalizeDashboard(raw);
    primaryStudents = extractStudents(dashboardData);

    const allObjects = [];
    collectObjectsDeep(dashboardData, allObjects);

    const nextCandidates = new Map();

    allObjects.forEach(obj => {
      const name = getStudentName(obj);
      if (!name) return;

      const compact = compactName(name);
      pushCandidate(nextCandidates, name, obj);
      pushCandidate(nextCandidates, compact, obj);

      const id = getStudentId(obj);
      if (id) pushCandidate(nextCandidates, id, obj);
    });

    namedCandidates = nextCandidates;
  }

  function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function pickFirstNumber(values) {
    for (const value of values) {
      const parsed = toFiniteNumber(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return NaN;
  }

  function countFromKnownKeys(source, areaCode) {
    const lower = areaCode.toLowerCase();
    const aliases = ALIAS_BY_AREA[areaCode] || [];
    const keys = [
      `${lower}_count`,
      `${lower}Count`,
      `${areaCode}_count`,
      `${areaCode}Count`,
      `${lower}_practice_count`,
      `${lower}PracticeCount`,
      `${lower}_total`,
      `${lower}Total`,
      lower,
      areaCode
    ];

    aliases.forEach(alias => {
      keys.push(
        `${alias}_count`,
        `${alias}Count`,
        `${alias}_practice_count`,
        `${alias}PracticeCount`,
        `${alias}_total`,
        `${alias}Total`,
        alias
      );
    });

    const direct = pickFirstNumber(keys.map(key => source?.[key]));
    if (!Number.isNaN(direct)) return direct;

    const nested = source?.[lower] || source?.[areaCode];
    if (nested && typeof nested === 'object') {
      const nestedValue = pickFirstNumber([
        nested?.count,
        nested?.total,
        nested?.value,
        nested?.practice_count,
        nested?.practiceCount
      ]);
      if (!Number.isNaN(nestedValue)) return nestedValue;
    }

    return NaN;
  }

  function countFromFuzzyKeys(source, areaCode) {
    if (!source || typeof source !== 'object') return NaN;

    const aliases = ALIAS_BY_AREA[areaCode] || [];
    const keys = Object.keys(source);
    const matched = [];

    keys.forEach(key => {
      const normalized = key.toLowerCase().replace(/\s+/g, '');
      const hitArea = aliases.some(alias => normalized.includes(alias.toLowerCase()));
      if (!hitArea) return;

      if (
        normalized.includes('count') ||
        normalized.includes('total') ||
        normalized.includes('practice') ||
        normalized.includes('횟수') ||
        normalized.includes('실천')
      ) {
        matched.push(source[key]);
      }
    });

    return pickFirstNumber(matched);
  }

  function countOfCandidate(candidate, areaCode) {
    const sources = [
      candidate,
      candidate?.status,
      candidate?.student_status,
      candidate?.studentStatus,
      candidate?.badge_status,
      candidate?.badgeStatus,
      candidate?.badge_counts,
      candidate?.badgeCounts,
      candidate?.badges,
      candidate?.counts,
      candidate?.metrics,
      candidate?.summary,
      candidate?.progress,
      candidate?.badge_progress,
      candidate?.badgeProgress
    ].filter(Boolean);

    let best = 0;

    sources.forEach(source => {
      const known = countFromKnownKeys(source, areaCode);
      if (!Number.isNaN(known)) best = Math.max(best, Math.max(0, Math.round(known)));

      const fuzzy = countFromFuzzyKeys(source, areaCode);
      if (!Number.isNaN(fuzzy)) best = Math.max(best, Math.max(0, Math.round(fuzzy)));
    });

    return best;
  }

  function badgeLevel(count) {
    if (count >= 20) return 4;
    if (count >= 15) return 3;
    if (count >= 10) return 2;
    if (count >= 5) return 1;
    return 0;
  }

  function fetchJson(url, options) {
    return fetch(url, options).then(async res => {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    });
  }

  async function fetchStatusByTable(studentId) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !studentId) return null;

    const query = `${SUPABASE_URL}/rest/v1/student_status?student_id=eq.${encodeURIComponent(studentId)}&select=student_id,s_count,a_count,i_count,l_count&limit=1`;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const data = await fetchJson(query, { method: 'GET', headers });
    if (Array.isArray(data) && data[0]) return data[0];
    return null;
  }

  async function fetchStatusByRpc(studentId, loginCode = '') {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !studentId) return null;

    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    const payload = {
      p_student_id: studentId,
      p_login_code: loginCode
    };

    const data = await fetchJson(`${SUPABASE_URL}/rest/v1/rpc/get_student_home`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (data?.status && typeof data.status === 'object') return data.status;
    return null;
  }

  async function ensureStudentStatus(primaryStudent, extraCandidates = []) {
    const studentId = getStudentId(primaryStudent);
    if (!studentId) return;
    if (statusCache.has(studentId) || statusPending.has(studentId)) return;

    statusPending.add(studentId);

    try {
      const byTable = await fetchStatusByTable(studentId);
      if (byTable) {
        statusCache.set(studentId, byTable);
        return;
      }

      const loginCode = [
        getLoginCode(primaryStudent),
        ...extraCandidates.map(getLoginCode)
      ].find(Boolean) || '';

      const byRpc = await fetchStatusByRpc(studentId, loginCode);
      if (byRpc) statusCache.set(studentId, byRpc);
    } catch {
      // Silent fallback: keep dashboard data only.
    } finally {
      statusPending.delete(studentId);
      scheduleSync();
    }
  }

  function findPrimaryStudentByName(name) {
    const compact = compactName(name);
    return primaryStudents.find(row => compactName(getStudentName(row)) === compact) || null;
  }

  function resolveCandidatesByName(name) {
    const raw = normalizeKey(name);
    const compact = compactName(raw);

    const merged = [];
    const push = row => {
      if (row && !merged.includes(row)) merged.push(row);
    };

    (namedCandidates.get(raw) || []).forEach(push);
    (namedCandidates.get(compact) || []).forEach(push);

    const primary = findPrimaryStudentByName(raw);
    if (primary) push(primary);

    return merged;
  }

  function mergeCountsFromCandidates(candidates, primaryStudent) {
    const counts = {
      S: 0,
      A: 0,
      I: 0,
      L: 0
    };

    const sources = [...candidates];

    const studentId = getStudentId(primaryStudent);
    if (studentId && statusCache.has(studentId)) {
      sources.push(statusCache.get(studentId));
    }

    sources.forEach(candidate => {
      AREAS.forEach(area => {
        counts[area.code] = Math.max(counts[area.code], countOfCandidate(candidate, area.code));
      });
    });

    return counts;
  }

  function syncBadgeTable() {
    const cards = Array.from(document.querySelectorAll('.teacher-card'));
    const badgeCard = cards.find(card => {
      const title = card.querySelector('h2')?.textContent || '';
      return title.includes('학생별 배지 진행도');
    });
    if (!badgeCard) return;

    const rows = badgeCard.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 6) return;

      const studentName = normalizeKey(cells[0].textContent);
      if (!studentName) return;

      const candidates = resolveCandidatesByName(studentName);
      const primary = findPrimaryStudentByName(studentName) || candidates[0] || null;
      if (!primary && !candidates.length) return;

      const counts = mergeCountsFromCandidates(candidates, primary);

      cells[1].textContent = `${counts.S}/${BADGE_MAX}`;
      cells[2].textContent = `${counts.A}/${BADGE_MAX}`;
      cells[3].textContent = `${counts.I}/${BADGE_MAX}`;
      cells[4].textContent = `${counts.L}/${BADGE_MAX}`;

      const weakest = [
        { label: '안전', value: counts.S },
        { label: '책임', value: counts.A },
        { label: '윤리', value: counts.I },
        { label: '소통', value: counts.L }
      ].sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return badgeLevel(a.value) - badgeLevel(b.value);
      })[0];

      cells[5].innerHTML = `<b>${weakest.label} ${weakest.value}/${BADGE_MAX}</b>`;

      const totalNow = counts.S + counts.A + counts.I + counts.L;
      if (totalNow === 0 && primary) {
        ensureStudentStatus(primary, candidates);
      }
    });
  }

  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleSync();
}
