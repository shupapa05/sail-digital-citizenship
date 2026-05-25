import { getStudentHome } from './api.js';

const PATCH_KEY = '__SAIL_INFO_RANKING_PATCHED__';
let loadingRanking = false;
let lastRenderAt = 0;

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  injectStyle();
  new MutationObserver(() => scheduleRender()).observe(document.body, { childList: true, subtree: true });
  scheduleRender();
}

function scheduleRender() {
  const now = Date.now();
  if (now - lastRenderAt < 250) return;
  lastRenderAt = now;
  setTimeout(renderRanking, 120);
}

function injectStyle() {
  if (document.querySelector('#infoRankingPatchStyles')) return;

  const style = document.createElement('style');
  style.id = 'infoRankingPatchStyles';
  style.textContent = `
    .ranking-card{margin-top:14px;background:#fff;border:1px solid #d9e5f4;border-radius:18px;padding:16px;box-shadow:0 12px 24px rgb(28 80 150 / 9%)}
    .ranking-card h2{margin:0 0 12px;color:#07192f;font-size:20px}
    .ranking-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .ranking-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:14px;padding:14px;text-align:center}
    .ranking-box span{display:block;color:#60738d;font-weight:900}
    .ranking-box strong{display:block;margin-top:6px;color:#07192f;font-size:30px;line-height:1}
    .ranking-box small{display:block;margin-top:8px;color:#415a77;font-weight:800}
    .ranking-list-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
    .ranking-list{background:#fff;border:1px solid #e5edf7;border-radius:14px;padding:12px}
    .ranking-list h3{margin:0 0 8px;font-size:15px;color:#07192f}
    .ranking-row{display:grid;grid-template-columns:42px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #edf3fb}
    .ranking-row:first-of-type{border-top:0}
    .ranking-row.me{background:#fff7ed;margin:0 -8px;padding:8px;border-radius:10px;border-top:0}
    .ranking-row b{color:#3264df}
    .ranking-row span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#31435a;font-weight:900}
    .ranking-row small{color:#60738d;font-weight:900}
    .ranking-empty{margin:0;color:#60738d;font-size:14px}
    .ranking-note{margin:12px 0 0;color:#415a77;line-height:1.45;font-size:14px}
    @media(max-width:720px){.ranking-grid,.ranking-list-grid{grid-template-columns:1fr}.ranking-box strong{font-size:28px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function rankText(rank, total) {
  const r = Number(rank || 0);
  const t = Number(total || 0);
  if (!r || !t) return '-';
  return `${r}위`;
}

function totalText(total) {
  const t = Number(total || 0);
  return t ? `${t}명 중` : '집계 대기';
}

function removeDuplicateCards() {
  const cards = [...document.querySelectorAll('[data-info-ranking]')];
  cards.slice(1).forEach(card => card.remove());
}

function isInfoScreen() {
  return Boolean(document.querySelector('.profile .ship-profile') && document.querySelector('.profile .level-progress-card'));
}

function rankRows(items) {
  const rows = Array.isArray(items) ? items.slice(0, 5) : [];
  if (!rows.length) return '<p class="ranking-empty">아직 랭킹 데이터가 없습니다.</p>';

  return rows.map(row => `
    <div class="ranking-row ${row?.is_me ? 'me' : ''}">
      <b>${Number(row?.rank || 0) || '-'}위</b>
      <span>${esc(row?.name || '학생')}</span>
      <small>${Number(row?.score || 0)}점</small>
    </div>
  `).join('');
}

function rankingHtml(ranking) {
  const classLabel = ranking?.class_label || '우리반';
  const score = Number(ranking?.score || 0);

  return `
    <section class="ranking-card" data-info-ranking>
      <h2>나의 랭킹</h2>
      <div class="ranking-grid">
        <div class="ranking-box">
          <span>${esc(classLabel)} 랭킹</span>
          <strong>${rankText(ranking?.class_rank, ranking?.class_total)}</strong>
          <small>${totalText(ranking?.class_total)}</small>
        </div>
        <div class="ranking-box">
          <span>전체 랭킹</span>
          <strong>${rankText(ranking?.overall_rank, ranking?.overall_total)}</strong>
          <small>${totalText(ranking?.overall_total)}</small>
        </div>
      </div>
      <div class="ranking-list-grid">
        <div class="ranking-list">
          <h3>${esc(classLabel)} TOP 5</h3>
          ${rankRows(ranking?.class_top5)}
        </div>
        <div class="ranking-list">
          <h3>전체 TOP 5</h3>
          ${rankRows(ranking?.overall_top5)}
        </div>
      </div>
      <p class="ranking-note">현재 총점 ${score}점을 기준으로 계산됩니다. 내 이름은 주황색으로 표시됩니다.</p>
    </section>
  `;
}

async function fetchRanking() {
  const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
  const loginCode = localStorage.getItem('SAIL_LOGIN_CODE') || '';
  if (!studentId) return null;
  const res = await getStudentHome(studentId, loginCode);
  return res?.ranking || null;
}

async function renderRanking() {
  removeDuplicateCards();
  if (!isInfoScreen() || document.querySelector('[data-info-ranking]') || loadingRanking) return;

  const levelCard = document.querySelector('.profile .level-progress-card');
  if (!levelCard) return;

  loadingRanking = true;
  try {
    const ranking = await fetchRanking();
    if (!ranking || document.querySelector('[data-info-ranking]')) return;
    levelCard.insertAdjacentHTML('afterend', rankingHtml(ranking));
    removeDuplicateCards();
  } catch {
    // Keep the existing info screen if ranking data is temporarily unavailable.
  } finally {
    loadingRanking = false;
  }
}
