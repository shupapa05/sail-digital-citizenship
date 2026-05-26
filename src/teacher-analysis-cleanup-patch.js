injectCleanupStyles();
watchAnalysisCleanup();
setTimeout(cleanupAnalysisPanels, 200);
setInterval(cleanupAnalysisPanels, 900);

function injectCleanupStyles() {
  if (document.querySelector('#teacherAnalysisCleanupStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherAnalysisCleanupStyles';
  style.textContent = `
    .citizen-analysis-card .analysis-split{grid-template-columns:1fr !important;}
    .citizen-analysis-card .analysis-panel[data-duplicate-area-panel="1"]{display:none !important;}
    .citizen-analysis-card .analysis-panel h3{font-size:20px;}
  `;
  document.head.appendChild(style);
}

function watchAnalysisCleanup() {
  new MutationObserver(cleanupAnalysisPanels).observe(document.body, { childList: true, subtree: true });
}

function cleanupAnalysisPanels() {
  document.querySelectorAll('.citizen-analysis-card').forEach(card => {
    const panels = Array.from(card.querySelectorAll('.analysis-panel'));
    panels.forEach(panel => {
      const title = panel.querySelector('h3')?.textContent?.trim() || '';
      if (title.includes('영역별 분포')) panel.dataset.duplicateAreaPanel = '1';
    });

    const copy = card.querySelector('.analysis-copy p:last-child');
    if (copy && !copy.dataset.cleanedCopy) {
      copy.dataset.cleanedCopy = '1';
      copy.textContent = '아래 S/A/I/L 원자료와 겹치지 않도록, 여기서는 참여·성찰·편차를 종합한 해석만 보여줍니다.';
    }
  });
}
