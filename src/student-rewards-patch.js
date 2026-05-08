const STATUS_KEY = 'SAIL_REWARD_STATUS';
const STUDENT_KEY = 'SAIL_REWARD_STUDENT';

const BADGES = [
  { key: 's_count', label: '안전 배지', short: '안전', className: 's', icon: 'S', help: '위험한 상황을 멈추고 확인한 실천' },
  { key: 'a_count', label: '책임 배지', short: '책임', className: 'a', icon: 'A', help: '올리기 전에 한 번 더 생각한 실천' },
  { key: 'i_count', label: '윤리 배지', short: '윤리', className: 'i', icon: 'I', help: '출처와 권리를 확인한 실천' },
  { key: 'l_count', label: '소통 배지', short: '소통', className: 'l', icon: 'L', help: '상대의 말을 끝까지 듣고 이해한 실천' }
];

const LEGACY_KEYS = [
  'SAIL_DECOR_OWNED',
  'SAIL_DECOR_ACTIVE',
  'SAIL_EQUIPPED_ITEMS_V2',
  'SAIL_OWNED_ITEMS_V2',
  'SAIL_ITEM_EARNED_NOTICE_V2'
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

injectRewardStyles();
cleanupLegacyRewardData();
wrapFetchForRewards();
observeStudentScreens();
setTimeout(enhanceStudentScreens, 300);

function cleanupLegacyRewardData() {
  LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
}

function wrapFetchForRewards() {
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch || window.__SAIL_REWARD_FETCH_PATCHED__) return;
  window.__SAIL_REWARD_FETCH_PATCHED__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');

    if (url.includes('/rpc/login_student') || url.includes('/rpc/get_student_home') || url.includes('/rpc/save_mission_result')) {
      response.clone().json().then(storeRewardData).catch(() => {});
    }

    return response;
  };
}

function storeRewardData(data) {
  const role = String(data?.student?.role || data?.role || '').toLowerCase();
  if (role === 'teacher' || role === 'admin') return;

  if (data?.status) localStorage.setItem(STATUS_KEY, JSON.stringify(data.status));
  if (data?.student) localStorage.setItem(STUDENT_KEY, JSON.stringify(data.student));
}

function readJson(key, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null') || fallback;
  } catch {
    return fallback;
  }
}

function getStatus() {
  return readJson(STATUS_KEY);
}

function countOf(status, key) {
  return Number(status?.[key] || 0);
}

function earnedBadges(status) {
  return BADGES.map(badge => {
    const count = countOf(status, badge.key);
    return {
      ...badge,
      count,
      earned: count >= 10,
      progress: Math.min(100, Math.round((count / 10) * 100))
    };
  });
}

function activeTitle(status) {
  const badges = earnedBadges(status);
  const top = [...badges].sort((a, b) => b.count - a.count)[0];
  const streak = Number(status.streak || 0);
  const total = Number(status.total_score || 0);

  if (streak >= 10) return { name: '꾸준한 항해사', note: '연속 실천으로 얻은 칭호' };
  if (total >= 120) return { name: '디지털 선장', note: '높은 점수로 얻은 칭호' };
  if (top?.count >= 10) return { name: `${top.short} 항해사`, note: `${top.label}를 완성했어요` };
  if (total >= 50) return { name: '성장 항해사', note: '꾸준히 실천하며 성장 중' };
  return { name: '새싹 항해사', note: '배지를 모으는 중' };
}

function observeStudentScreens() {
  const app = document.querySelector('#app');
  if (!app) return;

  new MutationObserver(() => enhanceStudentScreens()).observe(app, {
    childList: true,
    subtree: true
  });
}

function enhanceStudentScreens() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;

  const status = getStatus();
  if (!Object.keys(status).length) return;

  removeLegacyPanels();
  enhanceTopbar(status);
  enhanceHome(status);
  enhanceInfo(status);
  enhanceStats(status);
}

function removeLegacyPanels() {
  document.querySelectorAll('[data-item-shop], .decor-shop, .shop-use-note').forEach(el => el.remove());
}

