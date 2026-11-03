"""Música original (~100 BPM), diseño sonoro y mezcla para «Una oferta que vende sola».
Todo sintetizado de forma determinista con numpy. Salida: assets/audio/{musica,sfx,mezcla}.wav
Uso: python3 audio_build.py
"""
import numpy as np, subprocess, wave, os

SR = 48000
DUR = 54.4
N = int(SR * DUR)
rng = np.random.default_rng(7)
HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'assets', 'audio')


def t_(d):
    return np.arange(int(SR * d)) / SR


def place(buf, sig, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i] * gain


def env(n, a=0.005, d=0.3):
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / d)
    return e


def lp(x, cut):  # filtro paso bajo de un polo
    a = np.exp(-2 * np.pi * cut / SR)
    y = np.empty_like(x); s = 0.0
    for i in range(len(x)):
        s = (1 - a) * x[i] + a * s; y[i] = s
    return y


def hp(x, cut):
    return x - lp(x, cut)


def noise(d):
    return rng.standard_normal(int(SR * d))


def midi(m):
    return 440 * 2 ** ((m - 69) / 12)


# ───────── instrumentos ─────────
def marimba(f, d=0.6, g=1.0):
    tt = t_(d)
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.32) + 0.35 * np.sin(2 * np.pi * f * 4 * tt) * np.exp(-tt / 0.05) + 0.12 * np.sin(2 * np.pi * f * 10 * tt) * np.exp(-tt / 0.012)
    return s * np.minimum(1, tt / 0.002) * g


def pluck(f, d=0.5):
    tt = t_(d)
    s = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * 2 * f * tt) + 0.25 * np.sin(2 * np.pi * 3 * f * tt)) * np.exp(-tt / 0.16)
    return s * np.minimum(1, tt / 0.003)


def kick(d=0.45):
    tt = t_(d)
    f = 48 + 110 * np.exp(-tt / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt / 0.16) * np.minimum(1, tt / 0.002)


def clap():
    n = noise(0.22)
    e = np.zeros_like(n); tt = np.arange(len(n)) / SR
    for k in range(3):
        e += np.exp(-np.maximum(0, tt - k * 0.011) / 0.01) * (tt >= k * 0.011)
    e += 0.6 * np.exp(-tt / 0.09)
    return hp(lp(n * e, 3500), 700) * 0.6


def hat():
    n = noise(0.06); tt = np.arange(len(n)) / SR
    return hp(n, 7000) * np.exp(-tt / 0.018) * 0.35


def sub(f, d):
    tt = t_(d)
    return np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / 0.01) * np.minimum(1, (d - tt) / 0.08)


def pad(fs, d, bright=0.3):
    tt = t_(d); s = np.zeros_like(tt)
    for f in fs:
        for det in (-0.12, 0.0, 0.13):
            ff = f * 2 ** (det / 12)
            s += np.sin(2 * np.pi * ff * tt) + bright * 0.3 * np.sin(2 * np.pi * 2 * ff * tt + 1)
    s /= len(fs) * 3
    a = np.minimum(1, tt / 0.6) * np.minimum(1, (d - tt) / 0.8)
    return s * a


# ───────── MÚSICA ─────────
BPM = 100; B = 60 / BPM; BAR = 4 * B
mus = np.zeros(N)
# progresión Am – F – C – G (raíces MIDI)
PROG = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
ARP = [0, 2, 1, 2, 0, 1, 2, 1]


def bar_at(i):
    return PROG[i % 4]


def intensity(t):
    if t < 4.4: return 0
    if t < 17.1: return 1
    if t < 35.45: return 2
    if t < 36.4: return 3
    if t < 47.35: return -1  # bajada para el contraste
    if t < 52.4: return 1
    return -2

# pad base durante todo
for bi in range(int(DUR / BAR) + 1):
    t0 = bi * BAR
    root, ch = bar_at(bi)
    lvl = 0.10 if t0 < 52.4 else 0.0
    place(mus, pad([midi(m) for m in ch], BAR + 0.6, 0.2), t0, lvl)

