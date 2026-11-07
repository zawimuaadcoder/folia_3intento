# Tiempos clave (absolutos, ya sumado el gancho) a partir de assets/words.js
import json,re
V0=70/30   # 57 fotogramas del gancho + 4 congelados + 9-10 de zoom-through
src=open('assets/words.js',encoding='utf-8').read()
W=json.loads(src.split('window.WORDS=',1)[1].split(';\n',1)[0])
for x in W: x['s']=round(x['s']+V0,3); x['e']=round(x['e']+V0,3)
def norm(s): return re.sub(r'[¿?.,…!:"]','',s).lower()
def w(f,word,n=0,end=False):
    m=[x for x in W if x['f']==f and norm(x['w'])==word]; return m[n]['e' if end else 's']
PH=[[min(x['s'] for x in W if x['f']==i),max(x['e'] for x in W if x['f']==i)] for i in range(10)]
B=[0,V0,PH[2][0]-.02,PH[3][0]-.05,PH[4][0]-.05,PH[5][0]-.05,PH[6][0]-.05,PH[7][0]-.02,PH[8][0]-.3,PH[9][0]-.15]
B=[round(x,3) for x in B]
C=dict(V0=V0,B=B,END=round(PH[9][1]+1.2,3),PH=PH,W=W,
 e1_ehr=w(0,'ehrenberg-bass'),e1_calc=w(0,'calculó'),e1_pos=w(0,'posibles'),e1_listos=w(0,'listos'),
 e2_resp=w(1,'respuesta'),e2_cambia=w(1,'cambia'),e2_end=PH[1][1],
 e3_alr=w(2,'alrededor'),e3_cinco=w(2,'cinco'),
 e4_cien=w(3,'cien'),e4_podrian=w(3,'podrían'),e4_noventa=w(3,'noventa'),e4_ahora=w(3,'ahora'),
 e5_casi=w(4,'casi'),e5_perseguir=w(4,'perseguir'),e5_llam=w(4,'llamadas'),e5_pide=w(4,'pide'),e5_desc=w(4,'descuentos'),
 e6_olvidan=w(5,'olvidan'),e6_ti=w(5,'ti'),
 e7_cuando=w(6,'cuando'),e7_toca=w(6,'toca'),e7_llaman=w(6,'llaman'),
 e8_mejor=w(7,'mejor'),e8_al=w(7,'al',1),
 e9_no=w(8,'no',2),e9_todavia=w(8,'todavía'),
 e10_seguir=w(9,'seguir'),e10_cuando=w(9,'cuando'))
if __name__=='__main__':
    open('assets/cues.js','w').write('window.C='+json.dumps(C,ensure_ascii=False)+';\n')
    print({k:v for k,v in C.items() if k not in('W','PH')})
