import { getStudentHome } from './api.js';

const PATCH_KEY = '__SAIL_INFO_COIN_PATCHED__';

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  injectStyle();
  observeInfoPage();
  setTimeout(() => {
    enhanceInfoPage();
  }, 300);
}

let fetchingCoin = false;

function injectStyle() {
  if (document.querySelector('#infoCoinPatchStyles')) return;

  const style = document.createElement('style');
  style.id = 'infoCoinPatchStyles';
  style.textContent = `
    .info-coin-chip{display:inline-flex;align-items:center;justify-content:center;width:max-content;margin:0 auto;border:1px solid #fed7aa;background:#fff7ed;color:#9a3412;border-radius:999px;padding:7px 12px;font-weight:900;font-size:14px}
  `;

  document.head.appendChild(style);
}

function readRewardStatus() {
  try {
    return JSON.parse(localStorage.getItem('SAIL_REWARD_STATUS') || 'null') || {};
  } catch {
    return {};
  }
}

function parseCoin(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function currentCoinFromLocal() {
  const status = readRewardStatus();
  const coin = parseCoin(status?.coin);
  if (coin !== null) return coin;

  const raw = localStorage.getItem('SAIL_LAST_COIN');
  return parseCoin(raw);
}

async function currentCoinFromServer() {
  const studentId = String(localStorage.getItem('SAIL_STUDENT_ID') || '').trim();
  if (!studentId) return null;

  try {
    const loginCode = String(localStorage.getItem('SAIL_LOGIN_CODE') || '').trim();
    const res = await getStudentHome(studentId, loginCode);
    const coin = parseCoin(res?.status?.coin);

    if (coin !== null) {
      localStorage.setItem('SAIL_LAST_COIN', String(coin));
      const status = readRewardStatus();
      status.coin = coin;
      localStorage.setItem('SAIL_REWARD_STATUS', JSON.stringify(status));
    }

    return coin;
  } catch {
    return null;
  }
}

function findInfoCard() {
  return document.querySelector('.profile .level-progress-card');
}

function upsertCoinChip(card, coin) {
  if (!card) return;
  if (coin === null) return;

  let chip = card.querySelector('.info-coin-chip');
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'info-coin-chip';

    const anchor = card.querySelector('strong');
    if (anchor && anchor.nextSibling) {
      card.insertBefore(chip, anchor.nextSibling);
    } else {
      card.appendChild(chip);
    }
  }

  chip.textContent = `보유 코인 ${coin}개`;
}

async function enhanceInfoPage() {
  const card = findInfoCard();
  if (!card) return;

  const localCoin = currentCoinFromLocal();
  if (localCoin !== null) {
    upsertCoinChip(card, localCoin);
    return;
  }

  if (fetchingCoin) return;
  fetchingCoin = true;

  try {
    const serverCoin = await currentCoinFromServer();
    upsertCoinChip(card, serverCoin);
  } finally {
    fetchingCoin = false;
  }
}

function observeInfoPage() {
  new MutationObserver(() => {
    setTimeout(() => {
      enhanceInfoPage();
    }, 50);
  }).observe(document.body, { childList: true, subtree: true });
}
