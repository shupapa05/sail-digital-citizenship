const ITEMS = [
  { id: 'compass', icon: 'N', name: '나침반', unlock: 'default' },
  { id: 'flag', icon: 'F', name: '약속 깃발', unlock: 'default' },
  { id: 'telescope', icon: 'T', name: '망원경', unlock: 'default' },
  { id: 'badge', icon: 'B', name: '시민 배지', unlock: 'total', need: 10 },
  { id: 'badge_s', icon: 'S', name: '안전 배지', unlock: 'S', need: 10 },
  { id: 'badge_a', icon: 'A', name: '책임 배지', unlock: 'A', need: 10 },
  { id: 'badge_i', icon: 'I', name: '윤리 배지', unlock: 'I', need: 10 },
  { id: 'badge_l', icon: 'L', name: '소통 배지', unlock: 'L', need: 10 }
];

const EQUIP_KEY = 'SAIL_EQUIPPED_ITEMS_V2';
const OWNED_KEY = 'SAIL_OWNED_ITEMS_V2';
const STATUS_KEY = 'SAIL_STUDENT_STATUS_CACHE_V1';
const NOTICE_KEY = 'SAIL_ITEM_EARNED_NOTICE_V2';

const style = document.createElement('style');
style.textContent = `
.item-dock{margin-top:12px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:12px;display:grid;gap:10px}
.item-title{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:900;color:#07192f}.item-title small{color:#60738d;font-size:12px;font-weight:800}.item-row{display:flex;gap:8px;flex-wrap:wrap}.item-chip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid #d9e5f4;border-radius:999px;padding:7px 10px;font-weight:900;color:#415a77}.item-mark{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#3264df;color:#fff;font-size:13px}.item-guide{background:#eef6ff;border:1px solid #bfdbfe;border-radius:14px;padding:10px 12px;color:#1e3a8a;font-size:13px;font-weight:800;line-height:1.45}.item-earn{background:#fef3c7;border:1px solid #fcd34d;border-radius:14px;padding:10px 12px;color:#92400e;font-size:13px;font-weight:900;line-height:1.45}
.item-shop{margin-top:14px;background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:18px;box-shadow:0 14px 30px rgb(28 80 150 / 8%)}.item-shop h2{margin:0 0 6px;color:#07192f}.item-shop p{margin:0 0 12px;color:#60738d;line-height:1.5}.item-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.item-card{border:1px solid #d9e5f4;background:#f8fbff;border-radius:18px;padding:13px;display:grid;gap:8px;cursor:pointer}.item-card.on{background:#eff6ff;border-color:#93c5fd}.item-card.locked{opacity:.55;cursor:not-allowed}.item-card small{color:#60738d;line-height:1.35}.item-card button{border:0;border-radius:12px;padding:8px;background:#3264df;color:#fff;font-weight:900}.item-card.on button{background:#22c55e}.item-card.locked button{background:#94a3b8}@media(max-width:600px){.item-grid{grid-template-columns:1fr}.item-shop{padding:14px}}
`;
document.head.appendChild(style);

const originalFetchForItems = window.fetch.bind(window);
window.fetch = async (...args) => {
  const response = await originalFetchForItems(...args);
  const url = String(args[0] || '');
  if (url.includes('/rpc/get_student_home') || url.includes('/rpc/save_mission_result') || url.includes('/rpc/login_student')) {
    try {
      const data = await response.clone().json();
      if (data && data.status) {
        localStorage.setItem(STATUS_KEY, JSON.stringify(data.status));
        checkAutoEarn(data.status);
      }
    } catch {}
  }
  return response;
};

