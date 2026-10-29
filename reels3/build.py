"""Voice + lo-fi bed (ducked, -14 LUFS) and word timings for reel 13."""
import json, subprocess, os, re, numpy as np
ROOT = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(ROOT, 'build'); os.makedirs(B, exist_ok=True)
import sys
SR, LEAD, TAIL = 44100, 0.4, 1.5
PREFIX, NAME = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ('r13', 'reel-13-cuantos-acaban-en-cita')
PAUSE = float(sys.argv[3]) if len(sys.argv) > 3 else 0     # min silence after . ? : … (reference reel breathes ~0.55 s)
src = open(os.path.join(ROOT, '..', 'reels2', 'src', 'build.py')).read()
exec(src[src.index('def lofi'):src.index('meta = {}')])          # reuse the same music generator
def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
v = load(os.path.join(ROOT, 'audio', PREFIX+'.mp3'))
raw_w, inside = [], False                                     # drop the spoken-direction tag "[warm, ...]"
for w in json.load(open(os.path.join(ROOT, 'audio', PREFIX+'-words.json')))['words']:
    if w['type'] != 'word': continue
    if w['text'].startswith('['): inside = True
    if not inside: raw_w.append(w)
    if w['text'].endswith(']'): inside = False
# stretch sentence gaps: cut mid-gap and splice in silence so every sentence end breathes at least PAUSE
segs, shift, cur, words = [], 0.0, 0, []
for i, w in enumerate(raw_w):
    words.append(dict(w=w['text'], t=round(w['start']+shift+LEAD,3), e=round(w['end']+shift+LEAD,3)))
    if PAUSE and i < len(raw_w)-1 and re.search(r'[.?:…]$', w['text']):
        gap = raw_w[i+1]['start'] - w['end']; add = max(0, PAUSE - gap)
        if add:
            # Scribe word ends run early: splice only inside real silence — the longest quiet run near the boundary
            env = np.sqrt(np.convolve(v**2, np.ones(441)/441, 'same')); thr = 0.02*np.sqrt((v**2).mean())
            lo, hi = int((w['end']-0.12)*SR), int((raw_w[i+1]['start']+0.12)*SR)
            q = env[lo:hi] < thr; best, run, bs = (0, 0), 0, 0
            for j, x in enumerate(q):
                run = run+1 if x else 0
                if run > best[0]: best = (run, j-run+1)
            if best[0] >= int(0.02*SR): cut = lo + best[1] + best[0]//2
            elif env[lo:hi].min() < 0.05*np.sqrt((v**2).mean()): cut = lo + int(np.argmin(env[lo:hi]))   # near-silent dip between linked words
            else: continue                                                                               # voice never drops: leave it
            f = int(0.012*SR)
            a_ = v[cur:cut].copy(); a_[-f:] *= np.linspace(1, 0, f)
            v[cut:cut+f] *= np.linspace(0, 1, f)
            segs += [a_, np.zeros(int(add*SR))]; cur = cut; shift += add
            words[-1]['cut'] = cut/SR
segs.append(v[cur:]); v = np.concatenate(segs)
total = round(LEAD + len(v)/SR + TAIL, 3); N = int(total*SR)
voice = np.zeros(N); a = int(LEAD*SR); voice[a:a+len(v)] = v[:N-a]
mus = lofi(total, bpm=96, seed=4)
win = int(0.05*SR); env = np.sqrt(np.convolve(voice**2, np.ones(win)/win, 'same'))
act = np.convolve((env > 0.01).astype(float), np.ones(int(0.3*SR))/int(0.3*SR), 'same')
vr = np.sqrt((voice[np.abs(voice) > 0.01]**2).mean()); mus *= 0.12*vr/np.sqrt((mus**2).mean()) * (1 - 0.3*np.clip(act, 0, 1))
raw = os.path.join(B, 'mix.f32'); (voice+mus).astype(np.float32).tofile(raw); wav = os.path.join(B, 'mix.wav')
subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i',raw,'-af','loudnorm=I=-14:TP=-1.0:LRA=11','-ar','48000','-ac','2','-c:a','pcm_s16le',wav],check=True)
r = subprocess.run(['ffmpeg','-nostats','-i',wav,'-af','ebur128','-f','null','-'],capture_output=True,text=True).stderr
lufs = float([l for l in r.splitlines() if l.strip().startswith('I:')][-1].split()[1])
subprocess.run(['ffmpeg','-y','-v','error','-i',wav,'-af',f'volume={-14-lufs:.2f}dB,alimiter=limit=0.89:level=false','-c:a','aac','-b:a','192k',os.path.join(B, NAME+'.m4a')],check=True)
os.remove(raw)
json.dump(dict(name=NAME, total=total, words=words), open(os.path.join(B, 'timeline.json'),'w'), ensure_ascii=False)
print(total, len(words))
