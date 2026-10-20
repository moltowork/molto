(() => {
  if (window.__moltoSmooth) return; window.__moltoSmooth = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return;
  let target = window.scrollY, current = target, running = false;
  const max = () => document.documentElement.scrollHeight - window.innerHeight;
  const step = () => {
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.4) { current = target; running = false; }
    window.scrollTo({ top: current, behavior: 'instant' });
    if (running) requestAnimationFrame(step);
  };
  window.addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented) return;
    for (let n = e.target; n && n !== document.body; n = n.parentElement) {
      if (n.nodeType === 1) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return; }
    }
    e.preventDefault();
    if (!running) current = window.scrollY;
    const d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    target = Math.max(0, Math.min(max(), (running ? target : window.scrollY) + d));
    if (!running) { running = true; requestAnimationFrame(step); }
  }, { passive: false });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href="#"]');
    if (!a) return;
    e.preventDefault(); current = window.scrollY; target = 0;
    if (!running) { running = true; requestAnimationFrame(step); }
  });
  window.addEventListener('scroll', () => { if (!running) { target = current = window.scrollY; } }, { passive: true });
})();
