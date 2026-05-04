function cleanupRiskCards(){
  const dashboard = document.querySelector('.teacher-dashboard');
  if(!dashboard) return;

  const sections = Array.from(dashboard.querySelectorAll('.teacher-card'));
  const riskSection = sections.find(section => {
    const title = section.querySelector('h2')?.textContent || '';
    return title.includes('미참여 학생');
  });
  if(!riskSection) return;

  const cards = Array.from(riskSection.querySelectorAll('.not-participant-card'));
  if(cards.length <= 1) return;

  const first = cards[0];
  cards.slice(1).forEach(card => card.remove());

  const list = riskSection.querySelector('.teacher-list');
  if(list){
    Array.from(list.children).forEach(child => {
      if(child !== first && child.textContent.trim() === '') child.remove();
    });
  }
}

new MutationObserver(cleanupRiskCards).observe(document.body, { childList:true, subtree:true });
setInterval(cleanupRiskCards, 300);
setTimeout(cleanupRiskCards, 100);
