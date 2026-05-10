const PATCH_KEY = '__SAIL_DAILY_DATE_REFRESH_PATCHED__';
const STORAGE_KEY = 'SAIL_CURRENT_DATE_KST';

function todayKst() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function isStudentSession() {
  return localStorage.getItem('SAIL_ROLE') === 'student' &&
    Boolean(localStorage.getItem('SAIL_STUDENT_ID'));
}

function checkDateChanged() {
  if (!isStudentSession()) return;

  const today = todayKst();
  const savedDate = localStorage.getItem(STORAGE_KEY);

  if (!savedDate) {
    localStorage.setItem(STORAGE_KEY, today);
    return;
  }

  if (savedDate !== today) {
    localStorage.setItem(STORAGE_KEY, today);
    window.location.reload();
  }
}

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;

  localStorage.setItem(STORAGE_KEY, todayKst());

  window.addEventListener('focus', checkDateChanged);
  window.addEventListener('pageshow', checkDateChanged);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkDateChanged();
  });
  document.addEventListener('click', checkDateChanged, true);
  document.addEventListener('touchstart', checkDateChanged, true);

  setInterval(checkDateChanged, 60 * 1000);
}
