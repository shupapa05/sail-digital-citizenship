import { getMonthlyHistory } from './api.js';

const css = `
.citizen-dashboard{display:grid;gap:16px}
.citizen-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
.citizen-card h1,.citizen-card h2{margin:0 0 12px}
.citizen-score{display:grid;grid-template-columns:minmax(130px,180px) 1fr;gap:18px;align-items:center}
.score-ring{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#3264df calc(var(--score)*1%),#e9f0f7 0);position:relative}
.score-ring::before{content:"";position:absolute;inset:12px;border-radius:50%;background:#fff}
.score-ring strong{position:relative;font-size:44px;color:#07192f}
.score-ring span{position:relative;font-weight:900;color:#60738d}
.score-copy{display:grid;gap:8px}
.score-copy p{margin:0;color:#415a77;line-height:1.55}
.indicator-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.indicator{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:16px}
.indicator strong{display:block;font-size:30px;color:#07192f}
.indicator span{font-weight:900;color:#60738d}
.indicator small{display:block;margin-top:6px;color:#415a77;line-height:1.4}
.area-bars{display:grid;gap:10px}
.area-row{display:grid;grid-template-columns:70px 1fr 48px;align-items:center;gap:10px}
.area-track{height:14px;background:#e9f0f7;border-radius:999px;overflow:hidden}
.area-fill{height:100%;border-radius:999px}
.area-fill.s{background:#3b82f6}.area-fill.a{background:#f97316}.area-fill.i{background:#a855f7}.area-fill.l{background:#22c55e}
.line-chart{width:100%;height:auto;color:#3264df;background:#f8fbff;border-radius:16px;padding:8px}
.line-chart text{font-size:10px;fill:#60738d}
.choice-chips{display:flex;flex-wrap:wrap;gap:8px}
.choice-chip{background:#eef6ff;border:1px solid #d9e5f4;border-radius:999px;padding:8px 12px;font-weight:800;color:#31435a}
.insight-list{display:grid;gap:8px}
.insight-list p{margin:0;background:#f8fbff;border-radius:14px;padding:12px;line-height:1.5}
@media(max-width:720px){.citizen-score,.indicator-grid{grid-template-columns:1fr}.score-ring{width:min(190px,70vw);justify-self:center}.area-row{grid-template-columns:58px 1fr 42px}.indicator strong{font-size:26px}}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function typeOf(item) {
  return String(item?.mission_type || item?.type || '').toUpperCase();
}

function label(type) {
  return { S: '안전', A: '책임', I: '윤리', L: '소통' }[type] || type || '기록';
}

function countBy(items, fn) {
  return (items || []).reduce((acc, item) => {
    const key = fn(item);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function kstYmd(date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function normalizeYmd(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return kstYmd(parsed);
}

function missionDateOf(item) {
  return item?.date || item?.mission_date || item?.created_at || item?.createdAt || '';
}

function hasNote(item) {
  return Boolean(String(item?.note || item?.memo || '').trim());
}

function hasPhoto(item) {
  return Boolean(item?.photo_url || item?.photoUrl || item?.photo_file_id || item?.photoFileId);
}

function isSuccess(item) {
  if (typeof item?.success === 'boolean') return item.success;
  return Number(item?.total_point || 0) > 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function citizenshipMetrics(items, date = new Date()) {
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const byType = countBy(list, typeOf);
  const counts = ['S', 'A', 'I', 'L'].map(type => byType[type] || 0);
  const success = list.filter(isSuccess).length;
  const note = list.filter(hasNote).length;
  const photo = list.filter(hasPhoto).length;
  const activeDays = new Set(list.map(item => normalizeYmd(missionDateOf(item))).filter(Boolean)).size;
  const expected = total / 4;
  const imbalance = total ? counts.reduce((sum, count) => sum + Math.abs(count - expected), 0) / (Math.max(1, total) * 1.5) : 1;
  const balance = total ? Math.round(clamp(100 - imbalance * 100)) : 0;
  const reflection = total ? Math.round(clamp(((note * 0.65) + (photo * 0.35)) / total * 100)) : 0;
  const successRate = total ? Math.round(success / total * 100) : 0;
  const dayOfMonth = date.getDate();
  const consistency = Math.round(clamp(activeDays / Math.max(1, Math.min(dayOfMonth, 20)) * 100));
  const score = Math.round(balance * 0.35 + reflection * 0.25 + consistency * 0.25 + successRate * 0.15);

  return { total, byType, success, note, photo, activeDays, balance, reflection, consistency, successRate, score };
}

function scoreLabel(score) {
  if (score >= 85) return '주도적으로 성장 중';
  if (score >= 70) return '안정적으로 성장 중';
  if (score >= 50) return '성장 신호가 보임';
  if (score > 0) return '시작 단계';
  return '기록 대기 중';
}

function last7Days() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = kstYmd(date);
    return { key, label: key.slice(5).replace('-', '/') };
  });
}

function lineChart(items) {
  const days = last7Days();
  const dayCount = Object.fromEntries(days.map(day => [day.key, 0]));

  (items || []).forEach(item => {
    const key = normalizeYmd(missionDateOf(item));
    if (Object.prototype.hasOwnProperty.call(dayCount, key)) dayCount[key] += 1;
  });

  const vals = days.map(day => dayCount[day.key] || 0);
  const max = Math.max(1, ...vals);
  const pts = vals.map((value, index) => `${28 + index * 48},${112 - (value / max) * 82}`).join(' ');

  return `<svg class="line-chart" viewBox="0 0 340 145"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>${vals.map((value, index) => `<circle cx="${28 + index * 48}" cy="${112 - (value / max) * 82}" r="5" fill="currentColor"></circle><text x="${28 + index * 48}" y="136" text-anchor="middle">${days[index].label}</text><text x="${28 + index * 48}" y="${102 - (value / max) * 82}" text-anchor="middle">${value}</text>`).join('')}</svg>`;
}

function choices(items) {
  return (items || [])
    .flatMap(item => [item.choice1_text, item.choice2_text, item.choice3_text, item.choice1Text, item.choice2Text, item.choice3Text])
    .filter(Boolean);
}

function trendText(current, previous) {
  if (!previous.total && current.total) return '이번 달 기록이 새로 쌓이기 시작했습니다.';
  if (!current.total) return '기록이 쌓이면 성장 변화를 볼 수 있습니다.';
  const delta = current.score - previous.score;
  if (delta >= 8) return `지난달보다 ${delta}점 좋아졌습니다.`;
  if (delta <= -8) return `지난달보다 ${Math.abs(delta)}점 낮아졌습니다. 꾸준함을 회복하면 바로 올라갑니다.`;
  return '지난달과 비슷한 흐름을 유지하고 있습니다.';
}

function renderStatsHtml(currentItems, previousItems) {
  const current = citizenshipMetrics(currentItems);
  const previous = citizenshipMetrics(previousItems);
  const maxArea = Math.max(1, ...['S', 'A', 'I', 'L'].map(type => current.byType[type] || 0));
  const topChoices = Object.entries(countBy(choices(currentItems), value => value)).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const weakest = Object.entries({ S: current.byType.S || 0, A: current.byType.A || 0, I: current.byType.I || 0, L: current.byType.L || 0 }).sort((a, b) => a[1] - b[1])[0];

  return `
    <section class="citizen-dashboard">
      <div class="citizen-card citizen-score">
        <div class="score-ring" style="--score:${current.score}"><strong>${current.score}</strong><span>/100</span></div>
        <div class="score-copy">
          <h1>디지털 시민성 지수</h1>
          <p><b>${scoreLabel(current.score)}</b></p>
          <p>${trendText(current, previous)}</p>
          <p>횟수만 보지 않고 균형, 성찰, 꾸준함, 실천 성공률을 함께 계산합니다.</p>
        </div>
      </div>
      <div class="indicator-grid">
        <div class="indicator"><strong>${current.balance}</strong><span>균형 지수</span><small>S/A/I/L을 고르게 실천했는지</small></div>
        <div class="indicator"><strong>${current.reflection}</strong><span>성찰 지수</span><small>메모와 사진으로 생각을 남겼는지</small></div>
        <div class="indicator"><strong>${current.consistency}</strong><span>지속 지수</span><small>한 번에 몰아서가 아니라 꾸준했는지</small></div>
        <div class="indicator"><strong>${current.successRate}</strong><span>실천 지수</span><small>선택한 미션을 실제로 했는지</small></div>
      </div>
      <div class="citizen-card">
        <h2>영역별 시민성 균형</h2>
        <div class="area-bars">${['S', 'A', 'I', 'L'].map(type => `<div class="area-row"><b>${label(type)}</b><div class="area-track"><i class="area-fill ${type.toLowerCase()}" style="width:${Math.round(((current.byType[type] || 0) / maxArea) * 100)}%"></i></div><strong>${current.byType[type] || 0}</strong></div>`).join('')}</div>
      </div>
      <div class="citizen-card"><h2>최근 7일 흐름</h2>${lineChart(currentItems)}</div>
      <div class="citizen-card">
        <h2>성장 해석</h2>
        <div class="insight-list">
          <p>이번 달은 <b>${current.activeDays}일</b> 동안 디지털 시민성 실천 기록을 남겼습니다.</p>
          <p>다음에는 <b>${label(weakest?.[0])}</b> 영역 미션을 조금 더 해보면 균형 지수가 올라갑니다.</p>
          <p>사진이나 메모를 남기면 단순 완료가 아니라 자기 행동을 돌아보는 기록으로 바뀝니다.</p>
        </div>
      </div>
      <div class="citizen-card">
        <h2>선택 경향</h2>
        <div class="choice-chips">${topChoices.length ? topChoices.map(([choice, count]) => `<span class="choice-chip">${esc(choice)} ${count}</span>`).join('') : '<p>선택 데이터가 아직 부족합니다.</p>'}</div>
      </div>
    </section>
  `;
}

function previousYearMonth(date) {
  const previous = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return { year: previous.getFullYear(), month: previous.getMonth() + 1 };
}

async function replaceStats() {
  const title = document.querySelector('.profile h1');
  if (!title || title.textContent.trim() !== '나의 통계') return;

  const profile = document.querySelector('.profile');
  if (!profile || profile.dataset.richStats === '1') return;

  profile.dataset.richStats = '1';

  try {
    const id = localStorage.getItem('SAIL_STUDENT_ID');
    const now = new Date();
    const prev = previousYearMonth(now);
    const [current, previous] = await Promise.all([
      getMonthlyHistory(id, now.getFullYear(), now.getMonth() + 1),
      getMonthlyHistory(id, prev.year, prev.month)
    ]);

    profile.outerHTML = renderStatsHtml(
      Array.isArray(current.items) ? current.items : [],
      Array.isArray(previous.items) ? previous.items : []
    );
  } catch {
    profile.outerHTML = renderStatsHtml([], []);
  }
}

new MutationObserver(replaceStats).observe(document.body, { childList: true, subtree: true });
