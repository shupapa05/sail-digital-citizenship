const shipCss = `
.ship-shop-toggle-wrap{display:flex;justify-content:center;margin:16px 0 6px}
.ship-shop-toggle{min-width:220px;background:linear-gradient(180deg,#5886f4,#3264df)!important;color:#fff!important;border:0!important;border-radius:16px!important;box-shadow:0 12px 24px rgb(48 92 210 / 18%);font-size:20px;font-weight:950}
.ship-shop{display:none;margin-top:16px;background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}
.ship-shop.open{display:block}
.ship-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.ship-card{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;text-align:center}
.shop-ship-image{width:100%;height:120px;object-fit:contain;background:#fff;border-radius:14px}
.ship-card h2{font-size:18px;margin:8px 0 4px}.ship-card p{margin:0 0 8px}.ship-btn{width:100%;min-height:42px;border-radius:12px}.ship-btn.buy{background:#2563eb!important;color:#fff!important}.ship-btn.select{background:#16a34a!important;color:#fff!important}.ship-btn.equipped{background:#e0e7ff!important;color:#1d4ed8!important}.ship-btn.locked{background:#e5e7eb!important;color:#6b7280!important}
@media(max-width:720px){.ship-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ship-shop{padding:12px}.shop-ship-image{height:92px}.ship-card{padding:10px}.ship-card h2{font-size:15px}.ship-shop-toggle{width:100%}}
`;
const shipStyle = document.createElement('style');
shipStyle.textContent = shipCss;
document.head.appendChild(shipStyle);

function prepareShipShop() {
  const shop = document.querySelector('.ship-shop');
  const profile = document.querySelector('.profile');
  if (!shop || !profile || shop.dataset.toggleReady === '1') return;

  shop.dataset.toggleReady = '1';
  shop.classList.remove('open');

  const wrap = document.createElement('div');
  wrap.className = 'ship-shop-toggle-wrap';
  wrap.innerHTML = '<button type="button" class="ship-shop-toggle">배 구매/선택</button>';
  profile.insertAdjacentElement('afterend', wrap);

  wrap.querySelector('button').addEventListener('click', () => {
    shop.classList.toggle('open');
    wrap.querySelector('button').textContent = shop.classList.contains('open') ? '배 상점 닫기' : '배 구매/선택';
    if (shop.classList.contains('open')) shop.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

new MutationObserver(prepareShipShop).observe(document.body, { childList: true, subtree: true });
