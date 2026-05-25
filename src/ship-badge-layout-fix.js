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
      grid-template-columns:58px minmax(180px, 280px) 58px !important;
      grid-template-areas:
        "left image right"
        "left title right"
        "left note right"
        "caption caption caption" !important;
      justify-content:center !important;
      justify-items:center !important;
      align-items:center !important;
      column-gap:12px !important;
      row-gap:8px !important;
    }

    .reward-ship-stage .ship-image,
    .reward-ship-stage .ship-placeholder,
    .reward-ship-stage .ship-art-fallback{
      grid-area:image !important;
    }

    .reward-ship-stage > h1{grid-area:title !important;margin-top:0 !important;}
    .reward-ship-stage > p{grid-area:note !important;margin:0 !important;}

    .reward-ship-stage .ship-badge-slots{
      display:grid !important;
      grid-template-columns:58px minmax(180px, 280px) 58px !important;
      grid-template-rows:58px 58px !important;
      gap:8px 12px !important;
      width:100% !important;
      max-width:420px !important;
      pointer-events:none !important;
      z-index:auto !important;
      position:absolute !important;
      inset:0 auto auto 50% !important;
      transform:translateX(-50%) !important;
    }

    .reward-ship-stage .ship-badge-slot,
    .reward-ship-stage .ship-badge-slot.s,
    .reward-ship-stage .ship-badge-slot.a,
    .reward-ship-stage .ship-badge-slot.i,
    .reward-ship-stage .ship-badge-slot.l{
      position:static !important;
      width:54px !important;
      height:54px !important;
      border-radius:14px !important;
      box-shadow:0 8px 18px rgb(15 23 42 / 16%) !important;
      align-self:center !important;
      justify-self:center !important;
    }

    .reward-ship-stage .ship-badge-slot.s{grid-column:1 !important;grid-row:1 !important;}
    .reward-ship-stage .ship-badge-slot.i{grid-column:1 !important;grid-row:2 !important;}
    .reward-ship-stage .ship-badge-slot.a{grid-column:3 !important;grid-row:1 !important;}
    .reward-ship-stage .ship-badge-slot.l{grid-column:3 !important;grid-row:2 !important;}

    .reward-ship-stage .ship-badge-slot b{font-size:18px !important;}
    .reward-ship-stage .ship-badge-slot small{font-size:9px !important;line-height:1 !important;}
    .reward-ship-stage .ship-badge-slot em{font-size:8px !important;padding:1px 5px !important;}

    .reward-ship-stage .ship-badge-caption{
      grid-area:caption !important;
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
      width:min(280px, 100%) !important;
      max-width:min(280px, 100%) !important;
      min-height:180px;
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

    @media(max-width:720px){
      .reward-ship-stage{
        grid-template-columns:1fr !important;
        grid-template-areas:
          "image"
          "title"
          "note"
          "badges"
          "caption" !important;
      }

      .reward-ship-stage .ship-badge-slots{
        grid-area:badges !important;
        position:static !important;
        transform:none !important;
        grid-template-columns:repeat(4, 46px) !important;
        grid-template-rows:46px !important;
        justify-content:center !important;
        max-width:240px !important;
      }

      .reward-ship-stage .ship-badge-slot,
      .reward-ship-stage .ship-badge-slot.s,
      .reward-ship-stage .ship-badge-slot.a,
      .reward-ship-stage .ship-badge-slot.i,
      .reward-ship-stage .ship-badge-slot.l{
        width:46px !important;
        height:46px !important;
      }

      .reward-ship-stage .ship-badge-slot.s{grid-column:1 !important;grid-row:1 !important;}
      .reward-ship-stage .ship-badge-slot.a{grid-column:2 !important;grid-row:1 !important;}
      .reward-ship-stage .ship-badge-slot.i{grid-column:3 !important;grid-row:1 !important;}
      .reward-ship-stage .ship-badge-slot.l{grid-column:4 !important;grid-row:1 !important;}
    }
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
