/* Edrei · punto de entrada (PKG-0): importa cada módulo y llama a su init() */
import { applyConfig } from './core.js';
import * as shell from './shell.js';
import * as cases from './cases.js';
import * as demo from './demo.js';
import * as contact from './contact.js';
import * as motion from './motion.js';

const root = document.documentElement;
root.classList.add('js');
if (!root.lang) root.lang = 'es';

applyConfig();
[motion, demo, contact, cases, shell].forEach((m) => m.init());
