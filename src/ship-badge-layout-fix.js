const STYLE_ID = 'shipBadgeLayoutFixStyles';

injectShipBadgeLayoutFix();
watchShipImageFallbacks();
setTimeout(fixBrokenShipImages, 100);
setTimeout(fixBrokenShipImages, 700);

function injectShipBadgeLayoutFix() {
  if (document.querySelector(`#${STYLE_ID}`)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .reward-ship-stage{
      overflow:visible !important;
      padding-bottom:0 !important;
      display:grid !important;
      justify-items:center !important;
      gap:10px !important;
    }

    .reward-ship-stage .ship-badge-slots{
      position:static !important;
      inset:auto !important;
      display:flex !important;
      justify-content:center !important;
      align-items:center !important;
      gap:8px !important;
      flex-wrap:wrap !important;
      width:100% !important;
      max-width:320px !important;
      margin:4px auto 0 !important;
      pointer-events:none !important;
      z-index:auto !important;
    }

    .reward-ship-stage .ship-badge-slot,
    .reward-ship-stage .ship-badge-slot.s,
    .reward-ship-stage .ship-badge-slot.a,
    .reward-ship-stage .ship-badge-slot.i,
    .reward-ship-stage .ship-badge-slot.l{
      position:static !important;
      top:auto !important;
      right:auto !important;
      bottom:auto !important;
      left:auto !important;
      width:46px !important;
      height:46px !important;
      border-radius:13px !important;
      box-shadow:0 6px 14px rgb(15 23 42 / 14%) !important;
    }

    .reward-ship-stage .ship-badge-slot b{font-size:17px !important;}
    .reward-ship-stage .ship-badge-slot small{font-size:9px !important;line-height:1 !important;}
    .reward-ship-stage .ship-badge-slot em{font-size:8px !important;padding:1px 5px !important;}

    .reward-ship-stage .ship-badge-caption{
      position:static !important;
      left:auto !important;
      bottom:auto !important;
      transform:none !important;
      max-width:100% !important;
      margin:0 auto !important;
      text-align:center !important;
      white-space:normal !important;
    }

    .reward-ship-stage .ship-image{
      display:block;
      max-width:min(280px, 100%);
      min-height:120px;
      object-fit:contain;
    }

    .ship-art-fallback{
      display:grid !important;
      place-items:center !important;
      gap:6px !important;
      width:min(280px, 100%) !important;
      height:180px !important;
      margin:0 auto !important;
      border:1px solid #d9e5f4 !important;
      border-radius:18px !important;
      background:linear-gradient(180deg, #f8fbff 0%, #edf5ff 100%) !important;
      color:#0b2d5c !important;
      font-weight:950 !important;
      text-align:center !important;
      box-shadow:inset 0 -30px 0 rgb(91 141 247 / 10%) !important;
    }

    .ship-art-fallback span{
      color:#2f5dde !important;
      font-size:52px !important;
      line-height:1 !important;
    }

    .ship-art-fallback strong{
      color:#0b2d5c !important;
      font-size:16px !important;
    }

    .shop-ship-image.ship-art-fallback{
      width:100% !important;
      height:120px !important;
    }

    .shop-ship-image.ship-art-fallback span{font-size:38px !important;}
  `;

  document.head.appendChild(style);
}

function watchShipImageFallbacks() {
  const app = document.querySelector('#app');
  if (!app) return;

  new MutationObserver(fixBrokenShipImages).observe(app, {
    childList: true,
    subtree: true
  });
}

function fixBrokenShipImages() {
  document.querySelectorAll('img.ship-image, img.shop-ship-image').forEach(img => {
    if (img.dataset.shipFallbackReady === '1') return;
    img.dataset.shipFallbackReady = '1';

    const showFallback = () => {
      if (!img.isConnected) return;
      const fallback = document.createElement('div');
      fallback.className = `${img.className || 'ship-placeholder'} ship-art-fallback`;
      fallback.innerHTML = `<span aria-hidden="true">&#9973;</span><strong>${escapeHtml(img.alt || '나의 배')}</strong>`;
      img.replaceWith(fallback);
    };

    img.addEventListener('error', showFallback, { once: true });
    if (img.complete && img.naturalWidth === 0) showFallback();
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}
