/* EJE Z · Interacción del sitio */
const root = document.documentElement;
root.classList.add('js');
if (!root.lang) root.lang = 'es';

const CFG = Object.assign(
  { nombre: 'Edrei', marca: 'EJE Z', whatsapp: '', correo: '', ciudad: '', cargo: '', redes: {} },
  window.EJEZ_CONFIG || {}
);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const waNumber = String(CFG.whatsapp || '').replace(/\D/g, '');
const waUrl = (text) => `https://wa.me/${waNumber}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

/* ---------- Datos de configuración ---------- */
function applyConfig() {
  $$('[data-cfg]').forEach((el) => {
    const v = CFG[el.dataset.cfg];
    if (v) el.textContent = v;
  });
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  $$('[data-needs]').forEach((el) => { el.hidden = !CFG[el.dataset.needs]; });
  $$('[data-red]').forEach((li) => {
    const url = CFG.redes && CFG.redes[li.dataset.red];
    li.hidden = !url;
    const a = $('a', li);
    if (url && a) a.href = url;
  });
  $$('[data-socials]').forEach((ul) => { ul.hidden = !$$('[data-red]', ul).some((li) => !li.hidden); });
  if (waNumber) {
    $$('[data-wa-link]').forEach((a) => {
      a.href = waUrl(`Hola, ${CFG.nombre}. Quiero información sobre tus servicios.`);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }
}

/* ---------- Navegación en píldora + menú a pantalla completa ---------- */
function initHeader() {
  const toggle = $('.pill-menu');
  const menu = $('#menu');
  const label = $('.pill-label', toggle);
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
    if (label) label.textContent = open ? 'Cerrar' : 'Menú';
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('a', menu)?.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
}

/* ---------- Revelado suave (parte de un estado visible) ---------- */
function initReveal() {
  // Títulos gigantes: cada letra entra desenfocada
  $$('[data-letters]').forEach((el) => {
    const txt = el.textContent.trim();
    el.setAttribute('aria-label', txt);
    el.innerHTML = [...txt].map((c, i) => (c === ' ' ? ' ' : `<span class="ch" aria-hidden="true" style="--i:${i}">${c}</span>`)).join('');
  });
  if (reducedMotion || !('IntersectionObserver' in window)) return;
  const megas = $$('[data-letters]');
  const mo = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.remove('is-pending'); mo.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -12% 0px' });
  megas.forEach((el) => { if (el.getBoundingClientRect().top > innerHeight * 0.9) { el.classList.add('is-pending'); mo.observe(el); } });
  const els = $$('.reveal');
  const vh = innerHeight;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.remove('is-pending'); io.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -6% 0px' });
  els.forEach((el, i) => {
    if (el.getBoundingClientRect().top > vh * 0.95) {
      el.classList.add('is-pending');
      el.style.transitionDelay = `${(i % 3) * 70}ms`;
      io.observe(el);
    }
  });
  const steps = $('.steps');
  if (steps) {
    const so = new IntersectionObserver(([en]) => { if (en.isIntersecting) { steps.classList.add('is-drawn'); so.disconnect(); } }, { threshold: 0.3 });
    so.observe(steps);
  }
}

/* ---------- Declaración: las palabras pasan de borrosas a nítidas con el scroll ---------- */
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
    return { el, words: $$('.w', el), last: -1 };
  });
  if (reducedMotion) return () => {};
  return () => {
    const vh = innerHeight;
    blocks.forEach((b) => {
      const r = b.el.getBoundingClientRect();
      const p = clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3), 0, 1);
      const n = b.words.length;
      const head = p * (n + 6);
      const key = Math.round(head * 4);
      if (key === b.last) return;
      b.last = key;
      b.words.forEach((w, i) => {
        const d = clamp((i - head + 6) / 6, 0, 1);
        w.style.filter = d > 0.02 ? `blur(${(d * 7).toFixed(1)}px)` : '';
        w.style.opacity = (1 - d * 0.78).toFixed(2);
      });
    });
  };
}

/* ---------- Parallax suave ---------- */
function initParallax() {
  const els = $$('[data-speed]');
  if (reducedMotion || !els.length) return () => {};
  return () => {
    const vh = innerHeight;
    els.forEach((el) => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const off = (r.top + r.height / 2 - vh / 2) * +el.dataset.speed;
      el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
    });
  };
}

/* ---------- Frases con efecto de decodificación ---------- */
function initPhrases() {
  const el = $('[data-phrases]');
  if (!el) return;
  const list = $$('.phrases .sr-only li').map((li) => li.textContent.trim());
  const idxEl = $('[data-phrase-index]');
  const bar = $('.phrase-bar i');
  let i = 0;
  let timer = 0;
  let visible = false;
  let paused = false;
  const HOLD = reducedMotion ? 6500 : 4600;

  const fit = () => {
    el.style.minHeight = '';
    let max = 0;
    const keep = el.textContent;
    for (const t of list) { el.textContent = t; max = Math.max(max, el.offsetHeight); }
    el.textContent = keep;
    el.style.minHeight = max + 'px';
  };

  const scramble = (target) => {
    if (reducedMotion) { el.textContent = target; return; }
    el.classList.add('is-out');
    setTimeout(() => { el.textContent = target; el.classList.remove('is-out'); }, 600);
  };

  const show = (k) => {
    i = (k + list.length) % list.length;
    scramble(list[i]);
    if (idxEl) idxEl.textContent = String(i + 1).padStart(2, '0');
  };
  let t0 = performance.now();
  const loop = (now) => {
    if (visible && !paused) {
      const t = (now - t0) / HOLD;
      if (bar) bar.style.setProperty('--t', String(clamp(t, 0, 1)));
      if (t >= 1) { t0 = now; show(i + 1); }
    } else {
      t0 = now - (parseFloat(bar?.style.getPropertyValue('--t') || '0') * HOLD);
    }
    timer = requestAnimationFrame(loop);
  };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(el);
  const section = el.closest('section');
  const btn = $('.phrase-toggle', section);
  let held = false;
  const sync = () => { paused = held || hovering; };
  let hovering = false;
  section.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovering = true; sync(); } });
  section.addEventListener('pointerleave', () => { hovering = false; sync(); });
  btn?.addEventListener('click', () => {
    held = !held;
    btn.setAttribute('aria-pressed', String(held));
    btn.textContent = held ? 'Reanudar' : 'Pausar';
    sync();
  });
  fit();
  addEventListener('resize', fit);
  timer = requestAnimationFrame(loop);
}

/* ---------- Cifras que cuentan al aparecer ---------- */
function initCounters() {
  if (reducedMotion) return;
  const els = $$('[data-count]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const el = en.target;
      const end = +el.dataset.count;
      const t0 = performance.now();
      const dur = 1100;
      const step = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Comparador de tres estados (proyecto demo) ---------- */
// Etiquetas sobre el soporte (posiciones en % de la imagen 16:10)
const CALLOUTS = {
  design: [
    { x: 18, y: 87, t: '140 × 90 × 12' },
    { x: 24, y: 64, t: 'Ranura 11 × 22' },
    { x: 25, y: 41, t: 'Nervio e = 10' },
  ],
  sim: [
    { x: 49, y: 74, t: 'σ máx. 148 MPa' },
    { x: 50, y: 27, t: 'FS mín. 2.6' },
  ],
  fab: [
    { x: 85, y: 24, t: 'Al 6061-T6' },
    { x: 86, y: 47, t: 'CNC 3 ejes' },
    { x: 84, y: 88, t: 'Anodizado' },
  ],
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
    handles.forEach((h, k) => h.setAttribute('aria-valuenow', String(Math.round(pos[k]))));
  };
  const setPos = (k, v) => {
    if (k === 0) pos[0] = clamp(v, 3, pos[1] - MIN_GAP);
    else pos[1] = clamp(v, pos[0] + MIN_GAP, 97);
    apply();
  };
  const pct = (clientX) => {
    const r = box.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * 100;
  };
  let active = -1;
  let touched = false; // la pista animada se detiene en cuanto el usuario interactúa
  box.addEventListener('pointerdown', (e) => {
    touched = true;
    const p = pct(e.clientX);
    active = e.target.closest('.tp-handle') ? +e.target.closest('.tp-handle').dataset.handle : Math.abs(p - pos[0]) < Math.abs(p - pos[1]) ? 0 : 1;
    box.setPointerCapture(e.pointerId);
    setPos(active, p);
    handles[active].focus({ preventScroll: true });
  });
  box.addEventListener('pointermove', (e) => { if (active >= 0) setPos(active, pct(e.clientX)); });
  const end = () => { active = -1; };
  box.addEventListener('pointerup', end);
  box.addEventListener('pointercancel', end);
  handles.forEach((h, k) => {
    h.addEventListener('keydown', (e) => {
      touched = true;
      const step = e.shiftKey ? 10 : 2;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setPos(k, pos[k] - step); e.preventDefault(); }
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setPos(k, pos[k] + step); e.preventDefault(); }
      if (e.key === 'Home') { setPos(k, 0); e.preventDefault(); }
      if (e.key === 'End') { setPos(k, 100); e.preventDefault(); }
    });
  });
  // Cotas y etiquetas sobre las imágenes
  Object.entries(CALLOUTS).forEach(([layer, items]) => {
    const host = $(`[data-callouts="${layer}"]`, box);
    if (!host) return;
    host.innerHTML = items
      .map((c) => `<span class="callout callout-${layer}" style="left:${c.x}%;top:${c.y}%">${c.t}</span>`)
      .join('');
  });
  apply();
  // Pista de interacción la primera vez que aparece
  if (!reducedMotion) {
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const a0 = pos[0], b0 = pos[1];
      const step = (now) => {
        if (touched) return;
        const t = clamp((now - t0) / 1600, 0, 1);
        const w = Math.sin(t * Math.PI) * 7;
        pos[0] = a0 - w; pos[1] = b0 + w;
        apply();
        if (t < 1) requestAnimationFrame(step);
      };
      setTimeout(() => requestAnimationFrame(step), 350);
    }, { threshold: 0.55 });
    io.observe(box);
  }
}

/* ---------- Tarjetas de aplicaciones en pantallas táctiles ---------- */
function initAppCards() {
  if (finePointer) return;
  $$('.app-card').forEach((card) => card.addEventListener('click', () => card.classList.toggle('is-cad')));
}

/* ---------- Formulario de cotización + ficha técnica ---------- */
function initBrief() {
  const form = $('#brief');
  if (!form) return;
  const out = (k) => $(`[data-out="${k}"]`);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fecha = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const ref = `EZ-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(100 + Math.floor(Math.random() * 900))}`;
  out('fecha').textContent = fecha;
  out('codigo').textContent = ref;
  const wa = $('#enviar-wa');
  const status = $('#estado');
  const val = (name) => {
    const el = form.elements[name];
    if (!el) return '';
    if (el instanceof RadioNodeList) return el.value;
    return (el.value || '').trim();
  };
  const data = () => ({
    nivel: val('nivel'),
    partida: val('partida'),
    tipo: val('tipo'),
    cantidad: val('cantidad'),
    plazo: val('plazo'),
    descripcion: val('descripcion'),
    nombre: val('nombre'),
    empresa: val('empresa'),
    medio: val('medio'),
  });
  const message = (d) => [
    `Hola, ${CFG.nombre}. Quiero cotizar un proyecto.`,
    '',
    `• Nivel: ${d.nivel}`,
    `• Proyecto: ${d.tipo}`,
    `• Punto de partida: ${d.partida}`,
    `• Cantidad: ${d.cantidad}`,
    `• Plazo: ${d.plazo}`,
    '',
    `Descripción: ${d.descripcion || '(por completar)'}`,
    '',
    `Nombre: ${d.nombre || '(por completar)'}`,
    d.empresa ? `Empresa: ${d.empresa}` : null,
    d.medio ? `Contacto: ${d.medio}` : null,
    `Ref.: ${ref}`,
  ].filter((l) => l !== null).join('\n');

  const render = () => {
    const d = data();
    out('cliente').textContent = d.nombre ? d.nombre + (d.empresa ? ' · ' + d.empresa : '') : 'Tu nombre';
    out('tipo').textContent = d.tipo;
    out('cantidad').textContent = d.cantidad;
    out('nivel').textContent = d.nivel;
    out('plazo').textContent = d.plazo;
    out('partida').textContent = d.partida;
    out('descripcion').textContent = d.descripcion || 'Cuéntame qué necesitas y para qué lo usarás.';
    wa.href = waUrl(message(d));
  };
  form.addEventListener('input', (e) => { e.target.classList.remove('is-invalid'); render(); });
  form.addEventListener('change', render);
  form.addEventListener('submit', (e) => e.preventDefault());

  const check = () => {
    const missing = ['nombre', 'descripcion'].filter((n) => !val(n));
    missing.forEach((n) => form.elements[n].classList.add('is-invalid'));
    return missing;
  };
  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  };
  wa.addEventListener('click', (e) => {
    const missing = check();
    if (missing.length) {
      e.preventDefault();
      say('Completa tu nombre y una breve descripción para enviar la solicitud.', true);
      form.elements[missing[0]].focus();
      return;
    }
    say('Abriendo WhatsApp con tu solicitud. Si no se abre, copia la solicitud y pégala en un mensaje.');
  });
  const copiedMsg = CFG.correo
    ? `Solicitud copiada. Pégala en WhatsApp o en un correo a ${CFG.correo}.`
    : 'Solicitud copiada. Pégala en un mensaje de WhatsApp o en un correo.';
  $('#copiar').addEventListener('click', async () => {
    const text = message(data());
    try {
      await navigator.clipboard.writeText(text);
      say(copiedMsg);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      say(ok ? copiedMsg : 'No se pudo copiar automáticamente. Selecciona el texto de la ficha y cópialo.', !ok);
    }
  });
  // Botones "Cotizar Nivel X/Y/Z"
  $$('[data-pick-level]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = { X: 'nivel-opt-x', Y: 'nivel-opt-y', Z: 'nivel-opt-z' }[btn.dataset.pickLevel];
      const input = document.getElementById(id);
      if (input) { input.checked = true; render(); }
    });
  });
  render();
}

/* ---------- Portada: ciclo Diseñamos / Simulamos / Fabricamos ---------- */
const MODES = [
  { label: 'Diseño', spec: 'Modelo CAD paramétrico · m 2.5 · z 24/12/48', color: 'var(--cyan)' },
  { label: 'Simulación', spec: 'Esfuerzo de Von Mises · FS mín. 2.4', color: 'var(--green)' },
  { label: 'Fabricación', spec: 'Acero AISI 4140 · Mecanizado CNC', color: 'var(--molten)' },
];
const HOLDS = [3400, 3800, 4600];

function createHeroCycler(onChange) {
  const title = $('#hero-title');
  const lines = $$('.ht-line', title);
  const label = $('[data-mode-label]');
  const spec = $('[data-mode-spec]');
  const modeBox = $('.hero-mode');
  const heroStills = $$('[data-hstill]');
  let idx = 0;
  let t0 = performance.now();
  let running = false;
  const set = (k) => {
    idx = k;
    lines.forEach((l, j) => l.classList.toggle('is-active', j === k));
    if (label) label.textContent = MODES[k].label;
    if (spec) spec.textContent = MODES[k].spec;
    if (modeBox) modeBox.style.setProperty('--hm', MODES[k].color);
    heroStills.forEach((img) => img.classList.toggle('is-on', +img.dataset.hstill === k));
    onChange && onChange(k);
  };
  return {
    start(k = idx, extra = 0) { if (reducedMotion) { set(2); return; } title.classList.add('is-cycling'); running = true; t0 = performance.now() + extra; set(k); },
    stop() { running = false; },
    tick(now) {
      if (!running) return;
      if (now - t0 > HOLDS[idx]) { t0 = now; set((idx + 1) % 3); }
    },
    get index() { return idx; },
    set,
  };
}

/* ---------- Escena 3D + scroll ---------- */
function initStage() {
  const sceneEl = $('.scene');
  const canvas = $('#escena');
  const heroAnchor = $('[data-anchor="hero"]');
  const storyAnchor = $('.stage-inner');
  const story = $('.story');
  const panels = $$('.level');
  const stills = $$('.stage-inner .still');
  const readouts = $$('[data-readout]');
  const axes = $$('[data-axis]');
  const heroStep = $('[data-hero-step]');
  const heroBar = $('.steps-bar b');
  const storyNum = $('[data-story-num]');
  const storyBar = $('[data-story-bar]');
  const progress = $('.progress span');
  const hudX = $('[data-hud="x"]');
  const hudY = $('[data-hud="y"]');
  const hudZ = $('[data-hud="z"]');
  const hud = $('.hud');
  const updateBlur = initBlurText();
  const updateParallax = initParallax();
  const MM = 25.4 / 96; // milímetros por píxel CSS
  const fmt = (v) => v.toFixed(1).padStart(6, '0');

  let s3 = null; // escena WebGL (si está disponible)
  let modelFade = 0;
  let firstFrame = false;
  let panelIdx = -1;
  let phase = 'hero';
  const cycler = createHeroCycler((k) => {
    if (s3 && phase === 'hero') s3.setMode(k);
    if (heroStep) heroStep.textContent = '0' + (k + 1);
    heroBar?.style.setProperty('--s', String((k + 1) / 3));
  });
  cycler.start(0);

  const setPanel = (k) => {
    if (k === panelIdx) return;
    panelIdx = k;
    panels.forEach((p, j) => p.classList.toggle('is-active', j === k));
    stills.forEach((s, j) => s.classList.toggle('is-on', j === k));
    readouts.forEach((r) => r.classList.toggle('is-on', +r.dataset.readout === k));
    axes.forEach((a) => a.classList.toggle('is-on', +a.dataset.axis === k));
    if (storyNum) storyNum.textContent = '0' + (k + 1);
    storyBar?.style.setProperty('--s', String((k + 1) / 3));
  };
  setPanel(0);

  const visibility = (el) => {
    if (!el) return { v: 0, r: null };
    const r = el.getBoundingClientRect();
    if (!r.height || !r.width) return { v: 0, r };
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, innerHeight);
    return { v: clamp((bottom - top) / r.height, 0, 1), r };
  };

  const cache = new Map();
  const write = (key, value, fn) => { if (cache.get(key) !== value) { cache.set(key, value); fn(value); } };
  const frame = (now) => {
    const vh = innerHeight;
    const vw = innerWidth;
    const y = scrollY;
    const docH = document.documentElement.scrollHeight - vh;
    write('p', (docH > 0 ? clamp(y / docH, 0, 1) : 0).toFixed(4), (v) => progress.style.setProperty('--p', v));
    if (hudZ) write('z', fmt(y * MM), (v) => { hudZ.textContent = v; });
    updateBlur();
    updateParallax();

    // Panel activo de servicios (el más cercano al centro de la pantalla)
    let best = 0, bestD = Infinity;
    panels.forEach((p, j) => {
      const r = p.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (d < bestD) { bestD = d; best = j; }
    });
    setPanel(best);

    const H = visibility(heroAnchor);
    const S = visibility(storyAnchor);
    const nextPhase = S.v > H.v ? 'story' : 'hero';
    if (nextPhase !== phase) {
      phase = nextPhase;
      if (phase === 'hero') cycler.start(cycler.index); else cycler.stop();
    }
    cycler.tick(now);

    if (s3) {
      const A = phase === 'story' ? S : H;
      const vis = smooth(0.12, 0.55, A.v);
      if (A.r && A.r.width) {
        const cx = A.r.left + A.r.width / 2;
        const cy = A.r.top + A.r.height / 2;
        const camZ = s3.camera.position.z;
        const visH = 2 * camZ * Math.tan((s3.camera.fov * Math.PI) / 360);
        const basePx = (5.9 / visH) * vh;
        const scale = Math.min(A.r.width * 0.9, A.r.height * 1.02) / basePx;
        s3.setLayout({ x: (cx - vw / 2) / vw, y: (cy - vh / 2) / vh, scale }, true);
      }
      if (phase === 'story') {
        s3.setMode(best);
        const sr = story.getBoundingClientRect();
        const p = clamp(-sr.top / Math.max(1, sr.height - vh), 0, 1);
        s3.setScrollRotation(p * 1.4);
      } else {
        s3.setScrollRotation(clamp(y / vh, 0, 1.5) * 0.5);
      }
      if (firstFrame) modelFade = Math.min(1, modelFade + 0.04);
      const o = vis * modelFade;
      write('o', o.toFixed(3), (v) => { canvas.style.opacity = v; });
      const want = o > 0.001;
      if (want && !s3.running) s3.start();
      if (!want && s3.running) s3.stop();
    }
    // La grilla de fondo acompaña a la portada y a los servicios
    const storyRect = story.getBoundingClientRect();
    const gridO = clamp((storyRect.bottom / vh - 0.15) * 1.5, 0, 1);
    write('grid', gridO.toFixed(3), (v) => { sceneEl.style.setProperty('--grid-o', v); hud && hud.style.setProperty('--hud-o', v); });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (finePointer) {
    addEventListener('pointermove', (e) => {
      if (hudX) hudX.textContent = fmt(e.clientX * MM);
      if (hudY) hudY.textContent = fmt(e.clientY * MM);
      if (s3) s3.setPointer((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
    }, { passive: true });
  }

  // Carga diferida de Three.js: la página funciona igual sin WebGL
  const boot = async () => {
    try {
      const probe = document.createElement('canvas');
      if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) throw new Error('Sin WebGL');
      const mod = await import('./scene.js');
      const small = innerWidth < 760;
      s3 = mod.createGearScene(canvas, {
        pixelRatio: Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75),
        particles: !reducedMotion,
        shadows: !small,
      });
      const size = () => s3.resize(canvas.clientWidth || innerWidth, canvas.clientHeight || innerHeight);
      size();
      let lastW = innerWidth;
      addEventListener('resize', () => {
        // En móviles la barra del navegador cambia el alto: solo redimensionar si cambia el ancho o mucho el alto
        if (innerWidth !== lastW || Math.abs(canvas.clientHeight - s3.state.h) > 140) { lastW = innerWidth; size(); }
      });
      if (reducedMotion) { s3.skipIntro(); s3.setAutoSpin(false); s3.setMode(2, true); }
      else if (scrollY < innerHeight * 0.5) { s3.setMode(0, true); s3.playIntro(); }
      else s3.skipIntro();
      if (phase === 'hero') s3.setMode(cycler.index, reducedMotion);
      s3.start();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        firstFrame = true;
        root.classList.add('has-webgl');
        if (!reducedMotion && phase === 'hero') cycler.start(0, scrollY < innerHeight * 0.5 ? 2000 : 0);
      }));
    } catch (err) {
      root.classList.add('no-webgl');
      console.info('[EJE Z] Vista 3D en modo imagen:', err && err.message);
    }
  };
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 1200 }); else setTimeout(boot, 200);
}

/* ---------- Inicio ---------- */
applyConfig();
initHeader();
initReveal();
initPhrases();
initCounters();
initTriptych();
initAppCards();
initBrief();
initStage();
