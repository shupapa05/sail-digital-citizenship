const LABEL_FIXES = [
  ['기본 바다', '장식 없음'],
  ['배만 깔끔하게 보여 줍니다.', '장식을 빼고 배만 깔끔하게 봅니다.'],
  ['현재 장식: 기본 바다', '현재 장식: 장식 없음']
];

let scheduled = false;

injectDecorationVisualFix();
fixDecorationText();
new MutationObserver(scheduleFixDecorationText).observe(document.body, { childList: true, subtree: true });

function scheduleFixDecorationText() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    fixDecorationText();
  });
}

function fixDecorationText() {
  const targets = document.querySelectorAll('.decor-card h3, .decor-card p, .ship-decoration-caption');
  targets.forEach(node => {
    const original = node.textContent || '';
    let text = original;
    LABEL_FIXES.forEach(([from, to]) => {
      text = text.replaceAll(from, to);
    });
    if (text !== original) node.textContent = text;
  });
}

function injectDecorationVisualFix() {
  if (document.querySelector('#studentDecorationVisualFix')) return;
  const style = document.createElement('style');
  style.id = 'studentDecorationVisualFix';
  style.textContent = `
    .decor-card.clear .decor-preview{background:linear-gradient(180deg,#f8fbff 0%,#eaf4ff 100%)}
    .decor-card.clear .decor-wave{left:16%;right:16%;bottom:20px;height:22px;background:linear-gradient(90deg,#bfdbfe,#93c5fd,#bfdbfe);box-shadow:0 10px 18px rgb(59 130 246 / 16%)}

    .reward-ship-stage.scene-lighthouse{background:linear-gradient(180deg,#f8fbff 0%,#eaf6ff 64%,#dbeafe 100%)}
    .reward-ship-stage.scene-compass{background:linear-gradient(180deg,#fffaf0 0%,#eef6ff 70%,#dbeafe 100%)}
    .reward-ship-stage.scene-stars{background:linear-gradient(180deg,#eef2ff 0%,#f8fbff 64%,#dbeafe 100%)}

    .lighthouse-base{left:7% !important;bottom:72px !important;width:42px !important;height:108px !important;background:repeating-linear-gradient(180deg,#fff 0 18px,#ef4444 18px 31px) !important;border:3px solid #b91c1c !important;border-radius:14px 14px 5px 5px !important;box-shadow:0 12px 22px rgb(185 28 28 / 18%) !important;z-index:2}
    .lighthouse-base:before{top:-22px !important;left:-7px !important;width:56px !important;height:26px !important;background:#dc2626 !important;border-radius:16px 16px 4px 4px !important;box-shadow:0 4px 0 #991b1b !important}
    .lighthouse-base:after{content:"";position:absolute;left:13px;bottom:8px;width:14px;height:24px;background:#334155;border-radius:8px 8px 2px 2px}
    .lighthouse-light{left:17% !important;bottom:152px !important;width:190px !important;height:62px !important;background:linear-gradient(90deg,rgba(250,204,21,.9),rgba(254,240,138,.4),transparent) !important;filter:drop-shadow(0 0 16px rgba(250,204,21,.45));z-index:1}

    .compass-ring{right:7% !important;bottom:76px !important;width:96px !important;height:96px !important;background:radial-gradient(circle at 35% 30%,#fff7ed 0%,#fde68a 44%,#f59e0b 100%) !important;border:6px solid #92400e !important;color:#78350f !important;font-size:18px !important;box-shadow:0 16px 28px rgb(146 64 14 / 20%) !important;z-index:2}
    .compass-ring:before{content:"";position:absolute;inset:12px;border:2px dashed rgba(120,53,15,.55);border-radius:999px}
    .compass-ring:after{width:14px !important;height:48px !important;top:24px !important;left:35px !important;background:linear-gradient(180deg,#2563eb 0 50%,#ef4444 50% 100%) !important;filter:drop-shadow(0 2px 4px rgba(15,23,42,.2))}

    .decor-card.lighthouse .decor-preview{background:linear-gradient(180deg,#e0f2fe,#f8fbff)}
    .decor-card.compass .decor-preview{background:linear-gradient(180deg,#fff7ed,#eef6ff)}
    .decor-card.lighthouse .lighthouse-base{left:18% !important;bottom:8px !important;width:34px !important;height:72px !important;transform:scale(.78) !important;transform-origin:bottom left}
    .decor-card.lighthouse .lighthouse-light{left:38% !important;bottom:52px !important;width:130px !important;height:42px !important;transform:none !important}
    .decor-card.compass .compass-ring{right:50% !important;bottom:9px !important;width:68px !important;height:68px !important;transform:translateX(50%) !important;font-size:14px !important}
    .decor-card.compass .compass-ring:after{width:10px !important;height:34px !important;top:16px !important;left:24px !important}

    @media(max-width:720px){
      .lighthouse-base{left:5% !important;width:36px !important;height:92px !important}
      .lighthouse-light{left:16% !important;width:150px !important;height:48px !important}
      .compass-ring{right:5% !important;width:78px !important;height:78px !important}
      .compass-ring:after{left:28px !important;top:19px !important;height:40px !important}
    }
  `;
  document.head.appendChild(style);
}
