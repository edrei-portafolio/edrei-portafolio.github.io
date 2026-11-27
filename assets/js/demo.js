/* Proyecto demo: comparador de tres niveles con barrido narrado (PKG-C)
   Emite 'tp:state' {state: 'design' | 'sim' | 'fab'} con el panel más ancho. */
import { $, $$, clamp, isReduced, onMeasure, observeOnce } from './core.js';

/* Coordenadas en % de la imagen (16:10); side: lado del rótulo */
const CALLOUTS = {
  design: [
    { x: 36, y: 52, t: 'Nervio e = 10', s: 'l' },
    { x: 32, y: 72, t: 'Ranura 11 × 22', s: 'l' },
    { x: 27, y: 81, t: '140 × 90 × 12', s: 'l' },
  ],
  sim: [
    { x: 44, y: 60, t: 'Esfuerzo máx.<br>148 MPa', s: 'r' },
    { x: 44, y: 25, t: 'FS mín. 2.6', s: 'r' },
  ],
  fab: [
    { x: 73, y: 28, t: 'Al 6061-T6', s: 'r' },
    { x: 71, y: 50, t: 'CNC 3 ejes', s: 'r' },
    { x: 72, y: 81, t: 'Anodizado', s: 'r' },
  ],
};
const REST = [42, 60];
const MIN_GAP = 6;
const NAMES = ['Modelo CAD', 'simulación', 'pieza fabricada'];
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function initTriptych() {
  const box = $('[data-triptych]');
  if (!box) return;
  const handles = $$('.tp-handle', box);
  const panes = ['design', 'sim', 'fab'];
  const labels = panes.map((k) => $(`.tp-${k} .tp-label`, box));
  const scale = $('.tp-scale', box);

  // Anotaciones
  const notes = [];
  panes.forEach((k, pi) => {
    const host = $(`[data-callouts="${k}"]`, box);
    if (!host) return;
    host.innerHTML = CALLOUTS[k].map((c) => `<span class="callout callout-${k}" data-side="${c.s}" style="left:${c.x}%;top:${c.y}%"><i></i><b>${c.t}</b></span>`).join('');
    $$('.callout', host).forEach((el, i) => notes.push({ el, pane: pi, host, c: CALLOUTS[k][i], X: 0, w: 0, on: null }));
  });

  const pos = REST.slice();
  let widest = '';
  let settled = true;
  const motion = document.documentElement.classList.contains('motion') && !isReduced() && 'IntersectionObserver' in window;
  if (motion) { pos[0] = 100; pos[1] = 100; settled = false; box.classList.add('is-sweeping'); }

  // Medidas cacheadas (ancho del escenario, rótulos, anotaciones en % del escenario)
  let W = 1;
  const lw = [0, 0, 0];
  let sw = 0;
  onMeasure(() => {
    const r = box.getBoundingClientRect();
    W = r.width || 1;
    labels.forEach((l, i) => { if (l) { const mw = l.style.maxWidth; l.style.maxWidth = 'none'; lw[i] = l.offsetWidth; l.style.maxWidth = mw; } });
    sw = scale ? scale.offsetWidth : 0;
    notes.forEach((n) => {
      const h = n.host.getBoundingClientRect();
      n.X = ((h.left - r.left + (n.c.x / 100) * h.width) / W) * 100;
      const b = $('b', n.el);
      n.w = (((b ? b.offsetWidth : 0) + 24) / W) * 100;
    });
    apply();
  });

  function write() {
    handles.forEach((h, k) => {
      const v = Math.round(pos[k]);
      h.setAttribute('aria-valuenow', String(v));
      h.setAttribute('aria-valuemin', String(k === 0 ? 3 : Math.round(pos[0] + MIN_GAP)));
      h.setAttribute('aria-valuemax', String(k === 0 ? Math.round(pos[1] - MIN_GAP) : 97));
      const a = Math.round(pos[0]), b = Math.round(pos[1]);
      const w = [a, b - a, 100 - b];
      const n0 = NAMES[k].charAt(0).toUpperCase() + NAMES[k].slice(1);
      h.setAttribute('aria-valuetext', `${n0} ${w[k]} %, ${NAMES[k + 1]} ${w[k + 1]} %`);
    });
  }
  function apply() {
    const [a, b] = pos;
    box.style.setProperty('--a', a + '%');
    box.style.setProperty('--b', b + '%');
    const range = [[0, a], [a, b], [b, 100]];
    // Rótulos: se ocultan enteros si no caben (nunca cortados a media palabra)
    labels.forEach((l, i) => {
      if (!l) return;
      const px = ((range[i][1] - range[i][0]) / 100) * W;
      l.classList.toggle('is-cut', px < lw[i] + 24);
    });
    if (scale) scale.classList.toggle('is-cut', ((b - a) / 100) * W < sw + 20);
    notes.forEach((n) => {
      const [s, e] = range[n.pane];
      const on = n.c.s === 'r' ? n.X - 2 >= s && n.X + n.w + 1 <= e : n.X - n.w - 1 >= s && n.X + 2 <= e;
      if (on !== n.on) { n.on = on; n.el.classList.toggle('is-on', on); }
    });
    const w = [a, b - a, 100 - b];
    const k = panes[w.indexOf(Math.max(...w))];
    if (k !== widest) {
      widest = k;
      box.dataset.widest = k;
      document.dispatchEvent(new CustomEvent('tp:state', { detail: { state: k } }));
    }
    if (settled) write();
  }

  const setPos = (k, v) => {
    if (k === 0) pos[0] = clamp(v, 3, pos[1] - MIN_GAP);
    else pos[1] = clamp(v, pos[0] + MIN_GAP, 97);
    apply();
  };

  // Barrido narrado: CAD puro → entra la simulación → entra la fabricación (una sola vez)
  let raf = 0;
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (!settled) { settled = true; box.classList.remove('is-sweeping'); write(); }
  };
  if (motion) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      if (settled) return;
      let t0 = 0;
      const step = (now) => {
        if (!t0) t0 = now + 250;
        const t = now - t0;
        pos[0] = 100 + (REST[0] - 100) * easeInOut(clamp(t / 900, 0, 1));
        pos[1] = 100 + (REST[1] - 100) * easeInOut(clamp((t - 450) / 900, 0, 1));
        apply();
        if (t < 1350) raf = requestAnimationFrame(step); else { raf = 0; stop(); }
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.5 });
    io.observe(box);
  }

  // Arrastre: 1:1; en táctil solo desde los divisores
  const pct = (x) => { const r = box.getBoundingClientRect(); W = r.width || W; return ((x - r.left) / r.width) * 100; };
  let active = -1;
  const release = () => {
    if (active < 0) return;
    handles[active].classList.remove('is-dragging');
    box.classList.remove('is-dragging');
    active = -1;
  };
  box.addEventListener('pointerdown', (e) => {
    stop();
    const h = e.target.closest('.tp-handle');
    if (!h && e.pointerType !== 'mouse') return;
    if (e.button > 0) return;
    const p = pct(e.clientX);
    const d0 = Math.abs(p - pos[0]), d1 = Math.abs(p - pos[1]);
    active = h ? +h.dataset.handle : d0 < d1 ? 0 : d1 < d0 ? 1 : p < pos[0] ? 0 : 1;
    box.setPointerCapture(e.pointerId);
    handles[active].classList.add('is-dragging');
    box.classList.add('is-dragging');
    if (!h) setPos(active, p);
    handles[active].focus({ preventScroll: true });
    e.preventDefault();
  });
  box.addEventListener('pointermove', (e) => { if (active >= 0) setPos(active, pct(e.clientX)); });
  box.addEventListener('pointerup', release);
  box.addEventListener('pointercancel', release);
  box.addEventListener('keydown', stop, true);
  handles.forEach((h, k) => h.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
    if (e.key in map) { setPos(k, pos[k] + map[e.key]); e.preventDefault(); }
    if (e.key === 'Home') { setPos(k, 0); e.preventDefault(); }
    if (e.key === 'End') { setPos(k, 100); e.preventDefault(); }
  }));

  // Precarga de las tres capas cuando Servicios se acerca
  const imgs = $$('img', box);
  observeOnce('#servicios', () => imgs.forEach((im) => { im.loading = 'eager'; }), { rootMargin: '150% 0px' });

  apply();
}

export function init() { initTriptych(); }