for step in range(int(DUR / (B / 2)) + 1):
    t0 = step * B / 2
    lvl = intensity(t0)
    bi = int(t0 // BAR); root, ch = bar_at(bi)
    beat = step % 8
    if lvl >= 1:
        if beat in (0, 3, 4) or (lvl >= 2 and beat == 6):
            place(mus, kick(), t0, 0.55)
        if beat % 2 == 0:
            place(mus, sub(midi(root - 12), B * 0.9), t0, 0.22)
        n = ch[ARP[beat] % 3] + (12 if beat in (5, 7) else 0)
        place(mus, marimba(midi(n + 12)), t0, 0.16)
    if lvl >= 2:
        if beat in (2, 6):
            place(mus, clap(), t0, 0.5)
        place(mus, hat(), t0 + (0.02 if beat % 2 else 0), 0.5 if beat % 2 else 0.25)
        if beat in (1, 5):
            place(mus, pluck(midi(ch[2] + 12)), t0, 0.08)
    if lvl == -1 and beat in (0, 4):
        place(mus, marimba(midi(ch[ARP[beat] % 3] + 12), 0.9), t0, 0.1)

# golpes y acentos
place(mus, kick(0.8), 0.0, 0.9)
place(mus, sub(midi(33), 1.2) * np.exp(-t_(1.2) / 0.5), 0.0, 0.5)
for a in (20.22, 26.98, 30.5):
    place(mus, marimba(midi(81), 1.0), a, 0.25); place(mus, marimba(midi(76), 1.0), a + 0.02, 0.2)
# resolución (oferta pulida): acorde abierto
place(mus, pad([midi(m) for m in (57, 64, 69, 72, 76)], 3.2, 0.8), 35.45, 0.32)
for k, m in enumerate((69, 72, 76, 81)):
    place(mus, marimba(midi(m), 1.2), 35.45 + k * 0.06, 0.22)
place(mus, marimba(midi(84), 1.2), 43.4, 0.22)
place(mus, marimba(midi(88), 1.2), 46.6, 0.22)
# resonancia final
place(mus, pad([midi(m) for m in (45, 57, 64, 69, 76)], 2.2, 0.6), 52.3, 0.38)
place(mus, marimba(midi(69), 2.0), 52.4, 0.3); place(mus, marimba(midi(76), 2.0), 52.45, 0.22)

# ───────── DISEÑO SONORO ─────────
sfx = np.zeros(N)


def whoosh(d=0.5, lo=300, hi=3000, g=1.0):
    n = noise(d); tt = np.arange(len(n)) / SR
    e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 2
    cut = lo + (hi - lo) * (tt / d)
    out = np.zeros_like(n); s = 0.0
    for i in range(len(n)):
        a = np.exp(-2 * np.pi * cut[i] / SR); s = (1 - a) * n[i] + a * s; out[i] = s
    return out * e * g


def thud(f=70, d=0.35, g=1.0, click=0.3):
    tt = t_(d)
    s = np.sin(2 * np.pi * (f + 60 * np.exp(-tt / 0.02)) * tt) * np.exp(-tt / (d / 3))
    s += click * lp(noise(d), 2500) * np.exp(-tt / 0.01)
    return s * g


def tick(f=2400, d=0.03, g=1.0):
    tt = t_(d)
    return np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.006) * g


def ding(f=1320, d=0.8, g=1.0):
    tt = t_(d)
    return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.1)) * np.exp(-tt / 0.25) * g


def clink(g=1.0):  # vidrio
    tt = t_(1.4); s = np.zeros_like(tt)
    for f, dd in ((2093, 0.6), (3322, 0.35), (4870, 0.25), (6230, 0.15), (1567, 0.8)):
        s += np.sin(2 * np.pi * f * tt) * np.exp(-tt / dd)
    return s / 4 * g


def magnet(d=0.35, g=1.0):
    tt = t_(d); f = 300 + 1800 * (tt / d) ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) * 0.5 * g


def click_dock(g=1.0):
    out = thud(110, 0.18, 0.8, 0.6)
    out[: int(0.02 * SR)] += tick(3200, 0.02, 0.6)
    i = int(0.025 * SR); out[i:i + int(0.02 * SR)] += tick(2600, 0.02, 0.4)
    return out * g


def shimmer(d, g=1.0, f0=1200, f1=2600):
    tt = t_(d); out = np.zeros_like(tt)
    for k in range(5):
        f = (f0 + (f1 - f0) * tt / d) * (1 + 0.5 * k)
        out += np.sin(2 * np.pi * np.cumsum(f) / SR + k) / (k + 1)
    return out * np.sin(np.pi * np.clip(tt / d, 0, 1)) * 0.25 * g


def pop(f=600, g=1.0):
    tt = t_(0.12); fr = f * (1 + 1.5 * np.exp(-tt / 0.01))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt / 0.035) * g


