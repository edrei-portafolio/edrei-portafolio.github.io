/* Shell: índice, pestañas, barra lateral compacta, bloque CTA y símbolo Z (PKG-A) */
import { $, $$, clamp, isReduced, desktopMq, onFrame, onMeasure, spy } from './core.js';

const root = document.documentElement;
const TAB_OF = { modela: 'servicios', valida: 'servicios', materializa: 'servicios', demo: 'demo', 'sobre-mi': 'sobre-mi', contacto: 'contacto' };
const LEVELS = ['modela', 'valida', 'materializa'];
const VIEW_OF = { modela: 'wire', manifiesto: 'wire', valida: 'thermal', materializa: 'solid', 'sobre-mi': 'solid', contacto: 'solid', demo: 'thermal' };
const VIEW_TXT = { wire: 'Alámbrica', thermal: 'Térmica', solid: 'Sólida' };
const TP_VIEW = { design: 'wire', sim: 'thermal', fab: 'solid' };
const PLAN_DRAW_MS = 1250;

let mark = null;
let view = 'wire';
let tpView = 'thermal';
let compact = false;

/* Para motion.js: instancia de la Z (o null) y vista actual */
export const getMark = () => mark;
export const getView = () => view;

/* ---------- Estado visual de la Z (lectura + 3D) ---------- */
function setView(v, opts) {
  view = v;
  const out = $('[data-view]');
  if (out) out.textContent = `Vista · ${VIEW_TXT[v]}`;
  if (mark) mark.setState(v, opts);
}
const viewFor = (id) => (id === 'demo' ? tpView : VIEW_OF[id] || 'wire');

/* ---------- Activo: pestañas (tinta), índice y franja ---------- */
function makeActive() {
  const nav = $('.tabs');
  const ink = $('.tabs-ink');
  const tabs = $$('.tabs > a.tab');
  const idx = $$('[data-idx]');
  const lvl = $$('[data-lvl]');
  let tabId = '';
  const placeInk = () => {
    if (!ink || !nav) return;
    const a = tabs.find((t) => t.dataset.tab === tabId);
    if (!a) { ink.style.clipPath = 'inset(0 100% 0 0)'; return; }
    const L = a.offsetLeft, R = nav.clientWidth - L - a.offsetWidth;
    ink.style.clipPath = `inset(0 ${R + 1}px 0 ${L + 1}px)`;
  };
  const set = (id) => {
    tabId = TAB_OF[id] || '';
    const cur = (a, on) => { if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); };
    tabs.forEach((a) => cur(a, a.dataset.tab === tabId));
    [...idx, ...lvl].forEach((a) => {
      const on = (a.dataset.idx || a.dataset.lvl) === id;
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    placeInk();
  };
  onMeasure(placeInk);
  return set;
}

/* ---------- Progreso de cada caso (índice lateral + franja móvil) ---------- */
function initProgress() {
  const cases = $$('[data-case]').map((el) => ({
    el, links: $$(`[data-idx="${el.dataset.case}"], [data-lvl="${el.dataset.case}"]`), top: 0, h: 1, p: '',
  }));
  if (!cases.length) return;
  onMeasure(() => {
    const y = scrollY;
    cases.forEach((c) => { const r = c.el.getBoundingClientRect(); c.top = r.top + y; c.h = r.height || 1; });
  });
  onFrame((y, vh) => {
    const mid = y + vh * 0.5;
    cases.forEach((c) => {
      const inside = mid >= c.top && mid < c.top + c.h;
      const p = inside ? clamp((mid - c.top) / c.h, 0, 1).toFixed(3) : '0';
      if (p !== c.p) { c.p = p; c.links.forEach((a) => a.style.setProperty('--p', p)); }
    });
  });
}

/* ---------- Navegación por clic: activo inmediato, spy en pausa ---------- */
function initNav(setActive) {
  const sp = spy();
  let timer = 0;
  const resume = () => { clearTimeout(timer); removeEventListener('scrollend', resume); sp.resume(); };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.tabs a[href^="#"], .side-index a[href^="#"], .lvl-strip a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    const sid = id === 'servicios' ? 'modela' : id;
    setActive(sid);
    setView(viewFor(sid));
    sp.pause();
    clearTimeout(timer);
    addEventListener('scrollend', resume, { once: true });
    timer = setTimeout(resume, 900);
  });
}

