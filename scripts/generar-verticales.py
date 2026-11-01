"""Genera /capilares/ y /dentales/ a partir de index.html.

Uso: python3 scripts/generar-verticales.py
Vuelve a ejecutarlo cada vez que cambies index.html.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
A = ROOT / 'assets'

BASE = (ROOT / 'index.html').read_text()


def absolutize(html):
    # Las páginas viven en una subcarpeta: las rutas a assets/ deben ser absolutas.
    return re.sub(r'(src|href|poster)="assets/', r'\1="/assets/', html)


def must_replace(html, old, new, count=1):
    if old not in html:
        sys.exit(f'No encuentro el texto a sustituir: {old[:80]!r}')
    return html.replace(old, new) if count == 0 else html.replace(old, new, count)


# ---------- /capilares/ : la misma página, con canonical a la portada ----------
cap = absolutize(BASE)
(ROOT / 'capilares').mkdir(exist_ok=True)
(ROOT / 'capilares' / 'index.html').write_text(cap)

# ---------- Colores rosa para la versión dental ----------
PINK = [
    ('#266df0', '#e0457b'), ('#266DF0', '#E0457B'),
    ('rgba(38,109,240', 'rgba(224,69,123'),
    ('rgba(59,135,242', 'rgba(234,92,142'),
    ('rgba(79,140,255', 'rgba(234,92,142'),
    ('#2457c5', '#b8285e'), ('#1559d0', '#c12e66'),
    ('#4f8cff', '#ea5c8e'), ('#7aa6ff', '#f38fb3'),
    ('#8fb3ff', '#f6a5c2'), ('#eef3ff', '#fdeef4'),
    ('#f1f5ff', '#fef2f6'), ('#e8f0fe', '#fce8f0'),
    ('#eaf1ff', '#fdeaf2'), ('#E2E9FF', '#FCE3EC'), ('#3B87F2', '#EA5C8E'),
]


def pinkify(text):
    for a, b in PINK:
        text = text.replace(a, b)
    return text


css = pinkify((A / 'styles.css').read_text()).replace("url('hero-bg.svg')", "url('hero-bg-dental.svg')")
(A / 'styles-dental.css').write_text(css)
for name in ['hero-bg', 'ic-chart', 'ic-shiny', 'ic-users']:
    (A / f'{name}-dental.svg').write_text(pinkify((A / f'{name}.svg').read_text()))

# ---------- /dentales/ ----------
d = absolutize(BASE)
d = must_replace(d, '<html lang="es">', '<html lang="es" data-vertical="dental">')
d = must_replace(d, '/assets/styles.css', '/assets/styles-dental.css')
d = must_replace(d, '/assets/vsl-lead-engine-v3.mp4', '/assets/vsl-dental.mp4')
d = must_replace(d, '/assets/vsl-poster.jpg', '/assets/vsl-dental-poster.jpg')
for name in ['ic-chart', 'ic-shiny', 'ic-users']:
    d = d.replace(f'/assets/{name}.svg', f'/assets/{name}-dental.svg')

R = [
    # Cabecera y SEO
    ('<title>Captación de pacientes para clínicas capilares | Marketing Health for Clinics</title>',
     '<title>Captación de pacientes para clínicas dentales | Marketing Health for Clinics</title>'),
    ('Sistema de captación de pacientes para clínicas capilares en España: Meta Ads en tu zona, filtro de curiosos y seguimiento hasta la valoración. Garantía de 30 contactos cualificados.',
     'Sistema de captación de pacientes para clínicas dentales en España: Meta Ads en tu zona, filtro de curiosos y seguimiento hasta la primera visita. Garantía de 30 contactos cualificados.'),
    ('<link rel="canonical" href="https://mhfcleads.com/">', '<link rel="canonical" href="https://mhfcleads.com/dentales/">'),
    ('<meta property="og:title" content="Captación de pacientes para clínicas capilares">',
     '<meta property="og:title" content="Captación de pacientes para clínicas dentales">'),
    ('<meta property="og:url" content="https://mhfcleads.com/">', '<meta property="og:url" content="https://mhfcleads.com/dentales/">'),
    ('"name": "Sistema de captación de pacientes para clínicas capilares"', '"name": "Sistema de captación de pacientes para clínicas dentales"'),
    ('"serviceType": "Captación de pacientes para clínicas capilares"', '"serviceType": "Captación de pacientes para clínicas dentales"'),
    ('"url": "https://mhfcleads.com/", "description"', '"url": "https://mhfcleads.com/dentales/", "description"'),
    ('<div class="announcement">Sistemas de captación para clínicas capilares en España.</div>',
     '<div class="announcement">Sistemas de captación para clínicas dentales en España.</div>'),
    # Hero
    ('Solo para clínicas capilares', 'Solo para clínicas dentales'),
    ('Valoraciones capilares cada mes.', 'Primeras visitas cada mes.'),
    ('con interés real en un injerto o un tratamiento capilar, filtra a los curiosos y las lleva hasta su valoración.',
     'con interés real en un implante, una ortodoncia u otro tratamiento dental, filtra a los curiosos y las lleva hasta su primera visita.'),
    ('cómo el Lead Engine V3 llena las valoraciones de tu clínica', 'cómo el Lead Engine V3 llena las primeras visitas de tu clínica'),
    # Problemas
    ('Hola, ¿precio del injerto?', 'Hola, ¿precio del implante?'),
    ('¿Cuánto cuesta un FUE?', '¿Cuánto cuesta una ortodoncia invisible?'),
    ('<span class="city-label l2">Estambul</span>', '<span class="city-label l2">Cadena low cost</span>'),
    ('<h3>Pacientes que se van a Turquía</h3>', '<h3>Pacientes que se van a las cadenas</h3>'),
    ('Si solo compiten por precio, se operan fuera. Sin un mensaje que explique tu valor, ni entras en la comparación.',
     'Si solo comparan precios, eligen la cadena de turno. Sin un mensaje que explique tu valor, ni entras en la comparación.'),
    # Método
    ('Del anuncio a la valoración.', 'Del anuncio a la primera visita.'),
    ('para personas de tu zona que ya buscan una solución para su pelo.', 'para personas de tu zona que ya buscan una solución para su boca.'),
    ('convierte el interés en solicitudes de valoración.', 'convierte el interés en solicitudes de primera visita.'),
    ('Medimos el coste por valoración y por paciente', 'Medimos el coste por primera visita y por paciente'),
    ('cuánto te cuesta cada valoración y cada paciente.', 'cuánto te cuesta cada primera visita y cada paciente.'),
    ('<strong>Clínica Capilar Madrid</strong>', '<strong>Clínica Dental Madrid</strong>'),
    ('¿Notas menos densidad en las entradas? Pide tu valoración capilar gratuita con un especialista.',
     '¿Te falta una pieza o te cuesta sonreír? Pide tu primera visita gratuita con un especialista.'),
    ('<span class="ad-badge">Valoración gratuita</span>', '<span class="ad-badge">Primera visita gratuita</span>'),
    ('<span>Clínica Capilar · Madrid</span>', '<span>Clínica Dental · Madrid</span>'),
    ('Interés: injerto capilar', 'Interés: implantes dentales'),
    ('Clics a valoración', 'Clics a primera visita'),
    ('<p class="lf-title">Valoración capilar gratuita</p>', '<p class="lf-title">Primera visita dental gratuita</p>'),
    ('data-text="Entradas y coronilla"', 'data-text="Me falta una muela"'),
    ('<span class="lf-button">Quiero mi valoración</span>', '<span class="lf-button">Quiero mi primera visita</span>'),
    ('<small>Entradas y coronilla · ahora</small>', '<small>Implante · ahora</small>'),
    ('<small>Valoración FUE · hace 42 min</small>', '<small>Ortodoncia invisible · hace 42 min</small>'),
    ('<small>Tratamiento PRP · hace 2 h</small>', '<small>Blanqueamiento · hace 2 h</small>'),
    ('<span>Injerto FUE</span>', '<span>Implante</span>'),
    ('<span>Valoración</span><span><i class="score" data-score="81">', '<span>Ortodoncia</span><span><i class="score" data-score="81">'),
    ('<span>PRP</span>', '<span>Blanqueamiento</span>'),
    ('Laura quiere un injerto FUE, tiene presupuesto y puede venir por las tardes.',
     'Laura necesita un implante, tiene presupuesto y puede venir por las tardes.'),
    ('Valoraciones al mes</small>', 'Primeras visitas al mes</small>'),
    # Para quién es
    ('Tienes una clínica capilar en España y quieres crecer de forma predecible.', 'Tienes una clínica dental en España y quieres crecer de forma predecible.'),
    ('Puedes atender más valoraciones de las que tienes ahora.', 'Puedes atender más primeras visitas de las que tienes ahora.'),
    ('Quieres medir lo que cuesta cada valoración y cada paciente.', 'Quieres medir lo que cuesta cada primera visita y cada paciente.'),
    # Quiénes somos (sin inventar experiencia en dental)
    ('Especialistas en clínicas capilares.<br class="desktop-break"> <span class="tone-muted">No una agencia más.</span>',
     'Especialistas en captación para clínicas.<br class="desktop-break"> <span class="tone-muted">No una agencia más.</span>'),
    ('Llevamos más de 6 años haciendo marketing y hoy nos dedicamos a una sola cosa: llenar la agenda de clínicas capilares. Conocemos tus tratamientos, tu ticket y la competencia de Turquía, así que no empezamos de cero contigo.',
     'Llevamos más de 6 años haciendo marketing y hoy nos dedicamos a una sola cosa: llenar la agenda de clínicas de salud. Sabemos cómo decide un paciente antes de un tratamiento de ticket alto, así que no empezamos de cero contigo.'),
    ('<div><dt>1 especialidad</dt><dd>captación para clínicas capilares</dd></div>',
     '<div><dt>1 sector</dt><dd>captación solo para clínicas</dd></div>'),
    # Calculadora
    ('cuántas valoraciones y pacientes podrías sumar cada mes', 'cuántas primeras visitas y pacientes podrías sumar cada mes'),
    ('Contactos → valoraciones → pacientes', 'Contactos → primeras visitas → pacientes'),
    # Preguntas
    ('Sí. Trabajamos con clínicas capilares de cualquier zona.', 'Sí. Trabajamos con clínicas dentales de cualquier zona.'),
    ('Es nuestro sistema de captación para clínicas capilares: campañas en Meta Ads dirigidas a tu zona, un recorrido que filtra a los curiosos, respuesta y seguimiento de cada contacto con ayuda de IA, y medición del coste por valoración y por paciente para mejorar cada mes.',
     'Es nuestro sistema de captación para clínicas dentales: campañas en Meta Ads dirigidas a tu zona, un recorrido que filtra a los curiosos, respuesta y seguimiento de cada contacto con ayuda de IA, y medición del coste por primera visita y por paciente para mejorar cada mes.'),
    ('Es para clínicas capilares que tienen capacidad para atender más valoraciones y quieren crecer de forma predecible.',
     'Es para clínicas dentales que tienen capacidad para atender más primeras visitas y quieren crecer de forma predecible.'),
]
for old, new in R:
    d = must_replace(d, old, new, 0)

# Las guías del pie son capilares: en dental no se muestran.
d = re.sub(r'\s*<nav class="footer-guides".*?</nav>', '', d, flags=re.S)

left = re.findall(r'[^>]{0,40}(?:capilar|injert|Turqu|FUE\b|PRP|pelo|Estambul)[^<]{0,40}', d, flags=re.I)
if left:
    sys.exit('Quedan referencias capilares en /dentales/:\n' + '\n'.join(left))

d = pinkify(d)
(ROOT / 'dentales').mkdir(exist_ok=True)
(ROOT / 'dentales' / 'index.html').write_text(d)
print('OK: capilares/index.html, dentales/index.html, assets/styles-dental.css')
