"""Build per-reel timelines (scene timing + word timings), voice mix, generated music and final audio."""
import json, subprocess, numpy as np, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'audio'); B = os.path.join(ROOT, 'build'); os.makedirs(B, exist_ok=True)
SR = 44100
REELS = {
 'reel-1-precio': [
  ("¿Cuánto *cuesta*?", "Si tienes una clínica y te escriben solo para preguntar el precio…"),
  ("Y *desaparecen*", "…y después desaparecen, el problema no es tu precio."),
  ("El *error*", "Es lo que respondes. Si contestas con una cifra, solo te comparan por precio."),
  ("Pregunta *primero*", "Antes de dar el precio, pregunta qué busca y en qué plazo."),
  ("Agenda la *valoración*", "Y lleva la conversación a una valoración. El precio, en consulta."),
  ("*Mándaselo* a tu equipo", "Mándaselo a quien responde los mensajes en tu clínica."),
 ],
 'reel-2-boca-a-boca': [
  ("Opinión *impopular*", "Opinión impopular: el boca a boca está frenando tu clínica."),
  ("Un mes *lleno*", "Un mes vas a tope…"),
  ("Otro *vacío*", "…y al siguiente, huecos. Y nunca sabes cuál te toca."),
  ("No lo *controlas*", "El boca a boca es bueno, pero no lo controlas. Así no puedes planificar."),
  ("Un *sistema*", "Las clínicas que crecen tienen un sistema que trae pacientes cada mes."),
  ("Facturación *x2*", "Como Mario, que con su clínica capilar en Valencia duplicó su facturación en 5 meses."),
  ("¿Y *tú*?", "¿Tu clínica depende del boca a boca? Te leo en comentarios."),
 ],
 'reel-3-turquia': [
  ("Este es *Carlos*", "Este es Carlos. Lleva un año pensando en hacerse un injerto."),
  ("Busca en *Google*", "Un día busca clínicas en su ciudad."),
  ("Escribe a *3* clínicas", "Escribe a tres clínicas."),
  ("Nadie *responde*", "Una tarda dos días. Otra nunca contesta. La tercera solo le manda un precio."),
  ("Turquía *sí*", "Una clínica de Turquía le responde en minutos, le hace preguntas y le acompaña."),
  ("No fue el *precio*", "Carlos no se fue por el precio. Se fue porque alguien le atendió primero."),
  ("¿Cuánto *tardas*?", "¿Cuánto tarda tu clínica en responder?"),
 ],
 'reel-4-tres-errores': [
  ("3 *errores*", "Tres errores que vacían la agenda de una clínica capilar."),
  ("1 · Responder *tarde*", "Uno: responder tarde. El interés se enfría en horas."),
  ("2 · Hablar de *precio*", "Dos: anunciar el precio. Así solo te comparan por euros."),
  ("3 · No hacer *seguimiento*", "Tres: no insistir. Muchos reservan al segundo o tercer mensaje."),
  ("¿Cuál *cometes*?", "¿Cuál comete tu clínica? Tres errores que vacían…"),
 ],
}
LEAD, TAIL = 0.22, 0.38  # silence before / after each voice clip inside its scene

def load(path):
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-ac','1','-ar',str(SR),'-f','f32le','-'],capture_output=True,check=True).stdout
    return np.frombuffer(raw, np.float32).copy()

def speech_span(x):
    win = int(SR*0.02); n = len(x)//win
    e = np.sqrt((x[:n*win].reshape(n,win)**2).mean(1)); thr = e.max()*0.06
    idx = np.where(e > thr)[0]
    return idx[0]*win/SR, (idx[-1]+1)*win/SR, e, thr, win

def word_times(words, x):
    s, end, e, thr, win = speech_span(x)
    # weight = letters + pause bonus after punctuation
    w = [len(t.strip('¿?¡!.,:…')) + 2 for t in words]
    pause = [3 if t[-1] in ',.:?…' else 0 for t in words]
    tot = sum(w) + sum(pause[:-1]); acc = 0; out = []
    for i, t in enumerate(words):
        out.append(s + (end - s) * acc / tot); acc += w[i] + pause[i]
    return out

def music(dur, seed):
    rng = np.random.default_rng(seed)
    t = np.arange(int(dur*SR))/SR; out = np.zeros_like(t)
    chords = [[57,60,64],[53,57,60],[48,52,55],[55,59,62]]  # Am F C G
    bar = 2.4
    f = lambda m: 440*2**((m-69)/12)
    for k in range(int(dur/bar)+2):
        c = chords[k % 4]; t0 = k*bar
        seg = (t >= t0) & (t < t0 + bar*1.6); tt = t[seg]-t0
        env = np.minimum(tt/0.8, 1) * np.exp(-np.maximum(tt-bar, 0)/0.4)
        for m in c:
            out[seg] += 0.10*env*(np.sin(2*np.pi*f(m)*tt) + 0.3*np.sin(2*np.pi*f(m)*2*tt + 0.5))
        for j in range(4):  # soft pluck arpeggio
            m = c[j % 3] + 12; p0 = t0 + j*bar/4
            sg = (t >= p0) & (t < p0 + 1.2); pt = t[sg]-p0
            out[sg] += 0.07*np.exp(-pt*4)*np.sin(2*np.pi*f(m)*pt)
    out += 0.004*np.convolve(rng.standard_normal(len(t)), np.ones(200)/200, 'same')
    fade = np.minimum(1, np.minimum(t/0.6, (dur-t)/0.8)); return out*fade

meta = {}
for ri, (name, scenes) in enumerate(REELS.items()):
    clips = [load(os.path.join(A, f'r{ri+1}s{i+1}.mp3')) for i in range(len(scenes))]
    t = 0.0; sc = []
    last = len(scenes)-1
    for i, ((title, vo), x) in enumerate(zip(scenes, clips)):
        lead = 0.05 if i == 0 else LEAD  # hook: voice starts immediately
        tail = 0.15 if (name.startswith('reel-4') and i == last) else (0.9 if i == last else TAIL)
        d = max(2.0, lead + len(x)/SR + tail)
        words = vo.split()
        wt = [t + lead + w for w in word_times(words, x)]
        sc.append(dict(title=title, vo=vo, start=round(t,3), dur=round(d,3), voice=round(t+lead,3),
                       words=[dict(w=w, t=round(s,3)) for w, s in zip(words, wt)]))
        t += d
    total = round(t, 3)
    voice = np.zeros(int(total*SR)+SR)
    for s, x in zip(sc, clips):
        a = int(s['voice']*SR); voice[a:a+len(x)] += x
    voice = voice[:int(total*SR)]
    mus = music(total, ri)
    vr = np.sqrt((voice[np.abs(voice) > 0.01]**2).mean()); mr = np.sqrt((mus**2).mean())
    mus *= 0.13*vr/mr  # music RMS at 13% of voice RMS
    mix = voice + mus; mix /= max(1, np.abs(mix).max()/0.97)
    wav = os.path.join(B, name + '.f32')
    mix.astype(np.float32).tofile(wav)
    subprocess.run(['ffmpeg','-y','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i',wav,'-ac','2','-c:a','aac','-b:a','192k',os.path.join(B,name+'.m4a')],check=True)
    os.remove(wav)
    meta[name] = dict(total=total, scenes=sc)
    print(name, total, [s['dur'] for s in sc])
json.dump(meta, open(os.path.join(B, 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
