import { getStudentTreasures, openTreasureChest } from './api.js?v=20260527-treasure1';

const CACHE_KEY = 'SAIL_TREASURE_CACHE_V1';
let treasureTimer = null;
let loading = false;
let lastSignature = '';

injectTreasureStyles();
wrapTreasureFetch();
scheduleTreasure(500);
new MutationObserver(() => scheduleTreasure()).observe(document.querySelector('#app') || document.body, { childList: true });

document.addEventListener('click', event => {
  const button = event.target.closest('[data-open-treasure]');
  if (!button) return;
  event.preventDefault();
  openChest(button);
});

function scheduleTreasure(delay = 150) {
  if (treasureTimer) clearTimeout(treasureTimer);
  treasureTimer = setTimeout(() => {
    treasureTimer = null;
    renderTreasureUi();
  }, delay);
}

function wrapTreasureFetch() {
  if (window.__SAIL_TREASURE_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_TREASURE_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/save_mission_result')) {
      response.clone().json().then(data => {
        if (data?.treasures) localStorage.setItem(CACHE_KEY, JSON.stringify(data.treasures));
        scheduleTreasure(120);
      }).catch(() => {});
    }
    return response;
  };
}

async function renderTreasureUi() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;

  const anchor = document.querySelector('.home-title-card') || document.querySelector('.profile') || document.querySelector('.result-card');
  if (!anchor) return;

  const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
  const loginCode = localStorage.getItem('SAIL_LOGIN_CODE') || '';
  if (!studentId || loading) return;

  let data = readCache();
  const signature = `${currentScreen()}|${studentId}|${data.unopened_count || 0}|${latestChestKey(data)}`;
  if (signature !== lastSignature || !document.querySelector('[data-treasure-panel]')) {
    anchor.querySelector('[data-treasure-panel]')?.remove();
    document.querySelector('[data-treasure-panel]')?.remove();
    if (data.chests?.length || Number(data.unopened_count || 0) > 0) {
      anchor.insertAdjacentHTML(anchor.classList.contains('result-card') ? 'beforeend' : 'afterend', treasureHtml(data));
    }
    lastSignature = signature;
  }

  if (data.loadedFromServer) return;

  loading = true;
  try {
    data = await getStudentTreasures(studentId, loginCode);
    data.loadedFromServer = true;
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    lastSignature = '';
    scheduleTreasure(50);
  } catch {
    // Keep the main student screen usable if treasure data is temporarily unavailable.
  } finally {
    loading = false;
  }
}

