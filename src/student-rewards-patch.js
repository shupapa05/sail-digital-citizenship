const STATUS_KEY = 'SAIL_REWARD_STATUS';
const STUDENT_KEY = 'SAIL_REWARD_STUDENT';

const BADGES = [
  { key: 's_count', code: 'S', label: '안전 배지', className: 's', icon: 'S', help: '위험한 상황을 멈추고 확인한 기록' },
  { key: 'a_count', code: 'A', label: '책임 배지', className: 'a', icon: 'A', help: '올리기 전 한 번 더 생각한 기록' },
  { key: 'i_count', code: 'I', label: '윤리 배지', className: 'i', icon: 'I', help: '자료의 출처와 권리를 확인한 기록' },
  { key: 'l_count', code: 'L', label: '소통 배지', className: 'l', icon: 'L', help: '상대의 말을 끝까지 읽고 이해한 기록' }
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[ch]));

injectRewardStyles();
wrapFetchForRewards();
observeStudentScreens();
setTimeout(enhanceStudentScreens, 300);

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

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || {}; } catch { return {}; }
}

function getStatus() {
  return readJson(STATUS_KEY);
}

function getStudent() {
  return readJson(STUDENT_KEY);
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
      progress: Math.min(100, Math.round(count / 10 * 100))
    };
  });
}

function activeTitle(status) {
  const counts = earnedBadges(status);
  const total = Number(status.total_score || 0);
  const streak = Number(status.streak || 0);
  const level = Number(status.level || 1);
  const top = [...counts].sort((a, b) => b.count - a.count)[0];

  if (streak >= 10) return { name: '꾸준한 항해사', note: '연속 실천으로 얻은 칭호' };
  if (total >= 120 || level >= 5) return { name: '디지털 선장', note: '높은 점수로 얻은 칭호' };
  if (top?.count >= 10) return { name: `${top.label.replace(' 배지', '')} 항해사`, note: `${top.label} 완성으로 얻은 칭호` };
  if (total >= 50) return { name: '성장 항해사', note: '꾸준히 기록하며 얻은 칭호' };
  return { name: '새싹 항해사', note: '미션을 기록하며 성장 중' };
}

function decorationState(status) {
  const badgeCount = earnedBadges(status).filter(badge => badge.earned).length;
  return {
    flag: Number(status.level || 1) >= 2,
    glow: Number(status.streak || 0) >= 3,
    ribbon: badgeCount > 0,
    badgeCount
  };
}

function observeStudentScreens() {
  const app = document.querySelector('#app');
  if (!app) return;
  const observer = new MutationObserver(() => enhanceStudentScreens());
  observer.observe(app, { childList: true, subtree: true });
}

function enhanceStudentScreens() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;
  const status = getStatus();
  if (!Object.keys(status).length) return;

  enhanceTopbar(status);
  enhanceHome(status);
  enhanceInfo(status);
  enhanceStats(status);
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
  home.querySelector('.reward-row')?.insertAdjacentHTML('afterend', `
    <div class="reward-home-panel">
      <strong>${esc(title.name)}</strong>
      <span>${esc(title.note)}</span>
      ${badgeStrip(status)}
    </div>
  `);
}

function enhanceInfo(status) {
  const profile = document.querySelector('.profile');
  if (!profile || profile.querySelector('.reward-board')) return;
  decorateShipPreview(profile, status);
  const title = activeTitle(status);

  profile.insertAdjacentHTML('beforeend', `
    <section class="reward-board">
      <div class="reward-board-head">
        <div>
          <span>현재 칭호</span>
          <h2>${esc(title.name)}</h2>
          <p>${esc(title.note)} · 이름 아래에 표시됩니다.</p>
        </div>
        <div class="reward-coin-note">코인으로 산 배는 내 배 모습에 바로 적용됩니다.</div>
      </div>
      <div class="reward-benefit-grid">
        <div><strong>배 꾸미기</strong><span>구매한 배를 선택하면 대표 배 이미지가 바뀝니다.</span></div>
        <div><strong>칭호</strong><span>성장 상태를 이름 아래에 보여 주는 표시입니다.</span></div>
        <div><strong>배지</strong><span>SAIL 네 영역을 얼마나 실천했는지 한눈에 보여 줍니다.</span></div>
      </div>
      ${badgeGrid(status)}
    </section>
  `);

  enhanceShopCopy();
}

function enhanceStats(status) {
  const profile = document.querySelector('.profile');
  if (!profile || !profile.querySelector('.sail-grid') || profile.querySelector('.stats-badge-board')) return;
  profile.insertAdjacentHTML('beforeend', `<section class="stats-badge-board">${badgeGrid(status)}</section>`);
}

