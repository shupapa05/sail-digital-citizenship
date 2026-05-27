import { buyDecoration, setEquippedDecoration } from './api.js';

const STATUS_KEY = 'SAIL_UNIFIED_SHOP_STATUS_V1';
const OWNED_KEY = 'SAIL_UNIFIED_SHOP_OWNED_V1';
const ACTIVE_ITEMS_KEY = 'SAIL_UNIFIED_SHOP_ACTIVE_ITEMS_V1';
const ACTIVE_BG_KEY = 'SAIL_UNIFIED_SHOP_ACTIVE_BG_V1';
const ACTIVE_TAB_KEY = 'SAIL_UNIFIED_SHOP_TAB_V1';

const ITEMS = [
  { id: 'item_compass', type: 'item', name: '나침반', icon: 'N', level: 1, price: 0, note: '부족한 영역을 떠올리게 해요.' },
  { id: 'item_lighthouse', type: 'item', name: '등대', icon: 'L', level: 3, price: 12, note: '꾸준한 참여를 응원해요.' },
  { id: 'item_telescope', type: 'item', name: '망원경', icon: 'T', level: 4, price: 18, note: '다음 목표를 바라보게 해요.' },
  { id: 'item_star_badge', type: 'item', name: '별 배지', icon: 'S', level: 5, price: 25, note: '성장한 항해자를 표시해요.' }
];

const BACKGROUNDS = [
  { id: 'mist_dawn', type: 'background', name: '새벽 안개', icon: 'M', level: 6, price: 50, note: '차분한 아침 바다 느낌' },
  { id: 'moon_path', type: 'background', name: '달빛 항로', icon: 'M', level: 7, price: 70, note: '은은한 밤 항로 느낌' },
  { id: 'aurora_sea', type: 'background', name: '오로라 바다', icon: 'A', level: 8, price: 90, note: '푸른 빛이 흐르는 바다' },
  { id: 'golden_sunset', type: 'background', name: '황금 노을', icon: 'G', level: 9, price: 120, note: '따뜻한 노을빛 항해' },
  { id: 'legend_sky', type: 'background', name: '전설의 하늘', icon: 'L', level: 10, price: 160, note: '최고 레벨 전용 배경' }
];

injectUnifiedShopStyles();
wrapShopFetch();
schedulePatch(300);

let patchTimer = null;
function schedulePatch(delay = 120) {
  if (patchTimer) clearTimeout(patchTimer);
  patchTimer = setTimeout(() => {
    patchTimer = null;
    patchShop();
    applyEquippedDecor();
  }, delay);
}

new MutationObserver(() => schedulePatch()).observe(document.querySelector('#app') || document.body, { childList: true });

document.addEventListener('click', event => {
  const tab = event.target.closest('[data-shop-tab]');
  const buy = event.target.closest('[data-shop-buy]');
  const equip = event.target.closest('[data-shop-equip]');
  if (!tab && !buy && !equip) return;

  if (tab) {
    localStorage.setItem(ACTIVE_TAB_KEY, tab.dataset.shopTab);
    setActiveTab(tab.dataset.shopTab);
    return;
  }

  if (buy) handleBuy(buy);
  if (equip) handleEquip(equip);
});

function wrapShopFetch() {
  if (window.__SAIL_UNIFIED_SHOP_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_UNIFIED_SHOP_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/login_student') || url.includes('/rpc/get_student_home') || url.includes('/rpc/save_mission_result')) {
      response.clone().json().then(data => {
        if (data?.status) localStorage.setItem(STATUS_KEY, JSON.stringify(data.status));
        schedulePatch(80);
      }).catch(() => {});
    }
    return response;
  };
}

function patchShop() {
  document.querySelectorAll('.ship-shop-toggle-wrap').forEach(el => el.remove());
  const shop = document.querySelector('.ship-shop');
  if (!shop || shop.dataset.unifiedShop === '1') return;

  const sectionHead = shop.querySelector('.section-head');
  const grid = shop.querySelector('.ship-grid');
  if (!grid) return;

  shop.dataset.unifiedShop = '1';
  shop.classList.remove('closed');
  sectionHead?.remove();
  grid.remove();

  const shipPanel = document.createElement('div');
  shipPanel.className = 'shop-panel';
  shipPanel.dataset.shopPanel = 'ship';
  shipPanel.appendChild(grid);

  shop.innerHTML = `
    <div class="unified-shop-head">
      <div><h1>상점</h1><p>배, 아이템, 배경을 탭으로 나누어 가볍게 관리합니다.</p></div>
    </div>
    <div class="shop-tabs" role="tablist">
      <button type="button" data-shop-tab="ship">배</button>
      <button type="button" data-shop-tab="item">아이템</button>
      <button type="button" data-shop-tab="background">배경</button>
    </div>
  `;

  shop.appendChild(shipPanel);
  shop.insertAdjacentHTML('beforeend', `
    <div class="shop-panel" data-shop-panel="item">${shopCards(ITEMS)}</div>
    <div class="shop-panel" data-shop-panel="background">${shopCards(BACKGROUNDS)}</div>
  `);

  setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'ship');
}