function readJson(key, fallback){
  try { const v = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); return Array.isArray(v) ? v : fallback; }
  catch { return fallback; }
}
function readEquipped(){ return readJson(EQUIP_KEY, ['compass']); }
function saveEquipped(ids){ localStorage.setItem(EQUIP_KEY, JSON.stringify([...new Set(ids)].slice(0, 3))); }
function readOwned(){
  const owned = readJson(OWNED_KEY, []);
  return [...new Set(['compass','flag','telescope',...owned])];
}
function saveOwned(ids){ localStorage.setItem(OWNED_KEY, JSON.stringify([...new Set(ids)])); }
function readStatus(){
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || '{}') || {}; }
  catch { return {}; }
}
function countOf(status, key){
  if (key === 'S') return Number(status.s_count || status.S || 0);
  if (key === 'A') return Number(status.a_count || status.A || 0);
  if (key === 'I') return Number(status.i_count || status.I || 0);
  if (key === 'L') return Number(status.l_count || status.L || 0);
  return 0;
}
function totalPracticeCount(status = readStatus()){
  const areaTotal = countOf(status,'S') + countOf(status,'A') + countOf(status,'I') + countOf(status,'L');
  return Number(status.total_count || status.mission_count || status.completed_count || 0) || areaTotal;
}
function isUnlocked(item, status = readStatus()){
  if (item.unlock === 'default') return true;
  if (item.unlock === 'total') return totalPracticeCount(status) >= item.need;
  return countOf(status, item.unlock) >= item.need;
}
function unlockText(item, status = readStatus()){
  if (item.unlock === 'total') return `총 실천 ${totalPracticeCount(status)}/${item.need}회`;
  if (['S','A','I','L'].includes(item.unlock)) {
    const label = { S:'안전', A:'책임', I:'윤리', L:'소통' }[item.unlock];
    return `${label} ${countOf(status,item.unlock)}/${item.need}회`;
  }
  return '기본 제공';
}
function checkAutoEarn(status = readStatus()){
  const owned = readOwned();
  const newly = [];
  ITEMS.forEach(item => {
    if (!owned.includes(item.id) && isUnlocked(item, status)) newly.push(item.id);
  });
  if (!newly.length) return false;
  saveOwned([...owned, ...newly]);
  localStorage.setItem(NOTICE_KEY, newly.map(id => ITEMS.find(item => item.id === id)?.name).filter(Boolean).join(', '));
  return true;
}
function noticeHtml(){
  const text = localStorage.getItem(NOTICE_KEY) || '';
  if (!text) return '';
  return `<div class="item-earn">축하합니다. ${text} 아이템을 자동 획득했어요.</div>`;
}
function weakArea(){
  const s = readStatus();
  const rows = [
    { key:'S', label:'안전', value:countOf(s,'S'), msg:'개인정보와 위험 상황을 한 번 더 살펴보세요.' },
    { key:'A', label:'책임', value:countOf(s,'A'), msg:'글을 올리기 전 책임 있는 선택을 떠올려 보세요.' },
    { key:'I', label:'윤리', value:countOf(s,'I'), msg:'자료의 출처와 저작권을 확인해 보세요.' },
    { key:'L', label:'소통', value:countOf(s,'L'), msg:'상대의 마음을 생각하며 답글을 적어 보세요.' }
  ];
  return rows.sort((a,b) => a.value - b.value)[0];
}
function selectedItems(){
  checkAutoEarn();
  const owned = readOwned();
  const equipped = readEquipped().filter(id => owned.includes(id));
  const base = equipped.length ? equipped : ['compass'];
  return base.map(id => ITEMS.find(item => item.id === id)).filter(Boolean);
}
function hasCompass(){ return selectedItems().some(item => item.id === 'compass'); }
function dockHtml(){
  const guide = weakArea();
  return `<div class="item-dock" data-item-dock><div class="item-title">장착 아이템 <small>최대 3개</small></div><div class="item-row">${selectedItems().map(item => `<span class="item-chip"><b class="item-mark">${item.icon}</b>${item.name}</span>`).join('')}</div>${hasCompass() ? `<div class="item-guide">나침반 안내: 오늘은 ${guide.label} 영역을 보완하면 좋아요. ${guide.msg}</div>` : ''}${noticeHtml()}</div>`;
}
function shopHtml(){
  checkAutoEarn();
  const status = readStatus();
  const owned = readOwned();
  const equipped = readEquipped();
  return `<section class="item-shop" data-item-shop><h2>아이템 보관함</h2><p>기본 아이템은 바로 장착할 수 있고, 배지는 실천 횟수를 달성하면 자동 획득됩니다.</p><div class="item-grid">${ITEMS.map(item => { const unlocked = owned.includes(item.id) || isUnlocked(item, status); const on = equipped.includes(item.id); return `<article class="item-card ${on ? 'on' : ''} ${unlocked ? '' : 'locked'}" data-item-id="${item.id}" ${unlocked ? '' : 'data-locked="1"'}><strong><span class="item-mark">${item.icon}</span> ${item.name}</strong><small>${unlocked ? '획득 완료' : unlockText(item, status)}</small><button type="button">${unlocked ? (on ? '장착 중' : '장착하기') : '잠김'}</button></article>`; }).join('')}</div></section>`;
}
function refresh(){
  document.querySelectorAll('[data-item-dock]').forEach(el => el.outerHTML = dockHtml());
  const shop = document.querySelector('[data-item-shop]');
  if (shop) shop.outerHTML = shopHtml();
}
function patch(){
  checkAutoEarn();
  const home = document.querySelector('.home-title-card');
  if (home && !home.querySelector('[data-item-dock]')) home.insertAdjacentHTML('beforeend', dockHtml());
  const profile = document.querySelector('.profile');
  if (profile && !document.querySelector('[data-item-shop]')) profile.insertAdjacentHTML('afterend', shopHtml());
}
document.addEventListener('click', event => {
  const card = event.target.closest && event.target.closest('[data-item-id]');
  if (!card || card.dataset.locked === '1') return;
  const id = card.dataset.itemId;
  let ids = readEquipped();
  ids = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id].slice(-3);
  saveEquipped(ids);
  refresh();
});
new MutationObserver(patch).observe(document.body, { childList: true, subtree: true });
setInterval(patch, 700);
setTimeout(patch, 200);
