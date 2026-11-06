# Tiempos clave del anuncio, sacados de las marcas por palabra de la voz (assets/words.js).
import json,re
src=open('assets/words.js',encoding='utf-8').read()
W=json.loads(src.split('window.WORDS=',1)[1].split(';\n',1)[0])
def norm(s): return re.sub(r'[¿?.,…!]','',s).lower()
def w(f,word,n=0,end=False):
    m=[x for x in W if x['f']==f and norm(x['w'])==word]
    return m[n]['e' if end else 's']
PH=[[min(x['s'] for x in W if x['f']==i),max(x['e'] for x in W if x['f']==i)] for i in range(9)]
S=[0.0]+[round(PH[i][0]-0.15,3) for i in range(1,9)]
C=dict(S=S,END=round(PH[8][1]+1.15,3),PH=PH,
 e1_pac=w(0,'pacientes'),e1_pierde=w(0,'pierde'),e1_clin=w(0,'clínica'),
 e2_nunca=w(1,'nunca'),e2_llam=w(1,'llamarte'),e2_llam_e=w(1,'llamarte',end=True),
 e3_comp=w(2,'comparan'),e3_eligen=w(2,'eligen'),e3_prim=w(2,'primero'),
 e4_cada=w(3,'cada'),e4_miles=w(3,'miles'),e4_otra=w(3,'otra'),
 e5_clin=w(4,'clínica'),e5_es=w(4,'es',1),e5_boca=w(4,'boca'),
 e6_solo=w(5,'solo'),e6_cap=w(5,'capilares'),
 e7_sis=w(6,'sistema'),e7_pac=w(6,'paciente'),e7_agenda=w(6,'agenda'),
 e8_ysi=w(7,'y'),e8_tres=w(7,'tres'),e8_treinta=w(7,'treinta'),e8_cual_e=w(7,'cualificados',end=True),
 e8_seg=w(7,'seguimos'),e8_sin=w(7,'sin'),
 e9_calc=w(8,'calcula'),e9_en=w(8,'en'))
if __name__=='__main__':
    open('assets/cues.js','w').write('window.C='+json.dumps(C)+';\n'); print(json.dumps(C,indent=0))