function decorateShipPreview(profile, status) {
  const image = profile.querySelector('.ship-image, .ship-placeholder');
  if (!image || image.parentElement?.classList.contains('reward-ship-stage')) return;
  const stage = image.parentElement;
  const deco = decorationState(status);
  stage.classList.add('reward-ship-stage');
  stage.insertAdjacentHTML('beforeend', `
    <div class="ship-decoration-layer" aria-hidden="true">
      ${deco.flag ? '<span class="ship-deco flag">Lv</span>' : ''}
      ${deco.glow ? '<span class="ship-deco glow"></span>' : ''}
      ${deco.ribbon ? `<span class="ship-deco ribbon">배지 ${deco.badgeCount}</span>` : ''}
    </div>
    <div class="ship-decoration-caption">레벨 깃발 · 연속 실천 빛 · 배지 리본이 배 꾸미기로 표시됩니다.</div>
  `);
}

function enhanceShopCopy() {
  const shop = document.querySelector('.ship-shop');
  if (!shop || shop.querySelector('.shop-use-note')) return;
  shop.querySelector('.section-head')?.insertAdjacentHTML('afterend', `
    <div class="shop-use-note">
      코인을 모아 배를 구매하고 선택하면, 내 정보의 배 모습과 꾸미기 효과가 함께 바뀝니다.
    </div>
  `);
}

function badgeStrip(status) {
  const badges = earnedBadges(status).filter(badge => badge.earned).slice(0, 4);
  if (!badges.length) return '<div class="badge-strip muted">배지를 모으는 중</div>';
  return `<div class="badge-strip">${badges.map(badge => `<span class="mini-badge ${badge.className}">${badge.icon}</span>`).join('')}</div>`;
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
            <small>${badge.count}/10 ${badge.earned ? '획득' : '진행 중'}</small>
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
    .reward-home-panel strong{font-size:18px;color:#07192f}.reward-home-panel span{font-weight:800}
    .badge-strip{display:flex;justify-content:center;gap:6px;min-height:30px}.badge-strip.muted{color:#60738d;font-weight:800}
    .mini-badge{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:999px;color:#fff;font-weight:950;box-shadow:0 8px 16px rgb(40 70 130 / 14%)}
    .mini-badge.s,.badge-card.s .badge-mark,.badge-card.s .badge-progress i{background:#3b82f6}.mini-badge.a,.badge-card.a .badge-mark,.badge-card.a .badge-progress i{background:#f97316}.mini-badge.i,.badge-card.i .badge-mark,.badge-card.i .badge-progress i{background:#a855f7}.mini-badge.l,.badge-card.l .badge-mark,.badge-card.l .badge-progress i{background:#22c55e}
    .reward-board,.stats-badge-board{margin-top:18px;border-top:1px solid #d9e5f4;padding-top:18px}.reward-board-head{display:flex;justify-content:space-between;gap:14px;align-items:start}.reward-board-head h2{margin:4px 0 6px;font-size:28px}.reward-coin-note,.shop-use-note{border-radius:16px;background:#fff7ed;color:#9a5a00;padding:12px 14px;font-weight:900;line-height:1.45}.shop-use-note{margin:-6px 0 14px}
    .reward-benefit-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}.reward-benefit-grid div{background:#f8fbff;border:1px solid #d9e5f4;border-radius:16px;padding:13px}.reward-benefit-grid strong{display:block;color:#07192f;margin-bottom:5px}.reward-benefit-grid span{font-size:13px;line-height:1.45}
    .badge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.badge-card{display:grid;grid-template-columns:52px 1fr;gap:12px;align-items:center;border:1px solid #d9e5f4;border-radius:16px;background:white;padding:13px;text-align:left}.badge-card.locked{opacity:.62}.badge-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;color:#fff;font-size:24px;font-weight:950}.badge-card h3{margin:0 0 4px;font-size:17px}.badge-card p{margin:0 0 8px;font-size:13px;line-height:1.35}.badge-card small{font-weight:900}.badge-progress{height:9px;border-radius:999px;background:#e9f0f7;overflow:hidden;margin-bottom:5px}.badge-progress i{display:block;height:100%;border-radius:inherit}
    .reward-ship-stage{position:relative}.ship-decoration-layer{position:absolute;inset:0;pointer-events:none}.ship-deco{position:absolute;display:grid;place-items:center;font-weight:950}.ship-deco.flag{top:8px;right:20%;width:42px;height:32px;border-radius:9px 9px 9px 2px;background:#3264df;color:#fff;box-shadow:0 8px 18px rgb(50 100 223 / 20%)}.ship-deco.glow{left:50%;bottom:54px;width:220px;height:28px;max-width:72%;transform:translateX(-50%);border-radius:999px;background:radial-gradient(circle,#fef08a 0%,rgba(254,240,138,.25) 55%,transparent 75%);mix-blend-mode:multiply}.ship-deco.ribbon{left:50%;bottom:16px;transform:translateX(-50%);border-radius:999px;background:#fff1cd;color:#8a5700;padding:6px 12px;box-shadow:0 8px 18px rgb(80 60 20 / 12%)}.ship-decoration-caption{margin-top:6px;color:#60738d;font-size:13px;font-weight:800}
    @media(max-width:720px){.reward-board-head,.reward-benefit-grid,.badge-grid{grid-template-columns:1fr;display:grid}.reward-board-head{gap:10px}.badge-card{grid-template-columns:46px 1fr}.badge-mark{width:46px;height:46px}.reward-coin-note{width:100%}}
  `;
  document.head.appendChild(style);
}
