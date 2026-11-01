# Folia — sistema de diseño para agentes

Página única: todo el diseño vive en el `<style>` de `index.html`. Antes de tocar CSS, lee el bloque `:root`.

## 1. Tokens

- **Primitivos** (`--gray-*`, `--blue-*`, `--red-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--ease-smooth`): son la materia prima. No los uses directamente en componentes; alimentan la capa semántica.
- **Semánticos**: describen para qué sirve el valor, no cómo se ve. Úsalos siempre en componentes:
  - Superficie: `--bg-surface`, `--bg-subtle`, `--bg-hover`, `--bg-hover-strong`, `--bg-frame`, `--bg-inverse`, `--bg-inverse-raised`, `--bg-dark`, `--bg-info`
  - Borde: `--border-subtle`, `--border-default`, `--border-strong`, `--border-inverse`
  - Texto: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`, `--text-inverse-muted`, `--text-info`
  - Acción: `--action-primary`, `--action-primary-hover`, `--focus-ring`
  - Estado: `--status-error`, `--status-error-text`
  - Forma: `--radius-control` (botones, inputs), `--radius-card` (tarjetas)
  - Elevación: `--elevation-hairline`, `--elevation-card`, `--elevation-frame`, `--elevation-dialog`
  - Movimiento: `--motion-hover` (cambios de color), `--motion-control` (botones), `--motion-micro` (flechas, microinteracciones), `--motion-reveal` (entrada al hacer scroll)
- No inventes valores nuevos (ni un 13.5px, ni un gris "parecido"). Si ningún token encaja, **pregunta antes**.

### Pendiente de decidir (pregunta antes de reutilizar o ampliar)
Estos valores aparecen una sola vez y aún no son tokens: `#b3e3ff`, `#f9fbff`, `#f2f2f2`, `#e6e7ea`, `#a8c5ff`, `#f0f2f5`, `#f7faff`, `#9cbcf6`, `#f8faff`, `#bfd3fc`. Tampoco lo son la escala tipográfica y los espaciados. Los degradados decorativos (hero, órbita, raíl) son ilustración y pueden llevar valores propios.

## 2. Componentes (solo los que existen)

| Componente | Cuándo usarlo | Variante por defecto | Estados |
|---|---|---|---|
| `.button` + `.button-dark` | CTA principal de cabecera y hero | `button-dark` | hover y focus a azul; `disabled` con opacidad .65 y cursor de espera |
| `.button-blue` | CTA dentro de la calculadora y los diálogos | — | hover más oscuro; sobre fondo oscuro, hover blanco |
| `.button-secondary` | Acción secundaria junto a una principal | — | hover `--bg-hover-strong` |
| `.arrow` | Solo dentro de `.button`: la flecha sale hacia arriba y entra otra | — | hover/focus con `--motion-micro` |
| `.nav-link` | Enlaces de navegación | — | hover, focus y `.active` con `--bg-hover` |
| `.eyebrow-orbit` | Etiqueta sobre el h1, una por página | — | hover |
| `.field` (input/select/textarea) | Formularios | — | focus, `aria-invalid=true` con `--status-error`, mensaje `.error` |
| `dialog` | Formulario de contacto y textos legales | — | abierto (con `body.modal-open`) y cerrado |

## 3. Bloques

La página es una pila de bloques: `announcement` → `header` → `hero` (eyebrow, h1, descripción, CTA, `dashboard-frame`) → `trust/logos` → `method` (`section-heading`, `method-panel`) → `testimonial` → `calculator-section` (`calculator-copy`, `diagnosis-card`, `benefits`) → `footer` → `dialog`.
Si una pantalla nueva necesita algo que ningún bloque resuelve, para y pregunta si de verdad debe existir.

## 4. Reglas

- Solo un botón primario (`button-dark` o `button-blue`) por bloque. Si todo es importante, nada lo es.
- El rojo solo comunica error en formularios. Si se usa como decoración, pierde su significado.
- Toda animación usa un token `--motion-*` y respeta `prefers-reduced-motion`. Así la página se siente coherente y es accesible.
- Todo elemento interactivo tiene un `:focus-visible` igual de visible que su hover. Hay gente que navega con el teclado.
- Si cambias el `<script>` incrustado, actualiza el hash `sha256` de la CSP en `netlify.toml`. Si no, el JavaScript deja de funcionar en producción.
- Después de cambiar el diseño, ejecuta el skill `review-screen`.
