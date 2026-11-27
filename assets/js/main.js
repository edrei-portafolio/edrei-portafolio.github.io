/* Edrei · punto de entrada (PKG-0): importa cada módulo y llama a su init() */
import { applyConfig } from './core.js';
import * as shell from './shell.js';
import * as cases from './cases.js';
import * as demo from './demo.js';
import * as contact from './contact.js';
import * as motion from './motion.js';

const root = document.documentElement;
if (!root.lang) root.lang = 'es';

applyConfig();
// Un módulo que falle no detiene a los demás
[shell, cases, demo, contact, motion].forEach((m) => { try { m.init(); } catch (err) { console.error(err); } });
