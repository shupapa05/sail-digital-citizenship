const detailStyle = document.createElement('style');
detailStyle.textContent = `
.teacher-student-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.48);display:none;align-items:flex-end;justify-content:center;z-index:10000;padding:18px}
.teacher-student-modal-backdrop.open{display:flex}
.teacher-student-modal{width:min(560px,100%);background:#fff;border-radius:26px;padding:22px;box-shadow:0 28px 80px rgba(15,23,42,.32);display:grid;gap:14px}
.teacher-student-modal h2{margin:0;color:#07192f;font-size:24px}
.teacher-student-modal p{margin:0;color:#475569;line-height:1.6}
.teacher-student-info{display:grid;gap:8px;background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px}
.teacher-student-info b{color:#07192f}
.teacher-student-actions{display:grid;gap:8px;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:14px;color:#9a3412;font-weight:800;line-height:1.55}
.teacher-student-close{border:0;background:#3264df;color:#fff;border-radius:16px;padding:13px;font-weight:900;cursor:pointer}
.teacher-dashboard .teacher-table tbody tr{cursor:pointer}
.teacher-dashboard .teacher-table tbody tr:hover{background:#f8fbff}
.teacher-dashboard .not-participant-card small{cursor:pointer}
.teacher-dashboard .not-participant-card small:hover{text-decoration:underline}
@media(max-width:720px){.teacher-student-modal{padding:18px;border-radius:22px}.teacher-student-modal h2{font-size:21px}}
`;
document.head.appendChild(detailStyle);

function ensureStudentModal(){
  let modal = document.querySelector('[data-student-detail-modal]');
  if(modal) return modal;

  modal = document.createElement('div');
  modal.className = 'teacher-student-modal-backdrop';
  modal.setAttribute('data-student-detail-modal','1');
  modal.innerHTML = `
    <div class="teacher-student-modal" role="dialog" aria-modal="true">
      <h2 data-detail-title>학생 상세</h2>
      <p data-detail-desc>학생 정보를 확인합니다.</p>
      <div class="teacher-student-info" data-detail-info></div>
      <div class="teacher-student-actions">
        <b>교사 개입 순서</b>
        <span>1. 오늘 참여 여부를 짧게 확인합니다.</span>
        <span>2. 기기 문제인지, 활동 이해 문제인지 구분합니다.</span>
        <span>3. 필요한 경우 미션 1개만 함께 시작하게 안내합니다.</span>
      </div>
      <button type="button" class="teacher-student-close" data-student-detail-close>닫기</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if(event.target === modal || event.target.matches('[data-student-detail-close]')) modal.classList.remove('open');
  });
  return modal;
}

function openStudentModal({title, desc, info}){
  const modal = ensureStudentModal();
  modal.querySelector('[data-detail-title]').textContent = title || '학생 상세';
  modal.querySelector('[data-detail-desc]').textContent = desc || '학생 정보를 확인합니다.';
  modal.querySelector('[data-detail-info]').innerHTML = info || '';
  modal.classList.add('open');
}

function cleanStudentName(text){
  return String(text || '')
    .replace(/^\d+-\d+\s*/,'')
    .replace(/^\d+번\s*/,'')
    .trim();
}

function handleTableRow(row){
  const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
  if(!cells.length) return;

  const title = cleanStudentName(cells[0]) || '학생 상세';
  const isBadgeTable = row.closest('.teacher-card')?.querySelector('h2')?.textContent.includes('배지 진행도');

  if(isBadgeTable){
    openStudentModal({
      title,
      desc:'학생별 배지 진행도를 확인합니다.',
      info:`
        <span><b>안전</b> ${cells[1] || '-'}</span>
        <span><b>책임</b> ${cells[2] || '-'}</span>
        <span><b>윤리</b> ${cells[3] || '-'}</span>
        <span><b>소통</b> ${cells[4] || '-'}</span>
        <span><b>집중 필요</b> ${cells[5] || '-'}</span>
      `
    });
    return;
  }

  openStudentModal({
    title,
    desc:'학생별 개입 현황을 확인합니다.',
    info:`
      <span><b>상태</b> ${cells[1] || '-'}</span>
      <span><b>강점</b> ${cells[2] || '-'}</span>
      <span><b>보완</b> ${cells[3] || '-'}</span>
      <span><b>교사 행동</b> ${cells[4] || '-'}</span>
    `
  });
}

function handleRiskNames(card){
  const text = Array.from(card.querySelectorAll('small'))[0]?.textContent || '';
  const names = text.split(',').map(v => cleanStudentName(v)).filter(Boolean);
  if(!names.length) return;

  openStudentModal({
    title:`미참여 학생 ${names.length}명`,
    desc:'오늘 기록이 없는 학생 목록입니다.',
    info:names.map(name => `<span><b>${name}</b> 참여 여부 확인 필요</span>`).join('')
  });
}

document.addEventListener('click', event => {
  const row = event.target.closest?.('.teacher-dashboard .teacher-table tbody tr');
  if(row){
    handleTableRow(row);
    return;
  }

  const riskCard = event.target.closest?.('.teacher-dashboard .not-participant-card');
  if(riskCard){
    handleRiskNames(riskCard);
  }
});

document.addEventListener('keydown', event => {
  if(event.key === 'Escape') document.querySelector('[data-student-detail-modal]')?.classList.remove('open');
});
