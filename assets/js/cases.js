/* Casos (PKG-B): trama Atkinson en vivo para el banner de Materializa.
   Se dibuja una vez cuando la figura se acerca al viewport y solo se repite
   si cambia el ancho (ResizeObserver, 150 ms de espera). Sin bucles. */
import { $$, observeOnce } from './core.js';

// Cada punto mide 2 px CSS: 1200 px de fuente sobran en escritorio y 640 en móvil (ya en caché por el img)
const srcFor = (w) => `assets/img/macro-fabricado-${w / 2 > 300 ? 1200 : 640}.webp`;
const INK = [13, 15, 18];       // #0d0f12
const PAPER = [227, 233, 230];  // #e3e9e6 (--paper)
const BG = 0.13; // el fondo del render (L ≈ .08–.10) queda como papel, no como mancha de tinta

function atkinson(src, cw, ch) {
  const off = document.createElement('canvas');
  off.width = cw; off.height = ch;
  const c = off.getContext('2d', { willReadFrequently: true });
  // recorte tipo cover
  const s = Math.max(cw / src.naturalWidth, ch / src.naturalHeight);
  const w = src.naturalWidth * s, h = src.naturalHeight * s;
  c.drawImage(src, (cw - w) / 2, (ch - h) / 2, w, h);
  const img = c.getImageData(0, 0, cw, ch);
  const px = img.data;
  const n = cw * ch;
  const v = new Float32Array(n + cw * 2 + 2);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const L = (0.2126 * px[j] + 0.7152 * px[j + 1] + 0.0722 * px[j + 2]) / 255;
    v[i] = L < BG ? 0 : Math.min(1, Math.max(0.08, 1.15 - 1.1 * L));
  }
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = y * cw + x;
      const old = v[i];
      const ink = old >= 0.5;
      const e = (old - (ink ? 1 : 0)) / 8;
      if (x + 1 < cw) v[i + 1] += e;
      if (x + 2 < cw) v[i + 2] += e;
      if (y + 1 < ch) {
        if (x > 0) v[i + cw - 1] += e;
        v[i + cw] += e;
        if (x + 1 < cw) v[i + cw + 1] += e;
      }
      if (y + 2 < ch) v[i + cw * 2] += e;
      const col = ink ? INK : PAPER;
      const j = i * 4;
      px[j] = col[0]; px[j + 1] = col[1]; px[j + 2] = col[2]; px[j + 3] = 255;
    }
  }
  return img;
}

function initDither(fig) {
  const cv = fig.querySelector('canvas');
  if (!cv || !cv.getContext) return;
  const src = new Image();
  src.decoding = 'async';
  let lastW = 0;
  let timer = 0;
  const draw = () => {
    const cw = Math.floor(fig.clientWidth / 2), ch = Math.floor(fig.clientHeight / 2);
    if (!cw || !ch || cw === lastW || !src.naturalWidth) return;
    lastW = cw;
    try {
      const data = atkinson(src, cw, ch);
      cv.width = cw; cv.height = ch;
      cv.style.width = `${cw * 2}px`; cv.style.height = `${ch * 2}px`;
      cv.getContext('2d').putImageData(data, 0, 0);
      fig.classList.add('is-dithered');
    } catch { fig.classList.remove('is-dithered'); }
  };
  src.onload = () => {
    draw();
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(draw, 150); }).observe(fig);
    }
  };
  src.src = srcFor(fig.clientWidth);
}

export function init() {
  observeOnce($$('[data-dither]'), initDither, { rootMargin: '200% 0px' });
}
