/* Proyecto demo (PKG-C) */
import { $, $$, clamp, isReduced } from './core.js';

/* ---------- Comparador de tres estados (proyecto demo) ---------- */
const CALLOUTS = {
  design: [ { x: 19, y: 86, t: '140 × 90 × 12' }, { x: 22, y: 70, t: 'Ranura 11 × 22' }, { x: 24, y: 47, t: 'Nervio e = 10' } ],
  sim: [ { x: 49, y: 74, t: 'Esfuerzo máx. 148 MPa' }, { x: 50, y: 27, t: 'FS mín. 2.6' } ],
  fab: [ { x: 85, y: 24, t: 'Al 6061-T6' }, { x: 86, y: 47, t: 'CNC 3 ejes' }, { x: 84, y: 88, t: 'Anodizado' } ],
};
function initTriptych() {
  const box = $('[data-triptych]');
  if (!box) return;
  const handles = $$('.tp-handle', box);
  const pos = [33.333, 66.667];
  const MIN_GAP = 7;
  const apply = () => {
    box.style.setProperty('--a', pos[0] + '%');
    box.style.setProperty('--b', pos[1] + '%');
    handles.forEach((h, k) => {
      h.setAttribute('aria-valuenow', String(Math.round(pos[k])));
      h.setAttribute('aria-valuemin', String(k === 0 ? 3 : Math.round(pos[0] + MIN_GAP)));
      h.setAttribute('aria-valuemax', String(k === 0 ? Math.round(pos[1] - MIN_GAP) : 97));
      h.setAttribute('aria-valuetext', `${Math.round(pos[k])} %`);
    });
  };
  const setPos = (k, v) => {
    if (k === 0) pos[0] = clamp(v, 3, pos[1] - MIN_GAP);
    else pos[1] = clamp(v, pos[0] + MIN_GAP, 97);
    apply();
  };
  const pct = (x) => { const r = box.getBoundingClientRect(); return ((x - r.left) / r.width) * 100; };
  let active = -1;
  let touched = false;
  box.addEventListener('pointerdown', (e) => {
    touched = true;
    const p = pct(e.clientX);
    const h = e.target.closest('.tp-handle');
    // En pantallas táctiles solo se arrastra desde los divisores, para no interferir con el scroll
    if (!h && e.pointerType !== 'mouse') return;
    active = h ? +h.dataset.handle : Math.abs(p - pos[0]) < Math.abs(p - pos[1]) ? 0 : 1;
    box.setPointerCapture(e.pointerId);
    setPos(active, p);
    handles[active].focus({ preventScroll: true });
  });
  box.addEventListener('pointermove', (e) => { if (active >= 0) setPos(active, pct(e.clientX)); });
  box.addEventListener('pointerup', () => { active = -1; });
  box.addEventListener('pointercancel', () => { active = -1; });
  handles.forEach((h, k) => h.addEventListener('keydown', (e) => {
    touched = true;
    const step = e.shiftKey ? 10 : 2;
    const map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step };
    if (e.key in map) { setPos(k, pos[k] + map[e.key]); e.preventDefault(); }
    if (e.key === 'Home') { setPos(k, 0); e.preventDefault(); }
    if (e.key === 'End') { setPos(k, 100); e.preventDefault(); }
  }));
  Object.entries(CALLOUTS).forEach(([layer, items]) => {
    const host = $(`[data-callouts="${layer}"]`, box);
    if (host) host.innerHTML = items.map((c) => `<span class="callout callout-${layer}" style="left:${c.x}%;top:${c.y}%">${c.t}</span>`).join('');
  });
  apply();
  if (!isReduced()) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now() + 350;
      const a0 = pos[0], b0 = pos[1];
      const step = (now) => {
        if (touched) return;
        const t = clamp((now - t0) / 1600, 0, 1);
        const w = Math.sin(t * Math.PI) * 7;
        pos[0] = a0 - w; pos[1] = b0 + w;
        apply();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.55 });
    io.observe(box);
  }
}

export function init() { initTriptych(); }
