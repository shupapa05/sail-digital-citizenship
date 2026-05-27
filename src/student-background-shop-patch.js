import { buyDecoration, getStudentHome, setEquippedDecoration } from './api.js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const HOME_KEY = 'SAIL_BACKGROUND_HOME_V1';
const DECOR_KEY = 'SAIL_BACKGROUND_DECOR_STATUS_V1';

let renderScheduled = false;
let shopRendering = false;
let decorationsCache = null;
let statusRefreshing = false;

const SCENES = {
  clear: { name: '기본 바다', className: 'bg-clear', desc: '배만 깔끔하게 보여요' },
  lighthouse: { name: '안전 등대', className: 'bg-lighthouse', desc: '따뜻한 등대빛' },
  compass: { name: '나침반', className: 'bg-compass', desc: '부드러운 항해 지도' },
  stars: { name: '별빛 항로', className: 'bg-stars', desc: '잔잔한 별빛' },
  harbor: { name: '항구 깃발', className: 'bg-harbor', desc: '작은 항구의 환영' },
  mist_dawn: { name: '새벽 안개', className: 'bg-mist', desc: '은은한 아침 바다' },
  moon_path: { name: '달빛 항로', className: 'bg-moon', desc: '달빛이 비치는 물결' },
  aurora_sea: { name: '오로라 바다', className: 'bg-aurora', desc: '푸른 오로라 하늘' },
  golden_sunset: { name: '황금 노을', className: 'bg-sunset', desc: '따뜻한 노을빛' },
  legend_sky: { name: '전설의 하늘', className: 'bg-legend', desc: '최고 항해사의 하늘' }
};

injectBackgroundStyles();
wrapHomeFetch();
watchBackgroundUi();
scheduleEnhance();

function injectBackgroundStyles() {
  if (document.querySelector('#studentBackgroundShopStyles')) return;
  const style = document.createElement('style');
  style.id = 'studentBackgroundShopStyles';
  style.textContent = `
    .reward-ship-stage.bg-clear{background:linear-gradient(180deg,#ffffff 0%,#f8fbff 64%,#eef6ff 100%)}
    .reward-ship-stage.bg-lighthouse{background:linear-gradient(180deg,#f8fbff 0%,#e0f2fe 58%,#dbeafe 100%)}
    .reward-ship-stage.bg-compass{background:linear-gradient(180deg,#fff7ed 0%,#f8fbff 64%,#e0f2fe 100%)}
    .reward-ship-stage.bg-stars{background:radial-gradient(circle at 22% 18%,rgba(253,230,138,.9) 0 3px,transparent 4px),radial-gradient(circle at 76% 24%,rgba(191,219,254,.9) 0 4px,transparent 5px),linear-gradient(180deg,#eef2ff 0%,#f8fbff 62%,#dbeafe 100%)}
    .reward-ship-stage.bg-harbor{background:linear-gradient(180deg,#f8fbff 0%,#e0f2fe 65%,#dbeafe 100%)}
    .reward-ship-stage.bg-mist{background:linear-gradient(180deg,#f8fafc 0%,#edf6ff 52%,#dbeafe 100%)}
    .reward-ship-stage.bg-moon{background:radial-gradient(circle at 78% 18%,#fff7cc 0 22px,transparent 23px),linear-gradient(180deg,#e0e7ff 0%,#f8fbff 62%,#dbeafe 100%)}
    .reward-ship-stage.bg-aurora{background:linear-gradient(115deg,rgba(125,211,252,.35),transparent 32%),linear-gradient(245deg,rgba(134,239,172,.36),transparent 36%),linear-gradient(180deg,#eef2ff 0%,#f8fbff 62%,#dbeafe 100%)}
    .reward-ship-stage.bg-sunset{background:linear-gradient(180deg,#fff7ed 0%,#fed7aa 45%,#dbeafe 100%)}
    .reward-ship-stage.bg-legend{background:radial-gradient(circle at 24% 20%,rgba(253,224,71,.65) 0 6px,transparent 7px),radial-gradient(circle at 82% 26%,rgba(96,165,250,.45) 0 14px,transparent 15px),linear-gradient(180deg,#eef2ff 0%,#f8fbff 56%,#bfdbfe 100%)}
    .background-shop{margin-top:18px;background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
    .background-shop h1{margin:0 0 6px;font-size:26px;color:#07192f}.background-shop p{margin:0 0 14px;color:#60738d;font-weight:800}
    .background-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
    .background-card{border:1px solid #d9e5f4;border-radius:18px;background:#fff;padding:12px;display:grid;gap:10px;text-align:left}
    .background-preview{height:92px;border-radius:14px;border:1px solid #d9e5f4;position:relative;overflow:hidden}
    .background-preview:after{content:'';position:absolute;left:18%;right:18%;bottom:18px;height:14px;border-radius:999px;background:rgba(59,130,246,.28)}
    .background-card h2{font-size:18px;margin:0;color:#07192f}.background-card small{color:#60738d;font-weight:800}.background-card button{width:100%;min-height:44px;border-radius:12px}
    .background-card .owned{background:#dbeafe;color:#1d4ed8}.background-card .equip{background:#3264df;color:#fff}.background-card .buy{background:#16a34a;color:#fff}.background-card .locked{background:#e5e7eb;color:#6b7280}
  `;
  document.head.appendChild(style);
}

function wrapHomeFetch() {
  if (window.__SAIL_BACKGROUND_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_BACKGROUND_FETCH__ = true;
  window.fetch = async (...args) => {
    const res = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/get_student_home') || url.includes('/rpc/login_student') || url.includes('/rpc/save_mission_result')) {
      res.clone().json().then(data => {
        if (data?.student && data?.status) localStorage.setItem(HOME_KEY, JSON.stringify(data));
        refreshDecorationStatus().finally(scheduleEnhance);
      }).catch(() => {});
    }
    return res;
  };
}

