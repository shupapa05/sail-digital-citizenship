import { getShips } from './api.js?v=20260527-treasure1';

const STATUS_KEY = 'SAIL_SHIP_BENEFIT_STATUS_V1';
const SHIPS_KEY = 'SAIL_SHIP_BENEFIT_SHIPS_V1';
let benefitTimer = null;
let loadingShips = false;
let lastSignature = '';

injectShipBenefitStyles();
wrapShipBenefitFetch();
scheduleShipBenefit(450);
new MutationObserver(() => scheduleShipBenefit()).observe(document.querySelector('#app') || document.body, { childList: true });

function scheduleShipBenefit(delay = 140) {
  if (benefitTimer) clearTimeout(benefitTimer);
  benefitTimer = setTimeout(() => {
    benefitTimer = null;
    renderShipBenefit();
  }, delay);
}

function wrapShipBenefitFetch() {
  if (window.__SAIL_SHIP_BENEFIT_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_SHIP_BENEFIT_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/login_student') || url.includes('/rpc/get_student_home') || url.includes('/rpc/save_mission_result') || url.includes('/rpc/buy_ship') || url.includes('/rpc/set_equipped_ship')) {
      response.clone().json().then(data => {
        const status = data?.status || data?.status?.status;
        if (data?.status) localStorage.setItem(STATUS_KEY, JSON.stringify(data.status));
        lastSignature = '';
        scheduleShipBenefit(90);
      }).catch(() => {});
    }
    return response;
  };
}

async function renderShipBenefit() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;

  const profile = document.querySelector('.ship-profile');
  if (!profile) return;

  const status = getStatus();
  if (!Object.keys(status).length) return;

  let ships = getCachedShips();
  if (!ships.length && !loadingShips) {
    loadingShips = true;
    try {
      ships = await getShips();
      localStorage.setItem(SHIPS_KEY, JSON.stringify(ships));
    } catch {
      ships = [];
    } finally {
      loadingShips = false;
    }
  }

  const ship = findEquippedShip(status, ships);
  const level = Number(ship?.level || status.level || 1);
  const signature = `${status.equipped_ship_id || ''}|${ship?.ship_id || ''}|${level}`;
  if (signature === lastSignature && profile.querySelector('[data-ship-benefit]')) return;
  lastSignature = signature;

  profile.querySelector('[data-ship-benefit]')?.remove();
  profile.insertAdjacentHTML('beforeend', benefitHtml(ship?.name || status.ship_type || '현재 배', level));
}

function benefitHtml(shipName, level) {
  const benefits = benefitList(level);
  return `
    <section class="ship-benefit-card" data-ship-benefit>
      <div>
        <span>현재 배 특성</span>
        <h2>${esc(shipName)} · Lv.${level}</h2>
      </div>
      <ul>${benefits.map(text => `<li>${esc(text)}</li>`).join('')}</ul>
    </section>
  `;
}

function benefitList(level) {
  const list = [];
  if (level >= 3) list.push('꾸준한 항해 안내가 강화됩니다.');
  if (level >= 4) list.push('나침반 추천과 다음 목표 안내가 더 잘 보입니다.');
  if (level >= 5) list.push('보물상자에서 코인 보상 확률이 조금 높아집니다.');
  if (level >= 7) list.push('보물상자에서 오프라인 쿠폰 확률이 조금 높아집니다.');
  if (level >= 8) list.push('5일·7일 상자에서 좋은 보상 확률이 올라갑니다.');
  if (level >= 9) list.push('온라인 아이템 보상 확률이 올라갑니다.');
  if (level >= 10) list.push('특별 보물상자 확장 조건을 열 수 있는 단계입니다.');
  if (!list.length) list.push('기본 배입니다. 높은 레벨 배를 장착하면 보물상자 혜택이 생깁니다.');
  return list.slice(-3);
}

function findEquippedShip(status, ships) {
  const equippedId = String(status.equipped_ship_id || '');
  return ships.find(ship => String(ship.ship_id) === equippedId)
    || ships.find(ship => ship.name === status.ship_type)
    || ships.find(ship => ship.is_default)
    || ships[0]
    || null;
}

function getStatus() {
  for (const key of [STATUS_KEY, 'SAIL_REWARD_STATUS', 'SAIL_UNIFIED_SHOP_STATUS_V1']) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value && typeof value === 'object') return value;
    } catch {}
  }
  return {};
}

function getCachedShips() {
  try {
    const ships = JSON.parse(localStorage.getItem(SHIPS_KEY) || '[]');
    return Array.isArray(ships) ? ships : [];
  } catch {
    return [];
  }
}

function injectShipBenefitStyles() {
  if (document.querySelector('#shipBenefitStyles')) return;
  const style = document.createElement('style');
  style.id = 'shipBenefitStyles';
  style.textContent = `
    .ship-benefit-card{grid-column:1/-1;margin:14px auto 0;width:min(620px,100%);display:grid;gap:10px;border:1px solid #bfdbfe;border-radius:18px;background:rgba(239,246,255,.92);padding:14px;text-align:left;color:#1e3a8a;box-shadow:0 10px 22px rgb(37 99 235 / 8%)}
    .ship-benefit-card span{color:#2563eb;font-weight:950;font-size:13px}.ship-benefit-card h2{margin:2px 0 0;color:#07192f;font-size:20px}.ship-benefit-card ul{display:grid;gap:6px;margin:0;padding-left:18px}.ship-benefit-card li{font-weight:850;line-height:1.4}
    @media(max-width:720px){.ship-benefit-card{font-size:13px}.ship-benefit-card h2{font-size:17px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
