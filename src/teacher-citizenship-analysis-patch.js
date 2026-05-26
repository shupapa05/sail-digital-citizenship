const CACHE_KEY = 'SAIL_TEACHER_CITIZENSHIP_ANALYSIS_V1';

injectAnalysisStyles();
wrapDashboardFetch();
observeDashboard();
setTimeout(injectTeacherAnalysis, 300);
setInterval(dedupeTeacherAnalysisCards, 800);

function wrapDashboardFetch() {
  if (window.__SAIL_TEACHER_ANALYSIS_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_TEACHER_ANALYSIS_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/get_teacher_dashboard')) {
      response.clone().json().then(data => {
        localStorage.setItem(CACHE_KEY, JSON.stringify(normalizeDashboard(data)));
        setTimeout(injectTeacherAnalysis, 80);
      }).catch(() => {});
    }
    return response;
  };
}

function observeDashboard() {
  new MutationObserver(() => {
    dedupeTeacherAnalysisCards();
    injectTeacherAnalysis();
  }).observe(document.body, { childList: true, subtree: true });
}

function injectAnalysisStyles() {
  if (document.querySelector('#teacherCitizenshipAnalysisStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherCitizenshipAnalysisStyles';
  style.textContent = `
    .citizen-analysis-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%);display:grid;gap:16px}
    .citizen-analysis-card h2{margin:0;color:#07192f;font-size:24px}
    .analysis-head{display:grid;grid-template-columns:160px 1fr;gap:18px;align-items:center}
    .analysis-ring{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#3264df calc(var(--score)*1%),#e9f0f7 0);position:relative}
    .analysis-ring::before{content:"";position:absolute;inset:12px;border-radius:50%;background:#fff}
    .analysis-ring strong{position:relative;color:#07192f;font-size:42px}
    .analysis-ring span{position:relative;color:#60738d;font-weight:900}
    .analysis-copy{display:grid;gap:8px}
    .analysis-copy p{margin:0;color:#415a77;line-height:1.55;font-weight:800}
    .analysis-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .analysis-metric{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;display:grid;gap:5px}
    .analysis-metric strong{font-size:28px;color:#07192f}
    .analysis-metric span{color:#60738d;font-weight:900}
    .analysis-metric small{color:#415a77;line-height:1.35;font-weight:800}
    .analysis-split{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .analysis-panel{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px}
    .analysis-panel h3{margin:0 0 10px;color:#07192f}
    .analysis-bars{display:grid;gap:9px}
    .analysis-row{display:grid;grid-template-columns:64px 1fr 42px;gap:8px;align-items:center;font-weight:900}
    .analysis-track{height:12px;background:#e9f0f7;border-radius:999px;overflow:hidden}
    .analysis-fill{height:100%;border-radius:999px;display:block}
    .analysis-fill.s{background:#3b82f6}.analysis-fill.a{background:#f97316}.analysis-fill.i{background:#a855f7}.analysis-fill.l{background:#22c55e}
    .analysis-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}
    .analysis-list li{background:#fff;border:1px solid #d9e5f4;border-radius:14px;padding:10px;color:#334155;font-weight:800;line-height:1.45}
    .analysis-warning{border-left:5px solid #f97316}
    .analysis-good{border-left:5px solid #22c55e}
    @media(max-width:720px){.analysis-head,.analysis-split,.analysis-metrics{grid-template-columns:1fr}.analysis-ring{width:min(180px,70vw);justify-self:center}.analysis-metric strong{font-size:24px}}
  `;
  document.head.appendChild(style);
}

function normalizeDashboard(raw) {
  if (Array.isArray(raw)) return raw[0] || {};
  if (raw?.data && Array.isArray(raw.data)) return raw.data[0] || {};
  if (raw?.data && typeof raw.data === 'object') return raw.data;
  return raw || {};
}

function readDashboard() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function arr(...values) {
  for (const value of values) if (Array.isArray(value)) return value;
  return [];
}

function num(value) { return Number(value || 0); }

function countArea(row, key) {
  const lower = key.toLowerCase();
  return num(row[`${lower}_count`] || row[`${key}_count`] || row[key] || row[lower] || row[`${lower}Count`] || row[`${key}Count`]);
}

function totalScore(row) {
  return num(row.total_score || row.totalScore || row.score || row.point || row.points);
}

function todayCount(row) {
  return num(row.today_count || row.todayCount || row.today_logs || row.todayLogs);
}

function studentName(row) {
  return row.name || row.student_name || row.studentName || row.student_id || '학생';
}

function hasEvidence(log) {
  return Boolean(String(log.note || log.memo || '').trim() || log.photo_url || log.photoUrl || log.photo_file_id || log.photoFileId);
}

function areaTotals(rows) {
  return ['S', 'A', 'I', 'L'].reduce((acc, key) => {
    acc[key] = rows.reduce((sum, row) => sum + countArea(row, key), 0);
    return acc;
  }, {});
}

function balanceScore(totals) {
  const values = Object.values(totals);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  const expected = total / 4;
  const imbalance = values.reduce((sum, value) => sum + Math.abs(value - expected), 0) / (total * 1.5);
  return clamp(Math.round(100 - imbalance * 100));
}

function clamp(value) { return Math.max(0, Math.min(100, value)); }

function label(key) { return { S: '안전', A: '책임', I: '윤리', L: '소통' }[key] || key; }

function grade(score) {
  if (score >= 85) return '매우 안정적입니다';
  if (score >= 70) return '좋은 흐름입니다';
  if (score >= 50) return '성장 신호가 보입니다';
  if (score > 0) return '지도 포인트가 필요합니다';
  return '기록이 더 필요합니다';
}

function buildAnalysis(data) {
  const overview = data.overview || data;
  const students = arr(data.students, data.student_statuses, data.studentRows, data.rows);
  const logs = arr(data.logs, data.recent_logs, data.recentLogs, data.proof_logs);
  const total = num(overview.total_students || overview.totalStudents || overview.students_total || students.length);
  const participated = num(overview.today_participants || overview.todayParticipants || students.filter(row => todayCount(row) > 0).length);
  const participation = total ? Math.round(participated / total * 100) : 0;
  const totals = areaTotals(students);
  const balance = balanceScore(totals);
  const evidence = logs.length ? Math.round(logs.filter(hasEvidence).length / logs.length * 100) : 0;
  const scores = students.map(totalScore).filter(value => value > 0);
  const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const belowAvg = avg ? students.filter(row => totalScore(row) > 0 && totalScore(row) < avg * 0.6).length : 0;
  const equity = total ? clamp(Math.round(100 - (belowAvg / total) * 100)) : 0;
  const index = Math.round(participation * 0.3 + balance * 0.25 + evidence * 0.25 + equity * 0.2);
  const weakest = Object.entries(totals).sort((a, b) => a[1] - b[1])[0] || ['S', 0];
  const strongest = Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || ['S', 0];
  const inactive = students.filter(row => todayCount(row) === 0).slice(0, 5).map(studentName);
  const lowScore = avg ? students.filter(row => totalScore(row) > 0 && totalScore(row) < avg * 0.6).slice(0, 5).map(studentName) : [];

  return { total, participated, participation, totals, balance, evidence, avg, equity, index, weakest, strongest, inactive, lowScore, logsCount: logs.length };
}

function analysisHtml(data) {
  const a = buildAnalysis(data);
  const maxArea = Math.max(1, ...Object.values(a.totals));
  return `
    <section class="citizen-analysis-card" data-teacher-citizenship-analysis="1">
      <div class="analysis-head">
        <div class="analysis-ring" style="--score:${a.index}"><strong>${a.index}</strong><span>/100</span></div>
        <div class="analysis-copy">
          <h2>반 디지털 시민성 분석</h2>
          <p><b>${grade(a.index)}</b></p>
          <p>단순 횟수 대신 참여율, S/A/I/L 균형, 성찰 증거, 학생 간 편차를 함께 계산했습니다.</p>
        </div>
      </div>
      <div class="analysis-metrics">
        <div class="analysis-metric"><strong>${a.participation}</strong><span>참여 지수</span><small>${a.participated}/${a.total}명이 오늘 참여</small></div>
        <div class="analysis-metric"><strong>${a.balance}</strong><span>균형 지수</span><small>가장 약한 영역: ${label(a.weakest[0])}</small></div>
        <div class="analysis-metric"><strong>${a.evidence}</strong><span>성찰 지수</span><small>메모/사진이 있는 기록 비율</small></div>
        <div class="analysis-metric"><strong>${a.equity}</strong><span>편차 지수</span><small>반 평균 ${a.avg}점 기준</small></div>
      </div>
      <div class="analysis-split">
        <div class="analysis-panel">
          <h3>영역별 분포</h3>
          <div class="analysis-bars">${['S', 'A', 'I', 'L'].map(key => `<div class="analysis-row"><b>${label(key)}</b><div class="analysis-track"><i class="analysis-fill ${key.toLowerCase()}" style="width:${Math.round((a.totals[key] || 0) / maxArea * 100)}%"></i></div><strong>${a.totals[key] || 0}</strong></div>`).join('')}</div>
        </div>
        <div class="analysis-panel">
          <h3>지도 포인트</h3>
          <ul class="analysis-list">
            <li class="analysis-warning">다음 수업에서는 <b>${label(a.weakest[0])}</b> 미션을 먼저 배치하면 균형이 좋아집니다.</li>
            <li class="analysis-good">현재 강점 영역은 <b>${label(a.strongest[0])}</b>입니다. 우수 사례를 공유하기 좋습니다.</li>
            <li>오늘 미참여 확인: ${a.inactive.length ? a.inactive.join(', ') : '현재 큰 누락 없음'}</li>
            <li>평균 대비 낮은 학생: ${a.lowScore.length ? a.lowScore.join(', ') : '현재 큰 편차 없음'}</li>
          </ul>
        </div>
      </div>
    </section>
  `;
}

function analysisCards() {
  const exact = Array.from(document.querySelectorAll('[data-teacher-citizenship-analysis]'));
  const legacy = Array.from(document.querySelectorAll('.citizen-analysis-card')).filter(card => !exact.includes(card));
  return [...exact, ...legacy];
}

function dedupeTeacherAnalysisCards() {
  const cards = analysisCards();
  cards.forEach((card, index) => {
    if (index > 0) card.remove();
  });
}

function injectTeacherAnalysis() {
  dedupeTeacherAnalysisCards();

  const dashboard = document.querySelector('#dashboard .teacher-dashboard') || document.querySelector('.teacher-dashboard');
  if (!dashboard || analysisCards().length) return;

  const data = readDashboard();
  if (!Object.keys(data).length) return;

  const anchor = dashboard.querySelector('.teacher-summary') || dashboard.querySelector('.teacher-alert') || dashboard.firstElementChild;
  if (anchor) anchor.insertAdjacentHTML('afterend', analysisHtml(data));
  dedupeTeacherAnalysisCards();
}