function enhanceTopbar(status) {
  const topbar = document.querySelector('.topbar div');
  if (!topbar || topbar.querySelector('.student-title-pill')) return;

  const title = activeTitle(status);
  topbar.insertAdjacentHTML('beforeend', `<span class="student-title-pill">${esc(title.name)}</span>`);
}

function enhanceHome(status) {
  const home = document.querySelector('.home-title-card');
  if (!home || home.querySelector('.reward-home-panel')) return;

  const title = activeTitle(status);
  const earnedCount = earnedBadges(status).filter(badge => badge.earned).length;

  home.querySelector('.reward-row')?.insertAdjacentHTML('afterend', `
    <div class="reward-home-panel">
      <strong>${esc(title.name)}</strong>
      <span>${esc(title.note)}</span>
      <div class="badge-strip-caption">획득 배지 ${earnedCount}/4</div>
      ${badgeStrip(status)}
    </div>
  `);
}

function enhanceInfo(status) {
  const profile = document.querySelector('.profile');
  if (!profile) return;

  decorateShipPreview(profile, status);

  if (profile.querySelector('.reward-board')) return;

  const earnedCount = earnedBadges(status).filter(badge => badge.earned).length;
  profile.insertAdjacentHTML('beforeend', `
    <section class="reward-board">
      <div class="reward-board-head">
        <div>
          <span>배지 자동 장착</span>
          <h2>획득 배지 ${earnedCount}/4</h2>
          <p>각 영역 실천을 10회 달성하면 배 그림 슬롯에 자동으로 배지가 표시됩니다.</p>
        </div>
      </div>
      ${badgeGrid(status)}
    </section>
  `);
}

function enhanceStats(status) {
  const profile = document.querySelector('.profile');
  if (!profile || !profile.querySelector('.sail-grid') || profile.querySelector('.stats-badge-board')) return;

  profile.insertAdjacentHTML('beforeend', `<section class="stats-badge-board">${badgeGrid(status)}</section>`);
}

function decorateShipPreview(profile, status) {
  const stage = profile.querySelector('.ship-profile > div:first-child');
  if (!stage) return;

  stage.classList.add('reward-ship-stage');

  const signature = earnedBadges(status).map(badge => `${badge.className}:${badge.earned ? 1 : 0}`).join('|');
  const hasSlots = Boolean(stage.querySelector('.ship-badge-slots') && stage.querySelector('.ship-badge-caption'));
  if (stage.dataset.badgeSignature === signature && hasSlots) return;

  stage.dataset.badgeSignature = signature;
  stage.querySelector('.ship-badge-slots')?.remove();
  stage.querySelector('.ship-badge-caption')?.remove();

  stage.insertAdjacentHTML('beforeend', `
    <div class="ship-badge-slots" aria-hidden="true">
      ${badgeSlots(status)}
    </div>
    <div class="ship-badge-caption">배지는 자동으로 채워집니다</div>
  `);
}

function badgeSlots(status) {
  return earnedBadges(status).map(badge => `
    <div class="ship-badge-slot ${badge.className} ${badge.earned ? 'earned' : 'locked'}">
      <b>${badge.earned ? badge.icon : '·'}</b>
      <small>${badge.short}</small>
    </div>
  `).join('');
}

function badgeStrip(status) {
  const badges = earnedBadges(status);
  return `<div class="badge-strip">${badges.map(badge => `<span class="mini-badge ${badge.className} ${badge.earned ? 'earned' : 'locked'}">${badge.earned ? badge.icon : '·'}</span>`).join('')}</div>`;
}

