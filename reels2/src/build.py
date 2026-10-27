"""Timeline (scene timing + real word timings from Scribe), lo-fi music bed, ducked mix at -14 LUFS."""
import json, subprocess, os, sys, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A, B = os.path.join(ROOT, 'audio'), os.path.join(ROOT, 'build')
os.makedirs(B, exist_ok=True)
SR = 44100

REELS = {
 'reel-6-tinder': dict(prefix='r6', scenes=[
  "¡*Match*!", "Opción *A*", "Te deja en *visto*", "Opción *B*", "Primera *cita*", "Ahora sí, el *precio*", "¿*A* o *B*?"]),
}
LEAD, TAIL, LAST_TAIL = 0.3, 0.45, 1.2

def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

# ---------- lo-fi music ----------
def lofi(dur, bpm=92, seed=1):
    rng = np.random.default_rng(seed)
    n = int(dur*SR); t = np.arange(n)/SR; out = np.zeros(n)
    beat = 60/bpm; bar = beat*4
    f = lambda m: 440*2**((m-69)/12)
    prog = [[53,57,60,64],[52,55,59,62],[50,53,57,60],[48,52,55,59]]   # Fmaj7 Em7 Dm7 Cmaj7
    bass = [41,40,38,36]
    def add(start, sig):
        a = int(start*SR); b = min(n, a+len(sig))
        if a < n: out[a:b] += sig[:b-a]
    def env(L, att, rel):
        e = np.ones(L); A_ = int(att*SR); e[:A_] = np.linspace(0,1,A_) if A_ else 1
        return e*np.exp(-np.arange(L)/SR/rel)
    for k in range(int(dur/bar)+1):
        t0 = k*bar; c = prog[k % 4]
        # rhodes-ish chord, two hits per bar, with tremolo
        for hit in (0, 2.5):
            L = int(beat*2.2*SR); tt = np.arange(L)/SR
            sig = sum(np.sin(2*np.pi*f(m)*tt) + 0.25*np.sin(2*np.pi*f(m)*2*tt)*np.exp(-tt*3) for m in c)
            sig *= env(L, 0.01, 1.4) * (1 + 0.15*np.sin(2*np.pi*4.5*tt)) * 0.05
            add(t0 + hit*beat + rng.uniform(0, 0.015), sig)
        # bass
        for hit, ln in ((0, 1.6), (2, 1.2), (3.5, 0.45)):
            L = int(beat*ln*SR); tt = np.arange(L)/SR
            add(t0+hit*beat, 0.16*np.sin(2*np.pi*f(bass[k % 4])*tt)*env(L, 0.005, 0.5))
        # drums
        for b in range(4):
            if b in (0, 2):  # kick (+ ghost)
                L = int(0.35*SR); tt = np.arange(L)/SR
                add(t0+b*beat, 0.5*np.sin(2*np.pi*(50+90*np.exp(-tt*30))*tt)*np.exp(-tt*9))
            if b in (1, 3):  # soft snare
                L = int(0.25*SR); nz = rng.standard_normal(L); nz = np.convolve(nz, np.ones(6)/6, 'same')
                add(t0+b*beat+0.01, 0.14*nz*np.exp(-np.arange(L)/SR*18))
            for h in (0, 0.5):  # hats, swung
                L = int(0.06*SR); nz = np.diff(rng.standard_normal(L+1))
                add(t0+(b+h+(0.08 if h else 0))*beat, (0.035 if h else 0.05)*nz*np.exp(-np.arange(L)/SR*60))
    # gentle lowpass + vinyl hiss
    out = np.convolve(out, np.ones(3)/3, 'same') + 0.002*rng.standard_normal(n)
    fade = np.minimum(1, np.minimum(t/0.5, (dur-t)/1.0)); return out*fade

meta = {}
for name, cfg in REELS.items():
    words_all = json.load(open(os.path.join(A, cfg['prefix'] + '-words.json')))
    t = 0.0; sc = []; clips = []
    for i, title in enumerate(cfg['scenes']):
        key = f"{cfg['prefix']}s{i+1}"; x = load(os.path.join(A, key + '.mp3')); clips.append(x)
        last = i == len(cfg['scenes'])-1
        lead = 0.12 if i == 0 else LEAD
        d = lead + len(x)/SR + (LAST_TAIL if last else TAIL)
        v = t + lead
        sc.append(dict(title=title, start=round(t,3), dur=round(d,3), voice=round(v,3),
                       words=[dict(w=w['text'], t=round(v+w['start'],3), e=round(v+w['end'],3)) for w in words_all[key]]))
        t += d
    total = round(t, 3); N = int(total*SR)
    voice = np.zeros(N)
    for s, x in zip(sc, clips):
        a = int(s['voice']*SR); voice[a:a+len(x)] += x[:N-a]
    mus = lofi(total)
    # ducking: music sits at 12% of voice level, dips another 30% while she speaks
    win = int(0.05*SR); env = np.sqrt(np.convolve(voice**2, np.ones(win)/win, 'same'))
    active = (env > 0.01).astype(float); active = np.convolve(active, np.ones(int(0.3*SR))/int(0.3*SR), 'same')
    vr = np.sqrt((voice[np.abs(voice) > 0.01]**2).mean()); mr = np.sqrt((mus**2).mean())
    mus *= 0.12*vr/mr * (1 - 0.3*np.clip(active, 0, 1)) * 1.0
    mix = voice + mus
    raw = os.path.join(B, name + '.f32'); mix.astype(np.float32).tofile(raw)
    subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i',raw,
                    '-af','loudnorm=I=-14:TP=-1.0:LRA=11','-ar','48000','-ac','2','-c:a','pcm_s16le', os.path.join(B, name + '.wav')], check=True)
    # second pass: measure and correct the residual gain so the delivered file sits at -14 LUFS
    r = subprocess.run(['ffmpeg','-nostats','-i',os.path.join(B, name + '.wav'),'-af','ebur128','-f','null','-'],capture_output=True,text=True).stderr
    lufs = float([l for l in r.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    subprocess.run(['ffmpeg','-y','-v','error','-i',os.path.join(B, name + '.wav'),'-af',f'volume={-14-lufs:.2f}dB,alimiter=limit=0.89',
                    '-c:a','aac','-b:a','192k',os.path.join(B, name + '.m4a')], check=True)
    os.remove(raw)
    meta[name] = dict(total=total, scenes=sc)
    print(name, total, [s['dur'] for s in sc])
json.dump(meta, open(os.path.join(B, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
