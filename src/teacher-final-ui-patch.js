const finalStyle = document.createElement('style');
finalStyle.textContent = `
.teacher-dashboard .not-participant-card{position:relative;overflow:hidden}
.teacher-dashboard .not-participant-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:#ef4444}
.teacher-dashboard .risk-none{background:#f0fdf4!important;border-color:#bbf7d0!important;color:#166534!important}
.teacher-dashboard .risk-none::before{background:#22c55e!important}
.teacher-dashboard .risk-low{background:#fff7ed!important;border-color:#fed7aa!important;color:#9a3412!important}
.teacher-dashboard .risk-low::before{background:#f97316!important}
.teacher-dashboard .risk-high{background:#fff1f2!important;border-color:#fecdd3!important;color:#7f1d1d!important}
.teacher-dashboard .badge-zero{color:#b91c1c!important;font-weight:900;background:#fef2f2;border-radius:999px;padding:4px 8px;display:inline-block}
.teacher-dashboard .badge-near{color:#92400e!important;font-weight:900;background:#fef3c7;border-radius:999px;padding:4px 8px;display:inline-block}
.teacher-dashboard .badge-done{color:#166534!important;font-weight:900;background:#dcfce7;border-radius:999px;padding:4px 8px;display:inline-block}
.teacher-dashboard .teacher-table td{vertical-align:middle}
.teacher-dashboard .teacher-card h2{display:flex;align-items:center;gap:8px}
.teacher-dashboard .teacher-card h2::before{font-size:18px}
@media(max-width:720px){
  .teacher-dashboard .teacher-card{padding:16px!important;border-radius:18px!important}
  .teacher-dashboard .teacher-table{min-width:560px!important;font-size:12px}
  .teacher-dashboard .not-participant-card small{font-size:13px;line-height:1.7!important}
}
`;
document.head.appendChild(finalStyle);

function parseNumber(text){
  const match = String(text || '').match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function polishRiskCard(){
  const dashboard = document.querySelector('.teacher-dashboard');
  if(!dashboard) return;

  const summaryBoxes = Array.from(dashboard.querySelectorAll('.teacher-box'));
  const totalBox = summaryBoxes.find(box => box.textContent.includes('전체 학생'));
  const absentBox = summaryBoxes.find(box => box.textContent.includes('미참여'));
  const total = parseNumber(totalBox?.querySelector('strong')?.textContent);
  const absent = parseNumber(absentBox?.querySelector('strong')?.textContent);

  const riskCards = Array.from(dashboard.querySelectorAll('.not-participant-card'));
  riskCards.forEach(card => {
    card.classList.remove('risk-none','risk-low','risk-high');
    if(absent <= 0) card.classList.add('risk-none');
    else if(total && absent / total < 0.35) card.classList.add('risk-low');
    else card.classList.add('risk-high');
  });
}

function polishBadgeTable(){
  const dashboard = document.querySelector('.teacher-dashboard');
  if(!dashboard) return;

  const cards = Array.from(dashboard.querySelectorAll('.teacher-card'));
  const progressCard = cards.find(card => card.querySelector('h2')?.textContent.includes('학생별 배지 진행도'));
  if(!progressCard) return;

  progressCard.querySelectorAll('tbody td').forEach(td => {
    const text = td.textContent.trim();
    const match = text.match(/^(\d+)\/10$/);
    if(!match) return;
    const value = Number(match[1]);
    td.innerHTML = `<span class="${value >= 10 ? 'badge-done' : value >= 8 ? 'badge-near' : value === 0 ? 'badge-zero' : ''}">${value}/10</span>`;
  });
}

function polishTeacherFinalUI(){
  polishRiskCard();
  polishBadgeTable();
}

new MutationObserver(polishTeacherFinalUI).observe(document.body,{childList:true,subtree:true});
setInterval(polishTeacherFinalUI,700);
setTimeout(polishTeacherFinalUI,200);
