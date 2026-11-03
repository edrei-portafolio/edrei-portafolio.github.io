/* Edrei · Interacción del portafolio */
const root = document.documentElement;
root.classList.add('js');
if (!root.lang) root.lang = 'es';

const CFG = Object.assign(
  { nombre: 'Edrei', marca: 'EJE Z', whatsapp: '', correo: '', ciudad: '', cargo: '', redes: {} },
  window.EJEZ_CONFIG || {}
);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const waNumber = String(CFG.whatsapp || '').replace(/\D/g, '');
const waUrl = (text) => `https://wa.me/${waNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/* ---------- Datos de configuración ---------- */
function applyConfig() {
  $$('[data-cfg]').forEach((el) => { const v = CFG[el.dataset.cfg]; if (v) el.textContent = v; });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  $$('[data-needs]').forEach((el) => { el.hidden = !CFG[el.dataset.needs]; });
  $$('[data-red-link]').forEach((a) => {
    const url = CFG.redes && CFG.redes[a.dataset.redLink];
    a.hidden = !url;
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; }
  });
}

/* ---------- Títulos: letras que entran desenfocadas ---------- */
function initLetters() {
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
function initReveal() {
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

/* ---------- Comparador de tres estados (proyecto demo) ---------- */
const CALLOUTS = {
  design: [ { x: 19, y: 86, t: '140 × 90 × 12' }, { x: 22, y: 70, t: 'Ranura 11 × 22' }, { x: 24, y: 47, t: 'Nervio e = 10' } ],
  sim: [ { x: 49, y: 74, t: 'σ máx. 148 MPa' }, { x: 50, y: 27, t: 'FS mín. 2.6' } ],
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
  if (!reducedMotion) {
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

/* ---------- Formulario: mensaje listo para WhatsApp ---------- */
function initForm() {
  const form = $('#brief');
  if (!form) return;
  const wa = $('#enviar-wa');
  const status = $('#estado');
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ref = `EZ-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${100 + Math.floor(Math.random() * 900)}`;
  const val = (name) => { const el = form.elements[name]; return el ? (el instanceof RadioNodeList ? el.value : (el.value || '').trim()) : ''; };
  const message = () => [
    `Hola, ${CFG.nombre}. Quiero cotizar un proyecto.`,
    '',
    `• Nivel: ${val('nivel')}`,
    `• Mensaje: ${val('descripcion') || '(por completar)'}`,
    '',
    `Nombre: ${val('nombre') || '(por completar)'}`,
    val('medio') ? `Contacto: ${val('medio')}` : null,
    `Ref.: ${ref}`,
  ].filter((l) => l !== null).join('\n');
  const render = () => { wa.href = waUrl(message()); };
  const say = (text, error = false) => { status.textContent = text; status.classList.toggle('is-error', error); };
  form.addEventListener('input', (e) => { e.target.classList.remove('is-invalid'); e.target.removeAttribute('aria-invalid'); render(); });
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());
  wa.addEventListener('click', (e) => {
    const missing = ['nombre', 'medio', 'descripcion'].filter((n) => !val(n));
    if (missing.length) {
      e.preventDefault();
      missing.forEach((n) => { const el = form.elements[n]; el.classList.add('is-invalid'); el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'estado'); });
      say('Completa tu nombre, tu WhatsApp o correo y un breve mensaje.', true);
      form.elements[missing[0]].focus();
      return;
    }
    say('Abriendo WhatsApp con tu mensaje. Si no se abre, copia el mensaje y envíalo tú.');
  });
  const copied = CFG.correo ? `Mensaje copiado. Pégalo en WhatsApp o envíalo a ${CFG.correo}.` : 'Mensaje copiado. Pégalo en WhatsApp o en un correo.';
  $('#copiar').addEventListener('click', async () => {
    const text = message();
    try { await navigator.clipboard.writeText(text); say(copied); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      say(ok ? copied : 'No se pudo copiar automáticamente. Selecciona tu mensaje y cópialo.', !ok);
    }
  });
  $$('[data-pick-level]').forEach((a) => a.addEventListener('click', () => {
    const id = { X: 'nivel-opt-x', Y: 'nivel-opt-y', Z: 'nivel-opt-z' }[a.dataset.pickLevel];
    const input = document.getElementById(id);
    if (input) { input.checked = true; render(); }
  }));
  render();
}

/* ---------- Índice lateral, pestañas y bloque fijo ---------- */
function initScroll() {
  const cases = $$('[data-case]');
  const idx = new Map($$('[data-idx]').map((a) => [a.dataset.idx, a]));
  const tabs = $$('[data-tab]');
  const sections = tabs.map((t) => document.getElementById(t.dataset.tab)).filter(Boolean);
  const cta = $('[data-cta]');
  const contact = $('#contacto');
  const updateBlur = initBlurText();
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
    updateBlur(now);
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

/* ---------- WhatsApp directo si hay número ---------- */
function initDirect() {
  if (!waNumber) return;
  $$('[data-wa-link]').forEach((a) => { a.href = waUrl(`Hola, ${CFG.nombre}. Quiero información sobre tus servicios.`); a.target = '_blank'; a.rel = 'noopener'; });
}

applyConfig();
initLetters();
initReveal();
initTriptych();
initForm();
initDirect();
initScroll();
