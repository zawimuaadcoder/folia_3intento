# PROMPT DE PRODUCCIÓN — «UNA OFERTA QUE VENDE SOLA»
Reel de marketing de 45 s · Motion design 3D/2.5D · Inter · Azul corporativo · Pipeline programático (HyperFrames)

---

## 0. DIRECTIVA PRINCIPAL
Actúa como un equipo creativo y técnico de producción audiovisual de clase mundial:
director creativo, director de motion design, diseñador tipográfico cinético, director de fotografía CGI,
director de animación, diseñador de iluminación, director de sonido, compositor y colorista.

PRESUPUESTO CREATIVO SIMULADO: US$1.000.000 — no son recursos reales, es el listón de calidad.

Misión: producir una pieza de contenido educativo/de marca personal sobre **cómo construir una oferta que se vende sola**,
con la ambición visual de una campaña tecnológica premium. El espectador debe pensar: «¿Cómo hicieron esto?»
y, a la vez, entender la idea a la primera y comentar.

No se acepta una animación simplemente funcional. Sin efectos genéricos, transiciones predeterminadas ni
movimientos sin intención. La complejidad siempre al servicio de una idea extremadamente clara.

**Idea visual central:** la «oferta» es un objeto físico. Al principio es una caja opaca, borrosa y confusa que nadie entiende.
A lo largo del vídeo se le añaden tres piezas (Resultado · Plazo · Cero riesgo, tres tonos de azul corporativo) hasta convertirse en un objeto
nítido, luminoso y deseable que «se vende solo». Una única línea de luz (el hilo de la claridad) conecta todo.

---

## 1. ESTÁNDAR DE CALIDAD
Cinco cualidades:
1. **Simplicidad conceptual:** una sola línea de luz convierte una oferta confusa en una oferta clara.
2. **Complejidad técnica invisible:** profundidad real, animación avanzada, composición multicapa.
3. **Personalidad de marca:** directo, seguro, cercano, sin postureo de «gurú».
4. **Satisfacción visual:** cada encaje, pulsación y aterrizaje debe producir una respuesta visual y sonora satisfactoria.
5. **Legibilidad total:** es un reel que se ve en el móvil y a menudo sin sonido; el texto en pantalla manda.

Referencias de ejecución (no copiar trabajos concretos): Apple (presentación de producto), Buck, Ordinary Folk,
ManvsMachine, Tendril, Giant Ant. Identidad propia.

---

## 2. ESPECIFICACIONES TÉCNICAS NO NEGOCIABLES
- Duración: **45 s** de contenido + **2 s** de pantalla final = **47 s**.
- 60 FPS (aceptable 30 FPS si el motor lo exige; documentarlo).
- **Formato principal: Vertical 1080 × 1920** (Reels/TikTok/Shorts).
- Formato secundario: Horizontal 1920 × 1080, con recomposición real (no recorte).
- Una única trayectoria continua de cámara. Cero cortes de montaje evidentes.
- Zonas seguras de redes: dejar libres ~250 px superiores y ~400 px inferiores y ~120 px a la derecha (UI de la app).

**Arquitectura de render**
- Construir el vídeo con **HyperFrames** (composición HTML/CSS/JS renderizada a vídeo de forma determinista).
- Usar CSS 3D / WebGL (Three.js) para profundidad real: cámara de perspectiva, sombras, profundidad de campo, motion blur.
- Python/FFmpeg solo para audio, mezcla y control técnico.
- No simular 3D con imágenes 2D escaladas sin perspectiva.

**Calidad interna:** antialiasing alto, sin banding en degradados, sin parpadeos, negros profundos, motion blur basado en movimiento real.

---

## 3. DIRECCIÓN DE ARTE — «EL ESTUDIO DE MARKETING»
**Concepto:** el universo visual es el de una agencia/consultora de marketing premium. Las ideas abstractas
se convierten en objetos físicos de su día a día: tarjetas de anuncio (Meta/Google genéricas, sin logos), contadores
de seguidores, notificaciones de DM, gráficos de conversión, un embudo de ventas, etiquetas de precio y propuestas comerciales.
La oferta es el objeto central: una «propuesta» que pasa de confusa a irresistible.

**Estilo:** corporativo, limpio y tecnológico (estética SaaS / dashboard premium). Mucho aire, rejilla precisa,
interfaces 3D con espesor, nada de estética «gurú», billetes, coches ni efectos llamativos.