function setActiveTab(tab) {
  const selected = ['ship', 'item', 'background'].includes(tab) ? tab : 'ship';
  document.querySelectorAll('[data-shop-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.shopTab === selected));
  document.querySelectorAll('[data-shop-panel]').forEach(panel => panel.hidden = panel.dataset.shopPanel !== selected);
}

function shopCards(list) {
  const status = getStatus();
  const owned = getOwned();
  const activeItems = getActiveItems();
  const activeBg = localStorage.getItem(ACTIVE_BG_KEY) || '';

  return `<div class="unified-shop-grid">${list.map(item => {
    const isOwned = item.price === 0 || owned.includes(item.id);
    const isActive = item.type === 'background' ? activeBg === item.id : activeItems.includes(item.id);
    const levelOk = Number(status.level || 1) >= Number(item.level || 1);
    const coinOk = Number(status.coin || 0) >= Number(item.price || 0);
    const canBuy = !isOwned && levelOk && coinOk;
    const lockedText = !levelOk ? `Lv.${item.level} 필요` : '코인 부족';
    const action = isOwned
      ? `<button type="button" data-shop-equip="${item.id}">${isActive ? '사용 중' : '선택하기'}</button>`
      : `<button type="button" ${canBuy ? `data-shop-buy="${item.id}"` : 'disabled'}>${canBuy ? '구입하기' : lockedText}</button>`;

    return `
      <article class="unified-shop-card ${isActive ? 'active' : ''} ${!isOwned && !canBuy ? 'locked' : ''}">
        <div class="shop-icon ${item.type}-${item.id}">${item.icon}</div>
        <h2>${esc(item.name)}</h2>
        <p>Lv.${item.level} · ${item.price}코인</p>
        <small>${esc(item.note)}</small>
        ${action}
      </article>
    `;
  }).join('')}</div>`;
}

async function handleBuy(button) {
  const item = findShopItem(button.dataset.shopBuy);
  if (!item) return;
  await withButton(button, '구입 중...', async () => {
    const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
    try {
      if (studentId) {
        const result = await buyDecoration(studentId, item.id);
        mergeStatus(result?.status || result);
      }
      markOwned(item.id);
    } catch {
      spendLocalCoin(item.price);
      markOwned(item.id);
    }
    equipItem(item);
    refreshShopPanels();
  });
}

async function handleEquip(button) {
  const item = findShopItem(button.dataset.shopEquip);
  if (!item) return;
  await withButton(button, '선택 중...', async () => {
    const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
    try {
      if (studentId) {
        const result = await setEquippedDecoration(studentId, item.id);
        mergeStatus(result?.status || result);
      }
    } catch {}
    equipItem(item);
    refreshShopPanels();
  });
}

function equipItem(item) {
  markOwned(item.id);
  if (item.type === 'background') {
    localStorage.setItem(ACTIVE_BG_KEY, item.id);
  } else {
    const current = getActiveItems().filter(id => id !== item.id);
    localStorage.setItem(ACTIVE_ITEMS_KEY, JSON.stringify([item.id, ...current].slice(0, 3)));
  }
  applyEquippedDecor();
}

function refreshShopPanels() {
  const itemPanel = document.querySelector('[data-shop-panel="item"]');
  const bgPanel = document.querySelector('[data-shop-panel="background"]');
  if (itemPanel) itemPanel.innerHTML = shopCards(ITEMS);
  if (bgPanel) bgPanel.innerHTML = shopCards(BACKGROUNDS);
  setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'ship');
  updateCoinText();
}

function applyEquippedDecor() {
  const profile = document.querySelector('.ship-profile');
  if (!profile) return;

  profile.classList.remove(...BACKGROUNDS.map(item => `shop-bg-${item.id}`));
  const bg = localStorage.getItem(ACTIVE_BG_KEY);
  if (bg) profile.classList.add(`shop-bg-${bg}`);

  profile.querySelector('[data-equipped-items]')?.remove();
  const items = getActiveItems().map(id => ITEMS.find(item => item.id === id)).filter(Boolean);
  if (!items.length) return;

  profile.insertAdjacentHTML('beforeend', `
    <div class="equipped-item-strip" data-equipped-items>
      ${items.map(item => `<span><b>${item.icon}</b>${esc(item.name)}</span>`).join('')}
    </div>
  `);
}

function getStatus() {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || localStorage.getItem('SAIL_REWARD_STATUS') || '{}') || {}; }
  catch { return {}; }
}

function mergeStatus(status) {
  if (!status || typeof status !== 'object') return;
  const current = getStatus();
  localStorage.setItem(STATUS_KEY, JSON.stringify({ ...current, ...status }));
  localStorage.setItem('SAIL_REWARD_STATUS', JSON.stringify({ ...current, ...status }));
}

