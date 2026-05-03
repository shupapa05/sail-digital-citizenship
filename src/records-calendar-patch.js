import { getMonthlyHistory } from './api.js';

const _fetchRecords = window.fetch.bind(window);
window.__records = [];
window.__calendarYear = null;
window.__calendarMonth = null;

const css = `
.calendar-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 10%);margin-bottom:18px}
.calendar-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:10px}.calendar-head h2{margin:0;text-align:center;font-size:30px}.calendar-head button{background:linear-gradient(180deg,#5886f4,#3264df);color:#fff;border:0;border-radius:14px;box-shadow:0 10px 20px rgb(48 92 210 / 18%)}.calendar-head button:last-child{justify-self:end}
.calendar-legend{display:flex;gap:14px;justify-content:center;align-items:center;flex-wrap:wrap;margin:8px 0 18px;font-weight:800}.calendar-legend span{display:flex;gap:6px;align-items:center;color:#31435a}
.legend-dot{width:14px;height:14px;border-radius:50%;display:inline-block}.legend-dot.s{background:#3b82f6}.legend-dot.a{background:#f97316}.legend-dot.i{background:#a855f7}.legend-dot.l{background:#22c55e}.legend-dot.memo{background:#111827}
.calendar-week,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.calendar-week{margin:8px 0 12px;text-align:center;color:#31435a;font-weight:900}.calendar-cell{min-height:92px;background:#fff;border:1px solid #d9e5f4;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px}.calendar-cell.blank{background:transparent;border:0}.calendar-cell strong{font-size:20px;color:#07192f}.calendar-dots{display:flex;gap:5px;flex-wrap:wrap;min-height:12px}.cal-dot{width:11px;height:11px;border-radius:999px;background:#111827;display:inline-block}.cal-dot.s{background:#3b82f6}.cal-dot.a{background:#f97316}.cal-dot.i{background:#a855f7}.cal-dot.l{background:#22c55e}.calendar-cell small{font-weight:800;color:#60738d}
@media(max-width:720px){.calendar-card{padding:12px}.calendar-head{grid-template-columns:1fr;gap:8px}.calendar-head h2{font-size:24px}.calendar-head button:last-child{justify-self:stretch}.calendar-week,.calendar-grid{gap:5px}.calendar-cell{min-height:68px;padding:7px;border-radius:10px}.calendar-cell strong{font-size:15px}.cal-dot{width:8px;height:8px}.calendar-cell small{font-size:11px}.calendar-week b{font-size:13px}}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function d10(v) { return v ? String(v).slice(0, 10) : ''; }
function kind(x) { return String(x.mission_type || x.type || '').toLowerCase(); }
function ymFromTitle() {
  const title = document.querySelector('.section-head h1')?.textContent || '';
  const m = title.match(/(\d{4})년\s+(\d{1,2})월/);
  const now = new Date();
  return { y: m ? Number(m[1]) : now.getFullYear(), mon: m ? Number(m[2]) - 1 : now.getMonth() };
}

window.fetch = async (...args) => {
  const res = await _fetchRecords(...args);
  if (!String(args[0] || '').includes('/rpc/get_monthly_history')) return res;
  try {
    const json = await res.clone().json();
    window.__records = Array.isArray(json.items) ? json.items : [];
  } catch {
    window.__records = [];
  }
  return res;
};

function calendarHtml(y, mon, records) {
  const first = new Date(y, mon, 1).getDay();
  const last = new Date(y, mon + 1, 0).getDate();
  const byDay = {};
  records.forEach(r => {
    const day = Number(d10(r.date).slice(-2));
    if (!day) return;
    (byDay[day] ||= []).push(r);
  });

  let html = `<section class="calendar-card"><div class="calendar-head"><button data-cal-prev>‹ 이전달</button><h2>${y}년 ${mon + 1}월 기록</h2><button data-cal-next>다음달 ›</button></div><div class="calendar-legend"><span><i class="legend-dot s"></i>S 안전</span><span><i class="legend-dot a"></i>A 책임</span><span><i class="legend-dot i"></i>I 윤리</span><span><i class="legend-dot l"></i>L 소통</span><span><i class="legend-dot memo"></i>메모/사진 있음</span></div><div class="calendar-week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div><div class="calendar-grid">`;
  for (let i = 0; i < first; i++) html += '<div class="calendar-cell blank"></div>';
  for (let day = 1; day <= last; day++) {
    const logs = byDay[day] || [];
    html += `<div class="calendar-cell"><strong>${day}</strong><div class="calendar-dots">${logs.slice(0,4).map(r=>`<span class="cal-dot ${kind(r)}"></span>`).join('')}</div>${logs.length ? `<small>${logs.length}개</small>` : ''}</div>`;
  }
  html += '</div></section>';
  return html;
}

function drawCalendar(y, mon, records) {
  const list = document.querySelector('.record-list');
  const card = document.querySelector('.calendar-card');
  const target = list || card;
  if (!target) return;
  window.__calendarYear = y;
  window.__calendarMonth = mon;
  target.outerHTML = calendarHtml(y, mon, records);
  bindCalendarButtons();
}

function makeCalendar() {
  const list = document.querySelector('.record-list');
  if (!list || list.dataset.done) return;
  const { y, mon } = ymFromTitle();
  list.dataset.done = '1';
  drawCalendar(y, mon, window.__records || []);
}

async function moveMonth(delta) {
  const base = new Date(window.__calendarYear, window.__calendarMonth + delta, 1);
  const y = base.getFullYear();
  const mon = base.getMonth();
  try {
    const studentId = localStorage.getItem('SAIL_STUDENT_ID');
    const res = await getMonthlyHistory(studentId, y, mon + 1);
    window.__records = Array.isArray(res.items) ? res.items : [];
    drawCalendar(y, mon, window.__records);
  } catch {
    drawCalendar(y, mon, []);
  }
}

function bindCalendarButtons() {
  document.querySelector('[data-cal-prev]')?.addEventListener('click', () => moveMonth(-1));
  document.querySelector('[data-cal-next]')?.addEventListener('click', () => moveMonth(1));
}

new MutationObserver(makeCalendar).observe(document.body, { childList: true, subtree: true });
