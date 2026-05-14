import { getMonthlyHistory } from './api.js';
import { STORAGE_BUCKET, SUPABASE_URL } from './config.js';

const _fetchRecords = window.fetch.bind(window);
window.__records = [];
window.__calendarYear = null;
window.__calendarMonth = null;

const css = `
.calendar-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 10%);margin-bottom:18px}
.calendar-head{display:grid;grid-template-columns:52px 1fr 52px;align-items:center;gap:12px;margin-bottom:10px}.calendar-head h2{margin:0;text-align:center;font-size:30px}.calendar-head button{width:52px;height:44px;min-height:44px;padding:0;display:grid;place-items:center;background:linear-gradient(180deg,#5886f4,#3264df);color:#fff;border:0;border-radius:12px;box-shadow:0 10px 20px rgb(48 92 210 / 18%);font-size:24px;line-height:1}.calendar-head button:first-child{justify-self:start}.calendar-head button:last-child{justify-self:end}
.calendar-legend{display:flex;gap:14px;justify-content:center;align-items:center;flex-wrap:wrap;margin:8px 0 18px;font-weight:800}.calendar-legend span{display:flex;gap:6px;align-items:center;color:#31435a}.legend-dot{width:14px;height:14px;border-radius:50%;display:inline-block}.legend-dot.s{background:#3b82f6}.legend-dot.a{background:#f97316}.legend-dot.i{background:#a855f7}.legend-dot.l{background:#22c55e}.legend-dot.memo{background:#111827}
.calendar-week,.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px}.calendar-week{margin:8px 0 12px;text-align:center;color:#31435a;font-weight:900}.calendar-cell{min-height:92px;background:#fff;border:1px solid #d9e5f4;border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px}.calendar-cell:not(.blank){cursor:pointer}.calendar-cell:not(.blank):hover{background:#f8fbff;border-color:#9ec0ff}.calendar-cell.blank{background:transparent;border:0;cursor:default}.calendar-cell strong{font-size:20px;color:#07192f}.calendar-dots{display:flex;gap:5px;flex-wrap:wrap;min-height:12px}.cal-dot{width:11px;height:11px;border-radius:999px;background:#111827;display:inline-block}.cal-dot.s{background:#3b82f6}.cal-dot.a{background:#f97316}.cal-dot.i{background:#a855f7}.cal-dot.l{background:#22c55e}.calendar-cell small{font-weight:800;color:#60738d}
.day-modal{position:fixed;inset:0;background:rgba(7,25,47,.45);display:grid;place-items:center;z-index:9999;padding:20px}.day-panel{width:min(460px,100%);max-height:min(85vh,760px);overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2)}.day-panel h3{margin:0 0 12px;font-size:24px}.day-item{border:1px solid #d9e5f4;border-radius:14px;padding:12px;margin:8px 0;display:grid;gap:8px}.day-item b{display:block;color:#07192f}.day-item-note{display:block;color:#475569;line-height:1.5;white-space:pre-wrap}.day-photo-thumb{display:block;width:min(220px,100%)}.day-photo-thumb img{display:block;width:100%;height:140px;object-fit:cover;border-radius:10px;border:1px solid #d9e5f4;background:#eef6ff}.day-photo-link{width:max-content;color:#3264df;font-weight:900;text-decoration:none}.day-photo-link:hover{text-decoration:underline}.day-panel button{width:100%;margin-top:10px;background:#3264df;color:#fff;border:0}
@media(max-width:720px){.calendar-card{padding:12px}.calendar-head{grid-template-columns:42px 1fr 42px;gap:6px}.calendar-head h2{font-size:22px}.calendar-head button{width:42px;height:38px;min-height:38px;font-size:20px}.calendar-week,.calendar-grid{gap:5px}.calendar-cell{min-height:68px;padding:7px;border-radius:10px}.calendar-cell strong{font-size:15px}.cal-dot{width:8px;height:8px}.calendar-cell small{font-size:11px}.calendar-week b{font-size:13px}.day-panel{padding:14px}}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function d10(v) { return v ? String(v).slice(0, 10) : ''; }
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
function kind(x) { return String(x.mission_type || x.type || '').toLowerCase(); }
function dateOf(x) { return x.date || x.mission_date || x.created_at || x.createdAt || ''; }
function titleOf(x) { return x.mission_title || x.title || x.mission_id || '실천 기록'; }
function noteOf(x) { return x.note || x.memo || x.choice1_text || x.choice2_text || x.choice3_text || ''; }
function safePhotoUrl(v) {
  const url = String(v || '').trim();
  if (!url) return '';
  return /^https?:\/\//i.test(url) ? url : '';
}
function publicStorageUrl(fileId) {
  const path = String(fileId || '').trim();
  if (!path || !SUPABASE_URL || !STORAGE_BUCKET) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
function photoOf(x) {
  return safePhotoUrl(
    x.photo_url ||
    x.photoUrl ||
    x.proof_photo_url ||
    x.proofPhotoUrl ||
    publicStorageUrl(x.photo_file_id || x.photoFileId || x.proof_photo_file_id || x.proofPhotoFileId)
  );
}
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
    const day = Number(d10(dateOf(r)).slice(-2));
    if (!day) return;
    (byDay[day] ||= []).push(r);
  });

  let html = `<section class="calendar-card"><div class="calendar-head"><button data-cal-prev title="이전달">‹</button><h2>${y}년 ${mon + 1}월 기록</h2><button data-cal-next title="다음달">›</button></div><div class="calendar-legend"><span><i class="legend-dot s"></i>S 안전</span><span><i class="legend-dot a"></i>A 책임</span><span><i class="legend-dot i"></i>I 윤리</span><span><i class="legend-dot l"></i>L 소통</span><span><i class="legend-dot memo"></i>메모/사진 있음</span></div><div class="calendar-week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div><div class="calendar-grid">`;
  for (let i = 0; i < first; i++) html += '<div class="calendar-cell blank"></div>';
  for (let day = 1; day <= last; day++) {
    const logs = byDay[day] || [];
    html += `<div class="calendar-cell" data-day="${day}"><strong>${day}</strong><div class="calendar-dots">${logs.slice(0,4).map(r=>`<span class="cal-dot ${kind(r)}"></span>`).join('')}</div>${logs.length ? `<small>${logs.length}개</small>` : ''}</div>`;
  }
  html += '</div></section>';
  return html;
}

