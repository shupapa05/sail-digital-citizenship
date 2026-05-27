const STATUS_KEYS = ['SAIL_UNIFIED_SHOP_STATUS_V1', 'SAIL_REWARD_STATUS'];
const ACTIVE_ITEMS_KEY = 'SAIL_UNIFIED_SHOP_ACTIVE_ITEMS_V1';

const AREA_INFO = [
  { key: 's_count', code: 'S', label: '안전', className: 's', tip: '개인정보, 링크, 사진 공유 전에 한 번 더 확인해 보세요.' },
  { key: 'a_count', code: 'A', label: '책임', className: 'a', tip: '올리기 전 내 말과 행동이 남길 흔적을 생각해 보세요.' },
  { key: 'i_count', code: 'I', label: '윤리', className: 'i', tip: '자료의 출처와 다른 사람의 권리를 확인해 보세요.' },
  { key: 'l_count', code: 'L', label: '소통', className: 'l', tip: '상대의 마음을 상상하며 댓글과 대화를 골라 보세요.' }
];

const LEVEL_TARGETS = [25, 50, 80, 120, 170, 230, 300, 380, 470];
const BACKGROUND_TARGETS = [
  { level: 6, name: '새벽 안개' },
  { level: 7, name: '달빛 항로' },
  { level: 8, name: '오로라 바다' },
  { level: 9, name: '황금 노을' },
  { level: 10, name: '전설의 하늘' }
];

let benefitTimer = null;
let lastSignature = '';

injectItemBenefitStyles();
wrapBenefitFetch();
scheduleBenefits(350);
new MutationObserver(() => scheduleBenefits()).observe(document.querySelector('#app') || document.body, { childList: true });

function scheduleBenefits(delay = 120) {
  if (benefitTimer) clearTimeout(benefitTimer);
  benefitTimer = setTimeout(() => {
    benefitTimer = null;
    applyItemBenefits();
  }, delay);
}

function wrapBenefitFetch() {
  if (window.__SAIL_ITEM_BENEFIT_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_ITEM_BENEFIT_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/login_student') || url.includes('/rpc/get_student_home') || url.includes('/rpc/save_mission_result')) {
      response.clone().json().then(data => {
        if (data?.status) localStorage.setItem('SAIL_UNIFIED_SHOP_STATUS_V1', JSON.stringify(data.status));
        lastSignature = '';
        scheduleBenefits(80);
      }).catch(() => {});
    }
    return response;
  };
}

function applyItemBenefits() {
  if (localStorage.getItem('SAIL_ROLE') === 'teacher' || localStorage.getItem('SAIL_ROLE') === 'admin') return;

  const active = getActiveItems();
  const status = getStatus();
  if (!Object.keys(status).length) return;

  const screen = currentScreen();
  const signature = [screen, active.join(','), status.total_score, status.level, status.streak, status.s_count, status.a_count, status.i_count, status.l_count].join('|');
  if (signature === lastSignature) return;
  lastSignature = signature;

  clearStaleBenefits();
  if (active.includes('item_compass')) applyCompass(status);
  if (active.includes('item_lighthouse')) applyLighthouse(status);
  if (active.includes('item_telescope')) applyTelescope(status);
  if (active.includes('item_star_badge')) applyStarBadge();
}

function currentScreen() {
  if (document.querySelector('.mission-grid')) return 'missions';
  if (document.querySelector('.mission-form')) return 'mission-form';
  if (document.querySelector('.ship-profile')) return 'info';
  if (document.querySelector('.home-title-card')) return 'home';
  return 'other';
}

function clearStaleBenefits() {
  document.querySelectorAll('[data-item-benefit]').forEach(el => el.remove());
  document.querySelectorAll('.mission-card.item-recommended').forEach(el => el.classList.remove('item-recommended'));
}

function applyCompass(status) {
  const weak = weakestArea(status);
  const missionsHead = document.querySelector('.section-head');
  const missionGrid = document.querySelector('.mission-grid');
  const home = document.querySelector('.home-title-card');

  if (missionGrid) {
    const recommended = [...missionGrid.querySelectorAll('.mission-card')]
      .find(card => card.classList.contains(weak.className) && !card.disabled);
    recommended?.classList.add('item-recommended');
    missionsHead?.insertAdjacentHTML('afterend', benefitPanel('나침반 안내', `오늘은 ${weak.label} 영역을 보완해 보면 좋아요. ${weak.tip}`));
    return;
  }

  if (home) {
    home.insertAdjacentHTML('beforeend', benefitPanel('나침반 안내', `지금 가장 보완하면 좋은 영역은 ${weak.label}입니다. ${weak.tip}`));
  }
}