function watchBackgroundUi() {
  new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
}

function scheduleEnhance() {
  if (renderScheduled) return;
  renderScheduled = true;
  setTimeout(() => {
    renderScheduled = false;
    enhanceBackgroundUi();
  }, 120);
}

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.error || '요청 실패');
  return data;
}

async function fetchDecorations() {
  if (decorationsCache) return decorationsCache;
  decorationsCache = await request('/rest/v1/decorations?active=eq.true&select=decoration_id,name,price,required_level&order=required_level.asc,price.asc').catch(() => []);
  return decorationsCache;
}

async function refreshDecorationStatus() {
  if (statusRefreshing) return null;
  const studentId = localStorage.getItem('SAIL_STUDENT_ID');
  if (!studentId) return null;
  statusRefreshing = true;
  try {
    const status = await request('/rest/v1/rpc/sail_decoration_status', {
      method: 'POST',
      body: JSON.stringify({ p_student_id: studentId })
    });
    localStorage.setItem(DECOR_KEY, JSON.stringify(status || {}));
    return status;
  } finally {
    statusRefreshing = false;
  }
}

function readJson(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

function sceneOf(id) { return SCENES[id] || SCENES.clear; }

function applyBackground() {
  const status = readJson(DECOR_KEY);
  const id = status.equipped_decoration_id || 'clear';
  const scene = sceneOf(id);
  document.querySelectorAll('.reward-ship-stage, .ship-profile > div:first-child').forEach(stage => {
    if (stage.dataset.backgroundScene === id) return;
    Object.values(SCENES).forEach(item => stage.classList.remove(item.className));
    stage.classList.add(scene.className);
    stage.dataset.backgroundScene = id;
  });
}

async function renderBackgroundShop() {
  const info = document.querySelector('.ship-shop');
  if (!info || document.querySelector('.background-shop') || shopRendering) return;
  shopRendering = true;
  try {
    const home = readJson(HOME_KEY);
    const status = readJson(DECOR_KEY);
    const level = Number(status.level || home.status?.level || 1);
    const coin = Number(status.coin || home.status?.coin || 0);
    const owned = new Set(status.owned_decoration_ids || ['clear']);
    const equipped = status.equipped_decoration_id || 'clear';
    const rows = await fetchDecorations();
    if (!info.isConnected || document.querySelector('.background-shop')) return;

    info.insertAdjacentHTML('afterend', `
      <section class="background-shop">
        <h1>배경 상점</h1>
        <p>배를 가리지 않는 은은한 배경 아이템입니다. 보유한 배경은 바로 선택할 수 있어요.</p>
        <div class="background-grid">
          ${rows.map(item => backgroundCard(item, { level, coin, owned, equipped })).join('')}
        </div>
      </section>
    `);
    bindBackgroundButtons();
  } finally {
    shopRendering = false;
  }
}

function backgroundCard(item, state) {
  const scene = sceneOf(item.decoration_id);
  const isOwned = state.owned.has(item.decoration_id);
  const isEquipped = state.equipped === item.decoration_id;
  const canBuy = !isOwned && state.level >= Number(item.required_level || 1) && state.coin >= Number(item.price || 0);
  const button = isEquipped
    ? '<button class="owned" disabled>사용 중</button>'
    : isOwned
      ? `<button class="equip" data-equip-bg="${escapeHtml(item.decoration_id)}">선택하기</button>`
      : canBuy
        ? `<button class="buy" data-buy-bg="${escapeHtml(item.decoration_id)}">구매하기</button>`
        : `<button class="locked" disabled>${state.level < Number(item.required_level || 1) ? `Lv.${item.required_level} 필요` : '코인 부족'}</button>`;
  return `
    <article class="background-card">
      <div class="background-preview ${scene.className}"></div>
      <h2>${escapeHtml(item.name || scene.name)}</h2>
      <small>Lv.${item.required_level} · ${item.price}코인 · ${scene.desc}</small>
      ${button}
    </article>
  `;
}

function bindBackgroundButtons() {
  document.querySelectorAll('[data-buy-bg]').forEach(button => {
    if (button.dataset.bgReady) return;
    button.dataset.bgReady = '1';
    button.addEventListener('click', async () => {
      await runBgAction(button, '구매 중...', async () => buyDecoration(localStorage.getItem('SAIL_STUDENT_ID'), button.dataset.buyBg));
    });
  });
  document.querySelectorAll('[data-equip-bg]').forEach(button => {
    if (button.dataset.bgReady) return;
    button.dataset.bgReady = '1';
    button.addEventListener('click', async () => {
      await runBgAction(button, '선택 중...', async () => setEquippedDecoration(localStorage.getItem('SAIL_STUDENT_ID'), button.dataset.equipBg));
    });
  });
}

async function runBgAction(button, label, action) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    const res = await action();
    if (res?.status) localStorage.setItem(DECOR_KEY, JSON.stringify(res.status));
    const home = await getStudentHome(localStorage.getItem('SAIL_STUDENT_ID'), localStorage.getItem('SAIL_LOGIN_CODE') || '');
    localStorage.setItem(HOME_KEY, JSON.stringify(home));
    document.querySelector('.background-shop')?.remove();
    await refreshDecorationStatus();
    scheduleEnhance();
  } catch (error) {
    alert(error.message || '처리하지 못했습니다.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function enhanceBackgroundUi() {
  applyBackground();
  renderBackgroundShop();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
