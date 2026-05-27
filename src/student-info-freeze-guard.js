const GUARDED_PATCHES = [
  'info-ranking-patch.js',
  'student-rewards-patch.js',
  'ship-badge-layout-fix.js',
  'ship-shop-toggle-patch.js',
  'student-participation-rewards-patch.js',
  'student-unified-shop-patch.js'
];

if (!window.__SAIL_INFO_FREEZE_GUARD__ && window.MutationObserver) {
  window.__SAIL_INFO_FREEZE_GUARD__ = true;
  const NativeMutationObserver = window.MutationObserver;

  window.MutationObserver = class SailGuardedMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      const stack = String(new Error().stack || '');
      const shouldGuard = GUARDED_PATCHES.some(name => stack.includes(name));
      let timer = null;

      super(shouldGuard
        ? (mutations, observer) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => callback(mutations, observer), 180);
          }
        : callback
      );

      this.__sailShouldGuard = shouldGuard;
    }

    observe(target, options = {}) {
      if (!this.__sailShouldGuard) return super.observe(target, options);

      const app = document.querySelector('#app') || target;
      return super.observe(app, { childList: true });
    }
  };
}
