const shipCss = `
.ship-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.ship-card{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;text-align:center}
.shop-ship-image{width:100%;height:120px;object-fit:contain;background:#fff;border-radius:14px}
.ship-card h2{font-size:18px;margin:8px 0 4px}.ship-card p{margin:0 0 8px}.ship-btn{width:100%;min-height:42px;border-radius:12px}.ship-btn.buy{background:#2563eb!important;color:#fff!important}.ship-btn.select{background:#16a34a!important;color:#fff!important}.ship-btn.equipped{background:#e0e7ff!important;color:#1d4ed8!important}.ship-btn.locked{background:#e5e7eb!important;color:#6b7280!important}
@media(max-width:720px){.ship-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.shop-ship-image{height:92px}.ship-card{padding:10px}.ship-card h2{font-size:15px}}
`;

if (!document.querySelector('#shipShopBaseStyles')) {
  const shipStyle = document.createElement('style');
  shipStyle.id = 'shipShopBaseStyles';
  shipStyle.textContent = shipCss;
  document.head.appendChild(shipStyle);
}

document.querySelectorAll('.ship-shop-toggle-wrap').forEach(el => el.remove());
