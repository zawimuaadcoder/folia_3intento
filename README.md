# Marketing Health for Clinics (MHFC) — landing

Landing de captación para clínicas capilares, con calculadora de potencial, calendario de reserva integrado y Pixel de Meta.

## Archivos

- `index.html`: estructura de la página.
- `assets/styles.css`: estilos (diseño del Figma «Landing v2 · Marketing Health for Clinics»).
- `assets/app.js`: calculadora, calendario integrado, acordeón de preguntas y Pixel de Meta.
- `assets/`: imágenes, logos, iconos y la fuente Inter.
- `api.mjs`: función de Netlify que envía los leads a HubSpot (y avisa a Make) y sirve la configuración pública.
- `netlify.toml`: compilación y cabeceras de seguridad para Netlify.
- `INTER-LICENSE.txt`: licencia de la fuente Inter.

## Publicar en Netlify

El proyecto ya está conectado a GitHub: al fusionar los cambios en `main`, Netlify publica solo. No hace falta `npm install` ni comando de build adicional; `netlify.toml` copia `index.html`, la carpeta `assets/` y la función.

## Variables de entorno (Netlify → Site configuration → Environment variables)

| Variable | Para qué sirve |
| --- | --- |
| `CALENDAR_URL` | URL del calendario de reservas que se muestra al terminar la calculadora. Si no existe, se usa `https://calendly.com/josemartinez31k/30min`. |
| `META_PIXEL_ID` | ID del Pixel de Meta (solo números). Sin esta variable el Pixel no se carga. |
| `MAKE_WEBHOOK_URL` | Webhook de Make que recibe cada lead. |
| `FOLIA_MODE` | `live` (por defecto) envía los leads de verdad; cualquier otro valor activa el modo demostración. |
| `PRIVACY_URL`, `LEGAL_URL`, `COOKIES_URL` | Opcionales: enlaces a las páginas legales definitivas. |

Las credenciales de HubSpot siguen configurándose como hasta ahora.

## Eventos del Pixel de Meta

- `PageView`: al cargar la página.
- `Lead`: cuando se envía la calculadora con los datos de contacto (no en modo demostración).
- `Schedule`: cuando se reserva la llamada en el calendario integrado (Calendly avisa a la página al confirmar la cita).
