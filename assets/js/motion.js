/* Movimiento (temporal, se elimina en el paso 2) */
import { $$, clamp, reducedMotion } from './core.js';

/* ---------- Títulos: letras que entran desenfocadas ---------- */
export function initLetters() {
  const els = $$('[data-letters]');
  els.forEach((el) => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.innerHTML = [...txt].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c}</span>`).join('');
  });
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove('is-pending'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -10% 0px' });
  els.forEach((el) => { if (el.getBoundingClientRect().top > innerHeight * 0.9) { el.classList.add('is-pending'); io.observe(el); } });
}

/* ---------- Imágenes del collage que suben al aparecer ---------- */
export function initReveal() {
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove('is-pending'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.collage figure').forEach((f, i) => {
    f.classList.add('reveal');
    if (f.getBoundingClientRect().top > innerHeight * 0.95) {
      f.classList.add('is-pending');
      f.style.transitionDelay = `${(i % 3) * 90}ms`;
      io.observe(f);
    }
  });
}

/* ---------- Manifiesto: palabras que pasan de borrosas a nítidas ---------- */
function initBlurText() {
  const blocks = $$('[data-blur]').map((el) => {
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const sp = document.createElement('span'); sp.className = 'w'; sp.textContent = part; frag.appendChild(sp); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return { el, words: $$('.w', el), last: -1, t0: performance.now() };
  });
  if (reducedMotion) return () => {};
  // Al cargar, las palabras se enfocan en secuencia; luego quedan nítidas
  return (now) => {
    blocks.forEach((b) => {
      const n = b.words.length;
      const head = ((now - b.t0) / 1400) * (n + 6);
      if (b.done) return;
      if (head > n + 8) {
        b.words.forEach((w) => { w.style.filter = ''; w.style.opacity = ''; });
        b.done = true;
        return;
      }
      const key = Math.round(head * 3);
      if (key === b.last) return;
      b.last = key;
      b.words.forEach((w, i) => {
        const d = clamp((i - head + 6) / 6, 0, 1);
        w.style.filter = d > 0.02 ? `blur(${(d * 8).toFixed(1)}px)` : '';
        w.style.opacity = (1 - d * 0.85).toFixed(2);
      });
    });
  };
}

export function init() {
  initLetters();
  initReveal();
  const upd = initBlurText();
  if (reducedMotion) return;
  const t0 = performance.now();
  const loop = (now) => { upd(now); if (now - t0 < 4000) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
