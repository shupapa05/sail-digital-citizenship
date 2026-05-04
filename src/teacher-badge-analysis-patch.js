const BADGE_CACHE_KEY = 'SAIL_TEACHER_DASHBOARD_CACHE_V1';

const css = `
.teacher-badge-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
.teacher-badge-card h2{margin:0 0 12px;color:#07192f}
.teacher-badge-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.teacher-badge-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;text-align:center;display:grid;gap:6px}
.teacher-badge-box b{font-size:28px;color:#07192f}
.teacher-badge-box span{font-weight:900;color:#60738d}
.teacher-badge-box small{color:#64748b;font-weight:800}
.teacher-badge-insight{margin-top:12px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:16px;padding:12px;color:#334155;font-weight:800;line-height:1.5}
@media(max-width:720px){.teacher-badge-grid{grid-template-columns:1fr 1fr}.teacher-badge-card{padding:14px;border-radius:16px}.teacher-badge-box b{font-size:22px}}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

const originalFetchForBadgeAnalysis = window.fetch.bind(window);
window.fetch = async (...args) => {
  const res = await originalFetchForBadgeAnalysis(...args);
  const url = String(args[0] || '');
  if (url.includes('/rpc/get_teacher_dashboard')) {
    try {
      const data = await res.clone().json();
      localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify(data || {}));
      setTimeout(injectBadgeAnalysis, 80);
    } catch {}
  }
  return res;
};

function readDashboard(){
  try { return JSON.parse(localStorage.getItem(BADGE_CACHE_KEY) || '{}') || {}; }
  catch { return {}; }
}
function num(v){ return Number(v || 0); }
function countArea(row, key){
  const lower = key.toLowerCase();
  return num(row[`${lower}_count`] || row[`${key}_count`] || row[key] || row[lower] || row[`${lower}Count`] || row[`${key}Count`]);
}
function getRows(data){
  return data.students || data.student_statuses || data.studentRows || data.rows || [];
}
function areaStats(rows){
  const stats = { S:0, A:0, I:0, L:0 };
  rows.forEach(row => {
    if (countArea(row, 'S') >= 10) stats.S += 1;
    if (countArea(row, 'A') >= 10) stats.A += 1;
    if (countArea(row, 'I') >= 10) stats.I += 1;
    if (countArea(row, 'L') >= 10) stats.L += 1;
  });
  return stats;
}
function label(key){ return { S:'안전', A:'책임', I:'윤리', L:'소통' }[key] || key; }
function colorName(key){ return { S:'blue', A:'orange', I:'purple', L:'green' }[key] || 'blue'; }
function badgeCardHtml(){
  const data = readDashboard();
  const rows = getRows(data);
  const stats = areaStats(rows);
  const total = rows.length || num(data.total_students || data.totalStudents || data.students_total);
  const entries = ['S','A','I','L'].map(key => ({ key, value: stats[key] }));
  const top = [...entries].sort((a,b) => b.value - a.value)[0];
  const low = [...entries].sort((a,b) => a.value - b.value)[0];
  const insight = total
    ? `획득 예상 배지가 가장 많은 영역은 ${label(top.key)}입니다. 상대적으로 ${label(low.key)} 배지가 적으므로 다음 수업에서 ${label(low.key)} 활동을 보강하면 좋습니다.`
    : '학생별 영역 횟수 데이터가 부족하여 배지 현황을 계산하지 못했습니다.';
  return `<section class="teacher-badge-card" data-teacher-badge-analysis>
    <h2>배지 현황</h2>
    <div class="teacher-badge-grid">
      ${entries.map(item => `<div class="teacher-badge-box"><span>${label(item.key)} 배지</span><b>${item.value}</b><small>${total ? `${item.value}/${total}명` : '데이터 확인 필요'}</small></div>`).join('')}
    </div>
    <div class="teacher-badge-insight">${insight}</div>
  </section>`;
}
function injectBadgeAnalysis(){
  const dashboard = document.querySelector('.teacher-dashboard');
  if (!dashboard) return;
  if (dashboard.querySelector('[data-teacher-badge-analysis]')) return;
  const grids = dashboard.querySelectorAll('.teacher-grid');
  const anchor = grids[1] || grids[0] || dashboard.querySelector('.teacher-summary');
  if (anchor) anchor.insertAdjacentHTML('afterend', badgeCardHtml());
}
new MutationObserver(injectBadgeAnalysis).observe(document.body, { childList:true, subtree:true });
setInterval(injectBadgeAnalysis, 900);
setTimeout(injectBadgeAnalysis, 300);
