# Cama electrónica (104 BPM, sin melodía) + efectos + voz -> assets/audio/mezcla.wav (−14 LUFS, ≤ −1 dBTP)
import numpy as np, subprocess, json, re
from scipy.signal import butter, sosfilt
from cues import C
SR = 48000; END = C['END']; N = int((END + .05) * SR)
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


FR=1/30; V0=C['V0']; B=C['B']
fx=np.zeros(N); imp=np.zeros(N)
def at(t, x, g=1.0, buf=None):
    buf = fx if buf is None else buf; i = int(t * SR); n = min(len(x), N - i)
    if i >= 0 and n > 0: buf[i:i + n] += x[:n] * g
def add(*xs):
    o=np.zeros(max(len(x) for x in xs))
    for x in xs: o[:len(x)]+=x
    return o
def clack(): return add(bp(noise(.04),1500,5000)*env(int(.04*SR),.001,.01)*.9, sine(220,.08,.03)*.4)
def boom(d=.8): x=sweep(55,45,d)*np.exp(-t_(d)/(d/2.5)); return x
def crack(): return hp(noise(.12),2500)*env(int(.12*SR),.001,.03)*.8
def ding(f=1760): return add(sine(f,1.0,.35),.3*sine(f*2.01,1.0,.15))*.35
def bloop(f=600): return sweep(f,f*1.8,.09,.03)*.4
def rumble(d): x=lp(noise(d),180)*(.6+.4*np.sin(2*np.pi*7*t_(d))); return x*.5
def deflate(): return sweep(420,70,.7,.35)*.4
def beep(d=1.3): t=t_(d); return np.sin(2*np.pi*1000*t)*np.linspace(1,0,len(t))**1.5*.18
def rasp(): return bp(noise(.18),900,4000)*np.sin(np.pi*np.linspace(0,1,int(.18*SR)))*.45
def suction():
    n=int(.33*SR); r=np.linspace(0,1,n)**2
    return add(sweep(80,1800,.33)[:n]*r*.3, bp(noise(.33),400,3000)[:n]*r*.25)

# E0 · huevo
at(0, rumble(68*FR), .9); at(1.3, riser(68*FR-1.3), .8); at(1.35, boom(.35)); at(1.35+60/70, boom(.35))
at(72*FR, suction()); at(V0, sine(900,.08,.02)*.4)
# E1
h=C['e1_harvard']; [at(h+i*2*FR, tap(), .5) for i in range(7)]
d=C['e1_dos']; [at(d+k*2*FR, clack(), .25) for k in range(9)]; at(d+20*FR, clack(), .9)
at(d+20*FR, bp(noise(.6),3000,9000)*np.linspace(0,1,int(.6*SR))*np.linspace(1,0,int(.6*SR))*.4)
for k in range(9): at(C['e1_tardas']+k*.09, bloop(500+60*(k%4)), .5)
at(C['e1_cliente'], ping(1046,1568), .4)
# transiciones
for b in (B[2],B[5],B[9]): at(b-.2, whoosh(), .8)
for b in (B[3],B[8]): at(b-.17, swish(), 1.2)
# E2
at(C['e2_res'], swish(), .5); bt=C['e2_brutal']; at(bt, boom(), 1.0, imp); at(bt, crack(), .6, imp)
# E3
pm=C['e3_primera']; [at(pm+k*.1, clock(), .5) for k in range(8)]; at(pm+.9, ding(), .7)
sv=C['e3_siete']; [at(sv+k*2*FR, clack(), .25) for k in range(8)]; at(sv+16*FR, clack(), .9)
op=C['e3_oport']; at(op, sweep(200,900,.4,.2)*.3); at(op+14*FR, thump(), .7)
[at(C['e3_unahora']+.1+k*.2, clock(), .35) for k in range(5)]
# E4
dI=C['e4_dia']; at(dI, sweep(150,1400,.6,.3)*.25); ss=C['e4_ses']; [at(ss+k*2*FR, clack(), .25) for k in range(8)]
at(ss+16*FR, clack(), 1.0, imp); at(ss+16*FR, boom(.6), .9, imp); at(ss+16*FR, deflate(), .8, imp)
# E5
cu=C['e5_cuanto']; ct=C['e5_cont']; e42=C['e6_42']; x=cu
while x<e42-.05:
    v=.25 if x<ct else 1+5*((x-ct)/(e42-ct))**1.4
    at(x, clock(), .45); x+=1/(2+3*v)
