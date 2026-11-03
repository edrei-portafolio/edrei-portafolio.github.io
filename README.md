# Edrei · Portafolio

Portafolio de **Edrei**, diseñador mecatrónico freelance: diseño 3D, simulación y fabricación. Los proyectos se firman con la marca **EJE Z**.

En línea: https://edrei-portafolio.github.io
Es un sitio estático (HTML, CSS y JavaScript sin compilación), listo para publicarse gratis en GitHub Pages, Netlify o Cloudflare Pages, y para moverse después a tu propio dominio.

## Qué incluye

| Archivo o carpeta | Para qué sirve |
|---|---|
| `index.html` | La página completa: portada, servicios, comparativa, proceso, proyecto demo, aplicaciones, estudio, preguntas y contacto |
| `assets/css/styles.css` | Todos los estilos (colores, tipografías, animaciones) |
| `assets/js/config.js` | **Tus datos**: WhatsApp, correo, ciudad, nombre y redes |
| `assets/js/main.js` | Animaciones, menú, formulario de cotización y comparador |
| `assets/js/scene.js` | Modelo 3D animado de la portada (Three.js) |
| `assets/img/` | Renders 3D originales del sitio (WebP) |
| `assets/brand/` | Logo en SVG, favicon, íconos e imagen para compartir en redes (`og-image.jpg`) |
| `404.html` | Página de error con el estilo de la marca |

## 1. Personaliza tus datos (5 minutos)

Abre `assets/js/config.js` y cambia:

```js
nombre: 'Edrei',
whatsapp: '51987654321',          // código de país + número, solo dígitos
correo: 'contacto@tudominio.com',
ciudad: 'Lima, Perú',
redes: { linkedin: '...', instagram: '...', tiktok: '...', youtube: '' },
```

Con eso se actualizan solos la portada, "Sobre mí", el botón flotante de WhatsApp, el formulario de cotización y el pie de página.

Otros cambios frecuentes:

- **Tu foto**: en `index.html` busca `portrait-frame` y reemplaza el contenido por `<img src="assets/img/tu-foto.webp" alt="Tu nombre">` (formato vertical 4:5).
- **Textos**: todos están en `index.html`, en español y ordenados por sección.
- **Compromisos** ("Respuesta en 24 h", "Cotización sin costo", "NDA"): ajústalos en la portada y en "Por qué trabajar conmigo" si no aplican a tu forma de trabajo.

## 2. Publica gratis en GitHub Pages (sin instalar nada)

1. Crea una cuenta en [github.com](https://github.com) si aún no tienes.
2. Crea un repositorio nuevo, público, llamado por ejemplo `ejez-web`.
3. En el repositorio, usa **Add file → Upload files** y arrastra **el contenido** de esta carpeta (que `index.html` quede en la raíz, no dentro de otra carpeta). Confirma con **Commit changes**.
4. Ve a **Settings → Pages**. En *Build and deployment* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
5. En uno o dos minutos tu web estará en `https://TU-USUARIO.github.io/ejez-web/`.

Si prefieres la terminal:

```bash
git init
git add .
git commit -m "Sitio web EJE Z"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/ejez-web.git
git push -u origin main
```

### Alternativa aún más rápida: Netlify Drop

Entra a [app.netlify.com/drop](https://app.netlify.com/drop) y arrastra la carpeta completa. Te da un enlace público al instante.

## 3. Cuando tengas tu dominio propio

**En GitHub Pages:** Settings → Pages → *Custom domain*, escribe tu dominio (por ejemplo `www.ejez.pe`) y activa *Enforce HTTPS*. En el panel de tu proveedor de dominio crea:

| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `www` | `TU-USUARIO.github.io` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Después, en `index.html`, cambia `og:image` por la dirección completa (`https://www.ejez.pe/assets/brand/og-image.jpg`) para que la vista previa al compartir por WhatsApp o LinkedIn muestre la imagen.

## Detalles técnicos

- Funciona sin servidor ni base de datos. El formulario arma una ficha y la envía por WhatsApp (o se copia para pegarla en un correo).
- El modelo 3D se carga después del contenido. Si el equipo no soporta WebGL, la página muestra imágenes fijas de los mismos renders.
- Respeta la opción del sistema "reducir movimiento": desactiva animaciones y deja el modelo quieto.
- Tipografías de Google Fonts: Instrument Serif, Work Sans y Martian Mono (licencia SIL Open Font). Modelo 3D con Three.js 0.160 (licencia MIT) desde jsDelivr.
- Todas las imágenes 3D fueron generadas para esta marca; puedes usarlas libremente. Los valores técnicos del proyecto demo son ilustrativos.
