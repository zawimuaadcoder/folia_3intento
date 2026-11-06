# Toma 3 de Helena (ElevenLabs v4) + pausas del guion: [pausa corta]=0,3 s, [pausa]=0,6 s.
import json,subprocess,numpy as np
SR=48000
GUION=["¿Sabes cuántos pacientes pierde tu clínica capilar cada mes?",
"No los ves, porque nunca llegan a llamarte.",
"Buscan un injerto en el móvil, comparan tres clínicas… y eligen la que aparece primero.",
"Y cada uno de ellos son miles de euros que se van a otra clínica.",
"El problema no es tu clínica. Es que dependes del boca a boca.",
"Nosotros solo trabajamos con clínicas capilares.",
"Montamos un sistema para que ese paciente te encuentre a ti, y acabe en tu agenda.",
"Y si en tres meses no llegan treinta contactos cualificados, seguimos trabajando sin cobrarte.",
"Dale clic y calcula el potencial de tu clínica en treinta segundos."]
PAUSA=[0.3,0.6,0.6,0.6,0.6,0.3,0.6,0.6]
LEAD=0.25
a=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i","assets/audio/tomas/t3.mp3","-f","f32le","-ac","1","-ar",str(SR),"-"],capture_output=True).stdout,np.float32)
ww=json.load(open("assets/audio/tomas/t3.mp3.json"))
toks=[(i,t) for i,s in enumerate(GUION) for t in s.split()]
assert len(toks)==len(ww),(len(toks),len(ww))
ends=[]; 
for k in range(len(toks)-1):
    if toks[k][0]!=toks[k+1][0]: ends.append(k)
out=[np.zeros(int(LEAD*SR),np.float32)]; shift=LEAD; prev=0; shifts=[]
cuts=[]
for n,k in enumerate(ends):
    e,s=ww[k][2],ww[k+1][1]; mid=(e+s)/2; gap=s-e
    cuts.append((mid,max(0,PAUSA[n]-gap)))
words=[];ci=0;sh=LEAD
segs=[]
for mid,add in cuts:
    segs.append(a[int(prev*SR):int(mid*SR)]); segs.append(np.zeros(int(add*SR),np.float32)); prev=mid
segs.append(a[int(prev*SR):])
out+= segs
v=np.concatenate(out)
for k,(si,t) in enumerate(toks):
    w=ww[k]; extra=LEAD+sum(add for mid,add in cuts if mid<w[1])
    words.append({"w":t,"s":round(w[1]+extra,3),"e":round(w[2]+extra,3),"f":si})
# corrección manual (whisper pegó "Y" al final de la frase 7; verificado con silencedetect)
for x in words:
    if x["f"]==7 and x["w"]=="Y": x["s"],x["e"]=29.43,29.55
    if x["f"]==7 and x["w"]=="si": x["s"]=29.77
subprocess.run(["ffmpeg","-v","error","-y","-f","f32le","-ar",str(SR),"-ac","1","-i","-","-ar",str(SR),"assets/audio/voz.wav"],input=v.tobytes())
open("assets/words.js","w").write("window.WORDS="+json.dumps(words,ensure_ascii=False)+";\nwindow.GUION="+json.dumps(GUION,ensure_ascii=False)+";\n")
print(len(v)/SR); 
for i in range(9):
    f=[w for w in words if w["f"]==i]; print(i+1,f[0]["s"],f[-1]["e"])
