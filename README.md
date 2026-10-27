# THE HOUSE PERFUMERÍA — página web 3D

![Vista previa de la portada](preview.png)

Landing page de perfumería con una escena 3D en WebGL (three.js): botella de
cristal procedural, líquido ámbar, tapón de oro, anillos holográficos, polvo
dorado y suelo reflectante. La escena reacciona al mouse, se puede arrastrar
para girar la botella y al tocarla lanza un chorro de partículas.

## Ver la página en local

La escena usa módulos ES, así que **no funciona abriendo `index.html` con doble
clic** (el navegador bloquea los módulos desde `file://`). Necesita un servidor
local:

**Windows — doble clic en `start.cmd`**

Abre `http://localhost:8080` automáticamente.

O manualmente, desde esta carpeta:

```bat
python -m http.server 8080
```

y visita <http://localhost:8080>.

Alternativas: `npx serve .`, `php -S localhost:8080`, la extensión Live Server
de VS Code, etc.

## Estructura

```
index.html          Marcado y contenido (textos, precios, enlaces)
assets/styles.css   Paleta, tipografía, tarjetas, animaciones de scroll
assets/app.js       Escena three.js + interacciones
serve.py            Servidor local con apertura automática del navegador
start.cmd           Lanzador para Windows
```

## Personalizar

| Qué | Dónde |
| --- | --- |
| Nombre de la marca, textos, precios, enlaces de contacto | `index.html` |
| Colores (dorado, fondo, tipografía) | `assets/styles.css` → `:root` |
| Color del perfume y del tapón | `assets/app.js` → `liquidMat` / `gold` |
| Velocidad de giro, anillos, polvo | `assets/app.js` → `animate()` y `buildRings()` |
| Versión de three.js | `index.html` → bloque `importmap` (fijada en 0.169.0) |

Los datos de contacto del HTML (WhatsApp, Instagram, correo) son de ejemplo:
cámbialos antes de publicar.

## Publicar

- La escena carga three.js desde unpkg (CDN), así que necesita internet; la
  versión está fijada para que no se rompa con actualizaciones.
- **GitHub Pages**: en un repositorio privado, Pages solo está disponible con
  planes de pago. Si el repo se hace público, se activa en
  *Settings → Pages → Deploy from a branch → main / (root)*.
- Alternativas gratuitas con repos privados: Netlify, Vercel o Cloudflare Pages
  (arrastrar la carpeta o conectar el repo; no requiere build).

## Notas técnicas

- three.js r169: `MeshPhysicalMaterial` con transmisión para el cristal,
  `Reflector` para el suelo, `UnrealBloomPass` + `OutputPass` para el brillo.
- Rendimiento: el pixel ratio se limita a 2, el render se pausa cuando la
  pestaña no está visible y se respeta `prefers-reduced-motion` (sin giro
  automático, sin partículas animadas, sin transiciones).
- Accesibilidad: estructura semántica, `aria-label` en la navegación, foco
  visible del navegador y contenido legible sin la escena 3D.
- Si WebGL falla o el CDN no responde, se muestra un fondo degradado y un
  aviso con las instrucciones del servidor local.
