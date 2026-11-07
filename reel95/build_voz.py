# Toma 3 (mejores pausas y pronuncia bien "Ehrenberg") + pausas del guion. Escribe assets/audio/voz.wav y assets/words.js
import json,subprocess,numpy as np
SR=48000
# (frase, texto del tramo, pausa después)
SEG=[(0,"Un profesor del Ehrenberg-Bass Institute calculó cuántos de tus posibles clientes están listos para comprarte hoy.",.6),
(1,"La respuesta cambia por completo cómo deberías vender.",.9),
(2,"Alrededor del cinco por ciento.",.6),
(3,"De cada cien empresas que podrían comprarte, noventa y cinco no están buscando nada ahora mismo.",.6),
(4,"Y casi todo el mundo hace lo mismo: perseguir a esos cinco.",.3),(4,"Llamadas,",.3),(4,"anuncios de \"pide tu demo\",",.3),(4,"descuentos.",.6),
(5,"Mientras tanto, los otros noventa y cinco se olvidan de ti.",.6),
(6,"Y cuando por fin les toca comprar…",.3),(6,"llaman al que recuerdan.",.6),
(7,"No al mejor.",.3),(7,"Al que recuerdan.",.9),
(8,"Si hoy no te compran, no te están diciendo que no.",.3),(8,"Te están diciendo \"todavía no\".",.6),
(9,"La pregunta es si vas a seguir ahí cuando les toque.",0)]
GUION=[" ".join(s[1] for s in SEG if s[0]==i) for i in range(10)]
a=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","assets/audio/tomas/t3.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32)
ww0=json.load(open("assets/audio/tomas/t3.mp3.json")); ww=[]
EXP={'5%':3,'95':3,'100':1,'5':1,'5.':1,'5%.':3}
i=0
while i<len(ww0):
    w,s0,e0=ww0[i]
    if w.startswith('Ehrenberg') and i+1<len(ww0) and ww0[i+1][0].startswith('Bass'): ww.append([w,s0,ww0[i+1][2]]); i+=2; continue
    n=EXP.get(w.strip(',.'),EXP.get(w,1))
    for k in range(n): ww.append([w,s0+(e0-s0)*k/n,s0+(e0-s0)*(k+1)/n])
    i+=1
toks=[(si,t) for si,s in enumerate(SEG) for t in s[1].split()]
assert len(toks)==len(ww),(len(toks),len(ww))
import re
sd=subprocess.run(["ffmpeg","-i","assets/audio/tomas/t3.mp3","-af","silencedetect=n=-42dB:d=0.12","-f","null","-"],capture_output=True,text=True).stderr
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
