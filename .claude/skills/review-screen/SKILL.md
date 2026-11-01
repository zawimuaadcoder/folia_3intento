---
name: review-screen
description: Úsalo después de crear o cambiar una sección o el CSS de index.html.
---

1. Marca cualquier color, radio, sombra o duración escrito a mano que no sea un token semántico (los degradados decorativos son la excepción).
2. Marca los primitivos (`--gray-*`, `--blue-*`, `--radius-*`, `--duration-*`) usados directamente en un componente.
3. Comprueba que cada bloque nuevo tiene sus estados: hover, focus-visible, disabled o cargando, error y vacío, según aplique.
4. Comprueba que hay como máximo un botón primario por bloque.
5. Comprueba que el texto de estado coincide con el estado real (por ejemplo, el botón de envío no dice "Enviado" mientras sigue cargando).
6. Si cambió el `<script>`, comprueba que el hash de la CSP en `netlify.toml` coincide.
7. Haz capturas a 1440px y a 390px y compáralas con la versión anterior.