async function openChest(button) {
  const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
  const loginCode = localStorage.getItem('SAIL_LOGIN_CODE') || '';
  const chestId = button.dataset.openTreasure;
  if (!studentId || !loginCode || !chestId) return;

  const original = button.textContent;
  button.disabled = true;
  button.textContent = '여는 중...';
  try {
    const result = await openTreasureChest(studentId, loginCode, chestId);
    if (result?.treasures) localStorage.setItem(CACHE_KEY, JSON.stringify({ ...result.treasures, loadedFromServer: true }));
    showReward(result?.reward || result?.chest || {});
    lastSignature = '';
    scheduleTreasure(80);
  } catch (error) {
    alert(error.message || '보물상자를 열지 못했습니다.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function treasureHtml(data) {
  const chests = Array.isArray(data.chests) ? data.chests : [];
  const unopened = chests.filter(chest => !chest.opened_at);
  const opened = chests.filter(chest => chest.opened_at).slice(0, 3);

  return `
    <section class="treasure-chest-panel" data-treasure-panel>
      <div class="treasure-head">
        <div><h2>보물상자</h2><p>꾸준히 항해한 학생에게만 열리는 보상입니다.</p></div>
        <strong>${unopened.length}개 대기</strong>
      </div>
      ${unopened.length ? `
        <div class="treasure-list">
          ${unopened.map(chest => `
            <article class="treasure-card unopened">
              <div class="treasure-icon">상자</div>
              <div><h3>${esc(chest.title)}</h3><p>${esc(chest.description || '연속 실천으로 받은 보물상자입니다.')}</p></div>
              <button type="button" data-open-treasure="${esc(chest.chest_id)}">열기</button>
            </article>
          `).join('')}
        </div>
      ` : '<p class="treasure-empty">아직 열 수 있는 보물상자가 없습니다. 3일 이상 꾸준히 항해하면 열려요.</p>'}
      ${opened.length ? `
        <div class="treasure-history">
          <h3>최근 보상</h3>
          ${opened.map(chest => rewardLine(chest)).join('')}
        </div>
      ` : ''}
    </section>
  `;
}

function rewardLine(chest) {
  const tag = chest.reward_type === 'offline_coupon' ? '선생님 확인' : chest.reward_type === 'none' ? '다음 기회' : '획득 완료';
  return `<p><b>${esc(chest.reward_name || '보상')}</b><span>${esc(tag)}</span></p>`;
}

function showReward(reward) {
  document.querySelector('[data-treasure-reward-modal]')?.remove();
  const isOffline = reward.reward_type === 'offline_coupon';
  const isTryAgain = reward.reward_type === 'none';
  const footer = isOffline
    ? '<strong>오프라인 쿠폰입니다. 선생님께 이 화면을 보여주세요.</strong>'
    : isTryAgain
      ? '<strong>이번에는 보상이 없지만, 꾸준한 항해 기록은 남았어요.</strong>'
      : '<strong>온라인 보상이 적용됐어요.</strong>';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="treasure-modal-backdrop" data-treasure-reward-modal>
      <section class="treasure-modal">
        <div class="treasure-big-icon">상자</div>
        <h2>${esc(reward.name || reward.reward_name || '보상 획득')}</h2>
        <p>${esc(reward.description || reward.reward_description || '보물상자를 열었어요.')}</p>
        ${footer}
        <button type="button">확인</button>
      </section>
    </div>
  `);
  document.querySelector('[data-treasure-reward-modal] button')?.addEventListener('click', () => {
    document.querySelector('[data-treasure-reward-modal]')?.remove();
  });
}

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function latestChestKey(data) {
  const chests = Array.isArray(data.chests) ? data.chests : [];
  return chests.map(chest => `${chest.chest_id}:${chest.opened_at || ''}:${chest.reward_name || ''}`).join(',');
}

function currentScreen() {
  if (document.querySelector('.result-card')) return 'result';
  if (document.querySelector('.ship-profile')) return 'info';
  if (document.querySelector('.home-title-card')) return 'home';
  return 'other';
}

function injectTreasureStyles() {
  if (document.querySelector('#treasureChestStyles')) return;
  const style = document.createElement('style');
  style.id = 'treasureChestStyles';
  style.textContent = `
    .treasure-chest-panel{margin:16px auto;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:16px;box-shadow:0 14px 28px rgb(154 52 18 / 9%);max-width:880px}
    .treasure-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.treasure-head h2{margin:0;color:#7c2d12;font-size:24px}.treasure-head p{margin:4px 0 0;color:#9a3412;font-weight:850}.treasure-head strong{white-space:nowrap;border-radius:999px;background:#ffedd5;color:#9a3412;padding:8px 12px}
    .treasure-list{display:grid;gap:10px}.treasure-card{display:grid;grid-template-columns:64px 1fr auto;gap:12px;align-items:center;background:#fff;border:1px solid #fed7aa;border-radius:16px;padding:12px;text-align:left}.treasure-icon{display:grid;place-items:center;height:54px;border-radius:14px;background:linear-gradient(180deg,#facc15,#f97316);color:#7c2d12;font-weight:950}.treasure-card h3{margin:0 0 4px;color:#07192f}.treasure-card p{margin:0;color:#60738d;font-weight:800}.treasure-card button{border:0;border-radius:12px;background:#ea580c;color:#fff;font-weight:950;padding:10px 16px}.treasure-card button:disabled{background:#fdba74}
    .treasure-empty{margin:0;border-radius:14px;background:#fff;padding:12px;color:#9a3412;font-weight:850}.treasure-history{margin-top:12px;border-top:1px solid #fed7aa;padding-top:10px}.treasure-history h3{margin:0 0 8px;color:#7c2d12}.treasure-history p{display:flex;justify-content:space-between;gap:10px;margin:6px 0;background:#fff;border-radius:12px;padding:9px 10px;color:#415a77;font-weight:850}.treasure-history span{color:#ea580c}
    .treasure-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.35);display:grid;place-items:center;z-index:9999;padding:18px}.treasure-modal{width:min(420px,100%);background:#fff;border-radius:22px;padding:24px;text-align:center;box-shadow:0 24px 70px rgb(15 23 42 / 28%)}.treasure-big-icon{width:86px;height:86px;margin:0 auto 12px;border-radius:24px;display:grid;place-items:center;background:linear-gradient(180deg,#facc15,#fb923c);color:#7c2d12;font-weight:950}.treasure-modal h2{margin:0 0 8px;color:#07192f}.treasure-modal p{margin:0 0 12px;color:#415a77;font-weight:850;line-height:1.5}.treasure-modal strong{display:block;margin-bottom:14px;color:#9a3412}.treasure-modal button{border:0;border-radius:12px;background:#3264df;color:#fff;font-weight:950;padding:11px 18px}
    @media(max-width:720px){.treasure-head{display:grid}.treasure-card{grid-template-columns:48px 1fr}.treasure-card button{grid-column:1/-1}.treasure-icon{height:46px;font-size:13px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
