# Dron + efectos sintéticos + voz -> assets/audio/mezcla.wav (−14 LUFS, pico ≤ −1 dBTP)
import numpy as np, subprocess
from scipy.signal import butter, sosfilt
from cues import C
SR = 48000; S = C['S']; END = C['END']; N = int((END + .05) * SR)
rng = np.random.default_rng(3)
t_ = lambda d: np.arange(int(d * SR)) / SR
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def env(n, a=.004, r=None):
    e = np.ones(n); k = max(1, int(a * SR)); e[:k] = np.linspace(0, 1, k)
    if r: e *= np.exp(-np.arange(n) / (r * SR))
    return e
def sine(f, d, r): t = t_(d); return np.sin(2 * np.pi * f * t) * env(len(t), .003, r)
def tick(f=1000): return sine(f, .05, .015) * .5
def ping(f1=880, f2=1320): a = sine(f1, .5, .12) + .25 * sine(f1 * 2, .5, .06); b = sine(f2, .5, .14) + .25 * sine(f2 * 2, .5, .06); o = np.zeros(int(.6 * SR)); o[:len(a)] += a; o[int(.09 * SR):int(.09 * SR) + len(b)] += b[:len(o) - int(.09 * SR)]; return o * .35
def sweep(f0, f1, d, r=None):
    t = t_(d); f = f0 * (f1 / f0) ** (t / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), .004, r)
def thump(): return sweep(110, 40, .25) * np.exp(-t_(.25) / .1) * .9
def hit(): x = sweep(70, 32, 1.2) * np.exp(-t_(1.2) / .45); return x + lp(rng.standard_normal(len(x)), 180) * np.exp(-t_(1.2) / .2) * .3
def noise(d): return rng.standard_normal(int(d * SR))
def whoosh():
    d = .5; x = noise(d); o = np.zeros_like(x); fr = np.geomspace(300, 2600, 10); k = len(x) // 10
    for i, f in enumerate(fr): o[i * k:(i + 1) * k] = bp(x, f * .7, f * 1.3)[i * k:(i + 1) * k]
    return o * np.sin(np.pi * np.linspace(0, 1, len(o))) ** 1.5 * .5
def riser(d=1.0):
    x = noise(d); o = np.zeros_like(x); k = len(x) // 16
    for i, f in enumerate(np.geomspace(200, 3200, 16)): o[i * k:(i + 1) * k] = bp(x, f * .75, f * 1.25)[i * k:(i + 1) * k]
    return o * np.linspace(0, 1, len(o)) ** 2 * .45
def swish(): x = hp(noise(.3), 1800); return x * np.sin(np.pi * np.linspace(0, 1, len(x))) * .3
def tap(): x = bp(noise(.035), 3200, 4700); return x * env(len(x), .001, .008) * .8
def clock(): x = bp(noise(.03), 1300, 1800); return x * env(len(x), .001, .006) * .9
def step(): return thump()[:int(.12 * SR)] * .5 + lp(noise(.12), 300) * env(int(.12 * SR), .002, .03) * .3
def buzz(d):
    t = t_(d); x = np.sign(np.sin(2 * np.pi * 155 * t)); return lp(x, 420) * env(len(t), .01) * np.minimum(1, (d - t) / .02) * .35
def scribble(d):
    x = bp(noise(d), 2000, 3200); g = np.repeat(rng.uniform(.2, 1, int(d / .045) + 1), int(.045 * SR))[:len(x)]
    return x * lp(g, 40) * .25
def chime(fs, tail=1.4):
    o = np.zeros(int((tail + .1 * len(fs)) * SR))
    for i, f in enumerate(fs): s = sine(f, tail, .45) + .2 * sine(f * 2, tail, .2); o[int(i * .06 * SR):int(i * .06 * SR) + len(s)] += s
    return o * .22

fx = np.zeros(N)
def at(t, x, g=1.0):
    i = int(t * SR); n = min(len(x), N - i)
    if i >= 0 and n > 0: fx[i:i + n] += x[:n] * g

