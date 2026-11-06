# Tiempos clave (absolutos, ya sumado el gancho del huevo) a partir de assets/words.js
import json,re
V0=82/30   # 68 fotogramas del huevo + 4 congelados + 10 de zoom-through
src=open('assets/words.js',encoding='utf-8').read()
W=json.loads(src.split('window.WORDS=',1)[1].split(';\n',1)[0])
for x in W: x['s']=round(x['s']+V0,3); x['e']=round(x['e']+V0,3)
def norm(s): return re.sub(r'[¿?.,…!]','',s).lower()
def w(f,word,n=0,end=False):
    m=[x for x in W if x['f']==f and norm(x['w'])==word]; return m[n]['e' if end else 's']
PH=[[min(x['s'] for x in W if x['f']==i),max(x['e'] for x in W if x['f']==i)] for i in range(10)]
cuarenta=w(5,'cuarenta')
B=[0,V0]+[round(PH[i][0]-.05,3) for i in (1,2,3,4)]+[cuarenta]+[round(PH[i][0]-.05,3) for i in (6,7,8)]+[round(PH[9][0]-.25,3)]
C=dict(V0=V0,B=B,END=round(PH[9][1]+1.2,3),PH=PH,W=W,
 e1_harvard=w(0,'harvard'),e1_dos=w(0,'dos'),e1_tardas=w(0,'tardas'),e1_cliente=w(0,'cliente')-.2,
 e2_res=w(1,'resultado'),e2_brutal=w(1,'brutal'),
 e3_primera=w(2,'primera'),e3_siete=w(2,'siete'),e3_oport=w(2,'oportunidad'),e3_unahora=w(2,'una',1),
 e4_dia=w(3,'día'),e4_dia_e=w(3,'día',end=True),e4_ses=w(3,'sesenta'),
 e5_cuanto=w(4,'cuánto'),e5_media=w(4,'media'),e5_cont=w(4,'contestar'),e5_end=PH[4][1],
 e6_42=cuarenta,
 e7_una=w(6,'una'),e7_no=w(6,'no'),
 e8_clin=w(7,'clínica'),e8_pac=w(7,'paciente'),e8_ayer=w(7,'ayer'),e8_hoy=w(7,'hoy'),e8_ya=w(7,'ya'),
 e9_precio=w(8,'precio'),e9_anuncios=w(8,'anuncios'),e9_lo=w(8,'lo'),
 e10_man=w(9,'mañana'),e10_esa=w(9,'esa'),e10_cual=w(9,'cualquier'))
if __name__=='__main__':
    open('assets/cues.js','w').write('window.C='+json.dumps(C,ensure_ascii=False)+';\n')
    print({k:v for k,v in C.items() if k not in('W','PH')})