function getOwned() {
  try {
    const value = JSON.parse(localStorage.getItem(OWNED_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function markOwned(id) {
  const owned = new Set(getOwned());
  owned.add(id);
  localStorage.setItem(OWNED_KEY, JSON.stringify([...owned]));
}

function getActiveItems() {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_ITEMS_KEY) || '["item_compass"]');
    return Array.isArray(value) ? value : ['item_compass'];
  } catch { return ['item_compass']; }
}

function spendLocalCoin(price) {
  const status = getStatus();
  const coin = Number(status.coin || 0);
  status.coin = Math.max(0, coin - Number(price || 0));
  mergeStatus(status);
}

function updateCoinText() {
  const status = getStatus();
  document.querySelectorAll('.coin-badge').forEach(el => { el.textContent = `보유 코인 ${Number(status.coin || 0)}개`; });
}

function findShopItem(id) {
  return [...ITEMS, ...BACKGROUNDS].find(item => item.id === id);
}

async function withButton(button, label, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { await task(); }
  finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function injectUnifiedShopStyles() {
  if (document.querySelector('#unifiedShopStyles')) return;
  const style = document.createElement('style');
  style.id = 'unifiedShopStyles';
  style.textContent = `
    .ship-shop{margin-top:18px;background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
    .unified-shop-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;margin-bottom:12px}
    .unified-shop-head h1{margin:0;color:#07192f;font-size:34px}.unified-shop-head p{margin:6px 0 0;color:#60738d;font-weight:800;line-height:1.45}
    .shop-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;background:#f1f6fd;border:1px solid #d9e5f4;border-radius:14px;padding:6px}
    .shop-tabs button{border:0;border-radius:10px;background:transparent;color:#415a77;font-weight:950;padding:10px}.shop-tabs button.active{background:#3264df;color:#fff;box-shadow:0 8px 16px rgb(50 100 223 / 18%)}
    .shop-panel[hidden]{display:none!important}.unified-shop-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
    .unified-shop-card{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;text-align:center;display:grid;gap:7px;align-content:start}.unified-shop-card.active{background:#fff7ed;border-color:#fed7aa}.unified-shop-card.locked{opacity:.72}
    .shop-icon{width:56px;height:56px;margin:0 auto;border-radius:16px;display:grid;place-items:center;background:linear-gradient(180deg,#5b8df7,#3264df);color:#fff;font-weight:950;font-size:22px}.unified-shop-card h2{margin:2px 0 0;font-size:18px;color:#07192f}.unified-shop-card p{margin:0;color:#415a77;font-weight:900}.unified-shop-card small{min-height:34px;color:#60738d;font-weight:800;line-height:1.35}.unified-shop-card button{width:100%;min-height:40px;border:0;border-radius:12px;background:#16a34a;color:#fff;font-weight:950}.unified-shop-card.active button{background:#e0e7ff;color:#1d4ed8}.unified-shop-card button:disabled{background:#e5e7eb;color:#64748b}
    .equipped-item-strip{grid-column:1/-1;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:12px}.equipped-item-strip span{display:inline-flex;align-items:center;gap:6px;border:1px solid #d9e5f4;border-radius:999px;background:rgba(255,255,255,.82);padding:7px 10px;color:#415a77;font-weight:900}.equipped-item-strip b{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:#3264df;color:#fff;font-size:12px}
    .ship-profile{position:relative;overflow:hidden}.ship-profile>*{position:relative;z-index:1}.ship-profile::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .2s ease;z-index:0}.ship-profile[class*="shop-bg-"]::before{opacity:1}
    .shop-bg-mist_dawn::before{background:radial-gradient(circle at 22% 18%,rgba(255,255,255,.95),transparent 28%),linear-gradient(135deg,rgba(226,242,255,.78),rgba(241,248,255,.55))}.shop-bg-moon_path::before{background:radial-gradient(circle at 74% 18%,rgba(255,255,230,.9),transparent 12%),linear-gradient(135deg,rgba(30,64,175,.16),rgba(219,234,254,.62))}.shop-bg-aurora_sea::before{background:linear-gradient(120deg,rgba(45,212,191,.28),rgba(96,165,250,.12),rgba(192,132,252,.26)),linear-gradient(180deg,rgba(240,253,250,.74),rgba(239,246,255,.68))}.shop-bg-golden_sunset::before{background:radial-gradient(circle at 76% 24%,rgba(251,191,36,.5),transparent 22%),linear-gradient(135deg,rgba(255,247,237,.88),rgba(219,234,254,.54))}.shop-bg-legend_sky::before{background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.9),transparent 12%),linear-gradient(120deg,rgba(147,197,253,.34),rgba(196,181,253,.28),rgba(250,204,21,.18))}
    @media(max-width:720px){.ship-shop{padding:12px}.unified-shop-head h1{font-size:26px}.unified-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.unified-shop-card{padding:10px}.shop-icon{width:48px;height:48px}.unified-shop-card h2{font-size:15px}.unified-shop-card small{font-size:12px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
