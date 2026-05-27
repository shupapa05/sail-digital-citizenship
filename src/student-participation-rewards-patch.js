const HOME_CACHE_KEY = 'SAIL_PARTICIPATION_HOME_CACHE_V1';
const BONUS_CACHE_KEY = 'SAIL_LAST_REWARD_BONUS_V1';

const LEVEL_TARGETS = [25, 50, 80, 120, 170, 230, 300, 380, 470];

injectParticipationStyles();
wrapParticipationFetch();
watchParticipationUi();
setTimeout(enhanceParticipationUi, 300);

function injectParticipationStyles() {
  if (document.querySelector('#participationRewardStyles')) return;
  const style = document.createElement('style');
  style.id = 'participationRewardStyles';
  style.textContent = `
    .participation-panel{margin:14px auto 0;max-width:560px;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:14px;display:grid;gap:8px;text-align:left}
    .participation-panel strong{color:#7c2d12;font-size:18px}
    .participation-panel p{margin:0;color:#9a3412;font-weight:800;line-height:1.45}
    .participation-panel small{color:#415a77;font-weight:800}
    .treasure-panel{margin:16px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:16px;display:grid;gap:8px;text-align:left}
    .treasure-panel strong{color:#7c2d12;font-size:20px}
    .treasure-panel ul{margin:0;padding-left:18px;color:#9a3412;font-weight:900;line-height:1.55}
    .treasure-panel p{margin:0;color:#415a77;font-weight:800}
  `;
  document.head.appendChild(style);
}

function wrapParticipationFetch() {
  if (window.__SAIL_PARTICIPATION_REWARD_FETCH__) return;
  const originalFetch = window.fetch?.bind(window);
  if (!originalFetch) return;
  window.__SAIL_PARTICIPATION_REWARD_FETCH__ = true;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = String(args[0] || '');
    if (url.includes('/rpc/get_student_home') || url.includes('/rpc/login_student') || url.includes('/rpc/save_mission_result')) {
      response.clone().json().then(data => {
        if (data?.student && data?.status) localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data));
        if (data?.reward_bonus) localStorage.setItem(BONUS_CACHE_KEY, JSON.stringify(data.reward_bonus));
        setTimeout(enhanceParticipationUi, 80);
      }).catch(() => {});
    }
    return response;
  };
}

function watchParticipationUi() {
  new MutationObserver(enhanceParticipationUi).observe(document.body, { childList: true, subtree: true });
}

function readJson(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}

function nextLevelTarget(score) {
  return LEVEL_TARGETS.find(target => score < target) || null;
}

function currentLevel(score) {
  if (score >= 470) return 10;
  if (score >= 380) return 9;
  if (score >= 300) return 8;
  if (score >= 230) return 7;
  if (score >= 170) return 6;
  if (score >= 120) return 5;
  if (score >= 80) return 4;
  if (score >= 50) return 3;
  if (score >= 25) return 2;
  return 1;
}

function enhanceParticipationUi() {
  enhanceHomePanel();
  enhanceResultTreasure();
  enhanceLevelProgress();
}

function enhanceHomePanel() {
  const home = document.querySelector('.home-title-card');
  if (!home || home.querySelector('.participation-panel')) return;

  const data = readJson(HOME_CACHE_KEY);
  const status = data.status || {};
  const saved = Number(data.today_saved_count || 0);
  const limit = Number(data.daily_limit || 2);
  const streak = Number(status.streak || 0);
  const score = Number(status.total_score || 0);
  const next = nextLevelTarget(score);

  const title = saved > 0 ? '오늘 보물상자 획득 완료' : '오늘 첫 미션 보물상자 대기 중';
  const note = saved > 0
    ? `오늘 ${saved}/${limit}개 기록했어요. 내일도 이어가면 연속 항해 보너스를 노릴 수 있어요.`
    : '오늘 미션 1개만 기록해도 보물상자 +2코인을 바로 받을 수 있어요.';
  const levelText = next ? `현재 Lv.${currentLevel(score)} · 다음 레벨까지 ${next - score}점` : '현재 Lv.10 · 최고 항해 단계 도달';

  home.querySelector('.reward-row')?.insertAdjacentHTML('afterend', `
    <div class="participation-panel">
      <strong>${title}</strong>
      <p>${note}</p>
      <small>연속 항해 ${streak}일 · ${levelText}</small>
    </div>
  `);
}

function enhanceResultTreasure() {
  const result = document.querySelector('.result-card');
  if (!result || result.querySelector('.treasure-panel')) return;
  const heading = result.querySelector('h1')?.textContent || '';
  if (!heading.includes('기록 완료')) return;

  const bonus = readJson(BONUS_CACHE_KEY);
  const reasons = Array.isArray(bonus.reasons) ? bonus.reasons : [];
  const coinBonus = Number(bonus.coin_bonus || 0);
  if (!coinBonus && !reasons.length) return;

  result.querySelector('p')?.insertAdjacentHTML('afterend', `
    <div class="treasure-panel">
      <strong>보물상자 보상 획득</strong>
      <ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
      <p>미션 점수와 별도로 참여 보너스 코인이 추가됐어요.</p>
    </div>
  `);
  localStorage.removeItem(BONUS_CACHE_KEY);
}

function enhanceLevelProgress() {
  const card = document.querySelector('.level-progress-card');
  if (!card) return;

  const data = readJson(HOME_CACHE_KEY);
  const status = data.status || {};
  const score = Number(status.total_score || 0);
  const level = currentLevel(score);
  const next = nextLevelTarget(score);
  const prev = LEVEL_TARGETS[level - 2] || 0;
  const progress = next ? Math.max(0, Math.min(100, Math.round(((score - prev) / (next - prev)) * 100))) : 100;

  const label = card.querySelector('span');
  const strong = card.querySelector('strong');
  const bar = card.querySelector('.progress-track i');
  const smalls = card.querySelectorAll('small');

  if (label) label.textContent = next ? '다음 레벨까지' : '최고 레벨';
  if (strong) strong.textContent = next ? `${next - score}점` : 'Lv.10 도달';
  if (bar) bar.style.width = `${progress}%`;
  if (smalls[0]) smalls[0].textContent = `진행도 ${progress}% · Lv.${level}/10`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