**Ambiente**
- Fondo principal: **azul noche #06102A** con degradado volumétrico muy suave hacia **#0A1A44**.
- Rejilla de dashboard casi imperceptible en el suelo, bruma ligera, sombras de contacto, reflejos sutiles.
- Evitar estrellas, partículas excesivas, neón y fondos genéricos de ciencia ficción.

**Paleta (azul corporativo dominante)**
- **Azul corporativo principal: #1F5EFF** — línea de claridad, titulares destacados, botones, estado «positivo».
- Azul claro de apoyo: **#6E9BFF** · Azul profundo: **#0B2A6F** · Blanco: **#FFFFFF** · Gris texto secundario: **#A9B4CC**.
- Las tres piezas son tres tonos del mismo azul: 1. Resultado **#1F5EFF** · 2. Plazo **#4F86FF** · 3. Cero riesgo **#8FB4FF** (el sello de garantía en blanco con borde azul).
- Rojo apagado **#E5484D** solo para la ✕ del contraste. El ✓ va en azul corporativo, no en verde.
- Ningún otro color sin justificación narrativa.

**Materiales**
- Tarjetas UI: blanco/azul mate premium, espesor visible, esquinas redondeadas (radio 24 px), sombras azuladas suaves.
- Oferta confusa: vidrio esmerilado gris, texto ilegible y saturado de jerga («soluciones 360», «marketing integral»).
- Oferta clara: vidrio pulido con tinte azul, reflejos limpios, texto nítido.
- Línea luminosa: núcleo **#1F5EFF**, halo azul claro muy bajo, ilumina los objetos cercanos. Nunca un trazo 2D con glow.

**Tipografía: Inter (única familia)**
- Titulares: **Inter Black / ExtraBold**, tracking −2 %, mayúsculas en los 📝 principales.
- Subtítulos y textos de UI: **Inter Medium / SemiBold**.
- Cifras (30, 90, 3): Inter con `font-variant-numeric: tabular-nums` para los contadores.
- Palabra clave de cada titular resaltada en azul corporativo; resto en blanco.
- Sin efectos 3D sobre las letras. Cada palabra clave entra con acción física, nunca con fade.

---

## 4. ILUMINACIÓN
Key fría y suave que define volumen, fill controlado, rim azul de separación y la línea azul como luz práctica.
- Al encajar cada pieza, el entorno sube un paso de luz azul (la escena se «aclara» a medida que la oferta se aclara).
- En el contraste, la ficha ❌ apaga ligeramente la escena; la ✅ la ilumina en azul.
- No quemar blancos, no tapar texto con luz, sin destellos de lente en cada transición.

---

## 5. CÁMARA
Una sola cámara, un solo viaje. Movimientos con spline, aceleración no lineal y aterrizaje preciso.
Alternar tres energías: **explosiva** (gancho y CTA), **fluida** (problema y estrategia), **contemplativa** (lectura del contraste).
Cada cambio de escena se explica por seguimiento de la línea, transformación de geometría u oclusión natural.

---

## 6. ANIMACIÓN
Curvas de aceleración personalizadas, anticipación, squash & stretch, overlap, inercia, oscilaciones amortiguadas, colisiones.
**Regla:** ningún objeto importante aparece o desaparece por opacidad; todo entra y sale con una acción física motivada.
Microanimaciones: compresión de botones, oscilación de fichas al aterrizar, vibración residual de tarjetas.
No hacer que todo rebote: variar según peso y material.

---

## 7. PRESENTADOR / VOZ EN PANTALLA (opcional)
Si hay presentador grabado (talking head): integrarlo en el mundo 3D como una tarjeta-ventana con espesor,
con el gráfico interactuando alrededor (la línea pasa por detrás de él, las fichas caen junto a su hombro).
Si no hay grabación: pieza 100 % motion con voz en off.

---

## 8. GUION VISUAL CINEMATOGRÁFICO (vertical como referencia)

### ESCENA 01 — EL GANCHO · 0:00–3:00
🗣️ «No te faltan clientes. Lo que tienes es una oferta que nadie entiende.»
📝 **NO TE FALTAN CLIENTES**

