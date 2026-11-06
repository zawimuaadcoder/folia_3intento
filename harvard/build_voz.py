# Toma 2 (pronuncia bien "Járvard" y "a qué hora") + pausas del guion. Escribe assets/audio/voz.wav y assets/words.js
import json,subprocess,numpy as np
SR=48000
# (frase, texto del tramo, pausa después)
SEG=[(0,"Harvard analizó a más de dos mil empresas para ver qué pasa cuando tardas en contestar a un cliente.",.6),
(1,"El resultado es brutal.",.6),
(2,"Si contestas en la primera hora, tienes siete veces más probabilidades de convertirlo en una oportunidad real que si tardas una hora más.",.6),
(3,"Si tardas un día…",.3),(3,"sesenta veces menos.",.6),
(4,"¿Y sabes cuánto tardaban de media esas empresas en contestar?",.9),
(5,"Cuarenta y dos horas.",.6),
(6,"Y casi una de cada cuatro no contestó nunca.",.6),
(7,"Ahora piensa en tu clínica.",.3),(7,"El paciente que te escribió ayer a las diez de la noche, hoy a las diez de la mañana ya puede estar hablando con otra.",.6),
(8,"No perdiste ese paciente por precio.",.3),(8,"Ni por tus anuncios.",.3),(8,"Lo perdiste por la hora.",.9),
(9,"Mañana mira a qué hora contestas tus mensajes.",.3),(9,"Esa hora vale más que cualquier anuncio.",0)]
GUION=[" ".join(s[1] for s in SEG if s[0]==i) for i in range(10)]
a=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","assets/audio/tomas/t2.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32)
ww=json.load(open("assets/audio/tomas/t2.mp3.json"))
toks=[(si,t) for si,s in enumerate(SEG) for t in s[1].split()]
assert len(toks)==len(ww),(len(toks),len(ww))
import re
sd=subprocess.run(["ffmpeg","-i","assets/audio/tomas/t2.mp3","-af","silencedetect=n=-42dB:d=0.12","-f","null","-"],capture_output=True,text=True).stderr
ST=[float(x) for x in re.findall(r"silence_start: ([0-9.]+)",sd)]; EN=[float(x) for x in re.findall(r"silence_end: ([0-9.]+)",sd)]
SIL=list(zip(ST,EN))
edits=[]; firsts={}
for k in range(len(toks)-1):
    if toks[k][0]==toks[k+1][0]: continue
    s_=ww[k+1][1]; c=[x for x in SIL if x[1]>ww[k][1]+.1 and x[0]<s_+.4]
    x=min(c,key=lambda x:abs(x[1]-s_))
    edits.append((x[0]+.04,x[1]-.04,max(.05,SEG[toks[k][0]][2]-.08))); firsts[k+1]=x[1]
out=[];prev=0
for s0,s1,d in edits: out+= [a[int(prev*SR):int(s0*SR)],np.zeros(int(d*SR),np.float32)]; prev=s1
out.append(a[int(prev*SR):]); v=np.concatenate(out)
def mapt(x):
    sh=0
    for s0,s1,d in edits:
        if x>=s1: sh+=d-(s1-s0)
        elif x>s0: return s0+sh
    return x+sh
words=[{"w":t,"s":round(mapt(firsts.get(k,ww[k][1])),3),"e":round(mapt(ww[k][2]),3),"f":SEG[si][0],"g":si} for k,(si,t) in enumerate(toks)]
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","assets/audio/voz.wav"],input=v.tobytes())
open("assets/words.js","w").write("window.WORDS="+json.dumps(words,ensure_ascii=False)+";\nwindow.GUION="+json.dumps(GUION,ensure_ascii=False)+";\n")
print("dur",len(v)/SR)
for i in range(10):
    f=[w for w in words if w["f"]==i]; print(i+1,f[0]["s"],f[-1]["e"])
