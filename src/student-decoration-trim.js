const HIDDEN_DECOR_NAMES = new Set(['장식 없음', '항구 깃발', '기본 바다']);
const ACTIVE_KEY = 'SAIL_DECOR_ACTIVE';
const OWNED_KEY = 'SAIL_DECOR_OWNED';

normalizeTrimmedDecor();
trimDecorCards();
new MutationObserver(trimDecorCards).observe(document.body, { childList: true, subtree: true });

function normalizeTrimmedDecor() {
  const active = localStorage.getItem(ACTIVE_KEY);
  if (!active || active === 'clear') localStorage.setItem(ACTIVE_KEY, 'stars');
  if (active === 'harbor') localStorage.setItem(ACTIVE_KEY, 'stars');

  try {
    const owned = JSON.parse(localStorage.getItem(OWNED_KEY) || '[]');
    const next = Array.isArray(owned) ? owned.filter(id => id !== 'clear' && id !== 'harbor') : [];
    if (!next.includes('stars')) next.push('stars');
    localStorage.setItem(OWNED_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(OWNED_KEY, JSON.stringify(['stars']));
  }
}

function trimDecorCards() {
  document.querySelectorAll('.decor-card').forEach(card => {
    const title = card.querySelector('h3')?.textContent?.trim() || '';
    if (HIDDEN_DECOR_NAMES.has(title)) card.remove();
  });

  document.querySelectorAll('.ship-decoration-caption').forEach(caption => {
    const text = caption.textContent || '';
    if (text.includes('장식 없음') || text.includes('기본 바다') || text.includes('항구 깃발')) {
      caption.textContent = '현재 장식: 별빛 항로';
    }
  });

  const grid = document.querySelector('.decor-grid');
  if (grid && !grid.querySelector('.decor-card')) {
    grid.insertAdjacentHTML('beforeend', '<p class="empty">표시할 장식이 없습니다.</p>');
  }
}