- 0:00 Pantalla casi negra. En el primer fotograma ya hay movimiento (los primeros 0,5 s deben detener el scroll).
- Decenas de siluetas de «clientes» (tarjetas de lead/avatares minimalistas en azul y blanco) avanzan hacia el centro desde la profundidad.
- 0:00–1:20 El titular **NO TE FALTAN CLIENTES** cae palabra a palabra con peso; «CLIENTES» aterriza con golpe subgrave y la cámara recibe un micro-impacto.
- 1:20 Las figuras se detienen frente a un objeto: una caja de vidrio esmerilado con texto ilegible («la oferta»).
- 2:00 En «nadie entiende» los clientes ladean la cabeza y aparecen pequeños «?» físicos que rebotan sobre la caja.
- Objetivo emocional: sorpresa, identificación inmediata.

### ESCENA 02 — EL PROBLEMA · 3:00–12:00
🗣️ «Mucha gente piensa que necesita más anuncios, más seguidores, más contenido. Pero si cada vez que alguien te pregunta precio tienes que convencerle, el problema no es cuántas personas te ven. Es lo que les ofreces.»
📝 **+ anuncios ≠ + clientes**

- La cámara se eleva. Del cielo caen tarjetas UI de marketing sincronizadas con la voz: «ANUNCIOS» como tarjeta de anuncio (3:6), «SEGUIDORES» como contador +10K (4:4), «CONTENIDO» como pila de posts (5:2), cada una con su sonido de impacto, apilándose.
- La pila crece, pero las figuras siguen sin acercarse a la caja: un dashboard de ventas muestra «Clientes: 0» y la gráfica sigue plana.
- 7:00 Llega una notificación de DM 3D: «¿Precio?». La caja intenta «convencer»: se infla, tiembla, suda con un esfuerzo cómico y sutil.
- 9:00 Se ensambla la ecuación en tipografía limpia: **+ anuncios ≠ + clientes**. El «≠» entra con un pequeño golpe rojo.
- 10:50 En «Es lo que les ofreces», la línea azul nace de la base de la caja y la cámara la sigue hacia abajo.
- Objetivo emocional: «me pasa a mí», cambio de foco.

### ESCENA 03 — LA ESTRATEGIA · 12:00–30:00
🗣️ «Una oferta que vende sola tiene tres cosas: Uno: un resultado concreto. No ‘te ayudo con tu marketing’, sino ‘te consigo 30 clientes’. Dos: un plazo. ‘En 90 días’. Tres: quitarle el riesgo. ‘Y si no lo consigo, sigo trabajando gratis hasta que lo consiga.’»
📝 **1. Resultado concreto · 2. Plazo · 3. Cero riesgo**

Estructura: la caja esmerilada queda en el centro como una base vacía con tres ranuras. La línea azul la rodea.

