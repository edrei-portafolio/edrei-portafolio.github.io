/* Shell: índice, pestañas, bloque fijo y símbolo 3D (PKG-A) */
import { $, $$, clamp, reducedMotion } from './core.js';

const root = document.documentElement;

/* ---------- Índice lateral, pestañas y bloque fijo ---------- */
function initScroll() {
  const cases = $$('[data-case]');
  const idx = new Map($$('[data-idx]').map((a) => [a.dataset.idx, a]));
  const tabs = $$('[data-tab]');
  const sections = tabs.map((t) => document.getElementById(t.dataset.tab)).filter(Boolean);
  const cta = $('[data-cta]');
  const contact = $('#contacto');
  let mark = null;
  const cache = new Map();
  const write = (k, v, fn) => { if (cache.get(k) !== v) { cache.set(k, v); fn(v); } };

  const frame = (now) => {
    const vh = innerHeight;
    const mid = vh * 0.5;
    // Caso activo y su progreso
    cases.forEach((c) => {
      const r = c.getBoundingClientRect();
      const p = clamp((mid - r.top) / r.height, 0, 1);
      const inside = r.top <= mid && r.bottom > mid;
      const a = idx.get(c.dataset.case);
      if (!a) return;
      write('p' + c.id, inside ? p.toFixed(3) : '0', (v) => a.style.setProperty('--p', v));
      write('a' + c.id, inside, (v) => a.classList.toggle('is-active', v));
    });
    // Pestaña activa
    let current = '';
    sections.forEach((s) => { const r = s.getBoundingClientRect(); if (r.top <= vh * 0.4 && r.bottom > vh * 0.4) current = s.id; });
    write('tab', current, (v) => tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === v)));
    // El bloque de cotización se oculta en el contacto
    const cr = contact.getBoundingClientRect();
    write('cta', cr.top < vh * 0.85, (v) => { cta.classList.toggle('is-hidden', v); cta.toggleAttribute('inert', v); if (v) cta.setAttribute('tabindex', '-1'); else cta.removeAttribute('tabindex'); });
    // Giro del símbolo según el avance de la página
    const docH = document.documentElement.scrollHeight - vh;
    if (mark) mark.setProgress(docH > 0 ? scrollY / docH : 0);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Símbolo 3D en líneas (si hay WebGL)
  const canvas = $('#marca3d');
  const boot = async () => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('Sin WebGL');
      const mod = await import('./mark3d.js');
      mark = mod.createMark(canvas, { reduced: reducedMotion });
      const size = () => mark.resize();
      addEventListener('resize', size);
      new IntersectionObserver(([en]) => { if (en.isIntersecting) mark.start(); else mark.stop(); }).observe(canvas);
      mark.renderOnce();
      root.classList.add('has-webgl');
    } catch (err) {
      root.classList.add('no-webgl');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 }); else setTimeout(boot, 200);
}

export function init() { initScroll(); }
