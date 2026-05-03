import { getShips, getMissionChoices, getMonthlyHistory, getStudentHome, isConfigured, loginStudent, saveMissionResult, uploadProofPhoto, buyShip, setEquippedShip } from './api.js';

const DEFAULT_DAILY_LIMIT = 2;
const appEl = document.querySelector('#app');
let state = { student: null, status: null, missions: [], todaySavedMissionIds: [], todaySavedCount: 0, dailyLimit: DEFAULT_DAILY_LIMIT, dailyLimitReasons: ['기본 2개'], ships: [] };

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

function setState(next) { state = { ...state, ...next }; }
function renderShell(content) { appEl.innerHTML = content; }

async function ensureShipsLoaded() {
  if (state.ships.length) return;
  try { setState({ ships: await getShips() }); } catch { setState({ ships: [] }); }
}

function normalizeOwned(ids) {
  if (!ids) return [];
  if (Array.isArray(ids)) return ids;
  return String(ids).split(',').map(s => s.trim()).filter(Boolean);
}

async function renderInfo() {
  const status = state.status || {};
  await ensureShipsLoaded();
  const owned = normalizeOwned(status.owned_ship_ids);

  renderShell(`
    <section class="profile">
      <h1>내 배</h1>
      <p>현재 선택: ${esc(status.equipped_ship_id || '없음')}</p>
    </section>

    <section class="ship-grid">
      ${state.ships.map(ship => {
        const isOwned = owned.includes(ship.ship_id);
        const isEquipped = status.equipped_ship_id === ship.ship_id;
        const canBuy = !isOwned && status.level >= ship.level && status.coin >= ship.price;

        return `
        <div class="ship-card">
          <img src="${esc(ship.img_url)}" />
          <h3>${esc(ship.name)}</h3>
          <p>Lv.${ship.level} / ${ship.price}코인</p>

          ${isEquipped ? '<button disabled>사용 중</button>' : isOwned ? `<button data-equip="${ship.ship_id}">선택</button>` : canBuy ? `<button data-buy="${ship.ship_id}">구매</button>` : '<button disabled>조건 부족</button>'}
        </div>`;
      }).join('')}
    </section>
  `);

  document.querySelectorAll('[data-buy]').forEach(btn => btn.onclick = async () => {
    await buyShip(state.student.student_id, btn.dataset.buy);
    const res = await getStudentHome(state.student.student_id);
    state.status = res.status;
    renderInfo();
  });

  document.querySelectorAll('[data-equip]').forEach(btn => btn.onclick = async () => {
    await setEquippedShip(state.student.student_id, btn.dataset.equip);
    const res = await getStudentHome(state.student.student_id);
    state.status = res.status;
    renderInfo();
  });
}

export { renderInfo };
