const logoutCss = `
.teacher-logout-bar{display:flex;justify-content:flex-end;margin:0 0 12px}
.teacher-logout-btn{background:#ef4444!important;color:#fff!important;border:0!important;border-radius:14px!important;min-height:46px!important;padding:10px 18px!important;font-weight:950!important}
@media(max-width:720px){.teacher-logout-bar{justify-content:stretch}.teacher-logout-btn{width:100%}}
`;
const st = document.createElement('style');
st.textContent = logoutCss;
document.head.appendChild(st);

function teacherLogout() {
  localStorage.removeItem('SAIL_ROLE');
  localStorage.removeItem('SAIL_CLASS_CODE');
  localStorage.removeItem('SAIL_STUDENT_ID');
  localStorage.removeItem('SAIL_LOGIN_CODE');
  location.reload();
}

function addTeacherLogout() {
  const dash = document.querySelector('.teacher-dashboard');
  if (!dash || document.querySelector('.teacher-logout-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'teacher-logout-bar';
  bar.innerHTML = '<button type="button" class="teacher-logout-btn">로그아웃</button>';
  dash.insertAdjacentElement('beforebegin', bar);
  bar.querySelector('button').addEventListener('click', teacherLogout);
}

new MutationObserver(addTeacherLogout).observe(document.body, { childList: true, subtree: true });
setInterval(addTeacherLogout, 1000);
