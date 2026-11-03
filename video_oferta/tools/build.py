# Genera index.html a partir del transcript (subtítulos karaoke) + escenas.
import json, html, re, os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
words = json.load(open(f"{D}/assets/transcript.json"))
fix = {"Ysi": "Y si", "1.": "Uno:", "2.": "Dos:", "3.": "Tres:", "pero…¿cuál": "Pero ¿cuál"}
KEY = re.compile(r"clientes|oferta|resultado|concreto|plazo|riesgo|gratis|30|90|días|comentarios|precio|anuncios|seguidores|contenido|dinero|dedicas", re.I)
END = 52.3; TOTAL = 54.6
# agrupar en frases de <=4 palabras, corte en puntuación
groups, cur = [], []
for w in words:
    t = fix.get(w["text"], w["text"]); cur.append((t, w["start"], w["end"]))
    if len(cur) >= 4 or re.search(r"[.,?:]$", t): groups.append(cur); cur = []
if cur: groups.append(cur)
cap_html, cap_js = [], []
for gi, g in enumerate(groups):
    s = g[0][1] - 0.05; e = groups[gi+1][0][1] - 0.05 if gi+1 < len(groups) else END
    e = min(e, s + 3.0)
    spans = []
    for wi, (t, ws, we) in enumerate(g):
        wid = f"w{gi}_{wi}"; k = " k" if KEY.search(t) else ""
        spans.append(f'<span id="{wid}" class="w{k}">{html.escape(t)}</span>')
        cap_js.append(f'F("#{wid}",{{opacity:.45,y:8}},{{opacity:1,y:0,duration:.12,ease:"power2.out"}},{ws:.2f});')
    cap_html.append(f'<div id="cap{gi}" class="clip cap" data-start="{s:.2f}" data-duration="{e-s:.2f}" data-track-index="9">{" ".join(spans)}</div>')
    cap_js.append(f'tl.fromTo("#cap{gi} .capin",{{}},{{}},0);')
tpl = open(f"{D}/tools/template.html").read()
out = tpl.replace("%%CAPTIONS%%", "\n      ".join(cap_html)).replace("%%CAPJS%%", "\n      ".join(c for c in cap_js if "capin" not in c)).replace("%%TOTAL%%", str(TOTAL))
open(f"{D}/index.html", "w").write(out)
print("ok", len(groups), "grupos")
