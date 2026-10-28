---
name: perfumeria-web-premium
description: Diseño y desarrollo de la web de THE HOUSE PERFUMERÍA (perfumes originales servidos por mililitros). Úsala cuando haya que crear o modificar secciones, tarjetas de producto, animaciones 3D, copy o estilos de esta tienda, para mantener la estética dorada, cinematográfica y el tono de marca.
---

# THE HOUSE PERFUMERÍA — guía de diseño y desarrollo

Web estática (HTML + CSS + JS, sin build) con una escena 3D en three.js y un
catálogo de perfumes que se venden **por mililitros (decants)**.

## Cuándo usarla

- Crear o editar secciones, tarjetas de producto, botones o textos de la tienda.
- Ajustar la escena 3D, el movimiento o el "modo cine".
- Añadir una fragancia al catálogo.
- Revisar accesibilidad, rendimiento o coherencia visual.

## Identidad de marca

- **Marca:** THE HOUSE PERFUMERÍA · Bogotá, Colombia.
- **Producto:** perfumes 100 % originales servidos por mililitros (5 / 10 / 15 / 30 ml),
  decantados a mano en atomizador de vidrio. También frascos completos bajo pedido.
- **Tono:** lujo sobrio, artesanal, sin estridencias. Nada de "ganga" ni mayúsculas
  gritadas. Frases cortas, sensoriales, concretas.
- **Público:** compra recurrente, regalo, prueba de fragancias de nicho y de marca.

## Paleta y tipografía (usar siempre las variables de `:root`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#06040a` | fondo base |
| `--ink` | `#f7f0e2` | texto principal |
| `--muted` | `#ab9f8c` | texto secundario |
| `--gold` | `#e6c270` | acento principal |
| `--gold-2` | `#f9e4a8` | acento luminoso, precios |
| `--gold-3` | `#b8862e` | acento profundo, degradados |
| `--line` | `rgba(230,194,112,.16)` | bordes y separadores |

- **Titulares:** `Cormorant Garamond` (serif, peso 300/400, cursiva en la segunda línea).
- **Texto y etiquetas:** `Inter` (300/400/500), con `letter-spacing` amplio en mayúsculas.
- **Numeración de secciones:** `01 — Catálogo`, `02 — Cómo funciona`, etc. (guion largo).

## Estructura

```
index.html              Marcado y contenido
assets/styles.css       Estilos (tokens, componentes, animaciones)
assets/app.js           Escena three.js, cámara, modo cine, nav activo
assets/catalog.js       Selector de ml y enlace de WhatsApp
assets/productos/       Fotos de producto en WebP
assets/logo-the-house.png
```

Secciones en orden: portada (`#top`) → catálogo (`#catalogo`) → visor 360
(`#visor`) → cómo funciona (`#proceso`) → garantía (`#garantia`) → preguntas
(`#faq`) → contacto (`#contacto`).

El visor (`assets/viewer.js`) es un visor de producto aparte: gira solo, se
arrastra, la tapa se abre al tocarla y el difusor rocía loción. Se inicializa
solo cuando entra en pantalla y pausa la escena principal mientras está visible.

## Movimiento (la seña de identidad)

- La escena 3D es **persistente**: el canvas es fijo y las secciones son translúcidas
  con `backdrop-filter: blur(...)`; el 3D se ve moviéndose detrás del texto.
- Movimiento continuo: giro de botella, espiral de partículas, anillos, halo y polvo.
- **Scroll = película**: la cámara sube, se acerca y oscila; el líquido cambia de
  color (ámbar → caoba) y el fondo se calienta.
- **Modo cine** (`#cineBtn`): recorre la página sola a ~150 px/s y se pausa con
  wheel/touch/tecla.
- Respetar siempre `prefers-reduced-motion`: sin giro, sin partículas animadas,
  sin transiciones (las reglas ya existen al final de `styles.css`).

## Componentes

- **Tarjeta de producto** `.product`: foto 1:1, sello "Original", marca, nombre,
  descripción, precio por ml, botones de ml (`data-g`), total (`data-total`) y CTA
  (`data-wa`). El spotlight dorado sigue el cursor (`--mx` / `--my`).
- **Tarjeta CTA** `.product--cta`: borde punteado, "¿No la encuentras?".
- **Botón sólido** `.btn--solid`: degradado dorado, destello al pasar el mouse.
- **Píldoras** `.pill`: contactos (WhatsApp, Instagram, correo).
- **Pasos** `.steps` / `.step`: proceso de decantado, 4 pasos con número.
- **Confianza** `.trust` / `.trust__item`: sellos de garantía.
- **FAQ** `.faq` con `<details>`/`<summary>` (sin JavaScript).

## Añadir una fragancia al catálogo

1. Guarda la foto cuadrada (mín. 800×800) en `assets/productos/` y conviértela a WebP.
2. Duplica un `<article class="product" data-unit="…" data-name="…">` dentro de
   `.grid--catalog`.
3. Cambia: `data-unit` (precio por ml), `data-name` (marca + nombre), la imagen y su
   `alt`, la marca, el nombre, la descripción y los enlaces de WhatsApp.
4. Los botones de ml y el total se recalculan solos con `assets/catalog.js`.

## Reglas de calidad

- **Accesibilidad:** HTML semántico, `alt` descriptivo en imágenes, `aria-label` en
  enlaces icónicos, foco visible, contraste mínimo 4.5:1 en texto.
- **Rendimiento:** imágenes en WebP y con `loading="lazy"`; no añadir librerías nuevas
  sin justificarlo (three.js ya se carga por CDN).
- **Sin contenido inventado:** no crear productos, precios ni reseñas ficticias.
  Si falta un dato, dejarlo marcado como pendiente.
- **No romper:** tras cualquier cambio, comprobar que la página carga sin errores de
  JavaScript y que el 3D sigue renderizando.

## Antes de decir "listo"

- [ ] `node --check assets/app.js` y `node --check assets/catalog.js` sin errores.
- [ ] La página carga, la escena 3D está activa y no hay errores en consola.
- [ ] El selector de ml actualiza total y enlace de WhatsApp.
- [ ] En móvil (390 px) no hay solapamientos ni scroll horizontal.
- [ ] `prefers-reduced-motion` deja la página usable sin animaciones.
