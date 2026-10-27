#!/usr/bin/env python3
"""Genera una versión 'vieja y creepy' de la Gymnopédie n.º 1 de Satie (partitura de dominio público).

Caja de música desafinada + piano grave + vinilo (crujidos, siseo, wow/flutter), todo sintetizado:
no usa ninguna grabación con derechos.

Uso: python3 musica_vieja.py salida.wav duracion_segundos
"""
import subprocess, sys, tempfile, os, wave
import numpy as np

SR = 44100
BPM = 66
BEAT = 60 / BPM


def hz(n):
    """Nota MIDI a Hz."""
    return 440.0 * 2 ** ((n - 69) / 12)


# Acompañamiento: compás de 3/4, bajo en la 1, acorde en la 2 (ligado a la 3)
G_BAR = (43, (59, 62, 66))   # G2 | B3 D4 F#4
D_BAR = (38, (57, 61, 66))   # D2 | A3 C#4 F#4
# Melodía (nota MIDI, compás, tiempo, duración en tiempos); entra en el compás 4
MELODY_BARS = [
    [None, (78, 1, 1), (81, 2, 1)],
    [(79, 0, 1), (78, 1, 1), (73, 2, 1)],
    [(71, 0, 1), (73, 1, 1), (74, 2, 1)],
    [(69, 0, 3)],
    [(66, 0, 3)],
    [(66, 0, 3)],
    [(66, 0, 3)],
    [(66, 0, 3)],
]


def tone(f, dur, kind):
    t = np.arange(int(dur * SR)) / SR
    if kind == "box":
        # caja de música: parciales casi inarmónicos, ataque seco, caída larga
        w = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)
             + 0.18 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12))
        env = np.exp(-t * 1.6)
    else:
        # piano grave apagado
        w = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1), (2, 0.5), (3, 0.25), (4, 0.12)))
        env = np.exp(-t * 0.9) * (1 - np.exp(-t * 200))
    return w * env


def render(dur):
    out = np.zeros(int((dur + 6) * SR))

    def add(note, start, length, kind, gain):
        # desafinado aleatorio leve: suena a instrumento viejo
        f = hz(note) * (1 + np.random.uniform(-0.004, 0.004))
        s = tone(f, length + 2.5, kind) * gain
        i = int(start * SR)
        out[i:i + len(s)] += s[:len(out) - i]

    bar_len = 3 * BEAT
    bars = int(dur / bar_len) + 2
    for b in range(bars):
        t0 = b * bar_len
        bass, chord = G_BAR if b % 2 == 0 else D_BAR
        add(bass, t0, bar_len, "piano", 0.55)
        for n in chord:
            add(n, t0 + BEAT, 2 * BEAT, "piano", 0.22)
        if b >= 4:
            for ev in MELODY_BARS[(b - 4) % len(MELODY_BARS)]:
                if ev:
                    n, beat, d = ev
                    add(n, t0 + beat * BEAT, d * BEAT, "box", 0.30)
    out = out[:int(dur * SR)]
    # wow & flutter de tocadiscos: modulación lenta del tiempo
    t = np.arange(len(out)) / SR
    warp = t + 0.004 * np.sin(2 * np.pi * 0.55 * t) + 0.0008 * np.sin(2 * np.pi * 6.0 * t)
    out = np.interp(np.clip(warp, 0, t[-1]), t, out)
    # crujidos y siseo de vinilo
    rng = np.random.default_rng(7)
    crackle = np.zeros_like(out)
    idx = rng.integers(0, len(out), int(dur * 9))
    crackle[idx] = rng.uniform(-1, 1, len(idx)) * rng.uniform(0.05, 0.35, len(idx))
    hiss = rng.normal(0, 0.012, len(out))
    out = out / (np.max(np.abs(out)) + 1e-9) * 0.7 + crackle + hiss
    return np.clip(out, -1, 1)


def main(path, dur):
    np.random.seed(3)
    audio = render(dur)
    raw = os.path.join(tempfile.mkdtemp(), "raw.wav")
    with wave.open(raw, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((audio * 32767).astype(np.int16).tobytes())
    # timbre de gramófono: banda estrecha + eco de sala vacía
    subprocess.check_call(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af",
                           "highpass=f=140,lowpass=f=3800,aecho=0.8:0.6:120|260:0.35|0.22,"
                           "afade=t=in:d=2,afade=t=out:st=" + f"{dur - 2.5:.2f}:d=2.5,"
                           "loudnorm=I=-18:TP=-2,aformat=channel_layouts=stereo", path])


if __name__ == "__main__":
    main(sys.argv[1], float(sys.argv[2]))
