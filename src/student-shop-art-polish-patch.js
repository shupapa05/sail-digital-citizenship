const ART = {
  item_compass: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailCompassSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#eef7ff"/>
          <stop offset="1" stop-color="#dbeafe"/>
        </linearGradient>
        <radialGradient id="sailCompassFace" cx="50%" cy="45%" r="56%">
          <stop offset="0" stop-color="#fffdf5"/>
          <stop offset="0.72" stop-color="#fef3c7"/>
          <stop offset="1" stop-color="#f59e0b"/>
        </radialGradient>
        <filter id="sailCompassShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#1e3a8a" flood-opacity="0.20"/>
        </filter>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailCompassSky)"/>
      <path d="M30 118c39-14 70-14 108 0s62 14 92 0" fill="none" stroke="#bfdbfe" stroke-width="12" stroke-linecap="round" opacity=".8"/>
      <g filter="url(#sailCompassShadow)" transform="translate(80 20)">
        <circle cx="50" cy="55" r="45" fill="#2563eb" opacity=".15"/>
        <circle cx="50" cy="52" r="42" fill="url(#sailCompassFace)" stroke="#f59e0b" stroke-width="5"/>
        <circle cx="50" cy="52" r="30" fill="#fff7ed" stroke="#fde68a" stroke-width="2"/>
        <path d="M51 18l9 34-9 34-9-34z" fill="#ef4444"/>
        <path d="M51 18l9 34-9 5z" fill="#f97316"/>
        <path d="M18 52l34-9 34 9-34 9z" fill="#2563eb" opacity=".92"/>
        <circle cx="51" cy="52" r="6" fill="#0f172a"/>
        <text x="50" y="12" text-anchor="middle" font-size="14" font-weight="800" fill="#1e3a8a">N</text>
        <text x="50" y="104" text-anchor="middle" font-size="14" font-weight="800" fill="#1e3a8a">S</text>
      </g>
    </svg>`,
  item_lighthouse: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailLightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e0f2fe"/>
          <stop offset="1" stop-color="#f8fafc"/>
        </linearGradient>
        <linearGradient id="sailLightBeam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fde68a" stop-opacity="0"/>
          <stop offset=".45" stop-color="#fde68a" stop-opacity=".75"/>
          <stop offset="1" stop-color="#fde68a" stop-opacity="0"/>
        </linearGradient>
        <filter id="sailLightShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#0f172a" flood-opacity="0.16"/>
        </filter>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailLightSky)"/>
      <path d="M0 105c28-12 48-12 75 0s49 12 78 0 55-12 107 1v44H0z" fill="#bfdbfe"/>
      <path d="M16 122c36-10 63-10 99 0s63 10 129 0" fill="none" stroke="#60a5fa" stroke-width="6" stroke-linecap="round" opacity=".55"/>
      <path d="M95 50L14 31h166z" fill="url(#sailLightBeam)" opacity=".88"/>
      <g filter="url(#sailLightShadow)">
        <path d="M116 30h33l9 84h-51z" fill="#fff7ed" stroke="#e2e8f0" stroke-width="3"/>
        <path d="M112 58h42l4 17h-50zM109 91h50l3 18h-56z" fill="#ef4444" opacity=".9"/>
        <rect x="118" y="17" width="29" height="20" rx="5" fill="#1d4ed8"/>
        <rect x="124" y="20" width="17" height="12" rx="3" fill="#fde68a"/>
        <path d="M112 17h41l-9-11h-23z" fill="#0f172a"/>
        <path d="M89 119h88l-12 13H101z" fill="#64748b"/>
      </g>
    </svg>`,
  item_telescope: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailScopeSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#eff6ff"/>
          <stop offset="1" stop-color="#dbeafe"/>
        </linearGradient>
        <linearGradient id="sailScopeTube" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#1d4ed8"/>
          <stop offset=".55" stop-color="#60a5fa"/>
          <stop offset="1" stop-color="#0f172a"/>
        </linearGradient>
        <filter id="sailScopeShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#1e3a8a" flood-opacity="0.18"/>
        </filter>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailScopeSky)"/>
      <circle cx="53" cy="35" r="3" fill="#facc15"/>
      <circle cx="212" cy="39" r="2.5" fill="#facc15"/>
      <circle cx="197" cy="72" r="2" fill="#93c5fd"/>
      <path d="M38 112c44-15 71-15 111 0s56 12 83-1" fill="none" stroke="#bfdbfe" stroke-width="10" stroke-linecap="round"/>
      <g filter="url(#sailScopeShadow)" transform="rotate(-13 130 70)">
        <rect x="70" y="50" width="105" height="28" rx="14" fill="url(#sailScopeTube)"/>
        <rect x="58" y="53" width="24" height="22" rx="9" fill="#bfdbfe" stroke="#2563eb" stroke-width="4"/>
        <rect x="165" y="47" width="34" height="34" rx="12" fill="#0f172a"/>
        <circle cx="182" cy="64" r="9" fill="#38bdf8" opacity=".86"/>
      </g>
      <path d="M130 80v44M130 94l-37 33M130 94l38 33" stroke="#475569" stroke-width="6" stroke-linecap="round"/>
      <circle cx="130" cy="80" r="8" fill="#f59e0b"/>
    </svg>`,
  item_star_badge: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailStarSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="1" stop-color="#dbeafe"/>
        </linearGradient>
        <radialGradient id="sailStarGold" cx="45%" cy="35%" r="58%">
          <stop offset="0" stop-color="#fff7cc"/>
          <stop offset=".5" stop-color="#facc15"/>
          <stop offset="1" stop-color="#f97316"/>
        </radialGradient>
        <filter id="sailStarShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" flood-color="#92400e" flood-opacity="0.20"/>
        </filter>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailStarSky)"/>
      <path d="M58 119c42-14 74-14 113 0s53 12 74-1" fill="none" stroke="#fed7aa" stroke-width="12" stroke-linecap="round" opacity=".9"/>
      <g filter="url(#sailStarShadow)">
        <path d="M105 88l-17 44 43-20 43 20-17-44z" fill="#2563eb"/>
        <path d="M122 91l-11 35 20-10 20 10-11-35z" fill="#1d4ed8"/>
        <circle cx="131" cy="62" r="45" fill="url(#sailStarGold)" stroke="#f97316" stroke-width="5"/>
        <path d="M131 29l10 21 23 3-17 16 4 23-20-11-20 11 4-23-17-16 23-3z" fill="#fff7ed" stroke="#f59e0b" stroke-width="3"/>
        <circle cx="131" cy="62" r="54" fill="none" stroke="#fde68a" stroke-width="4" opacity=".72"/>
      </g>
    </svg>`,
  mist_dawn: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailMistSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e0f2fe"/>
          <stop offset=".58" stop-color="#f8fafc"/>
          <stop offset="1" stop-color="#bfdbfe"/>
        </linearGradient>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailMistSky)"/>
      <circle cx="190" cy="39" r="18" fill="#fde68a" opacity=".62"/>
      <path d="M0 101c31-13 58-13 91 0s57 12 89 0 54-11 80 1v48H0z" fill="#dbeafe"/>
      <path d="M22 82h177M49 96h187M24 115h151" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity=".72"/>
      <g transform="translate(105 70)">
        <path d="M12 33h70l-12 14H24z" fill="#60a5fa"/>
        <path d="M24 33l25-32 23 32z" fill="#fff7ed" stroke="#f59e0b" stroke-width="3"/>
        <path d="M48 3v30" stroke="#94a3b8" stroke-width="3"/>
      </g>
    </svg>`,
  moon_path: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailMoonSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#172554"/>
          <stop offset=".62" stop-color="#1e3a8a"/>
          <stop offset="1" stop-color="#60a5fa"/>
        </linearGradient>
        <linearGradient id="sailMoonPath" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fefce8" stop-opacity=".8"/>
          <stop offset="1" stop-color="#fefce8" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailMoonSky)"/>
      <circle cx="193" cy="36" r="20" fill="#fef9c3"/>
      <circle cx="202" cy="29" r="18" fill="#172554" opacity=".72"/>
      <circle cx="53" cy="28" r="2" fill="#fef9c3"/><circle cx="78" cy="51" r="2" fill="#bfdbfe"/><circle cx="219" cy="65" r="2" fill="#fef9c3"/>
      <path d="M0 102c30-11 58-11 88 0s57 11 89 0 57-11 83 0v48H0z" fill="#1d4ed8" opacity=".92"/>
      <path d="M166 53c-22 28-33 56-38 97h78c-3-38-14-70-40-97z" fill="url(#sailMoonPath)"/>
      <g transform="translate(92 80)">
        <path d="M10 29h77l-15 16H24z" fill="#93c5fd"/>
        <path d="M25 29l30-35 27 35z" fill="#fff7ed" stroke="#d97706" stroke-width="3"/>
        <path d="M55-4v33" stroke="#e5e7eb" stroke-width="3"/>
      </g>
    </svg>`,
  aurora_sea: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailAuroraSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#0f172a"/>
          <stop offset=".64" stop-color="#075985"/>
          <stop offset="1" stop-color="#67e8f9"/>
        </linearGradient>
        <linearGradient id="sailAuroraLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#22c55e" stop-opacity="0"/>
          <stop offset=".45" stop-color="#86efac" stop-opacity=".82"/>
          <stop offset="1" stop-color="#a78bfa" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailAuroraSky)"/>
      <path d="M8 35c36-28 68-24 102 1s74 28 142-3" fill="none" stroke="url(#sailAuroraLight)" stroke-width="17" stroke-linecap="round" opacity=".9"/>
      <path d="M31 56c33-17 64-13 96 7s65 19 103-2" fill="none" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" opacity=".35"/>
      <path d="M0 105c34-12 61-12 94 0s57 12 91 0 55-11 75 0v45H0z" fill="#0891b2" opacity=".9"/>
      <path d="M30 123c34-8 58-8 93 0s57 8 105 0" stroke="#a5f3fc" stroke-width="6" stroke-linecap="round" opacity=".65"/>
      <g transform="translate(95 76)">
        <path d="M12 31h76l-15 15H25z" fill="#38bdf8"/>
        <path d="M26 31l29-35 28 35z" fill="#fef3c7" stroke="#f59e0b" stroke-width="3"/>
        <path d="M55-4v35" stroke="#bfdbfe" stroke-width="3"/>
      </g>
    </svg>`,
  golden_sunset: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailSunsetSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fed7aa"/>
          <stop offset=".5" stop-color="#fb923c"/>
          <stop offset="1" stop-color="#60a5fa"/>
        </linearGradient>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailSunsetSky)"/>
      <circle cx="130" cy="72" r="35" fill="#fef3c7" opacity=".9"/>
      <path d="M0 97h260v53H0z" fill="#3b82f6" opacity=".78"/>
      <path d="M0 103c32-12 60-12 91 0s58 12 91 0 54-11 78 0v47H0z" fill="#2563eb" opacity=".86"/>
      <path d="M48 113h164M67 128h122" stroke="#fde68a" stroke-width="7" stroke-linecap="round" opacity=".7"/>
      <g transform="translate(95 70)">
        <path d="M12 34h76l-15 15H25z" fill="#f97316"/>
        <path d="M26 34l29-36 28 36z" fill="#fff7ed" stroke="#b45309" stroke-width="3"/>
        <path d="M55-2v36" stroke="#92400e" stroke-width="3"/>
      </g>
    </svg>`,
  legend_sky: String.raw`
    <svg viewBox="0 0 260 150" role="img" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sailLegendSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e0e7ff"/>
          <stop offset=".38" stop-color="#fef3c7"/>
          <stop offset=".72" stop-color="#bae6fd"/>
          <stop offset="1" stop-color="#bbf7d0"/>
        </linearGradient>
        <linearGradient id="sailLegendRibbon" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#2563eb"/>
          <stop offset=".5" stop-color="#facc15"/>
          <stop offset="1" stop-color="#22c55e"/>
        </linearGradient>
      </defs>
      <rect width="260" height="150" rx="24" fill="url(#sailLegendSky)"/>
      <path d="M19 46c42-28 72-28 110-2s67 24 111-8" fill="none" stroke="url(#sailLegendRibbon)" stroke-width="12" stroke-linecap="round" opacity=".62"/>
      <path d="M0 103c32-12 60-12 92 0s58 12 91 0 53-11 77 0v47H0z" fill="#60a5fa" opacity=".76"/>
      <path d="M31 121c34-9 62-9 98 0s57 8 98-1" stroke="#fef9c3" stroke-width="7" stroke-linecap="round" opacity=".72"/>
      <g transform="translate(90 65)">
        <path d="M11 39h86l-17 17H29z" fill="#2563eb"/>
        <path d="M25 39l35-45 34 45z" fill="#fff7ed" stroke="#d97706" stroke-width="4"/>
        <path d="M60-6v45" stroke="#94a3b8" stroke-width="3"/>
        <path d="M67 7l23 10-23 10z" fill="#ef4444"/>
      </g>
    </svg>`
};

