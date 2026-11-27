/* Contacto (PKG-D) */
import { $, $$, CFG, waUrl, waNumber } from './core.js';

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
    document.dispatchEvent(new CustomEvent('ez:sent', { detail: { via: 'whatsapp' } }));
  });
  const copied = CFG.correo ? `Mensaje copiado. Pégalo en WhatsApp o envíalo a ${CFG.correo}.` : 'Mensaje copiado. Pégalo en WhatsApp o en un correo.';
  $('#copiar').addEventListener('click', async () => {
    const text = message();
    try { await navigator.clipboard.writeText(text); say(copied); document.dispatchEvent(new CustomEvent('ez:sent', { detail: { via: 'copy' } })); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      say(ok ? copied : 'No se pudo copiar automáticamente. Selecciona tu mensaje y cópialo.', !ok);
      if (ok) document.dispatchEvent(new CustomEvent('ez:sent', { detail: { via: 'copy' } }));
    }
  });
  $$('[data-pick-level]').forEach((a) => a.addEventListener('click', () => {
    const id = { X: 'nivel-opt-x', Y: 'nivel-opt-y', Z: 'nivel-opt-z' }[a.dataset.pickLevel];
    const input = document.getElementById(id);
    if (input) { input.checked = true; render(); }
  }));
  render();
}

/* ---------- WhatsApp directo si hay número ---------- */
function initDirect() {
  if (!waNumber) return;
  $$('[data-wa-link]').forEach((a) => { a.href = waUrl(`Hola, ${CFG.nombre}. Quiero información sobre tus servicios.`); a.target = '_blank'; a.rel = 'noopener'; });
}

export function init() { initForm(); initDirect(); }
