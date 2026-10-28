"""Voice + lo-fi bed (ducked, -14 LUFS) and word timings for reel 13."""
import json, subprocess, os, re, numpy as np
ROOT = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(ROOT, 'build'); os.makedirs(B, exist_ok=True)
SR, LEAD, TAIL, NAME = 44100, 0.4, 1.5, 'reel-13-cuantos-acaban-en-cita'
src = open(os.path.join(ROOT, '..', 'reels2', 'src', 'build.py')).read()
exec(src[src.index('def lofi'):src.index('meta = {}')])          # reuse the same music generator
def load(p):
    raw = subprocess.run(['ffmpeg','-v','error','-i',p,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
v = load(os.path.join(ROOT, 'audio', 'r13.mp3'))
words = [dict(w=w['text'], t=round(w['start']+LEAD,3), e=round(w['end']+LEAD,3))
         for w in json.load(open(os.path.join(ROOT, 'audio', 'r13-words.json')))['words'] if w['type']=='word' and w['end'] > 0.16]
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