function badgeGrid(status) {
  return `
    <div class="badge-grid">
      ${earnedBadges(status).map(badge => `
        <article class="badge-card ${badge.className} ${badge.earned ? 'earned' : 'locked'}">
          <div class="badge-mark">${badge.icon}</div>
          <div>
            <h3>${esc(badge.label)}</h3>
            <p>${esc(badge.help)}</p>
            <div class="badge-progress"><i style="width:${badge.progress}%"></i></div>
            <small>${badge.count}/10 ${badge.earned ? '획득 완료' : '진행 중'}</small>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function injectRewardStyles() {
  if (document.querySelector('#studentRewardStyles')) return;

  const style = document.createElement('style');
  style.id = 'studentRewardStyles';
  style.textContent = `
    .student-title-pill{display:inline-flex;width:max-content;margin-top:4px;border-radius:999px;background:#fff1cd;color:#8a5700;padding:5px 10px;font-size:13px;font-weight:900}
    .reward-home-panel{display:grid;gap:6px;margin:16px auto 0;max-width:520px;border:1px solid #d9e5f4;border-radius:16px;background:#f8fbff;padding:14px}
    .reward-home-panel strong{font-size:18px;color:#07192f}
    .reward-home-panel span{font-weight:800}
    .badge-strip-caption{font-size:13px;color:#60738d;font-weight:900}

    .badge-strip{display:flex;justify-content:center;gap:6px;min-height:30px}
    .mini-badge{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:999px;color:#fff;font-weight:950;box-shadow:0 8px 16px rgb(40 70 130 / 14%)}
    .mini-badge.locked{background:#cbd5e1;color:#64748b}
    .mini-badge.s.earned,.badge-card.s .badge-mark,.badge-card.s .badge-progress i,.ship-badge-slot.s.earned{background:#3b82f6}
    .mini-badge.a.earned,.badge-card.a .badge-mark,.badge-card.a .badge-progress i,.ship-badge-slot.a.earned{background:#f97316}
    .mini-badge.i.earned,.badge-card.i .badge-mark,.badge-card.i .badge-progress i,.ship-badge-slot.i.earned{background:#a855f7}
    .mini-badge.l.earned,.badge-card.l .badge-mark,.badge-card.l .badge-progress i,.ship-badge-slot.l.earned{background:#22c55e}

    .reward-board,.stats-badge-board{margin-top:18px;border-top:1px solid #d9e5f4;padding-top:18px}
    .reward-board-head h2{margin:4px 0 6px;font-size:28px;color:#07192f}
    .reward-board-head p{margin:0;color:#60738d;font-weight:800;line-height:1.45}

    .badge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .badge-card{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center;border:1px solid #d9e5f4;border-radius:16px;background:#fff;padding:13px;text-align:left}
    .badge-card.locked{opacity:.62}
    .badge-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:#fff;font-size:24px;font-weight:950}
    .badge-card h3{margin:0 0 4px;font-size:17px}
    .badge-card p{margin:0 0 8px;font-size:13px;line-height:1.35}
    .badge-card small{font-weight:900}
    .badge-progress{height:9px;border-radius:999px;background:#e9f0f7;overflow:hidden;margin-bottom:5px}
    .badge-progress i{display:block;height:100%;border-radius:inherit}

    .reward-ship-stage{position:relative;overflow:hidden;border-radius:18px;padding-bottom:42px}
    .ship-badge-slots{position:absolute;inset:0;pointer-events:none;z-index:3}
    .ship-badge-slot{position:absolute;display:grid;justify-items:center;align-content:center;width:74px;height:74px;border-radius:18px;color:#fff;font-weight:900;box-shadow:0 10px 20px rgb(15 23 42 / 16%)}
    .ship-badge-slot.locked{background:#cbd5e1;color:#64748b;box-shadow:none}
    .ship-badge-slot b{font-size:28px;line-height:1}
    .ship-badge-slot small{font-size:11px}
    .ship-badge-slot.s{top:8px;left:8px}
    .ship-badge-slot.a{top:8px;right:8px}
    .ship-badge-slot.i{bottom:50px;left:8px}
    .ship-badge-slot.l{bottom:50px;right:8px}
    .ship-badge-caption{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:94%;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.9);color:#475569;font-size:12px;font-weight:900;z-index:3}

    @media(max-width:720px){
      .badge-grid{grid-template-columns:1fr}
      .badge-card{grid-template-columns:46px 1fr}
      .badge-mark{width:46px;height:46px}
      .ship-badge-slot{width:58px;height:58px;border-radius:14px}
      .ship-badge-slot b{font-size:22px}
      .ship-badge-slot small{font-size:10px}
      .ship-badge-slot.i,.ship-badge-slot.l{bottom:54px}
      .reward-board-head h2{font-size:22px}
    }
  `;

  document.head.appendChild(style);
}
