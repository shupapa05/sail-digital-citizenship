const STATUS_KEY = 'SAIL_REWARD_STATUS';
const STUDENT_KEY = 'SAIL_REWARD_STUDENT';

const BADGE_STEPS = [5, 10, 15, 20];
const BADGE_LEVEL_LABELS = ['잠금', '브론즈', '실버', '골드', '플래티넘'];

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

function getBadgeLevel(count) {
  if (count >= BADGE_STEPS[3]) return 4;
  if (count >= BADGE_STEPS[2]) return 3;
  if (count >= BADGE_STEPS[1]) return 2;
  if (count >= BADGE_STEPS[0]) return 1;
  return 0;
}

function nextTargetForLevel(level) {
  if (level >= 4) return null;
  return BADGE_STEPS[level];
}

function levelProgress(count, level) {
  if (level >= 4) return 100;

  const prev = level === 0 ? 0 : BADGE_STEPS[level - 1];
  const next = BADGE_STEPS[level];
  const value = Math.max(0, Math.min(next, count));
  return Math.round(((value - prev) / (next - prev)) * 100);
}

function earnedBadges(status) {
  return BADGES.map(badge => {
    const count = countOf(status, badge.key);
    const level = getBadgeLevel(count);
    const nextTarget = nextTargetForLevel(level);

    return {
      ...badge,
      count,
      level,
      levelName: BADGE_LEVEL_LABELS[level],
      earned: level > 0,
      maxed: level === 4,
      nextTarget,
      progress: Math.min(100, Math.round((Math.max(0, count) / BADGE_STEPS[3]) * 100)),
      tierProgress: levelProgress(count, level)
    };
  });
}

function activeTitle(status) {
  const badges = earnedBadges(status);
  const top = [...badges].sort((a, b) => (b.level - a.level) || (b.count - a.count))[0];
  const total = Number(status.total_score || 0);
  const totalLevel = badges.reduce((sum, badge) => sum + badge.level, 0);

  if (totalLevel >= 14) return { name: '배지 마스터 선장', note: '네 영역 배지를 최고 단계에 가깝게 달성했어요' };
  if (top?.level === 4) return { name: `${top.short} 플래티넘 항해사`, note: `${top.short} 영역 Lv.4를 달성했어요` };
  if (total >= 120) return { name: '디지털 선장', note: '높은 점수와 실천으로 얻은 칭호' };
  if (totalLevel >= 8) return { name: '성장 항해사', note: '배지 레벨이 빠르게 오르고 있어요' };
  if (totalLevel >= 4) return { name: '꾸준한 항해사', note: '꾸준한 참여로 배지를 모으는 중' };
  return { name: '새싹 항해사', note: '첫 배지 레벨을 향해 출발' };
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
  const badges = earnedBadges(status);
  const earnedCount = badges.filter(badge => badge.earned).length;
  const totalLevel = badges.reduce((sum, badge) => sum + badge.level, 0);

  home.querySelector('.reward-row')?.insertAdjacentHTML('afterend', `
    <div class="reward-home-panel">
      <strong>${esc(title.name)}</strong>
      <span>${esc(title.note)}</span>
      <div class="badge-strip-caption">획득 영역 ${earnedCount}/4 · 배지 레벨 합 ${totalLevel}/16</div>
      ${badgeStrip(status)}
    </div>
  `);
}