# 01
place(sfx, whoosh(0.7, 200, 2500, 0.5), -0.1 if False else 0.0)
for a in (0.1, 0.24, 0.4):
    place(sfx, thud(90, 0.2, 0.35), a)
place(sfx, thud(48, 0.7, 0.9, 0.5), 0.66)
for i in range(6):
    place(sfx, pop(700 + 90 * i, 0.25), 2.95 + i * 0.09); place(sfx, tick(1800, 0.03, 0.2), 3.57 + i * 0.09)
place(sfx, whoosh(0.5, 400, 4000, 0.3), 4.3)
# 02
for a in (5.75, 6.73, 7.75):
    place(sfx, whoosh(0.55, 200, 2200, 0.28), a)
for a in (6.3, 7.28, 8.3):
    place(sfx, thud(80, 0.35, 0.7, 0.5), a)
place(sfx, whoosh(0.4, 300, 1500, 0.2), 8.6); place(sfx, thud(120, 0.2, 0.3), 8.95)
place(sfx, thud(95, 0.25, 0.4), 9.32); place(sfx, thud(95, 0.25, 0.4), 9.62)
place(sfx, thud(55, 0.4, 0.6, 0.2), 9.95)
place(sfx, ding(1568, 0.6, 0.3), 10.45); place(sfx, ding(2093, 0.6, 0.25), 10.55)
tt = t_(1.75); wob = np.sin(2 * np.pi * 9 * tt) * np.sin(2 * np.pi * (90 + 30 * np.sin(2 * np.pi * 7 * tt)) * tt) * np.sin(np.pi * tt / 1.75) * 0.25
place(sfx, wob, 11.25)
for i in range(4):
    place(sfx, pop(1300, 0.08), 11.6 + i * 0.22 + 0.7)
place(sfx, whoosh(0.4, 300, 2500, 0.25), 13.1)
place(sfx, whoosh(0.7, 150, 800, 0.2), 15.5); place(sfx, thud(70, 0.4, 0.5, 0.4), 16.25)
place(sfx, shimmer(1.9, 0.5, 300, 1400), 15.46)
place(sfx, shimmer(1.2, 0.4, 700, 2000), 17.35)
# 03
for a in (17.2, 17.42, 17.72, 17.92, 18.12):
    place(sfx, thud(95, 0.22, 0.32), a)
for i in range(3):
    place(sfx, tick(1900 + 300 * i, 0.05, 0.25), 18.0 + i * 0.18)
for a in (21.12, 28.32, 31.84):
    place(sfx, whoosh(0.35, 500, 3500, 0.18), a - 0.05)
place(sfx, shimmer(1.4, 0.35, 900, 2200), 20.2)
place(sfx, whoosh(0.6, 200, 1500, 0.25), 22.35)
place(sfx, whoosh(0.5, 300, 3000, 0.3), 24.2)
sh = hp(noise(0.5), 1500) * np.exp(-t_(0.5) / 0.08) * 0.5
place(sfx, sh, 24.62); place(sfx, clink(0.25), 24.62)
for i in range(10):
    place(sfx, tick(3000 + 400 * (i % 4), 0.04, 0.12), 24.65 + 0.05 * i + 0.02 * (i % 3))
place(sfx, magnet(0.45, 0.6), 24.75)
for k in range(1, 31):
    # tiempo en que el contador alcanza k (curva eioQ entre 25.84 y 26.45)
    lo, hi = 0.0, 1.0
    for _ in range(30):
        m = (lo + hi) / 2; v = 8 * m ** 4 if m < 0.5 else 1 - (-2 * m + 2) ** 4 / 2
        if v * 30 < k: lo = m
        else: hi = m
    place(sfx, tick(2600 if k < 30 else 3400, 0.03, 0.22 if k < 30 else 0.4), 25.84 + lo * 0.61)
place(sfx, whoosh(0.45, 300, 2500, 0.25), 26.5)
for d in (27.0, 30.35, 35.42):
    place(sfx, click_dock(0.8), d)
place(sfx, shimmer(1.15, 0.35, 800, 1800), 27.05)
place(sfx, pop(500, 0.3), 27.75)
k = 0
while 28.25 + k * 0.11 < 29.65:
    place(sfx, hp(noise(0.05), 2500) * np.exp(-t_(0.05) / 0.012) * 0.25, 28.25 + k * 0.11); k += 1