- **12:00–13:50** Titular «UNA OFERTA QUE VENDE SOLA». Las tres ranuras se iluminan tenuemente.
- **13:50–21:00 · PIEZA 1 — RESULTADO (azul #1F5EFF)**
  - Tarjeta borrosa en gris «Te ayudo con tu marketing» flota, la cámara la atraviesa y se desintegra en fragmentos mate.
  - Del otro lado se ensambla con encaje magnético: **«30 CLIENTES»** (contador mecánico 0 → 30 en celdas de anchura fija).
  - La pieza azul encaja en la ranura 1 con clic satisfactorio. Etiqueta: **1. Resultado concreto**.
- **21:00–24:00 · PIEZA 2 — PLAZO (azul medio)**
  - La línea se curva y forma un calendario/reloj 3D. Las hojas pasan rápidamente hasta **«90 DÍAS»**.
  - Encaja en la ranura 2. La escena sube un paso de luz. Etiqueta: **2. Plazo**.
- **24:00–30:00 · PIEZA 3 — CERO RIESGO (azul claro + sello blanco)**
  - Un escudo/sello de garantía se forma con la propia línea.
  - Texto: «Si no lo consigo, sigo trabajando **gratis** hasta que lo consiga». «gratis» se subraya con la línea.
  - Encaja en la ranura 3. **Transformación clave:** el vidrio esmerilado se pule de golpe, se vuelve transparente y nítido; las figuras-clientes del gancho giran la cabeza hacia ella. Etiqueta: **3. Cero riesgo**.
  - 29:00 Las tres etiquetas se alinean en una fila limpia: **1. Resultado concreto · 2. Plazo · 3. Cero riesgo**.
- Objetivo emocional: claridad, «esto es aplicable».

### ESCENA 04 — EL CONTRASTE · 30:00–38:00
🗣️ «Compara: ‘Hacemos clases de inglés.’ O: ‘Habla inglés en una entrevista de trabajo en 3 meses, o te devolvemos el dinero.’ Es el mismo servicio. Pero ¿cuál compras?»
📝 ❌ «Clases de inglés» → ✅ «Inglés para tu entrevista en 3 meses o te devolvemos el dinero»

- Momento contemplativo: la cámara se calma para que se pueda leer.
- Dos tarjetas en el espacio. Vertical: una encima de otra. Horizontal: lado a lado.
- **Tarjeta ❌** (30:50): «Clases de inglés». Mate gris, luz plana, ligeramente hundida. Una ✕ roja se estampa.
- **Tarjeta ✅** (32:50): «Inglés para tu entrevista en **3 meses** o te **devolvemos el dinero**». Se eleva con las tres piezas de color incrustadas en su borde (tres tonos de azul: «entrevista», «3 meses», «devolvemos el dinero»). Un ✓ azul corporativo aterriza.
- 35:50 «Es el mismo servicio»: ambas tarjetas muestran el mismo icono interior (un libro), demostrándolo visualmente.
- 36:80 «¿cuál compras?»: un cursor/dedo 3D duda un instante sobre ❌ y elige ✅; la tarjeta se presiona y libera una onda de energía.
- Objetivo emocional: revelación, «ahora lo entiendo».

### ESCENA 05 — CTA · 38:00–45:00
🗣️ «Escríbeme en comentarios a qué te dedicas y te digo cómo reformularía tu oferta.»
📝 **Comenta a qué te dedicas 👇**

- La onda se convierte en una burbuja de comentario 3D que baja hacia la zona inferior de la pantalla (donde está el botón real de comentarios).
- Dentro, un campo de texto se escribe solo con ejemplos rotando: «Soy fisio…», «Tengo una academia…», «Hago diseño web…».
- **Comenta a qué te dedicas 👇**: titular grande; el 👇 rebota dos veces con oscilación amortiguada y apunta a la UI de comentarios.
- 43:00 La cámara se aleja: se ve la oferta pulida en el centro, rodeada de los clientes, con la línea azul cerrando el círculo.
- Objetivo emocional: invitación clara, acción inmediata.

### ESCENA 06 — FIRMA · 45:00–47:00
Pantalla final minimalista: solo **@mhfcleads**, centrado, en Inter Bold azul #1F5EFF sobre fondo #06102A. Sin nombre de marca, sin subtítulo, sin logo.
Pequeña resonancia musical. Sin animaciones innecesarias.

---

## 9. LOCUCIÓN
ElevenLabs o equivalente (o la voz real del creador si se graba).
- Voz cercana, segura, directa; español de España natural («tienes», «convencerle»).
- Sin tono robótico ni entonación de anuncio. Sonrisa contenida, autoridad tranquila.
- Grabar como una sola interpretación continua; 2–3 tomas; elegir la más natural; no acelerar artificialmente.

**Guion (literal):**
> No te faltan clientes. Lo que tienes es una oferta que nadie entiende.
> Mucha gente piensa que necesita más anuncios, más seguidores, más contenido. Pero si cada vez que alguien te pregunta precio tienes que convencerle, el problema no es cuántas personas te ven. Es lo que les ofreces.
> Una oferta que vende sola tiene tres cosas: Uno: un resultado concreto. No «te ayudo con tu marketing», sino «te consigo 30 clientes». Dos: un plazo. «En 90 días». Tres: quitarle el riesgo. «Y si no lo consigo, sigo trabajando gratis hasta que lo consiga.»
> Compara: «Hacemos clases de inglés.» O: «Habla inglés en una entrevista de trabajo en 3 meses, o te devolvemos el dinero.» Es el mismo servicio. Pero ¿cuál compras?
> Escríbeme en comentarios a qué te dedicas y te digo cómo reformularía tu oferta.

**Anclas de sincronización (validar con la toma final):**
0:00 «No te faltan» · 3:00 «Mucha gente» · 7:00 «te pregunta precio» · 10:50 «Es lo que les ofreces» ·
12:00 «Una oferta que vende sola» · 13:50 «Uno» · 21:00 «Dos» · 24:00 «Tres» · 30:00 «Compara» ·
36:80 «¿cuál compras?» · 38:00 «Escríbeme».

**Subtítulos:** además del 📝 principal de cada bloque, subtítulos palabra a palabra (estilo karaoke) en la mitad inferior-central,
máximo 2 líneas, resaltando en azul corporativo las palabras clave (clientes, oferta, resultado, plazo, riesgo, gratis, comentarios).

---

## 10. MÚSICA
Original. ~100 BPM, moderna, segura, sin ser épica ni infantil. Marimba/plucks suaves, bombo redondo, palmas, subgrave discreto.
- 0:00 golpe inicial · 3:00 groove base · 12:00 crecimiento · 13:50 / 21:00 / 24:00 acento en cada pieza ·
  29:00 resolución (oferta pulida) · 30:00 bajada para el contraste · 36:80 acento en ✅ · 38:00 groove ligero para CTA · 45:00 resonancia final.
- Música al menos 12 dB por debajo de la voz.

---

## 11. DISEÑO SONORO
Whooshes de distinta escala, encajes magnéticos, clics de contador, golpes amortiguados de fichas, «clink» de vidrio al pulirse,
sello de ✕ y ✓, tecleo suave en el CTA. Jerarquía: los momentos importantes sobresalen porque los secundarios son discretos.
Mezcla: −14 LUFS integrados, pico real ≤ −1 dBTP, compatible en mono y altavoz de móvil.

---

## 12. COMPOSICIÓN Y ACABADO
Corrección de color coherente, bloom muy contenido, grano fino, profundidad de campo, motion blur.
Prohibido: glow excesivo, aberración cromática evidente, sacudidas constantes, partículas aleatorias, textos deformados,
animaciones sin aceleración, transiciones genéricas.

---

## 13. ADAPTACIÓN A HORIZONTAL
La versión 16:9 es una nueva proyección del mismo mundo, no un recorte:
tarjetas del contraste lado a lado, las tres piezas en fila horizontal, textos reencuadrados, trayectorias de cámara adaptadas.

---

## 14. CONTROL DE CALIDAD
**Técnico:** duración exacta, resolución, FPS, sin frames negros, sincronía audio-texto, legibilidad en zona segura, niveles de audio.
**Artístico (1–10, revisar todo lo < 9):** composición, movimiento, iluminación, claridad del mensaje, satisfacción.
No declarar calidad sin inspeccionar fotogramas reales.

---

## 15. PIPELINE
A. Preproducción: storyboard por escenas, animática, anclas de voz/música, validar legibilidad de textos en móvil.
B. Audio: locución de prueba → toma final → ajustar anclas → maqueta musical → impactos principales.
C. Construcción: escenario, materiales, línea luminosa, objeto-oferta, cámara.
D. Animación: bloqueo → timing → anticipación/inercia → microanimaciones → pulido de curvas.
E. Acabado: iluminación, render, color, música final, SFX, mezcla.
F. Validación: preview completa, revisar impactos, corregir, render vertical, recomponer y render horizontal, verificar archivos.

---

## 16. ENTREGABLES
1. Máster vertical 1080×1920, 60 FPS, 47 s, con audio final y subtítulos quemados.
2. Máster horizontal 1920×1080, recomposición real.
3. Versión sin subtítulos + archivo .srt.
4. Proyecto y código fuente (composiciones HyperFrames, scripts, curvas de cámara, configuración de render).
5. Recursos: locución, música, SFX.
6. Reporte de QA con capturas de fotogramas clave.

---

## 17. REGLAS ABSOLUTAS
1. La claridad del mensaje está por encima de la espectacularidad.
2. Todo texto clave debe leerse en un móvil en menos del tiempo que está en pantalla.
3. No usar escenas independientes unidas por disolvencias.
4. No animar movimientos importantes con interpolaciones lineales.
5. No entregar una versión horizontal que sea un simple recorte.
6. No usar logos ni marcas de terceros.
7. No fingir que una herramienta está disponible si no lo está: documentar y usar la mejor alternativa.
8. No dar por terminado el proyecto tras el primer render.

---

## 18. LA PRUEBA DEFINITIVA
¿Los primeros 0,5 s detienen el scroll? ¿Se entiende el mensaje sin sonido? ¿Las tres piezas se recuerdan después de verlo?
¿El contraste ❌/✅ provoca un «ajá»? ¿El CTA es inequívoco? ¿La cámara se siente de producción real?
Si alguna respuesta es negativa, identificar el problema y corregirlo.

**OBJETIVO FINAL:** un reel que parezca fruto de semanas de dirección de arte y animación, donde ningún fotograma sea accidental,
y que deje una sola idea grabada:
**No te faltan clientes. Te falta una oferta clara.**