function enhanceInfo(status) {
  const profile = document.querySelector('.profile');
  if (!profile) return;

  decorateShipPreview(profile, status);

  if (profile.querySelector('.reward-board')) return;

  const badges = earnedBadges(status);
  const earnedCount = badges.filter(badge => badge.earned).length;
  const totalLevel = badges.reduce((sum, badge) => sum + badge.level, 0);

  profile.insertAdjacentHTML('beforeend', `
    <section class="reward-board">
      <div class="reward-board-head">
        <div>
          <span>4단계 배지 자동 장착</span>
          <h2>영역 ${earnedCount}/4 · 레벨 합 ${totalLevel}/16</h2>
          <p>각 영역 실천 횟수 5/10/15/20회에 도달하면 배지가 Lv.1→Lv.4로 자동 업그레이드됩니다.</p>
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

  const signature = earnedBadges(status).map(badge => `${badge.className}:${badge.level}`).join('|');
  const hasSlots = Boolean(stage.querySelector('.ship-badge-slots') && stage.querySelector('.ship-badge-caption'));
  if (stage.dataset.badgeSignature === signature && hasSlots) return;

  stage.dataset.badgeSignature = signature;
  stage.querySelector('.ship-badge-slots')?.remove();
  stage.querySelector('.ship-badge-caption')?.remove();

  stage.insertAdjacentHTML('beforeend', `
    <div class="ship-badge-slots" aria-hidden="true">
      ${badgeSlots(status)}
    </div>
    <div class="ship-badge-caption">배지는 5·10·15·20회 기준으로 자동 레벨업됩니다</div>
  `);
}

function badgeSlots(status) {
  return earnedBadges(status).map(badge => `
    <div class="ship-badge-slot ${badge.className} tier-${badge.level}">
      <b>${badge.earned ? badge.icon : '·'}</b>
      <small>${badge.short}</small>
      <em>Lv.${badge.level}</em>
    </div>
  `).join('');
}

function badgeStrip(status) {
  const badges = earnedBadges(status);
  return `<div class="badge-strip">${badges.map(badge => `
    <span class="mini-badge ${badge.className} tier-${badge.level}">
      <b>${badge.earned ? badge.icon : '·'}</b>
      <i>${badge.level}</i>
    </span>
  `).join('')}</div>`;
}

function badgeGrid(status) {
  return `
    <div class="badge-grid">
      ${earnedBadges(status).map(badge => `
        <article class="badge-card ${badge.className} tier-${badge.level}">
          <div class="badge-mark ${badge.className} tier-${badge.level}">${badge.icon}</div>
          <div>
            <h3>${esc(badge.label)} <span class="badge-level-name">${badge.levelName}</span></h3>
            <p>${esc(badge.help)}</p>
            <div class="badge-progress"><i style="width:${badge.progress}%"></i></div>
            <small>
              ${badge.count}회 · Lv.${badge.level}/4
              ${badge.maxed ? '· 최고 단계 달성' : `· 다음 Lv.${badge.level + 1} (${badge.nextTarget}회)`}
            </small>
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

    .badge-strip{display:flex;justify-content:center;gap:8px;min-height:34px}
    .mini-badge{position:relative;display:inline-grid;place-items:center;width:34px;height:34px;border-radius:999px;color:#fff;font-weight:950;box-shadow:0 8px 16px rgb(40 70 130 / 14%)}
    .mini-badge b{font-size:14px;line-height:1}
    .mini-badge i{position:absolute;right:-4px;bottom:-4px;display:grid;place-items:center;width:16px;height:16px;border-radius:999px;background:#0f172a;color:#fff;font-style:normal;font-size:10px;font-weight:900}

    .reward-board,.stats-badge-board{margin-top:18px;border-top:1px solid #d9e5f4;padding-top:18px}
    .reward-board-head h2{margin:4px 0 6px;font-size:28px;color:#07192f}
    .reward-board-head p{margin:0;color:#60738d;font-weight:800;line-height:1.45}

    .badge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .badge-card{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center;border:1px solid #d9e5f4;border-radius:16px;background:#fff;padding:13px;text-align:left}
    .badge-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:#fff;font-size:24px;font-weight:950}
    .badge-card h3{margin:0 0 4px;font-size:17px;display:flex;align-items:center;gap:8px}
    .badge-level-name{font-size:12px;color:#334155;background:#e2e8f0;padding:2px 8px;border-radius:999px}
    .badge-card p{margin:0 0 8px;font-size:13px;line-height:1.35}
    .badge-card small{font-weight:900;color:#475569}
    .badge-progress{height:9px;border-radius:999px;background:#e9f0f7;overflow:hidden;margin-bottom:5px}
    .badge-progress i{display:block;height:100%;border-radius:inherit}

    .reward-ship-stage{position:relative;overflow:hidden;border-radius:18px;padding-bottom:44px}
    .ship-badge-slots{position:absolute;inset:0;pointer-events:none;z-index:3}
    .ship-badge-slot{position:absolute;display:grid;justify-items:center;align-content:center;gap:2px;width:74px;height:74px;border-radius:18px;color:#fff;font-weight:900;box-shadow:0 10px 20px rgb(15 23 42 / 16%)}
    .ship-badge-slot b{font-size:24px;line-height:1}
    .ship-badge-slot small{font-size:11px}
    .ship-badge-slot em{font-style:normal;font-size:10px;background:rgba(15,23,42,.35);padding:1px 6px;border-radius:999px}
    .ship-badge-slot.s{top:8px;left:8px}
    .ship-badge-slot.a{top:8px;right:8px}
    .ship-badge-slot.i{bottom:52px;left:8px}
    .ship-badge-slot.l{bottom:52px;right:8px}
    .ship-badge-caption{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:94%;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.9);color:#475569;font-size:12px;font-weight:900;z-index:3}

    .mini-badge.s,.badge-mark.s,.ship-badge-slot.s,.badge-card.s .badge-progress i{background:#3b82f6}
    .mini-badge.a,.badge-mark.a,.ship-badge-slot.a,.badge-card.a .badge-progress i{background:#f97316}
    .mini-badge.i,.badge-mark.i,.ship-badge-slot.i,.badge-card.i .badge-progress i{background:#a855f7}
    .mini-badge.l,.badge-mark.l,.ship-badge-slot.l,.badge-card.l .badge-progress i{background:#22c55e}

    .tier-0{background:#cbd5e1 !important;color:#64748b !important;box-shadow:none !important}
    .tier-0 i,.ship-badge-slot.tier-0 em{background:#94a3b8 !important;color:#fff !important}
    .tier-1{outline:2px solid rgba(255,255,255,.35)}
    .tier-2{outline:2px solid rgba(255,255,255,.5);box-shadow:0 10px 20px rgb(15 23 42 / 20%),0 0 0 3px rgba(255,255,255,.18) inset}
    .tier-3{outline:2px solid #fde68a;box-shadow:0 10px 24px rgb(15 23 42 / 22%),0 0 16px rgba(250,204,21,.35)}
    .tier-4{outline:2px solid #f8fafc;box-shadow:0 12px 28px rgb(15 23 42 / 28%),0 0 18px rgba(255,255,255,.45)}
    .tier-4.badge-mark,.tier-4.ship-badge-slot,.tier-4.mini-badge{background:conic-gradient(from 140deg,#f8fafc,#fde68a,#f8fafc) !important;color:#334155 !important}

    .mini-badge.tier-1,.ship-badge-slot.tier-1,.badge-mark.tier-1{filter:saturate(.72) brightness(.92)}
    .mini-badge.tier-2,.ship-badge-slot.tier-2,.badge-mark.tier-2{filter:saturate(1.08) brightness(1.03)}
    .mini-badge.tier-3,.ship-badge-slot.tier-3,.badge-mark.tier-3{filter:saturate(1.2) brightness(1.1)}

    .badge-card.tier-0 .badge-level-name{background:#e2e8f0;color:#64748b}
    .badge-card.tier-1 .badge-level-name{background:#fef3c7;color:#92400e}
    .badge-card.tier-2 .badge-level-name{background:#dbeafe;color:#1d4ed8}
    .badge-card.tier-3 .badge-level-name{background:#fef9c3;color:#854d0e}
    .badge-card.tier-4 .badge-level-name{background:#ede9fe;color:#5b21b6}

    @media(max-width:720px){
      .badge-grid{grid-template-columns:1fr}
      .badge-card{grid-template-columns:46px 1fr}
      .badge-mark{width:46px;height:46px}
      .ship-badge-slot{width:58px;height:58px;border-radius:14px}
      .ship-badge-slot b{font-size:20px}
      .ship-badge-slot small{font-size:10px}
      .ship-badge-slot em{font-size:9px}
      .ship-badge-slot.i,.ship-badge-slot.l{bottom:54px}
      .reward-board-head h2{font-size:22px}
    }
  `;

  document.head.appendChild(style);
}
