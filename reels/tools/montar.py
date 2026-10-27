#!/usr/bin/env python3
"""Monta un reel 9:16 con vídeo 16:9 centrado, look oscuro y subtítulo palabra a palabra.

Uso: python3 montar.py config.json
config.json: {
  "audio": "voz.mp3", "words": "words.json", "out": "reel.mp4",
  "source": "<url o ruta del vídeo fuente>",
  "clips": [{"from": 0.0, "src": 329.0}, ...]   # 'from' = segundo del reel, 'src' = segundo en la fuente
}
words.json: lista [{"text","start","end"}] (salida de ElevenLabs Scribe).
"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1920
VW, VH = 1080, 608
VY = (H - VH) // 2
FPS = 30
FONT = "/usr/share/fonts/opentype/inter/Inter-Light.otf"
FONT_SIZE = 30
TEXT_X = 96
FADE = 0.12


def phrases(words):
    """Agrupa palabras en frases: corta tras puntuación o pausas largas."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        if w["text"][-1] in ".,?!…" or nxt is None or nxt["start"] - w["end"] > 0.45:
            out.append(cur)
            cur = []
    return out


def render_subs(words, duration, outdir):
    font = ImageFont.truetype(FONT, FONT_SIZE)
    groups = phrases(words)
    space = font.getlength(" ")
    n = int(duration * FPS) + 1
    for f in range(n):
        t = f / FPS
        img = Image.new("RGBA", (VW, VH), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        for gi, g in enumerate(groups):
            end = groups[gi + 1][0]["start"] - 0.05 if gi + 1 < len(groups) else duration
            if not (g[0]["start"] <= t < end):
                continue
            x = TEXT_X
            for w in g:
                txt = w["text"].rstrip(".,")
                if t >= w["start"]:
                    a = min(1.0, (t - w["start"]) / FADE)
                    d.text((x + 1, VH / 2 + 2), txt, font=font, fill=(0, 0, 0, int(160 * a)), anchor="lm")
                    d.text((x, VH / 2), txt, font=font, fill=(255, 255, 255, int(235 * a)), anchor="lm")
                x += font.getlength(txt) + space
        img.save(os.path.join(outdir, f"s_{f:05d}.png"))


def main(cfg_path):
    cfg = json.load(open(cfg_path))
    base = os.path.dirname(os.path.abspath(cfg_path))
    p = lambda k: os.path.join(base, cfg[k])
    raw = json.load(open(p("words")))
    raw = raw["words"] if isinstance(raw, dict) else raw
    words = [w for w in raw if w.get("type", "word") == "word"]
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                         "-of", "csv=p=0", p("audio")]).decode()) + 0.3
    tmp = tempfile.mkdtemp(dir=base)
    render_subs(words, dur, tmp)

    clips = cfg["clips"]
    look = (f"crop=iw:iw*9/16,scale={VW}:{VH},setsar=1,fps={FPS},"
            "eq=brightness=-0.10:contrast=1.08:saturation=0.70:gamma=0.85,"
            "colorbalance=bs=0.06:bm=0.03,vignette=PI/4,noise=alls=7:allf=t")
    inputs, chains = [], []
    for i, c in enumerate(clips):
        length = (clips[i + 1]["from"] if i + 1 < len(clips) else dur) - c["from"]
        inputs += ["-ss", str(c["src"]), "-t", f"{length:.3f}", "-i", cfg["source"]]
        chains.append(f"[{i}:v]{look},trim=duration={length:.3f},setpts=PTS-STARTPTS[v{i}]")
    k = len(clips)
    inputs += ["-framerate", str(FPS), "-i", os.path.join(tmp, "s_%05d.png"), "-i", p("audio")]
    fc = ";".join(chains) + ";" + "".join(f"[v{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=0[mv];"
    fc += f"[mv][{k}:v]overlay=0:0:format=auto[sv];"
    fc += f"color=black:s={W}x{H}:r={FPS}:d={dur:.3f}[bg];[bg][sv]overlay=0:{VY}:shortest=1,format=yuv420p[out]"
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", fc,
                           "-map", "[out]", "-map", f"{k + 1}:a", "-c:v", "libx264", "-crf", "18",
                           "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}",
                           "-movflags", "+faststart", p("out")])
    subprocess.call(["rm", "-rf", tmp])
    print("OK", p("out"))


if __name__ == "__main__":
    main(sys.argv[1])
