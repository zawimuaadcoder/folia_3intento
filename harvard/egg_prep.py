# Elige los fotogramas del huevo (0–1,95 s, rampa al 35 % desde 1,30 s) y localiza el huevo en cada uno.
import sys,os,shutil,json,numpy as np,subprocess
from scipy import ndimage
src=sys.argv[1]; T=0.65/((1+.35)/2)
times=[n/30 for n in range(39)]
tau=0
while True:
    tau=len(times)/30-1.3
    if tau>=T: break
    times.append(1.3+tau-.65*tau*tau/(2*T))
times.append(1.95)
out=[]
for i,t in enumerate(times):
    k=min(232,round(t*120)); f=f"{src}/{k:04d}.jpg"; shutil.copy(f,f"assets/egg/{i:03d}.jpg")
    g=np.frombuffer(subprocess.run(["ffmpeg","-v","error","-i",f,"-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout,np.uint8).reshape(1274,716,3).astype(int)
    mn=g.min(2); ch=g.max(2)-mn; m=(mn>165)&(ch<28); m[500:]=False; m=ndimage.binary_opening(m,iterations=2); lab,n=ndimage.label(m); sz=ndimage.sum(np.ones(m.shape),lab,range(1,n+1)); cm=ndimage.center_of_mass(m,lab,range(1,n+1))
    cand=[(cm[q][1],cm[q][0],sz[q]) for q in range(n) if sz[q]>250]
    p=out[-1] if out else (167,335)
    c=min(cand,key=lambda c:(c[0]-p[0])**2+(c[1]-p[1])**2) if cand else (p[0],p[1],0)
    out.append([round(float(c[0]),1),round(float(c[1]),1),int(c[2])])
open("assets/egg.js","w").write("window.EGG="+json.dumps(out)+";\n"); print(len(times)); print(out[::6], out[-1])
