/* Edrei · núcleo compartido (PKG-0) */
export const CFG = Object.assign(
  { nombre: 'Edrei', marca: 'EJE Z', whatsapp: '', correo: '', ciudad: '', cargo: '', redes: {} },
  window.EJEZ_CONFIG || {}
);
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const waNumber = String(CFG.whatsapp || '').replace(/\D/g, '');
export const waUrl = (text) => `https://wa.me/${waNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

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
