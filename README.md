# Folia — versión simplificada

## Publicar desde cero

1. Descomprime el ZIP.
2. Crea un repositorio vacío en GitHub llamado folia-simple.
3. Usa Upload files y selecciona los cinco archivos sueltos de este ZIP. No subas el ZIP ni una carpeta contenedora.
4. Guarda los cambios en main.
5. En Netlify, crea un proyecto NUEVO e importa ese repositorio de GitHub.
6. Deja Base directory y Package directory vacíos. La configuración de netlify.toml prepara la publicación automáticamente: no introduzcas npm run build.
7. Publica.
8. Rellena el formulario desde la URL publicada y comprueba el contacto en HubSpot. Comprueba también el botón de Calendly.

## Archivos

- index.html: página completa, diseño, imágenes, fuente y calculadora.
- api.mjs: conexión de servidor con HubSpot y configuración.
- netlify.toml: instrucciones para Netlify.
- README.md: estas instrucciones.
- INTER-LICENSE.txt: licencia de la fuente incluida.

No hay paquetes npm ni carpetas que tengas que subir. Netlify crea las carpetas necesarias automáticamente. No reutilices un repositorio anterior con archivos mezclados.

HubSpot: portal 149430727, formulario 97ba49d3-ce4d-4b1a-a503-6674f862e605.
Calendly: https://calendly.com/josemartinez31k/30min (enlace directo).
Los envíos están activos al publicar; la prueba local del código usa envíos simulados. No hemos comprobado un contacto real en tu cuenta.

Para cambiar la página, actualiza también el hash CSP de netlify.toml si modificas su JavaScript incrustado.
