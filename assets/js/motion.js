/* Movimiento (PKG-M): un momento de carga, revelados por capítulo una sola vez.
   - Pre-estados en CSS bajo html.motion; los de capítulo exigen html.mo-ready,
     que solo se pone aquí cuando todo quedó preparado. Si algo falla, se quita
     html.motion y todo queda en su estado final.
   - Sin bucles: solo IntersectionObserver y animaciones CSS que terminan solas. */
import { $, $$, rmq, observeOnce } from './core.js';
import { getMark, getView } from './shell.js';
import { stopSweep } from './demo.js';

const root = document.documentElement;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const RM = '0px 0px -12% 0px';
const HERO_STEPS = [0, 70, 130, 180, 220, 255, 285];
const H2_STEPS = [0, 60, 110, 150];
const LATE_MS = 2300; // después de esto el failsafe ya mostró el titular: no se anima
const motionOn = () => root.classList.contains('motion');

/* Estado final inmediato (scroll inicial, hash, movimiento reducido o error) */
function finalize() {
  root.classList.remove('motion', 'mo-ready');
  $$('.rv, .rv-h, .tbl, .case-row, .steps, .ind, .person-tile, .collage figure').forEach((el) => el.classList.add('is-in'));
  const h1 = $('.manifesto-text');
  if (h1) h1.classList.add('is-split', 'is-go');
  try { const m = getMark(); if (m) m.setState(getView(), { instant: true }); } catch (e) { /* sin Z */ }
}
function toReduced() {
  finalize();
  try { stopSweep(); } catch (e) { /* sin demo */ }
}

/* ---------- Palabras en máscara (sin partir letras) ---------- */
function mkWm(word) {
  const o = document.createElement('span');
  const i = document.createElement('span');
  o.className = 'wm';
  o.setAttribute('aria-hidden', 'true');
  if (word) i.textContent = word;
  o.appendChild(i);
  return o;
}
function splitWords(el) {
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  const walk = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.nodeValue.split(/(\s+)/);
        if (parts.every((p) => !p.trim())) return;
        const frag = document.createDocumentFragment();
        parts.forEach((p) => { if (p) frag.appendChild(p.trim() ? mkWm(p) : document.createTextNode(p)); });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        if (n.classList.contains('cota-word')) {
          // La palabra acotada y su puntuación van juntas en una sola máscara
          const w = mkWm('');
          n.before(w);
          w.firstChild.appendChild(n);
          const nx = w.nextSibling;
          const m = nx && nx.nodeType === 3 && nx.nodeValue.match(/^\S+/);
          if (m) { w.firstChild.appendChild(document.createTextNode(m[0])); nx.nodeValue = nx.nodeValue.slice(m[0].length); }
        } else walk(n);
      }
    });
  };
  walk(el);
}
/* Al terminar, se deshacen las máscaras: el estado final es el texto original
   (mismo kerning y mismos cortes de línea que sin movimiento). */
function unwrap(el) {
  $$('.wm', el).forEach((w) => w.replaceWith(...w.firstChild.childNodes));
  el.normalize();
  el.removeAttribute('aria-label');
  el.classList.add('is-done');
}
/* Retardo por línea (agrupa por posición vertical). Devuelve el de la última línea. */
function lineDelays(el, steps, base) {
  const tops = [];
  $$('.wm', el).forEach((w) => {
    const t = w.getBoundingClientRect().top;
    let L = tops.findIndex((x) => Math.abs(x - t) < 6);
    if (L < 0) { tops.push(t); L = tops.length - 1; }
    w.style.setProperty('--d', `${base + steps[Math.min(L, steps.length - 1)]}ms`);
  });
  return base + steps[Math.min(Math.max(tops.length - 1, 0), steps.length - 1)];
}

