import { buyDecoration, setEquippedDecoration } from './api.js';

const STATUS_KEY = 'SAIL_REWARD_STATUS';
const STUDENT_KEY = 'SAIL_REWARD_STUDENT';
const DECOR_OWNED_KEY = 'SAIL_DECOR_OWNED';
const DECOR_ACTIVE_KEY = 'SAIL_DECOR_ACTIVE';

const DECOR_ITEMS = {
  clear: { price: 0 },
  lighthouse: { price: 8 },
  compass: { price: 12 },
  stars: { price: 18 },
  harbor: { price: 25 }
};

document.addEventListener('click', event => {
  const openButton = event.target.closest('[data-decor-open]');
  const selectButton = event.target.closest('[data-decor-select]');
  if (!openButton && !selectButton) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (openButton) handleOpen(openButton);
  if (selectButton) handleSelect(selectButton);
}, true);

async function handleOpen(button) {
  const decorationId = button.dataset.decorOpen;
  await withButton(button, '구매 중...', async () => {
    const student = readJson(STUDENT_KEY);
    if (!student.student_id) throw new Error('학생 정보를 다시 불러와 주세요.');

    try {
      const result = await buyDecoration(student.student_id, decorationId);
      applyServerResult(result, decorationId);
    } catch (error) {
      applyLocalPreview(decorationId, true);
      alert('Supabase에 장식 구매 SQL을 적용하면 코인이 실제로 차감됩니다. 지금은 이 기기에서 미리보기로 적용했어요.');
    }
    rerenderInfo();
  });
}

async function handleSelect(button) {
  const decorationId = button.dataset.decorSelect;
  await withButton(button, '선택 중...', async () => {
    const student = readJson(STUDENT_KEY);
    if (!student.student_id) {
      applyLocalPreview(decorationId, false);
      rerenderInfo();
      return;
    }

    try {
      const result = await setEquippedDecoration(student.student_id, decorationId);
      applyServerResult(result, decorationId);
    } catch {
      applyLocalPreview(decorationId, false);
    }
    rerenderInfo();
  });
}

function applyServerResult(result, decorationId) {
  const status = result?.status || result || {};
  if (Object.keys(status).length) localStorage.setItem(STATUS_KEY, JSON.stringify(status));
  const owned = normalizeOwned(status.owned_decoration_ids || status.ownedDecorationIds || getOwned());
  if (!owned.includes(decorationId)) owned.push(decorationId);
  localStorage.setItem(DECOR_OWNED_KEY, JSON.stringify(owned));
  localStorage.setItem(DECOR_ACTIVE_KEY, status.equipped_decoration_id || status.equippedDecorationId || decorationId);
}

function applyLocalPreview(decorationId, shouldSpend) {
  const owned = new Set(getOwned());
  owned.add(decorationId);
  localStorage.setItem(DECOR_OWNED_KEY, JSON.stringify([...owned]));
  localStorage.setItem(DECOR_ACTIVE_KEY, decorationId);

  if (shouldSpend) {
    const status = readJson(STATUS_KEY);
    const price = Number(DECOR_ITEMS[decorationId]?.price || 0);
    const currentCoin = Number(status.coin || 0);
    if (currentCoin >= price) {
      status.coin = currentCoin - price;
      status.owned_decoration_ids = [...owned];
      status.equipped_decoration_id = decorationId;
      localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    }
  }
}

function getOwned() {
  const status = readJson(STATUS_KEY);
  return normalizeOwned(status.owned_decoration_ids || status.ownedDecorationIds || readJson(DECOR_OWNED_KEY, ['clear']));
}

function normalizeOwned(value) {
  if (Array.isArray(value)) return value.map(String);
  return String(value || 'clear').split(',').map(item => item.trim()).filter(Boolean);
}

function readJson(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}

function rerenderInfo() {
  document.querySelector('.reward-board')?.remove();
  const stage = document.querySelector('.reward-ship-stage');
  stage?.classList.remove('reward-ship-stage', 'scene-clear', 'scene-lighthouse', 'scene-compass', 'scene-stars', 'scene-harbor');
  stage?.querySelector('.scene-decoration-layer')?.remove();
  stage?.querySelector('.ship-decoration-layer')?.remove();
  stage?.querySelector('.ship-decoration-caption')?.remove();

  const nav = [...document.querySelectorAll('[data-nav]')].find(button => button.dataset.nav === 'info');
  nav?.click();
}

async function withButton(button, label, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    await task();
  } catch (error) {
    alert(error.message || '처리하지 못했습니다.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
