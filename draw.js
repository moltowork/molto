(() => {
if (customElements.get('molto-canvas')) return;
const PALETTE = ['#ffffff', '#632424', '#88e3f2', '#ffbbfc', '#ffef47'];
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
class MoltoCanvas extends HTMLElement {
  static get observedAttributes() { return ['stroke', 'grid']; }
  connectedCallback() {
    if (this._init) return; this._init = true;
    this.strokes = []; this.ci = 0; this.pick = null;
    this.style.cssText += ';display:block;position:relative;width:100%;aspect-ratio:16/9;background:#F94E19;border-radius:clamp(10px,0.8vw,28px);overflow:hidden;touch-action:none;user-select:none';
    this.style.cursor = 'url("data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><circle cx="9" cy="9" r="8" fill="#632424"/></svg>') + '") 9 9, crosshair';
    if (this.hasAttribute('fill')) this.style.cssText += ';aspect-ratio:auto;height:100%;border-radius:0';
    const ins = (this.getAttribute('controls-inset') || this.getAttribute('controlsinset')) || '16px';
    this.innerHTML = `
      <canvas style="position:absolute;inset:0;width:100%;height:100%;display:block;image-rendering:pixelated"></canvas>
      <div data-hint style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;font-size:clamp(18px,2.4vw,30px);letter-spacing:-0.02em;color:#fff;transition:opacity .4s">draw something</div>
      <div style="position:absolute;left:${ins};bottom:16px;display:flex;gap:6px" data-sw></div>
      <div data-ctl style="position:absolute;right:${ins};bottom:16px;display:flex;gap:6px">
        <button data-undo>undo</button><button data-clear>clear</button>
      </div>`;
    this.querySelectorAll('button').forEach(b => b.style.cssText = 'font:inherit;font-size:clamp(13px,0.9vw,22px);padding:0.55em 1.1em;border-radius:999px;border:0;background:#fff;color:#F94E19;cursor:pointer');
    const sw = this.querySelector('[data-sw]');
    PALETTE.forEach(c => {
      const d = document.createElement('button');
      d.title = c; d.style.cssText = `width:clamp(22px,1.5vw,40px);height:clamp(22px,1.5vw,40px);border-radius:50%;border:2px solid #F94E19;background:${c};cursor:pointer;padding:0`;
      d.onclick = () => { this.pick = this.pick === c ? null : c; this.updSw(); };
      sw.appendChild(d);
    });
    this.updSw = () => [...sw.children].forEach(d => d.style.boxShadow = d.title === this.pick ? '0 0 0 2px #fff' : 'none');
    this.querySelector('[data-undo]').onclick = () => { this.strokes.pop(); this.rebuild(); };
    this.querySelector('[data-clear]').onclick = () => { this.strokes = []; this.rebuild(); };
    this.querySelectorAll('button').forEach(b => b.onpointerdown = e => e.stopPropagation());
    this.cv = this.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.done = document.createElement('canvas'); this.dctx = this.done.getContext('2d');
    this.work = document.createElement('canvas'); this.wctx = this.work.getContext('2d', { willReadFrequently: true });
    this.hint = this.querySelector('[data-hint]');
    const rn = parseInt(this.getAttribute('random'));
    if (rn > 0) this.randomize(rn);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this);
    this.addEventListener('pointerdown', e => this.down(e));
    this.addEventListener('pointermove', e => this.move(e));
    ['pointerup', 'pointercancel'].forEach(t => this.addEventListener(t, () => this.up()));
  }
  randomize(n) {
    const r = this.getBoundingClientRect(), asp = r.width && r.height ? r.width / r.height : 16 / 9;
    const cols = PALETTE.slice().sort(() => Math.random() - 0.5);
    for (let k = 0; k < n; k++) {
      let x = 0.12 + Math.random() * 0.76, y = 0.15 + Math.random() * 0.7, a = Math.random() * 6.283, turn = 0;
      const pts = [[x, y]], steps = 50 + Math.random() * 110, st = 0.006;
      for (let i = 0; i < steps; i++) {
        turn = Math.max(-0.14, Math.min(0.14, turn + (Math.random() - 0.5) * 0.06));
        const ta = Math.atan2((0.5 - y) / asp, 0.5 - x), far = Math.max(Math.abs(x - 0.5) * 2, Math.abs(y - 0.5) * 2);
        let diff = Math.atan2(Math.sin(ta - a), Math.cos(ta - a));
        a += turn + (far > 0.75 ? diff * 0.12 : 0);
        x += Math.cos(a) * st; y += Math.sin(a) * st * asp;
        pts.push([x, y]);
      }
      this.strokes.push({ color: cols[k % cols.length], pts });
    }
    this.ci = n;
  }
  disconnectedCallback() { this.ro && this.ro.disconnect(); }
  attributeChangedCallback() { this.rebuild && this.rebuild(); }
  get sw() { return (parseFloat(this.getAttribute('stroke')) || 3) * this.w / 100; }
  pt(e) { const r = this.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; }
  down(e) {
    if (e.button > 0) return;
    this.setPointerCapture(e.pointerId);
    this.cur = { color: this.pick || PALETTE[this.ci++ % PALETTE.length], pts: [this.pt(e)] };
    this.strokes.push(this.cur); this.draw();
  }
  move(e) {
    if (!this.cur) return;
    const p = this.pt(e), l = this.cur.pts[this.cur.pts.length - 1];
    if (Math.hypot((p[0] - l[0]) * this.w, (p[1] - l[1]) * this.h) < 2) return;
    this.cur.pts.push(p);
    if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.draw(); });
  }
  up() {
    if (!this.cur) return;
    this.render(this.cur, this.dctx); this.cur = null; this.draw();
  }
  resize() {
    const r = this.getBoundingClientRect();
    this.w = Math.max(1, Math.round(r.width)); this.h = Math.max(1, Math.round(r.height));
    this.cv.width = this.done.width = this.w; this.cv.height = this.done.height = this.h;
    this.makeNoise(); this.rebuild();
  }
  makeNoise() {
    const { w, h } = this, cell = 3, sw = Math.ceil(w / cell) + 1, sh = Math.ceil(h / cell) + 1;
    const s = document.createElement('canvas'); s.width = sw; s.height = sh;
    const sc = s.getContext('2d'), id = sc.createImageData(sw, sh);
    for (let i = 0; i < id.data.length; i += 4) { id.data[i] = Math.random() * 255; id.data[i + 3] = 255; }
    sc.putImageData(id, 0, 0);
    const b = document.createElement('canvas'); b.width = w; b.height = h;
    const bc = b.getContext('2d'); bc.imageSmoothingEnabled = true; bc.drawImage(s, 0, 0, sw * cell, sh * cell);
    const d = bc.getImageData(0, 0, w, h).data, n = new Float32Array(w * h);
    for (let i = 0; i < n.length; i++) n[i] = (d[i * 4] / 255 - 0.5) * 0.4 + (Math.random() - 0.5) * 0.12;
    this.noise = n;
  }
  render(s, target) {
    const { w, h, wctx, work } = this, lw = this.sw, blur = lw * 0.4, pad = Math.ceil(lw / 2 + blur * 1.5);
    const p = s.pts.map(([x, y]) => [x * w, y * h]);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(w, Math.ceil(x1 + pad)); y1 = Math.min(h, Math.ceil(y1 + pad));
    const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0) return;
    work.width = bw; work.height = bh;
    const off = 100000;
    wctx.save();
    wctx.translate(-x0 - off, -y0);
    wctx.shadowColor = '#000'; wctx.shadowBlur = blur; wctx.shadowOffsetX = off;
    wctx.lineCap = 'round'; wctx.lineJoin = 'round'; wctx.lineWidth = lw; wctx.strokeStyle = wctx.fillStyle = '#000';
    wctx.beginPath();
    if (p.length === 1) { wctx.arc(p[0][0], p[0][1], lw / 2, 0, 6.283); wctx.fill(); }
    else {
      wctx.moveTo(p[0][0], p[0][1]);
      for (let i = 1; i < p.length - 1; i++) wctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
      wctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]); wctx.stroke();
    }
    wctx.restore();
    const img = wctx.getImageData(0, 0, bw, bh), d = img.data, [r, g, b] = rgb(s.color), n = this.noise;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 4, a = d[i + 3] / 255;
      if (a > 0.02 && a + n[(y + y0) * w + x + x0] > 0.5) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
      else d[i + 3] = 0;
    }
    wctx.putImageData(img, 0, 0);
    target.save(); target.globalCompositeOperation = 'multiply';
    target.drawImage(work, x0, y0); target.restore();
  }
  grid(ctx) {
    const { w, h } = this; ctx.fillStyle = 'rgba(255,255,255,0.35)'; const g = Math.max(18, w / 48);
    for (let x = g / 2; x < w; x += g) for (let y = g / 2; y < h; y += g) ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  rebuild() {
    if (!this.dctx || !this.noise) return;
    this.dctx.clearRect(0, 0, this.w, this.h);
    for (const s of this.strokes) if (s !== this.cur) this.render(s, this.dctx);
    this.draw();
  }
  draw() {
    if (!this.ctx) return;
    const { ctx, w, h } = this; ctx.clearRect(0, 0, w, h);
    if (this.getAttribute('grid') === 'true') this.grid(ctx);
    if (false) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; const g = Math.max(18, w / 48);
      for (let x = g / 2; x < w; x += g) for (let y = g / 2; y < h; y += g) ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    if (!this.cur) ctx.drawImage(this.done, 0, 0);
    if (this.cur) {
      const L = this.live || (this.live = document.createElement('canvas')), lc = L.getContext('2d');
      if (L.width !== w || L.height !== h) { L.width = w; L.height = h; }
      lc.clearRect(0, 0, w, h); lc.drawImage(this.done, 0, 0); this.render(this.cur, lc);
      ctx.clearRect(0, 0, w, h); if (this.getAttribute('grid') === 'true') this.grid(ctx);
      ctx.drawImage(L, 0, 0);
    }
    this.hint.style.opacity = this.strokes.length ? 0 : 1;
  }
}
customElements.define('molto-canvas', MoltoCanvas);
})();
