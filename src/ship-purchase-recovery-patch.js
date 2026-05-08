import { buyShip, getStudentHome, setEquippedShip } from './api.js';

const SHIP_STATUS_ERROR = /학생\s*상태\s*정보가\s*없습니다/i;

document.addEventListener('click', function(event) {
  const target = event.target;
  if (!target || typeof target.closest !== 'function') return;

  const buyButton = target.closest('[data-buy-ship]');
  const equipButton = target.closest('[data-equip-ship]');
  if (!buyButton && !equipButton) return;
  if (!document.querySelector('.ship-shop')) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (buyButton) handleBuy(buyButton);
  if (equipButton) handleEquip(equipButton);
}, true);

async function handleBuy(button) {
  await withBusy(button, '구매 중...', async function() {
    const studentId = requireStudentId();
    const shipId = button.dataset.buyShip;
    const result = await runWithRecovery(function() {
      return buyShip(studentId, shipId);
    }, studentId);

    assertSuccess(result, '구매하지 못했습니다.');
    window.location.reload();
  });
}

async function handleEquip(button) {
  await withBusy(button, '선택 중...', async function() {
    const studentId = requireStudentId();
    const shipId = button.dataset.equipShip;
    const result = await runWithRecovery(function() {
      return setEquippedShip(studentId, shipId);
    }, studentId);

    assertSuccess(result, '선택하지 못했습니다.');
    window.location.reload();
  });
}

function requireStudentId() {
  const studentId = localStorage.getItem('SAIL_STUDENT_ID') || '';
  if (!studentId) {
    throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.');
  }
  return studentId;
}

async function runWithRecovery(task, studentId) {
  const first = await safely(task);
  if (first.ok) return first.value;

  await refreshHome(studentId);

  const second = await safely(task);
  if (second.ok) return second.value;

  throw new Error(helpMessage(second.message || first.message));
}

async function refreshHome(studentId) {
  try {
    await getStudentHome(studentId, localStorage.getItem('SAIL_LOGIN_CODE') || '');
  } catch {
    // Ignore: this is a best-effort recovery step.
  }
}

async function safely(task) {
  try {
    const value = await task();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, message: error && error.message ? error.message : '' };
  }
}

function assertSuccess(result, fallbackMessage) {
  if (result && result.ok === false) {
    throw new Error(helpMessage(result.message || fallbackMessage));
  }
}

function helpMessage(message) {
  const text = String(message || '').trim();
  if (!text) return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

  if (SHIP_STATUS_ERROR.test(text)) {
    return text + '\n\n관리자에게 Supabase SQL의 `supabase/ship-purchase-fix.sql` 적용을 요청해 주세요.';
  }

  return text;
}

async function withBusy(button, label, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try {
    await task();
  } catch (error) {
    alert(error && error.message ? error.message : '오류가 발생했습니다.');
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}