at(C['e5_end'], riser(e42-C['e5_end']), .9)
# E6
at(e42, bp(noise(.25),300,2500)*np.linspace(1,0,int(.25*SR))*.5); land=e42+10*FR
at(land, clack(), 1.0, imp); at(land, boom(.7), 1.0, imp); at(land+.03, ding(2093), .8, imp)
# E7
u=C['e7_una']; [at(u+i*3*FR, bloop(500+120*i), .9) for i in range(4)]; at(C['e7_no']+.3, beep())
# E8
pa=C['e8_pac']; at(pa+.15, swish(), .8); [at(pa+.55+k*.1, buzz(.07), .9) for k in range(3)]
hoy=C['e8_hoy']; [at(hoy+k*.05, tick(1200), .5) for k in range(12)]; at(hoy+.55, ping(1318,1976), .4)
ya=C['e8_ya']; [at(ya+.9+i*.38, bloop(520 if i%2==0 else 700), .7) for i in range(5)]
# E9
at(C['e9_precio']+.25, rasp()); at(C['e9_anuncios']+.25, rasp()); lo=C['e9_lo']
at(lo, boom(2.2)*1.1, 1.0, imp)
pd=t_(B[10]-lo-.4); at(lo+.4, np.sin(2*np.pi*55*pd)*np.minimum(1,pd/.3)*np.minimum(1,(pd[-1]-pd)/.3)*.12)
# E10/11
m=C['e10_man']; at(m+1.0, ding(1318), .6); at(C['e10_esa']+.3, chime([523,784],1.6), 1.0)
endv=C['PH'][9][1]; sh=bp(noise(1.2),5000,12000)*np.exp(-t_(1.2)/.4)*.15; at(endv+.15, sh)

# cama 104 BPM: bombo suave, pulso grave en corcheas, hi-hat discreto
t=np.arange(N)/SR; bed=np.zeros(N); beat=60/104
k=V0
while k<C['END']:
    at(k, sweep(90,45,.18)*np.exp(-t_(.18)/.07)*.9, 1, bed)
    for q in (0,.5):
        tt=t_(beat/2*.9); at(k+q*beat, lp(np.sign(np.sin(2*np.pi*55*tt)),300)*np.exp(-tt/.12)*.25, 1, bed)
    at(k+beat/2, hp(noise(.03),7000)*env(int(.03*SR),.001,.008)*.12, 1, bed)
    k+=beat
g=np.where(t<V0,0,1.0)
for a_,b_ in [(C['e2_brutal']-4*FR, C['e2_brutal']+.8),(C['e5_end'],e42),(lo-5*FR,B[10])]: g[(t>=a_)&(t<b_)]=0
g=lp(g,200)  # corte seco sin clic
voz=np.frombuffer(subprocess.run(['ffmpeg','-v','error','-i','assets/audio/voz.wav','-f','f32le','-ac','1','-ar',str(SR),'-'],capture_output=True).stdout,np.float32).astype(float)
v=np.zeros(N); i0=int(V0*SR); v[i0:i0+len(voz)]=voz[:N-i0]
# ducking ~8 dB bajo la voz
venv=lp(np.abs(v),8); duck=1-(1-10**(-8/20))*np.clip(venv/(venv.max()*.15),0,1)
bed10=lp(bed,700)*.6; bed=np.where(t>=B[10],bed10,bed)*g*duck
# silencios de efectos antes de los impactos
for a_,b_ in [(C['e2_brutal']-4*FR, C['e2_brutal']),(lo-5*FR,lo),(72*FR-4*FR,72*FR)]: fx[(t>=a_)&(t<b_)]=0
rms=lambda x: np.sqrt(np.mean(x[np.abs(x)>1e-4]**2)); vr=rms(v)
pk=lambda x: np.percentile(np.abs(x[np.abs(x)>1e-4]),99.5)
bed*=vr/rms(bed)*10**(-19/20); fx*=vr/rms(fx)*10**(-11/20); imp*=pk(v)/pk(imp)*10**(-6/20)
mix=v+bed+fx+imp
st=np.stack([mix,mix],1).astype(np.float32)
subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(SR),'-ac','2','-i','-','assets/audio/premezcla.wav'],input=st.tobytes())
o=subprocess.run(['ffmpeg','-i','assets/audio/premezcla.wav','-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True).stderr
m_=json.loads(re.findall(r'\{[^}]+\}',o)[-1])
af=f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m_['input_i']}:measured_TP={m_['input_tp']}:measured_LRA={m_['input_lra']}:measured_thresh={m_['input_thresh']}:offset={m_['target_offset']}:linear=true"
subprocess.run(['ffmpeg','-v','error','-y','-i','assets/audio/premezcla.wav','-af',af,'-ar','48000','assets/audio/mezcla.wav'])
o=subprocess.run(['ffmpeg','-i','assets/audio/mezcla.wav','-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True).stderr
print(o[o.rfind('Integrated'):])