for s in S[1:]: at(s - .18, whoosh(), .8)
for tm in [C['e1_clin'], S[1] + .25, C['e3_prim'] - .2, S[3] + .35, S[4] + .5, C['e5_es'] + .1, S[5] + .3, S[7] + .3, S[8] + .35]: at(tm, swish(), .7)
# E1
at(.3, scribble(1.0)); [at(C['e1_pac'] + k * .08, ping(880, 1320), .5) for k in range(6)]
[at(C['e1_pierde'] + .15 + k * .14, tick(900 - k * 60), .8) for k in range(4)]
# E2
at(C['e2_nunca'], buzz(.2)); at(C['e2_nunca'] + .45, buzz(.14), .6)
# E3
s3 = S[2]; [at(s3 + .6 + k * .09, tap(), .6) for k in range(10)]; [at(s3 + .7 + k * 1.1 / 15, clock(), .45) for k in range(15)]
at(C['e3_comp'], swish()); at(C['e3_eligen'], thump(), .7); at(C['e3_prim'], ping(1046, 1568), .8)
# E4
[at(C['e4_cada'] + k * .31, step(), .7) for k in range(13)]; at(C['e4_miles'], whoosh(), .7)
for i in range(4): at(C['e4_cada'] + .22 * i + (330 - 100 * i) / 135, ping(880 * .94 ** i, 1320 * .94 ** i), .5)
# E5
s5 = S[4]; bb = C['e5_boca']; at(s5 + .25, scribble(1.05)); at(C['e5_clin'], thump(), .8); at(C['e5_clin'] + .05, ping(990, 1480), .7)
at(C['e5_es'] + .3, tap()); at(bb - .05, tap())
at(bb + .25, scribble(.45)); [at(bb + .25 + k * .05, tick(1500 if k % 2 else 700), .5) for k in range(10)]; at(bb + .7, thump(), .8)
# E6
at(C['e6_cap'], swish()); at(C['e6_cap'] + .5, sweep(2400, 1800, .08, .02) * .4); at(C['e6_cap'] + .5, tick(3000))
# E7
sy = C['e7_sis']; at(sy - 1.0, riser()); at(sy, hit(), 1.1); at(sy + .15, chime([523, 659, 784]))
[at(C['e7_pac'] + k * .31, step(), .6) for k in range(int((C['e7_agenda'] - .1 - C['e7_pac']) / .31))]
at(C['e7_agenda'], ping(784, 1046), .7)
# E8
tt, ce, sn = C['e8_treinta'], C['e8_cual_e'], C['e8_sin']
[at(tt + i / 29 * (ce - tt - .1), tick(600 + 28 * i), .35) for i in range(30)]
at(sn, thump(), .8); at(sn + .05, chime([659, 784, 988]))
# E9
at(C['e9_calc'], thump(), .8); at(C['e9_calc'] + .05, chime([659, 784, 988])); at(C['e9_en'], swish(), .6)

# compresor del bus de efectos (umbral −14 dB, 4:1, sobre la envolvente)
lvl = np.sqrt(lp(fx ** 2, 30).clip(1e-12)); peak = np.abs(fx).max(); fx /= peak / .5
lvl = np.sqrt(lp(fx ** 2, 30).clip(1e-12)); db = 20 * np.log10(lvl / .5 + 1e-9); over = np.maximum(0, db + 14)
fx *= 10 ** (-(over * .75) / 20)

# dron
t = np.arange(N) / SR
dr = (np.sin(2 * np.pi * 55 * t) + np.sin(2 * np.pi * 55.7 * t) + .25 * (2 * np.abs(2 * ((82.5 * t) % 1) - 1) - 1) + .18 * np.sin(2 * np.pi * 110 * t)
      + .05 * bp(rng.standard_normal(N), 300, 500))
dr = lp(dr, 700)
g = np.clip(t / 1.2, 0, 1) * np.clip((END - t) / 1.0, 0, 1)
mute_a, mute_b = C['e8_ysi'] - .3, sn
g *= np.where((t > mute_a) & (t < mute_b), 0, 1)
g = lp(g, 20)  # sin clics
dr *= g

voz = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', 'assets/audio/voz.wav', '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True).stdout, np.float32).astype(float)
v = np.zeros(N); v[:min(N, len(voz))] = voz[:N]
rms = lambda x: np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2))
vr = rms(v)
dr *= vr / rms(dr) * 10 ** (-30 / 20)
fx *= vr / rms(fx) * 10 ** (-20 / 20)
mix = v + dr + fx
st = np.stack([mix, mix], 1).astype(np.float32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', 'assets/audio/premezcla.wav'], input=st.tobytes())
# loudnorm a dos pasadas
import json, re
o = subprocess.run(['ffmpeg', '-i', 'assets/audio/premezcla.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
m = json.loads(re.findall(r'\{[^}]+\}', o)[-1])
af = f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000"
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'assets/audio/premezcla.wav', '-af', af, '-ar', '48000', 'assets/audio/mezcla.wav'])
o = subprocess.run(['ffmpeg', '-i', 'assets/audio/mezcla.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print(o[o.rfind('Summary'):])