function applyLighthouse(status) {
  const home = document.querySelector('.home-title-card');
  if (!home) return;

  const streak = Number(status.streak || 0);
  const text = streak >= 7
    ? `등대가 연속 ${streak}일 항해를 지켜보고 있어요. 오늘도 한 번만 기록하면 흐름이 이어집니다.`
    : '등대가 오늘 첫 기록을 도와줘요. 미션 1개만 완료해도 오늘 참여 흐름을 만들 수 있습니다.';
  home.insertAdjacentHTML('beforeend', benefitPanel('등대 안내', text));
}

function applyTelescope(status) {
  const infoCard = document.querySelector('.level-progress-card');
  const home = document.querySelector('.home-title-card');
  const target = nextLevelTarget(Number(status.total_score || 0));
  const level = Number(status.level || 1);
  const nextBg = BACKGROUND_TARGETS.find(item => level < item.level);
  const levelText = target ? `다음 레벨까지 ${Math.max(0, target - Number(status.total_score || 0))}점 남았어요.` : '최고 레벨에 도달했어요.';
  const bgText = nextBg ? `다음 배경 목표는 Lv.${nextBg.level} ${nextBg.name}입니다.` : '모든 배경 목표를 열 수 있는 단계입니다.';
  const html = benefitPanel('망원경 안내', `${levelText} ${bgText}`);

  if (infoCard) infoCard.insertAdjacentHTML('afterend', html);
  else if (home) home.insertAdjacentHTML('beforeend', html);
}

function applyStarBadge() {
  const topbar = document.querySelector('.topbar div');
  if (topbar && !topbar.querySelector('.item-star-title')) {
    topbar.insertAdjacentHTML('beforeend', '<span class="student-title-pill item-star-title" data-item-benefit>별 항해자</span>');
  }

  const profile = document.querySelector('.ship-profile');
  if (profile) {
    profile.insertAdjacentHTML('beforeend', benefitPanel('별 배지', '내 프로필에 별 항해자 표시가 붙었어요. 꾸준히 참여한 나를 보여주는 아이템입니다.'));
  }
}

function benefitPanel(title, text) {
  return `<div class="item-benefit-panel" data-item-benefit><strong>${esc(title)}</strong><p>${esc(text)}</p></div>`;
}

function weakestArea(status) {
  return [...AREA_INFO].sort((a, b) => Number(status[a.key] || 0) - Number(status[b.key] || 0))[0];
}

function nextLevelTarget(score) {
  return LEVEL_TARGETS.find(target => score < target) || null;
}

function getActiveItems() {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_ITEMS_KEY) || '["item_compass"]');
    return Array.isArray(value) ? value : ['item_compass'];
  } catch {
    return ['item_compass'];
  }
}

function getStatus() {
  for (const key of STATUS_KEYS) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (value && typeof value === 'object') return value;
    } catch {}
  }
  return {};
}

function injectItemBenefitStyles() {
  if (document.querySelector('#itemBenefitStyles')) return;
  const style = document.createElement('style');
  style.id = 'itemBenefitStyles';
  style.textContent = `
    .item-benefit-panel{margin:12px auto 0;max-width:620px;border:1px solid #bfdbfe;border-radius:16px;background:#eff6ff;padding:12px 14px;text-align:left;color:#1e3a8a;box-shadow:0 8px 18px rgb(37 99 235 / 8%)}
    .item-benefit-panel strong{display:block;margin-bottom:4px;color:#1d4ed8;font-size:15px}.item-benefit-panel p{margin:0;font-weight:850;line-height:1.45}
    .mission-card.item-recommended{outline:4px solid rgba(250,204,21,.62);box-shadow:0 16px 28px rgb(250 204 21 / 18%),0 0 0 1px #facc15 inset;position:relative}
    .mission-card.item-recommended::after{content:"나침반 추천";position:absolute;right:10px;top:10px;border-radius:999px;background:#fef3c7;color:#92400e;padding:4px 8px;font-size:12px;font-weight:950}
    .item-star-title{background:#fef3c7!important;color:#92400e!important;border:1px solid #fcd34d}
    @media(max-width:720px){.item-benefit-panel{font-size:13px}.mission-card.item-recommended::after{position:static;display:inline-flex;width:max-content;margin-top:8px}}
  `;
  document.head.appendChild(style);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
