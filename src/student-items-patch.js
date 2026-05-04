const ITEMS = [
  { id: 'compass', icon: 'N', name: '나침반' },
  { id: 'badge', icon: 'B', name: '시민 배지' },
  { id: 'flag', icon: 'F', name: '약속 깃발' },
  { id: 'telescope', icon: 'T', name: '망원경' },
  { id: 'safe', icon: 'S', name: '안전 장비' }
];

const KEY = 'SAIL_EQUIPPED_ITEMS_V1';

const style = document.createElement('style');
style.textContent = `
.item-dock{margin-top:12px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:12px;display:grid;gap:10px}
.item-title{font-weight:900;color:#07192f}.item-row{display:flex;gap:8px;flex-wrap:wrap}.item-chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #d9e5f4;border-radius:999px;padding:7px 10px;font-weight:900;color:#415a77}.item-mark{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#3264df;color:#fff;font-size:13px}
.item-shop{margin-top:14px;background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 8%)}.item-shop h2{margin:0 0 6px;color:#07192f}.item-shop p{margin:0 0 12px;color:#60738d;line-height:1.5}.item-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.item-card{border:1px solid #d9e5f4;background:#f8fbff;border-radius:18px;padding:13px;display:grid;gap:8px;cursor:pointer}.item-card.on{background:#eff6ff;border-color:#93c5fd}.item-card button{border:0;border-radius:12px;padding:8px;background:#3264df;color:#fff;font-weight:900}.item-card.on button{background:#22c55e}@media(max-width:600px){.item-grid{grid-template-columns:1fr}.item-shop{padding:14px}}
`;
document.head.appendChild(style);

function readItems(){
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function saveItems(ids){ localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 3))); }
function selectedItems(){
  const ids = readItems();
  const base = ids.length ? ids : ['compass', 'badge'];
  return base.map(id => ITEMS.find(item => item.id === id)).filter(Boolean);
}
function dockHtml(){
  return `<div class="item-dock" data-item-dock><div class="item-title">장착 아이템</div><div class="item-row">${selectedItems().map(item => `<span class="item-chip"><b class="item-mark">${item.icon}</b>${item.name}</span>`).join('')}</div></div>`;
}
function shopHtml(){
  const ids = readItems();
  return `<section class="item-shop" data-item-shop><h2>아이템 보관함</h2><p>배와 함께 표시할 아이템을 고릅니다. 최대 3개까지 장착됩니다.</p><div class="item-grid">${ITEMS.map(item => { const on = ids.includes(item.id) || (!ids.length && ['compass','badge'].includes(item.id)); return `<article class="item-card ${on ? 'on' : ''}" data-item-id="${item.id}"><strong><span class="item-mark">${item.icon}</span> ${item.name}</strong><button type="button">${on ? '장착 중' : '장착하기'}</button></article>`; }).join('')}</div></section>`;
}
function refresh(){
  document.querySelectorAll('[data-item-dock]').forEach(el => el.outerHTML = dockHtml());
  const shop = document.querySelector('[data-item-shop]');
  if (shop) shop.outerHTML = shopHtml();
}
function patch(){
  const home = document.querySelector('.home-title-card');
  if (home && !home.querySelector('[data-item-dock]')) home.insertAdjacentHTML('beforeend', dockHtml());
  const profile = document.querySelector('.profile');
  if (profile && !document.querySelector('[data-item-shop]')) profile.insertAdjacentHTML('afterend', shopHtml());
  const shipBox = document.querySelector('.ship-profile > div:first-child');
  if (shipBox && !shipBox.querySelector('[data-item-dock]')) shipBox.insertAdjacentHTML('beforeend', dockHtml());
}
document.addEventListener('click', event => {
  const card = event.target.closest && event.target.closest('[data-item-id]');
  if (!card) return;
  const id = card.dataset.itemId;
  let ids = readItems();
  ids = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id].slice(-3);
  saveItems(ids);
  refresh();
});
new MutationObserver(patch).observe(document.body, { childList: true, subtree: true });
setInterval(patch, 700);
setTimeout(patch, 200);