place(sfx, whoosh(0.4, 300, 2500, 0.22), 29.9)
place(sfx, shimmer(1.35, 0.45, 600, 2400), 30.55)
place(sfx, pop(420, 0.4), 31.75); place(sfx, thud(140, 0.2, 0.2), 31.8)
place(sfx, whoosh(0.4, 1000, 6000, 0.15), 34.4)
place(sfx, whoosh(0.4, 300, 2500, 0.22), 35.0)
place(sfx, clink(0.9), 35.45); place(sfx, shimmer(0.8, 0.5, 2000, 5000), 35.45)
# 04
place(sfx, whoosh(1.2, 150, 1200, 0.25), 36.4)
place(sfx, whoosh(0.5, 200, 1500, 0.22), 36.95)
place(sfx, thud(60, 0.45, 0.8, 0.6), 38.55)
place(sfx, whoosh(0.6, 300, 2000, 0.25), 38.95)
for a in (40.46, 41.54, 42.52):
    place(sfx, pop(800, 0.2), a - 0.05); place(sfx, click_dock(0.35), a)
place(sfx, thud(140, 0.3, 0.5, 0.3), 43.4); place(sfx, ding(2637, 0.6, 0.18), 43.4)
place(sfx, pop(600, 0.25), 44.1); place(sfx, pop(640, 0.25), 44.22)
place(sfx, whoosh(0.35, 500, 2500, 0.12), 45.6)
place(sfx, tick(2000, 0.03, 0.18), 45.97); place(sfx, tick(2000, 0.03, 0.15), 46.12)
place(sfx, tick(3000, 0.03, 0.5), 46.55); place(sfx, thud(100, 0.2, 0.3), 46.56)
place(sfx, whoosh(0.9, 600, 5000, 0.3), 46.6)
# 05
place(sfx, pop(520, 0.4), 47.35)
for a in (47.48, 47.62, 47.76, 47.9, 48.12):
    place(sfx, thud(95, 0.2, 0.3), a)
for a0, a1, s in ((47.95, 49.35, 'Soy fisio…'), (49.4, 50.25, 'Tengo una academia…'), (50.25, 51.3, 'Hago diseño web…')):
    for i in range(len(s)):
        tt0 = a0 + i * 0.055
        if tt0 < a1:
            place(sfx, hp(noise(0.03), 1800) * np.exp(-t_(0.03) / 0.006) * 0.16, tt0)
place(sfx, pop(380, 0.25), 48.4); place(sfx, pop(380, 0.15), 48.85)
place(sfx, whoosh(0.6, 200, 2000, 0.25), 50.55)
place(sfx, shimmer(1.7, 0.4, 500, 1500), 50.6)
place(sfx, whoosh(0.5, 200, 1500, 0.15), 52.3)


def write(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype('<i2').tobytes())


def norm(x, peak=0.9):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


mus = norm(mus, 0.7); sfx = norm(sfx, 0.8)
write(os.path.join(A, 'musica.wav'), mus)
write(os.path.join(A, 'sfx.wav'), sfx)

# ───────── MEZCLA (FFmpeg) ─────────
# voz: limpieza suave + compresión; música ducked ≥12 dB bajo la voz; loudnorm −14 LUFS / −1 dBTP
fc = (
    "[0:a]aresample=48000,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-2:LRA=9,apad=whole_dur=54.4[v];"
    "[1:a]volume=-12dB[m];"
    "[2:a]volume=-9dB[s];"
    "[v]asplit=2[v1][vk];"
    "[m][vk]sidechaincompress=threshold=0.03:ratio=4:attack=20:release=300[md];"
    "[v1][md][s]amix=inputs=3:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[out]"
)
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(A, 'voz.mp3'), '-i', os.path.join(A, 'musica.wav'), '-i', os.path.join(A, 'sfx.wav'),
                '-filter_complex', fc, '-map', '[out]', '-t', '54.4', '-ac', '2', os.path.join(A, 'mezcla.wav')], check=True)
# segunda pasada: ganancia lineal hasta −14 LUFS + limitador de pico real
import re, shutil
mz = os.path.join(A, 'mezcla.wav'); tmp = os.path.join(A, '_tmp.wav')
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', mz, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', mz, '-af', f'volume={-14 - I:.2f}dB,alimiter=limit=0.84:attack=2:release=60:level=disabled', '-ar', '48000', tmp], check=True)
shutil.move(tmp, mz)
print('ok', I)