/* ---------- Barra lateral compacta tras el manifiesto ---------- */
function initSide() {
  const side = $('.side');
  const man = $('#manifiesto');
  const logo = $('.side-logo');
  const model = $('.side-model');
  const index = $('.side-index');
  const plan = $('.side-plan');
  if (!side || !man || !model) return;
  onMeasure(() => {
    if (plan && plan.clientHeight) plan.style.strokeWidth = String(((devicePixelRatio >= 2 ? 0.5 : 1) * 156) / plan.clientHeight);
    if (!desktopMq.matches || !logo || !index) return;
    // Z a escala .5: alto visible = 100/156 de la caja × .5, centrado en la caja
    const boxTop = model.offsetTop, boxH = model.offsetHeight;
    const zH = boxH * (100 / 156) * 0.5;
    const logoBottom = logo.offsetTop + logo.offsetHeight;
    const zTop = logoBottom + 28;
    const dyM = zTop + zH / 2 - (boxTop + boxH / 2);
    const dyI = zTop + zH + 24 - index.offsetTop;
    side.style.setProperty('--dy-m', `${dyM.toFixed(1)}px`);
    side.style.setProperty('--dy-i', `${dyI.toFixed(1)}px`);
  });
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(([en]) => {
    const c = !en.isIntersecting && en.boundingClientRect.top < 0;
    if (c === compact) return;
    compact = c;
    side.classList.toggle('is-compact', c);
    if (mark) mark.setScale(c ? 0.5 : 1);
  }, { rootMargin: '-35% 0px 0px 0px' }).observe(man);
}

/* ---------- Bloque de cotización: oculto en contacto; en móvil se recoge al bajar ---------- */
function initCta() {
  const cta = $('[data-cta]');
  const contact = $('#contacto');
  const man = $('#manifiesto');
  if (!cta) return;
  let inContact = false, tucked = false;
  const apply = () => {
    const off = inContact || tucked;
    cta.classList.toggle('is-hidden', inContact);
    cta.classList.toggle('is-tucked', tucked && !inContact);
    cta.toggleAttribute('inert', off);
    if (off) cta.setAttribute('tabindex', '-1'); else cta.removeAttribute('tabindex');
  };
  if (contact && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => {
      inContact = en.isIntersecting || en.boundingClientRect.top < 0;
      apply();
    }, { rootMargin: '0px 0px -15% 0px' }).observe(contact);
  }
  let manEnd = 0, lastY = scrollY;
  onMeasure(() => { manEnd = man ? man.offsetTop + man.offsetHeight : 0; });
  onFrame((y) => {
    const d = y - lastY;
    if (Math.abs(d) <= 8) return;
    lastY = y;
    const t = !desktopMq.matches && d > 0 && y > manEnd;
    if (t !== tucked) { tucked = t; apply(); }
  });
}

/* ---------- Símbolo Z 3D (solo escritorio, con WebGL, sin ahorro de datos) ---------- */
function initMark() {
  const canvas = $('#marca3d');
  if (!canvas) return;
  const ok = desktopMq.matches && !(navigator.connection && navigator.connection.saveData);
  let gl = false;
  if (ok) {
    try { const probe = document.createElement('canvas'); gl = !!(probe.getContext('webgl2') || probe.getContext('webgl')); } catch (e) { gl = false; }
  }
  if (!ok || !gl) { if (ok) root.classList.add('no-webgl'); return; }
  import('./mark3d.js').then((mod) => {
    mark = mod.createMark(canvas, { reduced: isReduced() });
    mark.setState(view, { instant: true });
    if (compact) mark.setScale(0.5);
    onMeasure(() => mark.resize());
    // Intro: plano 2D → extrusión, solo en la primera pantalla y con movimiento
    const play = root.classList.contains('motion') && scrollY < innerHeight * 0.5 && !compact;
    if (!play) { mark.renderOnce(); requestAnimationFrame(() => root.classList.add('has-webgl')); return; }
    // Espera a que el plóter termine el plano (150 + 4×90 + 700 ms) y luego extruye
    setTimeout(() => {
      if (compact) { mark.setScale(0.5); root.classList.add('has-webgl'); return; }
      mark.intro();
      requestAnimationFrame(() => root.classList.add('has-webgl'));
    }, Math.max(0, PLAN_DRAW_MS - performance.now()));
  }).catch(() => root.classList.add('no-webgl'));
}

export function init() {
  const sp = spy();
  const setActive = makeActive();
  document.addEventListener('ez:section', (e) => {
    const id = e.detail.id;
    setActive(id);
    setView(viewFor(id));
  });
  if (sp.current) { setActive(sp.current); setView(viewFor(sp.current)); }
  document.addEventListener('tp:state', (e) => {
    tpView = TP_VIEW[e.detail.state] || 'thermal';
    if (root.dataset.section === 'demo') setView(tpView);
  });
  document.addEventListener('ez:sent', () => {
    setView('solid');
    if (mark) mark.pulse();
  });
  initProgress();
  initNav(setActive);
  initSide();
  initCta();
  initMark();
}
