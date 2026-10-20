(() => {
  if (window.__moltoRise) return; window.__moltoRise = true;
  const tick = () => {
    const vh = window.innerHeight, mobile = window.innerWidth <= 640;
    document.querySelectorAll('[data-spin-scroll]').forEach(el => {
      el.style.transform = 'rotate(' + (window.scrollY * parseFloat(el.dataset.spinScroll)).toFixed(1) + 'deg)';
    });
    document.querySelectorAll('[data-grow]').forEach(el => {
      const w = el.offsetWidth; if (!w) return;
      const s0 = document.documentElement.clientWidth / w;
      const top = el.parentElement.getBoundingClientRect().top + parseFloat(getComputedStyle(el.parentElement).paddingTop);
      const start = Math.min(vh * 0.55, top + window.scrollY);
      const p = Math.max(0, Math.min(1, (start - top) / (vh * 0.45)));
      const e = 1 - Math.pow(1 - p, 2), s = s0 + (1 - s0) * e;
      el.style.transform = 'scale(' + s.toFixed(4) + ')';
      el.style.borderRadius = (12 * e / s).toFixed(2) + 'px';
    });
    document.querySelectorAll('[data-rise]').forEach(el => {
      if (mobile) { el.style.transform = ''; return; }
      const ref = el.parentElement.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, (ref.top - vh * 0.15) / (vh * 0.7)));
      const shift = Math.min(260, Math.max(90, window.innerWidth * 0.12));
      el.style.transform = 'translateY(' + (p * shift).toFixed(1) + 'px)';
    });
  };
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  const loop = (n) => { tick(); if (n > 0) setTimeout(() => loop(n - 1), 200); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => loop(15)); else loop(15);
})();
