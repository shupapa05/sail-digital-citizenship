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
    S: ['safe', 'safety'],
    A: ['accountable', 'accountability', 'responsible', 'responsibility'],
    I: ['ethic', 'ethics', 'ethical', 'integrity'],
    L: ['listen', 'listening', 'communication', 'communicate']
  };

  let studentRows = [];
  let studentMap = new Map();
  let rafId = 0;

  const originalFetch = window.fetch?.bind(window);
  if (originalFetch) {
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = String(args[0] || '');

      if (url.includes('/rpc/get_teacher_dashboard')) {
        try {
          const json = await response.clone().json();
          updateStudentIndex(json);
          scheduleSync();
        } catch {
          // Keep original response even when parsing fails.
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

  function updateStudentIndex(raw) {
    const data = normalizeDashboard(raw);
    const rows = extractStudents(data);

    studentRows = Array.isArray(rows) ? rows : [];
    studentMap = new Map();

    studentRows.forEach(row => {
      const keys = [
        normalizeKey(row?.student_id),
        normalizeKey(row?.studentId),
        normalizeKey(row?.id),
        normalizeKey(row?.user_id),
        normalizeKey(row?.userId),
        normalizeKey(row?.login_code),
        normalizeKey(row?.loginCode),
        normalizeKey(row?.name),
        normalizeKey(row?.student_name),
        normalizeKey(row?.studentName),
        compactName(row?.name || row?.student_name || row?.studentName)
      ].filter(Boolean);

      keys.forEach(key => {
        if (!studentMap.has(key)) studentMap.set(key, row);
      });
    });
  }

  function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function pickNumber(values) {
    for (const value of values) {
      const parsed = toFiniteNumber(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return 0;
  }

  function sourcesOf(row) {
    return [
      row,
      row?.status,
      row?.student_status,
      row?.studentStatus,
      row?.badge_status,
      row?.badgeStatus,
      row?.badge_counts,
      row?.badgeCounts,
      row?.badges,
      row?.counts,
      row?.metrics
    ].filter(Boolean);
  }

  function countOf(row, areaCode) {
    const lower = areaCode.toLowerCase();
    const aliases = ALIAS_BY_AREA[areaCode] || [];
    const candidates = [];

    sourcesOf(row).forEach(source => {
      candidates.push(
        source?.[`${lower}_count`],
        source?.[`${lower}Count`],
        source?.[`${areaCode}_count`],
        source?.[`${areaCode}Count`],
        source?.[lower],
        source?.[areaCode],
        source?.[`${lower}_practice_count`],
        source?.[`${lower}PracticeCount`],
        source?.[`${lower}_total`],
        source?.[`${lower}Total`]
      );

      aliases.forEach(alias => {
        candidates.push(
          source?.[`${alias}_count`],
          source?.[`${alias}Count`],
          source?.[alias],
          source?.[`${alias}_total`],
          source?.[`${alias}Total`]
        );
      });
    });

    return Math.max(0, Math.round(pickNumber(candidates)));
  }

  function findStudentByName(name) {
    const raw = normalizeKey(name);
    if (!raw) return null;

    const compact = compactName(raw);
    return studentMap.get(raw) || studentMap.get(compact) || studentRows.find(row => {
      const rowName = row?.name || row?.student_name || row?.studentName || '';
      return compactName(rowName) === compact;
    }) || null;
  }

  function badgeLevel(count) {
    if (count >= 20) return 4;
    if (count >= 15) return 3;
    if (count >= 10) return 2;
    if (count >= 5) return 1;
    return 0;
  }

  function syncBadgeTable() {
    if (!studentRows.length) return;

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
      const student = findStudentByName(studentName);
      if (!student) return;

      const counts = AREAS.map(area => ({
        ...area,
        value: countOf(student, area.code)
      }));

      cells[1].textContent = `${counts[0].value}/${BADGE_MAX}`;
      cells[2].textContent = `${counts[1].value}/${BADGE_MAX}`;
      cells[3].textContent = `${counts[2].value}/${BADGE_MAX}`;
      cells[4].textContent = `${counts[3].value}/${BADGE_MAX}`;

      const weakest = [...counts].sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return badgeLevel(a.value) - badgeLevel(b.value);
      })[0];

      cells[5].innerHTML = `<b>${weakest.label} ${weakest.value}/${BADGE_MAX}</b>`;
    });
  }

  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true,
    subtree: true
  });

  scheduleSync();
}
