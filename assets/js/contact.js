/* Contacto (PKG-D): mensaje listo para WhatsApp, validación por campo,
   nivel elegido desde los casos, datos del pie y de Sobre mí. */
import { $, $$, CFG, waUrl, waNumber, isReduced } from './core.js';

const FIELDS = {
  nombre: 'Escribe tu nombre.',
  medio: 'Déjame un WhatsApp o un correo para responderte.',
  descripcion: 'Cuéntame en una línea qué necesitas.',
};
const LEVEL_IDS = { X: 'nivel-opt-x', Y: 'nivel-opt-y', Z: 'nivel-opt-z' };

/* ---------- Formulario ---------- */
function initForm() {
  const form = $('#brief');
  if (!form) return;
  const wa = $('#enviar-wa');
  const copy = $('#copiar');
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

  let lastSent = '';
  const render = () => { wa.href = waUrl(message()); };
  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle('is-error', error);
    if (!isReduced() && status.animate) {
      status.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.23,1,.32,1)' });
    }
  };
  const sent = (via) => {
    const m = message();
    if (m === lastSent) return; // un solo momento de cierre por mensaje
    lastSent = m;
    document.dispatchEvent(new CustomEvent('ez:sent', { detail: { via } }));
  };

  const setError = (name, on) => {
    const el = form.elements[name];
    const err = document.getElementById(`err-${name}`);
    el.classList.toggle('is-invalid', on);
    if (on) { el.setAttribute('aria-invalid', 'true'); } else { el.removeAttribute('aria-invalid'); }
    if (err) { err.textContent = on ? FIELDS[name] : ''; el.setAttribute('aria-describedby', err.id); }
  };
  const validate = () => {
    const missing = Object.keys(FIELDS).filter((n) => !val(n));
    Object.keys(FIELDS).forEach((n) => setError(n, missing.includes(n)));
    if (missing.length) {
      say(missing.length === 1 ? 'Falta un dato para enviar tu mensaje.' : `Faltan ${missing.length} datos para enviar tu mensaje.`, true);
      form.elements[missing[0]].focus();
      return false;
    }
    return true;
  };

  form.addEventListener('input', (e) => {
    if (e.target.classList.contains('is-invalid') && e.target.value.trim()) setError(e.target.name, false);
    render();
  });
  form.addEventListener('change', render);
  // Enter en un campo envía (o valida); en el mensaje, Enter sigue siendo salto de línea
  form.addEventListener('submit', (e) => { e.preventDefault(); (wa.hidden ? copy : wa).click(); });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && e.target.matches('input[type="text"]')) { e.preventDefault(); (wa.hidden ? copy : wa).click(); }
  });

  wa.addEventListener('click', (e) => {
    render();
    if (!validate()) { e.preventDefault(); return; }
    say('Listo. Se abrió WhatsApp con tu mensaje.');
    sent('whatsapp');
  });

  const copied = CFG.correo ? `Mensaje copiado. Pégalo en WhatsApp o envíalo a ${CFG.correo}.` : 'Mensaje copiado. Pégalo en WhatsApp o en un correo.';
  copy.addEventListener('click', async () => {
    if (!waNumber && !validate()) return; // como acción principal, valida primero
    const text = message();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    say(ok ? copied : 'No se pudo copiar automáticamente. Selecciona tu mensaje y cópialo.', !ok);
    if (ok) sent('copy');
  });

  // Sin número configurado: copiar es la acción principal y WhatsApp se oculta
  if (!waNumber) {
    wa.hidden = true;
    copy.classList.add('btn-block');
    copy.innerHTML = '<span>Copiar mensaje</span><svg class="ic" aria-hidden="true"><use href="#i-corner"/></svg>';
  }

  // "Cotizar este nivel" en los casos: marca el nivel y lleva al formulario
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  $$('[data-pick-level]').forEach((a) => a.addEventListener('click', () => {
    const input = document.getElementById(LEVEL_IDS[a.dataset.pickLevel]);
    if (!input) return;
    input.checked = true;
    render();
    if (!fine.matches) return;
    let done = false;
    const land = () => {
      if (done) return;
      done = true;
      $('#nombre').focus({ preventScroll: true });
      const chip = input.nextElementSibling;
      chip.classList.add('is-picked');
      setTimeout(() => chip.classList.remove('is-picked'), 600);
    };
    if ('onscrollend' in window) { addEventListener('scrollend', land, { once: true }); setTimeout(land, 1500); }
    else setTimeout(land, isReduced() ? 0 : 700);
  }));
  render();
}

/* ---------- Sobre mí: cargo en líneas y LinkedIn solo si existe ---------- */
function initPerson() {
  const cargo = $('[data-cargo]');
  if (cargo && CFG.cargo) {
    cargo.textContent = '';
    CFG.cargo.split(' · ').forEach((part, i) => {
      if (i) cargo.appendChild(document.createElement('br'));
      cargo.appendChild(document.createTextNode(part));
    });
  }
  const slot = $('[data-red-slot]');
  const li = CFG.redes && CFG.redes.linkedin;
  if (slot && li) {
    const a = document.createElement('a');
    a.className = 'link'; a.href = li; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'LinkedIn';
    slot.append(document.createElement('br'), a);
  }
}

/* ---------- Pie: WhatsApp y correo solo cuando están configurados ---------- */
function initFoot() {
  const box = $('[data-foot-links]');
  if (!box) return;
  if (waNumber) {
    const a = document.createElement('a');
    a.className = 'link'; a.href = waUrl(`Hola, ${CFG.nombre}. Quiero información sobre tus servicios.`);
    a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'WhatsApp';
    box.appendChild(a);
  }
  if (CFG.correo) {
    const a = document.createElement('a');
    a.className = 'link'; a.href = `mailto:${CFG.correo}`; a.textContent = CFG.correo;
    box.appendChild(a);
  }
}

/* ---------- WhatsApp directo si hay número ---------- */
function initDirect() {
  if (!waNumber) return;
  $$('[data-wa-link]').forEach((a) => { a.href = waUrl(`Hola, ${CFG.nombre}. Quiero información sobre tus servicios.`); a.target = '_blank'; a.rel = 'noopener'; });
}

export function init() { initForm(); initPerson(); initFoot(); initDirect(); }
