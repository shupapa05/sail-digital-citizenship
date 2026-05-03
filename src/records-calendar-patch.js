const _fetchRecords = window.fetch.bind(window);
window.__records = [];

function d10(v) { return v ? String(v).slice(0, 10) : ''; }
function kind(x) { return String(x.mission_type || x.type || '').toLowerCase(); }

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

function makeCalendar() {
  const list = document.querySelector('.record-list');
  if (!list || list.dataset.done) return;
  const title = document.querySelector('.section-head h1')?.textContent || '';
  const m = title.match(/(\d{4})년\s+(\d{1,2})월/);
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mon = m ? Number(m[2]) - 1 : now.getMonth();
  const first = new Date(y, mon, 1).getDay();
  const last = new Date(y, mon + 1, 0).getDate();
  const byDay = {};
  window.__records.forEach(r => {
    const day = Number(d10(r.date).slice(-2));
    if (!day) return;
    (byDay[day] ||= []).push(r);
  });
  let html = '<section class="calendar-card"><div class="calendar-week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div><div class="calendar-grid">';
  for (let i = 0; i < first; i++) html += '<div class="calendar-cell blank"></div>';
  for (let day = 1; day <= last; day++) {
    const logs = byDay[day] || [];
    html += `<div class="calendar-cell"><strong>${day}</strong><div class="calendar-dots">${logs.slice(0,4).map(r=>`<span class="cal-dot ${kind(r)}"></span>`).join('')}</div>${logs.length ? `<small>${logs.length}개</small>` : ''}</div>`;
  }
  html += '</div></section>';
  list.dataset.done = '1';
  list.outerHTML = html;
}

new MutationObserver(makeCalendar).observe(document.body, { childList: true, subtree: true });
