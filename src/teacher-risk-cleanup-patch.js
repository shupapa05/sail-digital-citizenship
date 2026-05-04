function cleanupRiskCards(){
  const dashboard = document.querySelector('.teacher-dashboard');
  if(!dashboard) return;

  const cards = Array.from(dashboard.querySelectorAll('[data-risk-card]'));
  if(cards.length <= 1) return;

  const first = cards[0];
  cards.slice(1).forEach(card => card.remove());

  const list = first.closest('.teacher-list');
  if(list){
    Array.from(list.children).forEach(child => {
      if(child !== first && child.textContent.trim() === '') child.remove();
    });
  }
}

new MutationObserver(cleanupRiskCards).observe(document.body, { childList:true, subtree:true });
setInterval(cleanupRiskCards, 500);
setTimeout(cleanupRiskCards, 100);
