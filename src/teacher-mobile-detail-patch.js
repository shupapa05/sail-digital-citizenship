const css = `
@media(max-width:600px){
  .teacher-dashboard{gap:12px}
  .teacher-card{padding:14px;border-radius:16px}
  .teacher-top{padding:18px;gap:10px}
  .teacher-top h1{font-size:22px}
  .teacher-top p{font-size:13px}
  .teacher-summary{grid-template-columns:1fr 1fr;gap:10px}
  .teacher-box{padding:12px}
  .teacher-box strong{font-size:24px}
  .teacher-box span{font-size:13px}
  .teacher-grid{grid-template-columns:1fr;gap:12px}
  .teacher-alert strong{font-size:20px}
  .teacher-alert p{font-size:13px;line-height:1.45}
  .teacher-item{padding:10px}
  .not-participant-card{padding:12px;font-size:14px;cursor:pointer;position:relative}
  .not-participant-card::after{content:'상세보기';justify-self:start;margin-top:4px;background:#fee2e2;color:#991b1b;border-radius:999px;padding:4px 9px;font-size:11px;font-weight:900}
  .choice-box strong{font-size:22px}
  .choice-box p{font-size:12px}
  .choice-insight{font-size:13px;padding:12px}
  .choice-guide{font-size:12px}
  .teacher-table{font-size:12px;min-width:600px}
  .teacher-table th,.teacher-table td{padding:9px}
}
.teacher-detail-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:flex-end;justify-content:center;z-index:9999;padding:16px}
.teacher-detail-backdrop.open{display:flex}
.teacher-detail-modal{width:min(520px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 24px 70px rgba(15,23,42,.28);display:grid;gap:12px}
.teacher-detail-modal h2{margin:0;color:#7f1d1d;font-size:22px}
.teacher-detail-modal p{margin:0;color:#334155;line-height:1.6}
.teacher-detail-actions{display:grid;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:12px;color:#475569;font-size:14px;line-height:1.5}
.teacher-detail-close{border:0;background:#3264df;color:#fff;border-radius:16px;padding:13px;font-weight:900;cursor:pointer}
@media(min-width:601px){.not-participant-card{cursor:pointer}.not-participant-card:hover{filter:brightness(.98)}}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function ensureModal(){
  let modal = document.querySelector('[data-teacher-detail-modal]');
  if(modal) return modal;
  modal = document.createElement('div');
  modal.className = 'teacher-detail-backdrop';
  modal.setAttribute('data-teacher-detail-modal','1');
  modal.innerHTML = `
    <div class="teacher-detail-modal" role="dialog" aria-modal="true" aria-label="미참여 학생 상세보기">
      <h2 data-detail-name>미참여 학생</h2>
      <p data-detail-desc>오늘 기록이 없는 학생입니다.</p>
      <div class="teacher-detail-actions">
        <strong>교사 확인 흐름</strong>
        <span>1. 수업 중 미션을 확인했는지 짧게 질문합니다.</span>
        <span>2. 기기 문제인지, 활동 이해 문제인지 구분합니다.</span>
        <span>3. 필요하면 오늘 미션 1개만 먼저 기록하도록 안내합니다.</span>
      </div>
      <button type="button" class="teacher-detail-close" data-detail-close>닫기</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', event => {
    if(event.target === modal || event.target.matches('[data-detail-close]')) modal.classList.remove('open');
  });
  return modal;
}

function openNotParticipantDetail(card){
  const modal = ensureModal();
  const name = card.querySelector('strong')?.textContent?.trim() || '미참여 학생';
  modal.querySelector('[data-detail-name]').textContent = name;
  modal.querySelector('[data-detail-desc]').textContent = `${name} 학생은 오늘 미션 기록이 없습니다. 먼저 참여 방법을 이해했는지 확인하고, 필요하면 미션 1개만 함께 시작하도록 안내하세요.`;
  modal.classList.add('open');
}

document.addEventListener('click', event => {
  const card = event.target.closest?.('.not-participant-card');
  if(!card) return;
  openNotParticipantDetail(card);
});

document.addEventListener('keydown', event => {
  if(event.key === 'Escape') document.querySelector('[data-teacher-detail-modal]')?.classList.remove('open');
});
