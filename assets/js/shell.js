/* Shell: índice, pestañas, bloque fijo y símbolo 3D (PKG-A) */
import { $, $$, clamp, isReduced, onFrame, onMeasure, spy } from './core.js';

const root = document.documentElement;
const TAB_OF = { modela: 'servicios', valida: 'servicios', materializa: 'servicios', demo: 'demo', 'sobre-mi': 'sobre-mi', contacto: 'contacto' };

/* Índice lateral: caso activo y progreso --p, con offsets cacheados */
function initIndex() {
  const cases = $$('[data-case]').map((el) => ({ el, a: $(`[data-idx="${el.dataset.case}"]`), top: 0, h: 1, p: '', on: null }));
  onMeasure(() => {
    const y = scrollY;
    cases.forEach((c) => { const r = c.el.getBoundingClientRect(); c.top = r.top + y; c.h = r.height || 1; });
  });
  onFrame((y, vh) => {
    const mid = y + vh * 0.5;
    cases.forEach((c) => {
      if (!c.a) return;
      const inside = mid >= c.top && mid < c.top + c.h;
      const p = inside ? clamp((mid - c.top) / c.h, 0, 1).toFixed(3) : '0';
      if (p !== c.p) { c.p = p; c.a.style.setProperty('--p', p); }
      if (inside !== c.on) { c.on = inside; c.a.classList.toggle('is-active', inside); }
    });
  });
}

/* Pestañas desde html[data-section] */
function initTabs() {
  const tabs = $$('[data-tab]');
  const set = (id) => { const t = TAB_OF[id] || ''; tabs.forEach((a) => a.classList.toggle('is-active', a.dataset.tab === t)); };
  document.addEventListener('ez:section', (e) => set(e.detail.id));
  set(root.dataset.section);
}

/* Bloque de cotización oculto mientras el contacto está a la vista */
function initCta() {
  const cta = $('[data-cta]');
  const contact = $('#contacto');
  if (!cta || !contact || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => {
    const v = en.isIntersecting || en.boundingClientRect.top < 0;
    cta.classList.toggle('is-hidden', v);
    cta.toggleAttribute('inert', v);
    if (v) cta.setAttribute('tabindex', '-1'); else cta.removeAttribute('tabindex');
  }, { rootMargin: '0px 0px -15% 0px' }).observe(contact);
}

/* Símbolo 3D en líneas (si hay WebGL) */
function initMark() {
  const canvas = $('#marca3d');
  if (!canvas) return;
  const boot = async () => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('Sin WebGL');
      const mod = await import('./mark3d.js');
      const mark = mod.createMark(canvas, { reduced: isReduced() });
      addEventListener('resize', () => mark.resize(), { passive: true });
      new IntersectionObserver(([en]) => { if (en.isIntersecting) mark.start(); else mark.stop(); }).observe(canvas);
      let docH = 1;
      onMeasure(() => { docH = Math.max(1, root.scrollHeight - innerHeight); });
      onFrame((y) => mark.setProgress(y / docH));
      mark.renderOnce();
      root.classList.add('has-webgl');
    } catch (err) {
      root.classList.add('no-webgl');
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 }); else setTimeout(boot, 200);
}

export function init() {
  spy();
  initIndex();
  initTabs();
  initCta();
  initMark();
}