/* ---------- Carga: titular del manifiesto ---------- */
async function hero() {
  const h1 = $('.manifesto-text');
  if (!h1) return;
  try {
    const f = document.fonts && document.fonts.load ? document.fonts.load('300 1em Newsreader') : Promise.resolve();
    await Promise.race([f.catch(() => {}), wait(600)]);
  } catch (e) { /* sigue */ }
  try {
    if (motionOn() && performance.now() < LATE_MS) {
      splitWords(h1);
      const last = lineDelays(h1, HERO_STEPS, 120);
      h1.style.setProperty('--cd', `${last + 600}ms`);
      setTimeout(() => unwrap(h1), last + 1450);
    } else h1.style.setProperty('--cd', '0ms');
  } finally {
    h1.classList.add('is-split', 'is-go');
  }
}

/* ---------- Capítulos ---------- */
function setupChapters() {
  // Títulos de caso: una sola palabra, un solo nodo de texto (conserva el kerning)
  $$('.case-title').forEach((h) => {
    if (h.children.length) return;
    const o = document.createElement('span');
    const i = document.createElement('span');
    o.className = 'tm';
    i.textContent = h.textContent;
    o.appendChild(i);
    h.textContent = '';
    h.appendChild(o);
  });
  const heads = $$('.case-head, .demo-head');
  heads.forEach((el) => el.classList.add('rv'));

  // Títulos de frase (demo, sobre mí, contacto): máscaras por palabra
  const h2s = $$('.demo-title, .team-title, .contact-title');
  h2s.forEach((h) => { splitWords(h); h.classList.add('rv-h'); });

  // Tablas: la fila del caso hace de anfitrión; las demás se observan solas
  $$('.case-table').forEach((dl) => (dl.closest('.case-row') || dl).classList.add('tbl'));
  const tbls = $$('.case-table.tbl');

  return { heads, h2s, tbls };
}

function observeChapters({ heads, h2s, tbls }) {
  const reveal = (el) => el.classList.add('is-in');
  observeOnce(heads, reveal, { rootMargin: RM });
  observeOnce(h2s, (h) => {
    const last = lineDelays(h, H2_STEPS, 0);
    requestAnimationFrame(() => { reveal(h); setTimeout(() => unwrap(h), last + 1000); });
  }, { rootMargin: RM });
  observeOnce($$('.case-row'), reveal, { rootMargin: RM });
  observeOnce(tbls, reveal, { rootMargin: RM });
  observeOnce($$('.steps, .ind, .person-tile'), reveal, { rootMargin: RM });

  // Collages: por lote, de izquierda a derecha, tras cargar y decodificar
  const figs = $$('.collage figure');
  if (!('IntersectionObserver' in window)) { figs.forEach(reveal); return; }
  // El recorte inicial (clip-path) impide que la carga diferida arranque sola:
  // pedimos cada imagen con antelación, unos 1.5 altos de pantalla antes del revelado.
  const pre = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    pre.unobserve(e.target);
    const im = e.target.querySelector('img');
    if (im) im.loading = 'eager';
  }), { rootMargin: '150% 0px' });
  figs.forEach((f) => pre.observe(f));
  const ready = (img) => {
    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth) return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    img.loading = 'eager';
    return new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
  };
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((e, i) => {
        const f = e.target;
        io.unobserve(f);
        f.style.setProperty('--d', `${i * 90}ms`);
        const img = f.querySelector('img');
        Promise.race([ready(img), wait(1200)]).then(() => reveal(f));
      });
  }, { rootMargin: RM });
  figs.forEach((f) => io.observe(f));
}

export function init() {
  rmq.addEventListener('change', () => { if (rmq.matches) toReduced(); });
  if (!motionOn()) return;
  if (location.hash || scrollY > innerHeight * 0.5 || performance.now() > LATE_MS + 2000) { finalize(); return; }
  try {
    const parts = setupChapters();
    root.classList.add('mo-ready');
    observeChapters(parts);
  } catch (err) {
    finalize();
    throw err;
  }
  hero();
  // Restauración tardía del scroll: si la página quedó abajo, todo en su estado final
  addEventListener('load', () => { if (scrollY > innerHeight * 0.5 && performance.now() < 4000) finalize(); }, { once: true });
}
