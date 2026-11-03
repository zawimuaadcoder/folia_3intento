# Informe QA

| Entregable | Resolución | Duración | Estado |
|---|---|---|---|
| oferta_vertical_1080x1920.mp4 | 1080×1920 @30 | 54,4 s | OK |
| oferta_horizontal_1920x1080.mp4 | 1920×1080 @30 | 54,4 s | OK (recompuesto, no recortado) |
| oferta_vertical_sin_subtitulos_1080x1920.mp4 + subtitulos.srt | 1080×1920 @30 | 54,4 s | OK |

- Audio: mezcla integrada −14,0 LUFS, pico −1,9 dBFS (≤ −1 dBTP). Música con ducking bajo la voz.
- Subtítulos: 136 palabras sincronizadas con faster-whisper y corregidas a mano; 36 bloques en el .srt.
- Paleta e Inter según el brief; el rojo solo aparece en el ✕.

## Limitaciones conocidas
- 30 fps en vez de 60, por el tiempo de render (~37 min por versión con render por CPU).
- Sin motion blur ni profundidad de campo.
- Algunos titulares se solapan un instante durante el golpe de entrada.
- En horizontal, las cartas caídas del problema quedan grandes en primer plano.
- La mezcla está verificada por medición, pero nadie la ha escuchado.