function openDayDetail(day) {
  const logs = (window.__records || []).filter(r => Number(d10(dateOf(r)).slice(-2)) === Number(day));
  const box = document.createElement('div');
  box.className = 'day-modal';

  const rows = logs.length
    ? logs.map(log => {
      const note = String(noteOf(log) || '').trim();
      const photo = photoOf(log);
      const point = Number(log.total_point || 0);
      return `<div class="day-item"><b>${esc(titleOf(log))} · ${point}점</b><small class="day-item-note">${note ? esc(note) : '기록 내용 없음'}</small>${photo ? `<a class="day-photo-thumb" href="${esc(photo)}" target="_blank" rel="noopener noreferrer"><img src="${esc(photo)}" alt="기록 사진"></a><a class="day-photo-link" href="${esc(photo)}" target="_blank" rel="noopener noreferrer">사진 크게 보기</a>` : ''}</div>`;
    }).join('')
    : '<p>기록 없음</p>';

  box.innerHTML = `<div class="day-panel"><h3>${day}일 기록</h3>${rows}<button data-close-day>닫기</button></div>`;
  document.body.appendChild(box);
  box.addEventListener('click', e => { if (e.target === box) box.remove(); });
  box.querySelector('[data-close-day]')?.addEventListener('click', () => box.remove());
}

function bindDayCells() {
  document.querySelectorAll('.calendar-cell[data-day]').forEach(cell => {
    cell.addEventListener('click', () => openDayDetail(cell.dataset.day));
  });
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
  bindDayCells();
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
