/* =========================================================
   Edrei · núcleo compartido (PKG-0). Los módulos de sección
   importan de aquí; no lo editan.

   CONTRATO DE EVENTOS (todos se emiten en `document`):
   - 'ez:section' detail {id}   la sección actual cambió (spy()).
       id ∈ manifiesto | modela | valida | materializa | demo | sobre-mi | contacto
       También queda en <html data-section="…">.
   - 'tp:state'   detail {state: 'design' | 'sim' | 'fab'}  lo emite demo.js
       (panel más ancho del comparador).
   - 'ez:sent'    detail {via: 'whatsapp' | 'copy'}  lo emite contact.js al
       enviar o copiar el mensaje.
   ========================================================= */
export const CFG = Object.assign(
  { nombre: 'Edrei', marca: 'EJE Z', whatsapp: '', correo: '', ciudad: '', cargo: '', redes: {} },
  window.EJEZ_CONFIG || {}
);
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const waNumber = String(CFG.whatsapp || '').replace(/\D/g, '');
export const waUrl = (text) => `https://wa.me/${waNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/* Movimiento reducido y escritorio (MediaQueryList: usa .matches o addEventListener('change')) */
export const rmq = matchMedia('(prefers-reduced-motion: reduce)');
export const isReduced = () => rmq.matches;
export const desktopMq = matchMedia('(min-width:1024px)');

/* ---------- Datos de configuración ---------- */
export function applyConfig() {
  $$('[data-cfg]').forEach((el) => { const v = CFG[el.dataset.cfg]; if (v) el.textContent = v; });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  $$('[data-needs]').forEach((el) => { el.hidden = !CFG[el.dataset.needs]; });
  $$('[data-red-link]').forEach((a) => {
    const url = CFG.redes && CFG.redes[a.dataset.redLink];
    a.hidden = !url;
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  });
}

/* ---------- onFrame(fn): fn(scrollY, innerHeight) una vez por cuadro tras scroll/resize ----------
   Un solo listener pasivo agenda un único rAF; en reposo no corre nada.
   Devuelve una función para darse de baja. No leas layout dentro de fn: usa offsets
   cacheados con onMeasure(). */
const frameFns = new Set();
let frameQueued = false;
const runFrame = () => {
  frameQueued = false;
  const y = scrollY, h = innerHeight;
  frameFns.forEach((fn) => fn(y, h));
};
const queueFrame = () => { if (!frameQueued && frameFns.size) { frameQueued = true; requestAnimationFrame(runFrame); } };
addEventListener('scroll', queueFrame, { passive: true });
addEventListener('resize', queueFrame, { passive: true });
export function onFrame(fn) {
  frameFns.add(fn);
  queueFrame();
  return () => frameFns.delete(fn);
}
/* Pide un cuadro aunque no haya scroll (p. ej. tras medir) */
export const requestFrame = queueFrame;

/* ---------- onMeasure(fn): medir layout ----------
   Corre en load, en document.fonts.ready y cuando el body cambia de tamaño
   (ResizeObserver, 150 ms de espera). Tras medir se agenda un onFrame. */
const measureFns = new Set();
let measureTimer = 0;
const runMeasure = () => { measureFns.forEach((fn) => fn()); queueFrame(); };
const scheduleMeasure = () => { clearTimeout(measureTimer); measureTimer = setTimeout(runMeasure, 150); };
if (document.readyState === 'complete') queueMicrotask(runMeasure); else addEventListener('load', runMeasure, { once: true });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(runMeasure);
if ('ResizeObserver' in window) {
  let first = true;
  new ResizeObserver(() => { if (first) { first = false; return; } scheduleMeasure(); }).observe(document.body);
}
export function onMeasure(fn) {
  measureFns.add(fn);
  fn();
  return () => measureFns.delete(fn);
}

/* ---------- observeOnce(targets, cb, opts): cb(el) una sola vez por elemento ---------- */
export function observeOnce(targets, cb, { rootMargin = '0px', threshold = 0 } = {}) {
  const list = typeof targets === 'string' ? $$(targets) : Array.from(targets.length !== undefined ? targets : [targets]);
  if (!('IntersectionObserver' in window)) { list.forEach(cb); return () => {}; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); cb(en.target); } });
  }, { rootMargin, threshold });
  list.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/* ---------- spy(): sección actual ----------
   Un IntersectionObserver con rootMargin '-50% 0px -50% 0px' sobre [data-spy].
   Gana el último elemento que cruza la línea media (orden del DOM). Escribe
   html[data-section] y emite 'ez:section' {id} una vez por cambio.
   spy() es idempotente y devuelve {pause, resume, current}. Durante una navegación
   por clic, pause() congela la sección y resume() la recalcula. */
let spyApi = null;
export function spy() {
  if (spyApi) return spyApi;
  const root = document.documentElement;
  const els = $$('[data-spy]');
  const on = new Set();
  let paused = false;
  let current = '';
  const pick = () => {
    if (paused) return;
    let id = '';
    els.forEach((el) => { if (on.has(el)) id = el.id; });
    if (!id || id === current) return;
    current = id;
    root.dataset.section = id;
    document.dispatchEvent(new CustomEvent('ez:section', { detail: { id } }));
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) on.add(en.target); else on.delete(en.target); });
      pick();
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
  }
  spyApi = {
    pause() { paused = true; },
    resume() { paused = false; pick(); },
    get current() { return current; },
  };
  return spyApi;
}
