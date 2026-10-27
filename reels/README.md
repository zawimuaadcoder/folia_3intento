# Reels animados Folia

`out/` contiene los 4 vídeos (1080×1920, 30 fps, H.264 + AAC) y una portada PNG por reel.

## Textos de publicación

**reel-1-precio** — Si te escriben “¿precio?” y luego desaparecen, el problema no es tu precio. Es lo que respondes. 👇 Guárdalo y mándaselo a tu equipo.

**reel-2-boca-a-boca** — El boca a boca es buena señal. Pero si es tu única forma de captar pacientes, tu agenda depende de la suerte. ¿Estás de acuerdo? 👇

**reel-3-turquia** — Muchas clínicas creen que pierden pacientes por el precio. Muchas veces los pierden por llegar tarde. Mándaselo a un doctor que tenga que verlo.

**reel-4-tres-errores** — ¿Cuál de los tres comete tu clínica? Dímelo en comentarios y guárdalo para revisarlo con tu equipo.

## Regenerar

1. `audio/rXsY.mp3`: locución por escena (ElevenLabs, voz Helena, eleven_multilingual_v2).
2. `python3 src/timeline.py` → tiempos de escena, subtítulos, música generada (sin copyright, ~13 % del volumen de la voz) y mezcla de audio en `build/`.
3. `node src/render.js <reel>` renderiza el MP4; `--cover` genera la portada.
