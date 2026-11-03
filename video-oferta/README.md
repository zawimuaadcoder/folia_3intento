# Una oferta que vende sola — @mhfcleads

Reel en HyperFrames 0.9.8 + Three.js (todo local en `assets/lib`).

## Render
```bash
npx -y hyperframes@0.9.8 render --fps 30 --quality delivery -o renders/vertical_sinaudio.mp4
npx -y hyperframes@0.9.8 render -c horizontal.html --fps 30 --quality delivery --variables '{"orient":"h"}' -o renders/horizontal_sinaudio.mp4
npx -y hyperframes@0.9.8 render --fps 30 --quality delivery --variables '{"subs":false}' -o renders/vertical_sinsubs_sinaudio.mp4
python3 audio_build.py   # música, SFX y mezcla -> assets/audio/mezcla.wav
ffmpeg -i renders/X_sinaudio.mp4 -i assets/audio/mezcla.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart renders/X.mp4
```

## Archivos
- `index.html` / `horizontal.html`: composiciones 1080×1920 y 1920×1080.
- `assets/main.js`: escena 3D, animaciones y subtítulos karaoke. `assets/words.js`: tiempos por palabra.
- `audio_build.py`: música original (100 BPM), SFX y mezcla. `subtitulos.srt`: subtítulos aparte.