let polishTimer = null;
injectStyles();
schedulePolish(250);

new MutationObserver(() => schedulePolish()).observe(document.querySelector('#app') || document.body, { childList: true });

function schedulePolish(delay = 120) {
  if (polishTimer) clearTimeout(polishTimer);
  polishTimer = setTimeout(() => {
    polishTimer = null;
    polishShopArt();
  }, delay);
}

function polishShopArt() {
  document.querySelectorAll('.shop-preview').forEach(preview => {
    const id = getArtId(preview);
    if (!id || !ART[id] || preview.dataset.artPolished === id) return;
    preview.dataset.artPolished = id;
    preview.classList.add('polished-art');
    preview.innerHTML = ART[id];
  });
}

function getArtId(preview) {
  const classes = Array.from(preview.classList || []);
  const itemClass = classes.find(name => name.startsWith('item-item_'));
  if (itemClass) return itemClass.replace(/^item-/, '');
  const bgClass = classes.find(name => name.startsWith('bg-') && name !== 'bg-preview');
  if (bgClass) return bgClass.replace(/^bg-/, '');
  return '';
}

function injectStyles() {
  if (document.getElementById('sail-shop-art-polish-style')) return;
  const style = document.createElement('style');
  style.id = 'sail-shop-art-polish-style';
  style.textContent = `
    .shop-preview.polished-art {
      position: relative;
      overflow: hidden;
      background: #f8fbff;
      border: 1px solid rgba(147, 197, 253, 0.42);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    }

    .shop-preview.polished-art svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .unified-shop-card.active .shop-preview.polished-art {
      border-color: rgba(37, 99, 235, 0.42);
      box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.84);
    }
  `;
  document.head.appendChild(style);
}
