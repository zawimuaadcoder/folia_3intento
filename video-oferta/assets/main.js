// «Una oferta que vende sola» — escena única, una cámara, todo función del tiempo t.
import * as THREE from './lib/three.module.min.js';
import { RoundedBoxGeometry } from './lib/RoundedBoxGeometry.js';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

// ───────────────────────── utilidades deterministas ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const eo3 = (x) => 1 - Math.pow(1 - x, 3);
const eo5 = (x) => 1 - Math.pow(1 - x, 5);
const ei3 = (x) => x * x * x;
const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eioQ = (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2);
const eoBack = (x, s = 1.70158) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2));
const eoExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
// muelle amortiguado (sale de 0 y se asienta en 1); dt en segundos
const spring = (dt, f = 2.2, d = 7) => (dt <= 0 ? 0 : 1 - Math.exp(-d * dt) * Math.cos(2 * Math.PI * f * dt));
// impulso amortiguado (vibración residual)
const ring = (dt, f = 6, d = 9) => (dt <= 0 ? 0 : Math.exp(-d * dt) * Math.sin(2 * Math.PI * f * dt));
// caída con gravedad que aterriza en tl y rebota
function fall(t, tl, dur, h, bounce = 0.12) {
  if (t < tl) { const u = seg(t, tl - dur, tl); return h * (1 - u * u); }
  const dt = t - tl; return h * bounce * Math.exp(-7 * dt) * Math.abs(Math.sin(Math.PI * 3.2 * dt));
}
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ───────────────────────── formato / orientación ─────────────────────────
const vars = (window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables()) || {};
const H = vars.orient === 'h' || (vars.orient !== 'v' && window.innerWidth > window.innerHeight);
const SUBS = vars.subs !== false;
const W = H ? 1920 : 1080, HT = H ? 1080 : 1920;
const root = document.getElementById('root');
root.style.width = W + 'px'; root.style.height = HT + 'px';
root.dataset.width = W; root.dataset.height = HT;
if (H) document.body.classList.add('h');

const C = { blue: 0x1f5eff, blue2: 0x4f86ff, blue3: 0x8fb4ff, light: 0x6e9bff, deep: 0x0b2a6f, night: 0x06102a, night2: 0x0a1a44, white: 0xffffff, grey: 0xa9b4cc, red: 0xe5484d };
const F = (w, px) => `${w} ${px}px InterX`;

// ───────────────────────── renderer ─────────────────────────
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, HT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x081638, 16, 58);
const camera = new THREE.PerspectiveCamera(H ? 34 : 50, W / HT, 0.1, 400);
scene.add(camera);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

// fondo volumétrico con tramado (sin banding)
const bgMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uLevel: { value: 0 } },
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying vec3 vDir; uniform float uLevel;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      float y = clamp(vDir.y*0.5+0.5, 0.0, 1.0);
      vec3 top = vec3(0.0235,0.0627,0.165);
      vec3 hor = vec3(0.039,0.102,0.267);
      vec3 col = mix(hor, top, smoothstep(0.42, 0.85, y));
      float glow = exp(-pow((y-0.47)*7.0, 2.0));
      col += vec3(0.05,0.14,0.42) * glow * (0.25 + 0.55*uLevel);
      col *= 1.0 + 0.35*uLevel;
      col += (h(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5;
      gl_FragColor = vec4(col, 1.0);
    }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), bgMat));

// suelo: rejilla de dashboard casi imperceptible
const floorMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, fog: false,
  uniforms: { uLevel: { value: 0 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `varying vec3 vW; uniform float uLevel;
    float line(float x, float w){ float d = abs(fract(x-0.5)-0.5)/fwidth(x); return 1.0 - clamp(d - w, 0.0, 1.0); }
    void main(){
      float g = max(line(vW.x, 0.2), line(vW.z, 0.2));
      float g4 = max(line(vW.x*0.25, 0.4), line(vW.z*0.25, 0.4));
      float r = length(vW.xz);
      float fade = exp(-r*0.055);
      float a = (g*0.07 + g4*0.10) * fade * (0.8 + 0.6*uLevel);
      vec3 col = vec3(0.24,0.45,1.0);
      float pool = exp(-r*r*0.03) * (0.10 + 0.22*uLevel);
      gl_FragColor = vec4(col, a + pool*0.45);
    }`,
});
const floorPlane = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
floorPlane.rotation.x = -Math.PI / 2; floorPlane.position.y = 0.001; scene.add(floorPlane);
const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ color: 0x010614, opacity: 0.55 }));
shadowPlane.rotation.x = -Math.PI / 2; shadowPlane.receiveShadow = true; scene.add(shadowPlane);

// luces: key fría suave, fill controlado, rim azul
const hemi = new THREE.HemisphereLight(0xbcd0ff, 0x0a1a44, 0.55); scene.add(hemi);
const key = new THREE.DirectionalLight(0xe8efff, 2.0);
key.position.set(-5, 10, 7); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14;
key.shadow.camera.near = 1; key.shadow.camera.far = 40; key.shadow.radius = 6; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb4ff, 0.35); fill.position.set(6, 3, 6); scene.add(fill);
const rim = new THREE.DirectionalLight(0x4f86ff, 2.2); rim.position.set(2, 4, -9); scene.add(rim);
const tipLight = new THREE.PointLight(0x4f86ff, 0, 5, 1.6); scene.add(tipLight);
const coreLight = new THREE.PointLight(0x6e9bff, 0, 7, 1.5); coreLight.position.set(0, 1.0, 0.0); scene.add(coreLight);

// ───────────────────────── texturas de texto ─────────────────────────
const TEX = [];
function tex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.userData = { c, g, draw, w, h, last: null };
  TEX.push(t);
  if (draw) { draw(g, w, h); t.needsUpdate = true; }
  return t;
}
function redraw(t, arg) {
  const u = t.userData; const key = JSON.stringify(arg);
  if (u.last === key) return; u.last = key;
  u.g.clearRect(0, 0, u.w, u.h); u.draw(u.g, u.w, u.h, arg); t.needsUpdate = true;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function fitText(g, s, weight, max, maxW) { let px = max; g.font = F(weight, px); while (g.measureText(s).width > maxW && px > 10) { px -= 2; g.font = F(weight, px); } return px; }

// materiales base
const matUI = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
const faceMat = (map, glow = 0.32) => new THREE.MeshStandardMaterial({ map, roughness: 0.6, metalness: 0, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: glow, transparent: true });

// tarjeta UI con espesor: cuerpo redondeado + cara frontal con textura
function card(w, h, d, color, map, opt = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(opt.r ?? 0.07, d / 2 - 0.001)), opt.bodyMat || matUI(color, opt.rough ?? 0.5));
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  if (map) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.985, h * 0.985), faceMat(map, opt.glow ?? 0.3));
    f.position.z = d / 2 + 0.003; g.add(f); g.userData.face = f;
  }
  g.userData.body = body;
  return g;
}

// ───────────────────────── la línea de claridad ─────────────────────────
const lineCore = new THREE.MeshBasicMaterial({ color: 0x3d78ff, toneMapped: false });
const lineHalo = new THREE.MeshBasicMaterial({ color: 0x6e9bff, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const LINES = [];
function mkLine(points, opt = {}) {
  const curve = new THREE.CatmullRomCurve3(points, !!opt.closed, 'catmullrom', 0.5);
  const segs = opt.segs || 200, rad = 8;
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, opt.r || 0.022, rad, !!opt.closed), lineCore);
  const halo = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, (opt.r || 0.022) * 3.2, rad, !!opt.closed), lineHalo);
  const grp = new THREE.Group(); grp.add(core, halo); scene.add(grp);
  const L = { curve, core, halo, segs, rad, grp, a: 0, b: 0 };
  LINES.push(L); setLine(L, 0, 0); return L;
}
function setLine(L, a, b) {
  a = clamp(a); b = clamp(b); L.a = a; L.b = b;
  const per = L.rad * 6; const s = Math.floor(a * L.segs), e = Math.ceil(b * L.segs);
  const cnt = Math.max(0, e - s) * per;
  L.core.geometry.setDrawRange(s * per, cnt); L.halo.geometry.setDrawRange(s * per, cnt);
  L.grp.visible = cnt > 0;
}

// ───────────────────────── objeto-oferta ─────────────────────────
const BOX = { w: 2.7, h: 1.3, d: 1.3 };
const offer = new THREE.Group(); scene.add(offer);
const offerInner = new THREE.Group(); offer.add(offerInner);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x8792a8, roughness: 0.85, metalness: 0.0, clearcoat: 0.0, clearcoatRoughness: 0.4, transparent: true, opacity: 0.93, envMapIntensity: 0.8 });
const boxMesh = new THREE.Mesh(new RoundedBoxGeometry(BOX.w, BOX.h, BOX.d, 6, 0.12), glassMat);
boxMesh.position.y = BOX.h / 2; boxMesh.castShadow = true; boxMesh.receiveShadow = true; offerInner.add(boxMesh);
const coreMat = new THREE.MeshBasicMaterial({ color: 0x1f5eff, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false });
const coreMesh = new THREE.Mesh(new RoundedBoxGeometry(BOX.w * 0.82, BOX.h * 0.7, BOX.d * 0.7, 4, 0.1), coreMat);
coreMesh.position.y = BOX.h / 2; offerInner.add(coreMesh);

// cara frontal: jerga ilegible → oferta nítida (barrido de pulido)
const jargonTex = tex(1400, 520, (g, w, h) => {
  g.fillStyle = '#7d879c'; g.fillRect(0, 0, w, h);
  g.filter = 'blur(7px)'; g.fillStyle = 'rgba(30,38,60,.75)';
  const lines = ['SOLUCIONES 360 · MARKETING INTEGRAL', 'ESTRATEGIA OMNICANAL · SINERGIAS', 'BRANDING HOLÍSTICO · GROWTH · KPIs', 'ACOMPAÑAMIENTO PERSONALIZADO 360°'];
  lines.forEach((s, i) => { g.font = F(800, 64 - i * 4); g.textAlign = 'center'; g.fillText(s, w / 2 + (i % 2 ? 30 : -20), 120 + i * 108); });
  g.filter = 'none';
});
const clearTex = tex(1400, 520, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d2a78'); gr.addColorStop(1, '#0a1f5c');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.textAlign = 'center'; g.fillStyle = '#ffffff';
  g.font = F(900, 118); g.fillText('30 CLIENTES', w / 2, 170);
  g.font = F(900, 118); g.fillStyle = '#8FB4FF'; g.fillText('EN 90 DÍAS', w / 2, 300);
  g.font = F(700, 54); g.fillStyle = '#dbe5ff'; g.fillText('o sigo trabajando gratis hasta conseguirlo', w / 2, 420);
});
const panelMat = new THREE.ShaderMaterial({
  transparent: true, fog: false,
  uniforms: { A: { value: jargonTex }, B: { value: clearTex }, uSweep: { value: -0.2 }, uLevel: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D A; uniform sampler2D B; uniform float uSweep; uniform float uLevel;
    void main(){
      float x = vUv.x + (vUv.y-0.5)*0.25;
      float m = smoothstep(uSweep-0.02, uSweep+0.02, x);
      vec3 a = texture2D(A, vUv).rgb; vec3 b = texture2D(B, vUv).rgb;
      vec3 col = mix(b, a*0.55, m);
      float edge = exp(-pow((x-uSweep)*28.0, 2.0));
      col += vec3(0.55,0.72,1.0) * edge * 0.9 * step(-0.1, uSweep) * step(uSweep, 1.1);
      vec2 q = abs(vUv-0.5)*2.0; float corner = smoothstep(1.0, 0.985, max(q.x, q.y));
      gl_FragColor = vec4(col, 0.97*corner);
    }`,
});
// panel en espacio lineal → corregimos con toneMapped=false y colores ya sRGB
panelMat.toneMapped = false;
const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.38, 0.884), panelMat);
panel.position.set(0, BOX.h * 0.5, BOX.d / 2 + 0.004); offerInner.add(panel);

// ranuras en la tapa
const SLOT_X = [-0.86, 0, 0.86];
const slotGlowMats = [];
SLOT_X.forEach((x) => {
  const s = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.06, 0.2, 2, 0.025), new THREE.MeshStandardMaterial({ color: 0x050b1e, roughness: 0.8 }));
  s.position.set(x, BOX.h + 0.012, 0); offerInner.add(s);
  const gm = new THREE.MeshBasicMaterial({ color: 0x1f5eff, transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false });
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.18), gm); gl.rotation.x = -Math.PI / 2; gl.position.set(x, BOX.h + 0.045, 0); offerInner.add(gl);
  slotGlowMats.push(gm);
});

// gotas de "sudor"
const sweat = [];
for (let i = 0; i < 4; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0x8fb4ff, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9 }));
  m.scale.set(1, 1.35, 1); m.visible = false; offerInner.add(m); sweat.push(m);
}

// ───────────────────────── clientes ─────────────────────────
const rnd = mulberry32(42);
const figs = [];
const figMats = [matUI(0xe9eefa, 0.45), matUI(0x1f5eff, 0.4), matUI(0x6e9bff, 0.45), matUI(0xdfe7ff, 0.5)];
const bodyGeo = new THREE.CapsuleGeometry(0.17, 0.46, 6, 14), headGeo = new THREE.SphereGeometry(0.155, 24, 16);
const NF = 22;
for (let i = 0; i < NF; i++) {
  const ang = lerp(0.95, Math.PI * 2 - 0.95, i / (NF - 1)) + (rnd() - 0.5) * 0.12;
  const r = 3.7 + rnd() * 2.2 + (Math.abs(Math.sin(ang)) > 0.9 ? 0.6 : 0);
  const end = new THREE.Vector3(Math.sin(ang) * r, 0, Math.cos(ang) * r);
  const dir = end.clone().normalize();
  const start = end.clone().add(dir.clone().multiplyScalar(16 + rnd() * 10));
  const g = new THREE.Group();
  const mat = figMats[(i * 7) % 4];
  const body = new THREE.Mesh(bodyGeo, mat); body.position.y = 0.41; body.castShadow = true; g.add(body);
  const head = new THREE.Group(); head.position.y = 0.86; g.add(head);
  const hm = new THREE.Mesh(headGeo, mat); hm.position.y = 0.13; hm.castShadow = true; head.add(hm);
  scene.add(g);
  figs.push({ g, head, start, end, arrive: 0.75 + rnd() * 0.85, delay: rnd(), face: Math.atan2(-end.x, -end.z), tiltDir: rnd() > 0.5 ? 1 : -1, ph: rnd() * 6 });
}

// signos «?» físicos
const qTex = tex(256, 256, (g, w, h) => {
  g.fillStyle = '#ffffff'; rr(g, 20, 20, 216, 216, 60); g.fill();
  g.fillStyle = '#1F5EFF'; g.font = F(900, 170); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 128, 138);
});
const qs = [];
for (let i = 0; i < 6; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, toneMapped: false }));
  s.visible = false; scene.add(s);
  const f = figs[[2, 5, 9, 12, 16, 19][i]];
  qs.push({ s, f, t0: 2.95 + i * 0.09, land: new THREE.Vector3(-1.0 + i * 0.4, BOX.h + 0.2, (i % 2 ? 0.25 : -0.2)), out: new THREE.Vector3((i - 2.5) * 3, 6 + i, 4 - i) });
}

// ───────────────────────── escena 02: tarjetas de marketing ─────────────────────────
const adTex = tex(900, 570, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#E8EEFF'; rr(g, 30, 96, w - 60, 270, 22); g.fill();
  const gr = g.createLinearGradient(30, 96, w - 30, 366); gr.addColorStop(0, '#1F5EFF'); gr.addColorStop(1, '#8FB4FF');
  g.fillStyle = gr; rr(g, 30, 96, w - 60, 270, 22); g.fill();
  g.fillStyle = '#0B2A6F'; g.beginPath(); g.arc(70, 52, 24, 0, 7); g.fill();
  g.fillStyle = '#0B2A6F'; g.font = F(700, 30); g.fillText('Tu marca', 108, 46); g.fillStyle = '#7B86A3'; g.font = F(500, 22); g.fillText('Patrocinado', 108, 74);
  g.fillStyle = '#ffffff'; g.font = F(900, 92); g.textAlign = 'center'; g.fillText('ANUNCIOS', w / 2, 266);
  g.fillStyle = '#F0F4FF'; rr(g, 30, 396, w - 60, 140, 20); g.fill();
  g.fillStyle = '#0B2A6F'; g.textAlign = 'left'; g.font = F(600, 30); g.fillText('Descubre nuestra solución', 60, 470);
  g.fillStyle = '#1F5EFF'; rr(g, w - 300, 430, 240, 72, 36); g.fill();
  g.fillStyle = '#ffffff'; g.font = F(700, 28); g.textAlign = 'center'; g.fillText('Más info', w - 180, 476);
});
const folTex = tex(900, 570, (g, w, h, v = 0) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7B86A3'; g.font = F(700, 40); g.textAlign = 'center'; g.fillText('SEGUIDORES', w / 2, 120);
  const n = Math.round(v * 10);
  g.fillStyle = '#0B2A6F'; g.font = F(900, 230); g.fillText('+' + n + 'K', w / 2, 360);
  g.fillStyle = '#E8EEFF'; rr(g, 120, 430, w - 240, 26, 13); g.fill();
  g.fillStyle = '#1F5EFF'; rr(g, 120, 430, (w - 240) * Math.max(0.04, v), 26, 13); g.fill();
});
const postTex = tex(900, 570, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7B86A3'; g.font = F(700, 40); g.textAlign = 'center'; g.fillText('CONTENIDO', w / 2, 82);
  const cols = ['#1F5EFF', '#4F86FF', '#8FB4FF', '#0B2A6F', '#6E9BFF', '#C9D8FF'];
  for (let i = 0; i < 6; i++) { const x = 60 + (i % 3) * 266, y = 120 + Math.floor(i / 3) * 216; g.fillStyle = cols[i]; rr(g, x, y, 248, 196, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(x + 104, y + 70); g.lineTo(x + 152, y + 98); g.lineTo(x + 104, y + 126); g.fill(); }
});
const tower = new THREE.Group(); scene.add(tower);
tower.position.set(-2.3, 0, -0.35); tower.rotation.y = 0.32;
const towerInner = new THREE.Group(); tower.add(towerInner);
const CW = 1.42, CH = 0.9, CD = 0.12;
const tcards = [adTex, folTex, postTex].map((m, i) => { const c = card(CW, CH, CD, 0xffffff, m, { r: 0.05, glow: 0.38 }); towerInner.add(c); return c; });
const TLAND = [6.3, 7.28, 8.3];

const dashTex = tex(900, 680, (g, w, h, p = 0) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#0B2A6F'; g.font = F(800, 40); g.fillText('Ventas', 50, 78);
  g.fillStyle = '#7B86A3'; g.font = F(600, 30); g.fillText('Clientes', 50, 160);
  g.fillStyle = '#0B2A6F'; g.font = F(900, 150); g.fillText('0', 50, 310);
  g.strokeStyle = '#E3E9F7'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(50, 380 + i * 70); g.lineTo(w - 50, 380 + i * 70); g.stroke(); }
  g.strokeStyle = '#A9B4CC'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(50, 590); g.lineTo(50 + (w - 100) * p, 590); g.stroke();
  g.fillStyle = '#E5484D'; g.font = F(700, 28); g.textAlign = 'right'; g.fillText('0 %', w - 50, 160);
});
const dash = new THREE.Group(); scene.add(dash); dash.position.set(2.3, 0, -0.35); dash.rotation.y = -0.32;
const dashHinge = new THREE.Group(); dash.add(dashHinge);
const dashCard = card(1.45, 1.1, 0.1, 0xffffff, dashTex, { r: 0.045, glow: 0.38 }); dashCard.position.y = 0.55; dashHinge.add(dashCard);

const dmTex = tex(900, 300, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(40, 60, 200, 240); gr.addColorStop(0, '#4F86FF'); gr.addColorStop(1, '#1F5EFF');
  g.fillStyle = gr; g.beginPath(); g.arc(130, 150, 82, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = F(800, 70); g.textAlign = 'center'; g.fillText('L', 130, 175);
  g.textAlign = 'left'; g.fillStyle = '#7B86A3'; g.font = F(600, 34); g.fillText('Nuevo mensaje', 250, 110);
  g.fillStyle = '#0B2A6F'; g.font = F(900, 96); g.fillText('¿Precio?', 250, 214);
  g.fillStyle = '#1F5EFF'; g.beginPath(); g.arc(w - 70, 70, 22, 0, 7); g.fill();
});
const dm = card(1.55, 0.52, 0.08, 0xffffff, dmTex, { r: 0.035, glow: 0.4 }); scene.add(dm); dm.visible = false;

// ───────────────────────── escena 03: piezas ─────────────────────────
const P1 = new THREE.Vector3(0, 2.25, 1.75); // zona de construcción frente a la caja
const greyTex = tex(1000, 470, (g, w, h) => {
  g.fillStyle = '#6f788c'; g.fillRect(0, 0, w, h);
  g.filter = 'blur(2.5px)'; g.fillStyle = '#d6dbe6'; g.font = F(800, 70); g.textAlign = 'center';
  g.fillText('«Te ayudo con', w / 2, 200); g.fillText('tu marketing»', w / 2, 290); g.filter = 'none';
});
const grey = card(1.9, 0.9, 0.06, 0x6f788c, greyTex, { r: 0.028, glow: 0.12, rough: 0.9 }); scene.add(grey); grey.visible = false;
// fragmentos del cristal gris
const frags = []; const FX = 6, FY = 3;
for (let ix = 0; ix < FX; ix++) for (let iy = 0; iy < FY; iy++) {
  const fw = 1.9 / FX, fh = 0.9 / FY;
  const geo = new THREE.BoxGeometry(fw * 0.98, fh * 0.98, 0.06);
  const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (ix + uv.getX(k)) / FX, (iy + uv.getY(k)) / FY);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: greyTex, roughness: 0.9, emissive: 0xffffff, emissiveMap: greyTex, emissiveIntensity: 0.1 }));
  m.visible = false; m.castShadow = true; scene.add(m);
  const r = mulberry32(100 + ix * 10 + iy);
  frags.push({ m, off: new THREE.Vector3(-0.95 + fw * (ix + 0.5), -0.45 + fh * (iy + 0.5), 0), v: new THREE.Vector3((ix - 2.5) * 1.4 + (r() - 0.5), (iy - 1) * 1.3 + r() * 0.8, 1.2 + r() * 1.5), w: new THREE.Vector3(r() * 9, r() * 9, r() * 5) });
}

const PW = 0.78, PH = 0.56, PD = 0.12;
const p1Tex = tex(780, 560, (g, w, h, v = 30) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2A68FF'); gr.addColorStop(1, '#1F5EFF');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  // contador mecánico en celdas de anchura fija
  const cells = 2, cw = 210, chh = 270, x0 = w / 2 - cw - 10, y0 = 48;
  const val = v; const tens = Math.floor(val / 10), unitsF = val % 10;
  for (let i = 0; i < cells; i++) {
    const x = x0 + i * (cw + 20);
    g.fillStyle = '#0B2A6F'; rr(g, x, y0, cw, chh, 26); g.fill();
    g.save(); rr(g, x, y0, cw, chh, 26); g.clip();
    g.fillStyle = '#ffffff'; g.font = F(900, 220); g.textAlign = 'center'; g.textBaseline = 'middle';
    const d = i === 0 ? tens + (unitsF > 9 ? 0 : 0) : unitsF;
    const base = Math.floor(d), fr = i === 0 ? 0 : d - base;
    const ease = fr < 0.6 ? 0 : eio((fr - 0.6) / 0.4);
    g.fillText(String(base % 10), x + cw / 2, y0 + chh / 2 + 8 - ease * chh);
    g.fillText(String((base + 1) % 10), x + cw / 2, y0 + chh / 2 + 8 + chh - ease * chh);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, y0 + chh / 2 - 2, cw, 4);
    g.restore();
  }
  g.fillStyle = '#ffffff'; g.font = F(900, 104); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('CLIENTES', w / 2, 470);
});
const piece1 = card(PW, PH, PD, 0x1f5eff, p1Tex, { r: 0.04, glow: 0.42 }); scene.add(piece1); piece1.visible = false;

const p2Tex = tex(780, 560, (g, w, h, n = 90) => {
  g.fillStyle = '#4F86FF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#1F5EFF'; g.fillRect(0, 0, w, 120);
  g.fillStyle = '#ffffff'; g.font = F(800, 58); g.textAlign = 'center'; g.fillText('PLAZO', w / 2, 82);
  g.fillStyle = '#0B2A6F'; [w * 0.25, w * 0.75].forEach((x) => { rr(g, x - 14, -10, 28, 60, 12); g.fill(); });
  g.fillStyle = '#ffffff'; g.font = F(900, 250); g.fillText(String(n), w / 2, 370);
  g.font = F(900, 92); g.fillText('DÍAS', w / 2, 490);
});
const piece2 = card(PW, PH, PD, 0x4f86ff, p2Tex, { r: 0.04, glow: 0.42 }); scene.add(piece2); piece2.visible = false;
const pageTex = tex(780, 440, (g, w, h) => { g.fillStyle = '#EAF0FF'; g.fillRect(0, 0, w, h); g.strokeStyle = '#C9D8FF'; g.lineWidth = 6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(80, 100 + i * 80); g.lineTo(w - 80, 100 + i * 80); g.stroke(); } });
const pagePivot = new THREE.Group(); pagePivot.position.set(0, PH / 2 - 0.12, PD / 2 + 0.01); piece2.add(pagePivot);
const page = new THREE.Mesh(new THREE.PlaneGeometry(PW * 0.96, PH * 0.78), new THREE.MeshStandardMaterial({ map: pageTex, side: THREE.DoubleSide, roughness: 0.7, emissive: 0xffffff, emissiveMap: pageTex, emissiveIntensity: 0.25 }));
page.position.y = -PH * 0.39; pagePivot.add(page);

// escudo / sello de garantía
const shieldShape = new THREE.Shape();
(function () { const s = shieldShape; s.moveTo(0, 0.5); s.bezierCurveTo(0.16, 0.42, 0.3, 0.4, 0.42, 0.4); s.bezierCurveTo(0.44, 0.0, 0.36, -0.32, 0, -0.55); s.bezierCurveTo(-0.36, -0.32, -0.44, 0.0, -0.42, 0.4); s.bezierCurveTo(-0.3, 0.4, -0.16, 0.42, 0, 0.5); })();
const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 32 });
shieldGeo.translate(0, 0, -0.04);
const piece3 = new THREE.Group(); scene.add(piece3); piece3.visible = false;
const shieldMesh = new THREE.Mesh(shieldGeo, matUI(0x8fb4ff, 0.35)); shieldMesh.castShadow = true; piece3.add(shieldMesh);
const sealTex = tex(512, 512, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.fill();
  g.strokeStyle = '#1F5EFF'; g.lineWidth = 22; g.beginPath(); g.arc(256, 256, 214, 0, 7); g.stroke();
  g.strokeStyle = '#1F5EFF'; g.lineWidth = 46; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(150, 236); g.lineTo(226, 310); g.lineTo(366, 166); g.stroke();
  g.fillStyle = '#0B2A6F'; g.font = F(900, 50); g.textAlign = 'center'; g.fillText('GARANTÍA', 256, 410);
});
const seal = new THREE.Mesh(new THREE.CircleGeometry(0.3, 48), new THREE.MeshStandardMaterial({ map: sealTex, transparent: true, roughness: 0.4, emissive: 0xffffff, emissiveMap: sealTex, emissiveIntensity: 0.35 }));
seal.position.set(0, 0.02, 0.075); piece3.add(seal);

// ───────────────────────── escena 04: contraste ─────────────────────────
const CS = H ? { x: new THREE.Vector3(7.35, 2.7, 0), ok: new THREE.Vector3(10.75, 2.7, 0), cam: new THREE.Vector3(9.05, 2.75, 7.6), tgt: new THREE.Vector3(9.05, 2.62, 0) }
             : { x: new THREE.Vector3(9, 3.72, 0), ok: new THREE.Vector3(9, 1.98, 0), cam: new THREE.Vector3(9, 2.95, 8.0), tgt: new THREE.Vector3(9, 2.78, 0) };
const KW = 3.0, KH = 1.42;
const xTex = tex(1500, 710, (g, w, h) => {
  g.fillStyle = '#5b6479'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#c5cbd8'; g.font = F(800, 120); g.textAlign = 'left'; g.fillText('Clases de inglés', 90, 400);
  g.fillStyle = '#8f98ab'; g.font = F(600, 44); g.fillText('Servicio genérico', 92, 200);
});
const okTex = tex(1500, 710, (g, w, h, s = {}) => {
  g.fillStyle = '#F5F8FF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7B86A3'; g.font = F(700, 40); g.textAlign = 'left'; g.fillText('OFERTA CLARA', 90, 112);
  // líneas con resaltes que aparecen al decirse
  const L = [[['Inglés para tu ', 0], ['entrevista', 1]], [['en ', 0], ['3 meses', 2], [' o te', 0]], [['devolvemos el dinero', 3]]];
  const cols = ['', '#1F5EFF', '#4F86FF', '#8FB4FF'];
  const k = [0, s.a || 0, s.b || 0, s.c || 0];
  g.font = F(900, 84);
  L.forEach((ln, li) => {
    let x = 90; const y = 260 + li * 150;
    ln.forEach(([txt, ki]) => {
      const tw = g.measureText(txt).width;
      if (ki && k[ki] > 0) { g.fillStyle = cols[ki]; rr(g, x - 14, y - 92, (tw + 28) * eo3(k[ki]), 122, 20); g.fill(); }
      g.fillStyle = ki && k[ki] > 0.5 ? (ki === 3 ? '#0B2A6F' : '#ffffff') : '#0B2A6F';
      g.fillText(txt, x, y); x += tw;
    });
  });
});
const cardX = card(KW, KH, 0.1, 0x5b6479, xTex, { r: 0.05, glow: 0.2, rough: 0.9 }); scene.add(cardX);
const cardOk = card(KW, KH, 0.1, 0xf5f8ff, okTex, { r: 0.05, glow: 0.4 }); scene.add(cardOk);
cardX.visible = cardOk.visible = false;
// tres piezas incrustadas en el borde de la tarjeta ✓
const okChips = [C.blue, C.blue2, C.blue3].map((c, i) => { const m = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.14, 0.16, 2, 0.04), matUI(c, 0.35)); m.position.set(-0.6 + i * 0.6, KH / 2 + 0.02, 0); m.castShadow = true; cardOk.add(m); return m; });
// libro (mismo icono interior en ambas)
function book() { const g = new THREE.Group(); const cover = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.54, 0.09, 2, 0.02), matUI(C.blue, 0.4)); const pages = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.07), matUI(0xf2f5ff, 0.7)); pages.position.set(0.02, 0, 0.012); g.add(cover, pages); const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.545, 0.095), matUI(0xffffff, 0.4)); band.position.x = -0.15; g.add(band); g.traverse(o => o.castShadow = true); return g; }
const bookX = book(), bookOk = book(); bookX.position.set(1.1, -0.08, 0.1); bookOk.position.set(1.1, -0.08, 0.1); cardX.add(bookX); cardOk.add(bookOk);
// sellos ✕ y ✓
function bar(w, h, c) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.08, 2, h / 2 - 0.001), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, emissive: c, emissiveIntensity: 0.25 })); m.castShadow = true; return m; }
const xMark = new THREE.Group(); { const a = bar(0.62, 0.13, C.red), b = bar(0.62, 0.13, C.red); a.rotation.z = Math.PI / 4; b.rotation.z = -Math.PI / 4; xMark.add(a, b); }
cardX.add(xMark); xMark.position.set(-1.18, 0.38, 0.12); xMark.visible = false;
const okMark = new THREE.Group(); { const a = bar(0.3, 0.14, C.blue), b = bar(0.62, 0.14, C.blue); a.position.set(-0.17, -0.06, 0); a.rotation.z = -Math.PI / 4; b.position.set(0.1, 0.05, 0.001); b.rotation.z = Math.PI / 3.3; okMark.add(a, b); }
cardOk.add(okMark); okMark.position.set(1.22, 0.5, 0.14); okMark.visible = false;
// cursor 3D
const curShape = new THREE.Shape(); curShape.moveTo(0, 0); curShape.lineTo(0, -0.62); curShape.lineTo(0.15, -0.48); curShape.lineTo(0.26, -0.72); curShape.lineTo(0.36, -0.67); curShape.lineTo(0.25, -0.44); curShape.lineTo(0.45, -0.44); curShape.lineTo(0, 0);
const cursor = new THREE.Group(); scene.add(cursor); cursor.visible = false;
{ const m = new THREE.Mesh(new THREE.ExtrudeGeometry(curShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), matUI(0xffffff, 0.3)); m.castShadow = true; cursor.add(m);
  const o = new THREE.Mesh(new THREE.ExtrudeGeometry(curShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.045, bevelSegments: 1 }), matUI(0x0b2a6f, 0.5)); o.position.z = -0.03; cursor.add(o); }
// onda de energía
const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 12, 96), new THREE.MeshBasicMaterial({ color: 0x6e9bff, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
scene.add(wave); wave.visible = false;

// ───────────────────────── escena 05: burbuja de comentario (en espacio de cámara) ─────────────────────────
const EX = ['Soy fisio…', 'Tengo una academia…', 'Hago diseño web…'];
const bubTex = tex(1300, 520, (g, w, h, s = { i: 0, n: 0, caret: 1 }) => {
  g.fillStyle = '#F5F8FF'; g.fillRect(0, 0, w, h);
  const gr = g.createLinearGradient(60, 70, 220, 230); gr.addColorStop(0, '#6E9BFF'); gr.addColorStop(1, '#1F5EFF');
  g.fillStyle = gr; g.beginPath(); g.arc(140, 150, 70, 0, 7); g.fill();
  g.fillStyle = '#7B86A3'; g.font = F(700, 40); g.fillText('Añade un comentario…', 250, 130);
  g.fillStyle = '#E3E9F7'; rr(g, 60, 260, w - 120, 190, 40); g.fill();
  g.fillStyle = '#0B2A6F'; g.font = F(800, 84);
  const str = EX[s.i].slice(0, s.n); g.fillText(str, 110, 386);
  if (s.caret) { const x = 116 + g.measureText(str).width; g.fillStyle = '#1F5EFF'; g.fillRect(x, 318, 8, 88); }
  g.fillStyle = '#1F5EFF'; g.beginPath(); g.arc(w - 150, 355, 58, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(w - 170, 380); g.lineTo(w - 128, 355); g.lineTo(w - 170, 330); g.stroke();
});
const bubble = new THREE.Group(); camera.add(bubble); bubble.visible = false;
{ const c = card(2.6, 1.04, 0.14, 0xf5f8ff, bubTex, { r: 0.06, glow: 0.42 }); bubble.add(c);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.22, 0.34, 3), matUI(0xf5f8ff, 0.5)); tail.rotation.z = Math.PI; tail.position.set(-0.85, -0.62, 0); tail.scale.z = 0.35; bubble.add(tail); }
const bubLight = new THREE.PointLight(0xdfe7ff, 3, 6, 1.5); bubLight.position.set(0.4, 0.6, 1.8); bubble.add(bubLight);

// ───────────────────────── líneas (anclas del recorrido) ─────────────────────────
const RB = 1.95; // radio del anillo a la base
const ringPts = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * Math.PI * 2; ringPts.push(new THREE.Vector3(Math.sin(a) * RB, 0.03, Math.cos(a) * RB)); }
const L1 = mkLine([new THREE.Vector3(0, 0.03, BOX.d / 2 + 0.02), new THREE.Vector3(0.0, 0.03, 1.2), new THREE.Vector3(0.5, 0.03, 1.85), ...ringPts.slice(2).map(p => p.clone()), new THREE.Vector3(0.6, 0.03, 1.88)], { segs: 260 });
const L2 = mkLine([new THREE.Vector3(0.6, 0.03, 1.88), new THREE.Vector3(1.45, 0.05, 0.95), new THREE.Vector3(1.4, 0.7, BOX.d / 2 + 0.04), new THREE.Vector3(1.36, BOX.h + 0.03, 0.4), new THREE.Vector3(0.86, BOX.h + 0.04, 0.16), new THREE.Vector3(-1.3, BOX.h + 0.04, 0.16)], { segs: 160 });
const L3 = mkLine([new THREE.Vector3(-1.3, BOX.h + 0.04, 0.16), new THREE.Vector3(-1.38, BOX.h + 0.35, 0.6), new THREE.Vector3(-1.2, 2.0, 1.4), new THREE.Vector3(-0.9, 2.25, P1.z), new THREE.Vector3(0.9, 2.25, P1.z)], { segs: 140 });
const clockPts = []; for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + (i / 40) * Math.PI * 2; clockPts.push(new THREE.Vector3(P1.x + Math.cos(a) * 1.05, P1.y + 0.05 + Math.sin(a) * 1.05 * 0.8, P1.z - 0.05)); }
const L4 = mkLine([new THREE.Vector3(0.9, 2.25, P1.z), new THREE.Vector3(1.05, 2.1, P1.z - 0.05), ...clockPts.slice(10)], { segs: 200 });
const shPts = shieldShape.getSpacedPoints(60).map(p => new THREE.Vector3(P1.x + p.x * 1.9, P1.y + 0.1 + p.y * 1.9, P1.z - 0.05));
const L5 = mkLine(shPts, { segs: 220, closed: true });
// hacia el escenario del contraste
const L6pts = H
  ? [new THREE.Vector3(1.3, 0.03, 1.2), new THREE.Vector3(4, 0.03, 1.4), new THREE.Vector3(7, 0.03, 0.9), new THREE.Vector3(8.6, 0.03, 0.45), new THREE.Vector3(9.25, 1.0, 0.05), new THREE.Vector3(9.25, 1.96, 0.02), new THREE.Vector3(12.25, 1.96, 0.02), new THREE.Vector3(12.25, 3.44, 0.02), new THREE.Vector3(9.25, 3.44, 0.02), new THREE.Vector3(9.25, 2.0, 0.02)]
  : [new THREE.Vector3(1.3, 0.03, 1.2), new THREE.Vector3(4, 0.03, 1.4), new THREE.Vector3(7, 0.03, 0.9), new THREE.Vector3(7.25, 0.4, 0.3), new THREE.Vector3(7.42, 1.24, 0.03), new THREE.Vector3(10.58, 1.24, 0.03), new THREE.Vector3(10.58, 2.72, 0.03), new THREE.Vector3(7.42, 2.72, 0.03), new THREE.Vector3(7.42, 1.28, 0.03)];
const L6 = mkLine(L6pts, { segs: 320 });
const bigPts = []; for (let i = 0; i <= 48; i++) { const a = Math.PI * 0.08 + (i / 48) * Math.PI * 2; bigPts.push(new THREE.Vector3(Math.sin(a) * 6.6, 0.03, Math.cos(a) * 6.6)); }
const L7 = mkLine(bigPts, { segs: 300 });

// ───────────────────────── cámara: un solo viaje ─────────────────────────
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const KEYS = [
  // t, posición, objetivo, curva hacia la siguiente
  [-0.6, V3(0, 1.0, 19), V3(0, 1.0, 0), 'lin'],
  [0.0, V3(0, 1.05, 15.6), V3(0, 1.0, 0), 'out'],
  [1.4, V3(0, 1.9, 10.4), V3(0, 1.05, 0), 'io'],
  [3.9, V3(0.7, 2.2, 9.2), V3(0, 1.0, 0), 'io'],
  [5.8, V3(0, 5.2, 11.6), V3(0, 1.55, 0), 'io'],
  [9.2, V3(-0.3, 5.4, 11.2), V3(0, 1.6, 0), 'io'],
  [11.2, V3(0.6, 3.6, 8.4), V3(0.1, 1.1, 0), 'io'],
  [13.3, V3(-0.4, 4.0, 8.8), V3(0, 1.2, 0), 'io'],
  [15.5, V3(0, 2.2, 7.2), V3(0, 0.6, 0), 'io'],
  [16.7, V3(2.6, 1.2, 5.4), V3(0, 0.3, 0.5), 'io'],
  [18.0, V3(0, 6.2, 7.4), V3(0, 0.9, 0), 'io'],
  [20.4, V3(0, 5.0, 7.8), V3(0, 1.3, 0.4), 'io'],
  [22.5, V3(0, 2.5, 9.2), V3(0, 2.0, 3.6), 'io'],
  [24.45, V3(0, 2.35, 6.6), V3(0, 2.15, 2.4), 'lin'],
  [24.95, V3(0, 2.3, 4.5), V3(0, 2.1, 0), 'io'],
  [26.3, V3(0, 2.4, 5.6), V3(0, 2.0, 1.5), 'io'],
  [27.35, V3(0.2, 4.6, 6.8), V3(0, 1.4, 0.3), 'io'],
  [29.1, V3(0.5, 3.0, 6.6), V3(0, 2.1, 1.7), 'io'],
  [30.5, V3(-0.4, 4.4, 6.9), V3(0, 1.4, 0.4), 'io'],
  [32.2, V3(0, 3.0, 7.4), V3(0, 2.0, 1.7), 'io'],
  [35.1, V3(0, 3.2, 7.6), V3(0, 1.8, 0.9), 'io'],
  [36.3, V3(-0.3, 3.3, 7.9), V3(0, 1.2, 0), 'io'],
  [37.7, CS.cam.clone().add(V3(0, 0.1, 0.5)), CS.tgt.clone(), 'lin'],
  [44.0, CS.cam.clone().add(V3(0, 0, 0.1)), CS.tgt.clone(), 'lin'],
  [47.2, CS.cam.clone().add(V3(0.15, 0, -0.35)), CS.tgt.clone(), 'io'],
  [48.7, V3(0, 3.3, 7.4), V3(0, 1.45, 0), 'lin'],
  [50.5, V3(0.25, 3.5, 7.9), V3(0, 1.4, 0), 'io'],
  [52.4, V3(0, 10.5, 17.5), V3(0, 0.7, 0), 'lin'],
  [56.0, V3(0, 11.0, 18.5), V3(0, 0.7, 0), 'lin'],
];
function cr(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
function crV(a, b, c, d, u) { return new THREE.Vector3(cr(a.x, b.x, c.x, d.x, u), cr(a.y, b.y, c.y, d.y, u), cr(a.z, b.z, c.z, d.z, u)); }
const EASE = { lin: (x) => x, io: (x) => eio(x) * 0.7 + x * 0.3, out: (x) => eo5(x) };
function camAt(t) {
  let i = 0; while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
  const k0 = KEYS[Math.max(0, i - 1)], k1 = KEYS[i], k2 = KEYS[i + 1], k3 = KEYS[Math.min(KEYS.length - 1, i + 2)];
  const u = EASE[k1[3]](seg(t, k1[0], k2[0]));
  return { p: crV(k0[1], k1[1], k2[1], k3[1], u), q: crV(k0[2], k1[2], k2[2], k3[2], u) };
}

// ───────────────────────── capa tipográfica (DOM) ─────────────────────────
const $ = (id) => document.getElementById(id);
function buildHL(el, words, px, top) {
  el.style.fontSize = px + 'px'; el.style.top = top + 'px';
  el.innerHTML = '';
  return words.map((w) => {
    if (w === '\n') { el.appendChild(document.createElement('br')); return null; }
    const s = document.createElement('span'); s.className = 'w' + (w.k ? ' k' : '') + (w.kl ? ' kl' : ''); s.textContent = w.t; s.style.visibility = 'hidden';
    el.appendChild(s); el.appendChild(document.createTextNode(' '));
    return s;
  }).filter(Boolean);
}
const T = (t, extra = {}) => ({ t, ...extra });
const hTop = H ? 70 : 270;
const h1 = buildHL($('h1'), [T('NO'), T('TE'), T('FALTAN'), '\n', T('CLIENTES', { k: 1 })], H ? 120 : 132, hTop);
const h2 = buildHL($('h2'), [T('+ anuncios'), T('≠', { r: 1 }), T('+ clientes', { k: 1 })], H ? 104 : 96, hTop + 10);
const h3 = buildHL($('h3'), [T('UNA'), T('OFERTA'), T('QUE'), '\n', T('VENDE', { k: 1 }), T('SOLA', { k: 1 })], H ? 104 : 110, hTop);
const h4 = buildHL($('h4'), [T('MISMO'), T('SERVICIO')], H ? 60 : 64, H ? 905 : 1530 - 110);
const h5 = buildHL($('h5'), [T('¿CUÁL'), T('COMPRAS?', { k: 1 })], H ? 100 : 104, hTop);
const h6 = buildHL($('h6'), [T('COMENTA'), T('A'), T('QUÉ'), T('TE'), '\n', T('DEDICAS', { k: 1 })], H ? 104 : 110, hTop);
$('h2').style.textTransform = 'none';
h2[1].style.color = '#E5484D';
// 👇 (gesto que apunta a la UI de comentarios)
const hand = document.createElement('div'); hand.textContent = '👇'; hand.style.cssText = `position:absolute;left:0;right:${H ? 0 : 60}px;text-align:center;font-size:${H ? 120 : 150}px;line-height:1;top:${H ? 800 : 1320}px;font-family:"Noto Color Emoji";visibility:hidden;`;
$('ui').appendChild(hand);

// etiquetas de las tres piezas
const LAB = [['#1F5EFF', '1.', 'Resultado concreto'], ['#4F86FF', '2.', 'Plazo'], ['#8FB4FF', '3.', 'Cero riesgo']];
const labsEl = $('labels'); labsEl.style.top = (H ? 60 : 268) + 'px';
const labs = LAB.map(([c, n, s]) => { const d = document.createElement('div'); d.className = 'lab'; d.innerHTML = `<i style="background:${c}"></i><span><b>${n}</b> ${s}</span>`; d.style.visibility = 'hidden'; labsEl.appendChild(d); return d; });
if (H) { labsEl.style.left = '80px'; labsEl.style.right = '80px'; }

// cita de garantía
const quote = $('quote');
quote.innerHTML = ['«Si', 'no', 'lo', 'consigo,', 'sigo', 'trabajando', '<span class="u">gratis</span>', 'hasta', 'que', 'lo', 'consiga»'].map(w => `<span class="w" style="visibility:hidden">${w}</span>`).join(' ');
const qWords = [...quote.querySelectorAll(':scope > .w')]; const qU = quote.querySelector('.u');
quote.style.top = (H ? 900 : 1160) + 'px';
if (H) { quote.style.left = '360px'; quote.style.right = '360px'; quote.style.fontSize = '56px'; }
const QT = [32.72, 32.78, 32.88, 32.98, 33.78, 34.04, 34.36, 34.9, 35.08, 35.24, 35.34];

// subtítulos karaoke
const KEYW = /^(clientes|oferta|resultado|plazo|riesgo|gratis|comentarios)/i;
const words = window.WORDS.map(([w, s, e]) => ({ w, s, e }));
const chunks = []; { let cur = [];
  words.forEach((w, i) => { cur.push(w); const nx = words[i + 1]; const brk = /[.,?:]$/.test(w.w) || cur.length >= 5 || !nx || nx.s - w.e > 0.45; if (brk) { chunks.push(cur); cur = []; } });
}
chunks.forEach((c, i) => { c.a = c[0].s - 0.06; const nx = chunks[i + 1]; c.b = nx ? Math.min(nx[0].s - 0.04, c[c.length - 1].e + 0.9) : c[c.length - 1].e + 0.6; });
const cap = $('cap'); cap.style.top = (H ? 880 : 1290) + 'px';
if (H) { cap.style.left = '300px'; cap.style.right = '300px'; cap.style.fontSize = '52px'; }
if (!SUBS) cap.style.display = 'none';
let capIdx = -1, capSpans = [];
const CAP_OFF = [[-1, 1.3], [32.6, 35.75], [37.15, 99]];

// fin
const endEl = $('end'), handleEl = $('handle'), grainEl = $('grain');

// ───────────────────────── animaciones DOM ─────────────────────────
function wordDrop(sp, t, land, exit, opt = {}) {
  const pre = 0.2;
  if (t < land - pre || t >= exit + 0.5) { sp.style.visibility = 'hidden'; return; }
  sp.style.visibility = 'visible';
  let y = 0, sc = 1, sy = 1, r = 0;
  if (t < land) { const u = ei3(seg(t, land - pre, land)); sc = lerp(1.55, 1, u); y = lerp(-30, 0, u); }
  else { const s = ring(t - land, 4.2, 10) * (opt.heavy ? 0.26 : 0.14); sy = 1 - s; sc = 1 + s * 0.4; }
  if (t > exit) { const u = ei3(seg(t, exit, exit + 0.42)); y -= 1400 * u; r = (opt.rot || 0) * u; }
  sp.style.transform = `translateY(${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(3)},${(sc * sy).toFixed(3)})`;
}
function slideIn(el, t, t0, exitT, opt = {}) {
  if (t < t0 || (exitT && t >= exitT + 0.6)) { el.style.visibility = 'hidden'; return; }
  el.style.visibility = 'visible';
  const u = seg(t, t0, t0 + 0.42); let x = -(opt.dist ?? 1100) * (1 - eoBack(u, 1.3)); let y = opt.y ?? 0;
  if (exitT && t > exitT) { x += 1800 * ei3(seg(t, exitT, exitT + 0.5)); }
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

function renderDOM(t) {
  // 01 gancho
  const L1t = [0.1, 0.24, 0.4, 0.66];
  h1.forEach((s, i) => wordDrop(s, t, L1t[i], 4.25 + i * 0.04, { heavy: i === 3, h: 340, rot: (i - 1.5) * 6 }));
  // 02 ecuación
  wordDrop(h2[0], t, 9.32, 15.25, { rot: -5 }); wordDrop(h2[2], t, 9.62, 15.32, { rot: 5 });
  { const s = h2[1]; if (t < 9.95 || t > 15.8) s.style.visibility = 'hidden'; else { s.style.visibility = 'visible'; const k = spring(t - 9.95, 2.6, 6); let y = 0; if (t > 15.28) y = -1400 * ei3(seg(t, 15.28, 15.7)); s.style.transform = `translateY(${y}px) scale(${(0.2 + 0.8 * k * 1.0 + 0.0).toFixed(3)}) rotate(${(-18 * (1 - k)).toFixed(1)}deg)`; } }
  // 03 titular
  const L3t = [17.2, 17.42, 17.72, 17.92, 18.12];
  h3.forEach((s, i) => wordDrop(s, t, L3t[i], 20.05 + i * 0.03, { heavy: i >= 3, rot: (i - 2) * 5 }));
  // etiquetas
  const LT = [21.12, 28.32, 31.84];
  const align = eio(seg(t, 35.45, 36.05));
  labs.forEach((d, i) => {
    let yy = i * 82, xx = 0;
    if (H) { yy = 0; xx = [0, 640, 1060][i] * align + i * 0 + (1 - align) * 0; if (!align) { yy = i * 76; xx = 0; } else { yy = i * 76 * (1 - align); } }
    else { xx = (1 - align) * [0, 70, 140][i] + align * 0; }
    slideIn(d, t, LT[i], 36.3 + i * 0.05, { y: yy });
    if (t >= LT[i] && t < 36.9) { const cur = d.style.transform; d.style.transform = cur + ` translateX(${xx.toFixed(1)}px)`; }
    // la etiqueta activa se resalta
    const act = (i === 0 && t < 27.0) || (i === 1 && t >= 27.0 && t < 30.4) || (i === 2 && t >= 30.4 && t < 35.45);
    d.style.color = act ? '#ffffff' : (align > 0.5 ? '#ffffff' : '#A9B4CC');
  });
  // cita
  qWords.forEach((w, i) => { if (t < QT[i] - 0.05 || t > 35.95) { w.style.visibility = 'hidden'; return; } w.style.visibility = 'visible'; const u = seg(t, QT[i] - 0.05, QT[i] + 0.2); let y = 40 * (1 - eoBack(u, 2)); if (t > 35.55) y -= 1500 * ei3(seg(t, 35.55 + i * 0.015, 35.95)); w.style.transform = `translateY(${y.toFixed(1)}px)`; });
  qU.style.setProperty('--ul', eo3(seg(t, 34.4, 34.85)).toFixed(3));
  // contraste
  h4.forEach((s, i) => wordDrop(s, t, 44.15 + i * 0.16, 47.15, { h: 160 }));
  h5.forEach((s, i) => wordDrop(s, t, 45.66 + i * 0.4, 47.25, { heavy: i === 1 }));
  // CTA
  const L6t = [47.48, 47.62, 47.76, 47.9, 48.12];
  h6.forEach((s, i) => wordDrop(s, t, L6t[i], 52.15 + i * 0.03, { heavy: i === 4, rot: (i - 2) * 4 }));
  if (t < 48.4 || t > 52.6) hand.style.visibility = 'hidden';
  else { hand.style.visibility = 'visible'; const dt = t - 48.4; const b = Math.abs(Math.sin(Math.PI * 2.2 * dt)) * Math.exp(-1.6 * dt) * 55; const k = spring(dt, 2.4, 7); let y = b - 220 * (1 - k); if (t > 52.15) y += 900 * ei3(seg(t, 52.15, 52.55)); hand.style.transform = `translateY(${y.toFixed(1)}px) scale(${(0.6 + 0.4 * k).toFixed(3)})`; }

  // subtítulos
  const off = CAP_OFF.some(([a, b]) => t >= a && t < b);
  let ci = -1; if (!off) ci = chunks.findIndex(c => t >= c.a && t < c.b);
  if (ci !== capIdx) {
    capIdx = ci; cap.innerHTML = '';
    const box = document.createElement('span'); box.className = 'cbox'; cap.appendChild(box); capSpans = ci < 0 ? [] : chunks[ci].map((w, j) => { const s = document.createElement('span'); s.className = 'cw'; s.textContent = w.w; box.appendChild(s); box.appendChild(document.createTextNode(' ')); return s; }); if (ci < 0) cap.innerHTML = '';
  }
  if (ci >= 0) {
    const c = chunks[ci];
    c.forEach((w, j) => {
      const s = capSpans[j]; const on = t >= w.s - 0.03; const kw = KEYW.test(w.w.replace(/[¿¡«]/g, ''));
      s.style.color = on ? (kw ? '#6E9BFF' : '#ffffff') : 'rgba(255,255,255,.42)';
      const pop = on ? 1 + 0.1 * Math.exp(-14 * (t - w.s)) : 1;
      const u = seg(t, c.a + j * 0.03, c.a + j * 0.03 + 0.2); const y = 34 * (1 - eo3(u));
      s.style.transform = `translateY(${y.toFixed(1)}px) scale(${pop.toFixed(3)})`;
    });
  }

  // firma final
  if (t < 52.38) endEl.style.visibility = 'hidden';
  else {
    endEl.style.visibility = 'visible';
    const u = eioQ(seg(t, 52.38, 52.9)); endEl.style.clipPath = `circle(${(u * 75).toFixed(2)}% at 50% ${H ? 50 : 50}%)`;
    const v = eo5(seg(t, 52.75, 53.3)); handleEl.style.clipPath = `inset(0 ${((1 - v) * 50).toFixed(2)}% 0 ${((1 - v) * 50).toFixed(2)}%)`;
    handleEl.style.transform = `translateY(${(14 * (1 - v)).toFixed(1)}px)`;
  }
  // grano vivo
  const gi = Math.floor(t * 30) % 8; grainEl.style.transform = `translate(${(gi * 37) % 100 - 50}px, ${(gi * 53) % 100 - 50}px)`;
}

// ───────────────────────── render(t) ─────────────────────────
const tmpV = new THREE.Vector3();
function level(t) {
  let l = 0.0;
  l += 0.12 * eo3(seg(t, 27.0, 27.4));
  l += 0.12 * eo3(seg(t, 30.35, 30.75));
  l += 0.36 * eo3(seg(t, 35.45, 36.2));
  l -= 0.12 * eo3(seg(t, 38.5, 39.0)) * (1 - eo3(seg(t, 43.4, 43.9)));
  l += 0.1 * eo3(seg(t, 43.4, 43.9));
  l += 0.12 * ring(t - 46.6, 3, 5);
  return l;
}

function render(t) {
  // ── cámara
  const cam = camAt(t);
  // micro-impactos
  const imp = ring(t - 0.66, 7, 9) * 0.06 + ring(t - 6.3, 8, 11) * 0.02 + ring(t - 7.28, 8, 11) * 0.02 + ring(t - 8.3, 8, 11) * 0.02 + ring(t - 27.0, 9, 12) * 0.025 + ring(t - 30.35, 9, 12) * 0.025 + ring(t - 35.42, 9, 10) * 0.035 + ring(t - 38.5, 9, 12) * 0.02 + ring(t - 43.4, 9, 12) * 0.02;
  camera.position.copy(cam.p); camera.position.y += imp;
  camera.lookAt(cam.q);
  camera.updateMatrixWorld();

  const lv = level(t);
  renderer.toneMappingExposure = 0.95 + lv * 0.55;
  bgMat.uniforms.uLevel.value = lv; floorMat.uniforms.uLevel.value = lv;
  hemi.intensity = 0.5 + lv * 0.5;
  rim.intensity = 2.0 + lv * 1.5;

  // ── clientes
  figs.forEach((f, i) => {
    const u = seg(t, -0.8 + f.delay * 0.15, f.arrive);
    const e = eo3(u);
    tmpV.lerpVectors(f.start, f.end, e);
    // un paso más cerca cuando la oferta se pule
    const near = eo3(seg(t, 35.6 + f.delay * 0.5, 36.4 + f.delay * 0.5));
    tmpV.multiplyScalar(1 - 0.12 * near);
    f.g.position.copy(tmpV);
    const moving = u < 1 || (near > 0 && near < 1);
    const bob = moving ? Math.abs(Math.sin((t * 11 + f.ph))) * 0.07 * (1 - e * 0.6) : 0;
    f.g.position.y = bob;
    // girar la espalda (13.0) y volver a mirar (35.5)
    const away = eio(seg(t, 13.05 + f.delay * 0.7, 13.75 + f.delay * 0.7)) * (1 - eio(seg(t, 35.5 + f.delay * 0.35, 36.05 + f.delay * 0.35)));
    f.g.rotation.y = f.face + away * Math.PI * 0.82 * f.tiltDir;
    // ladear la cabeza en «nadie entiende»
    const tilt = spring(t - (2.95 + f.delay * 0.35), 1.6, 5) * (1 - eio(seg(t, 4.3, 4.8)));
    f.head.rotation.z = tilt * 0.38 * f.tiltDir;
    f.head.rotation.x = -tilt * 0.08;
    // los clientes «notan» la oferta pulida
    const look = spring(t - 35.55 - f.delay * 0.3, 1.8, 5) * (1 - away);
    f.head.rotation.x += -0.1 * look; f.head.position.y = 0.86 + 0.03 * look;
  });

  // ── signos «?»
  qs.forEach((q, i) => {
    if (t < q.t0 || t > 5.4) { q.s.visible = false; return; }
    q.s.visible = true;
    const from = q.f.g.position.clone().add(V3(0, 1.45, 0));
    const u = seg(t, q.t0 + 0.12, q.t0 + 0.62);
    const pop = spring(t - q.t0, 2.2, 6);
    const p = tmpV.lerpVectors(from, q.land, eio(u)); p.y += Math.sin(Math.PI * u) * 0.45;
    if (u >= 1) p.y += fall(t, q.t0 + 0.62, 0.01, 0, 0) + 0.25 * Math.exp(-6 * (t - q.t0 - 0.62)) * Math.abs(Math.sin(9 * (t - q.t0 - 0.62)));
    if (t > 4.35 + i * 0.03) { const v = seg(t, 4.35 + i * 0.03, 5.2); p.addScaledVector(q.out, ei3(v)); }
    q.s.position.copy(p); const sc = 0.3 * pop; q.s.scale.set(sc, sc, 1);
  });

  // ── tarjetas que caen (anuncios / seguidores / contenido)
  tcards.forEach((c, i) => {
    const tl = TLAND[i];
    if (t < tl - 0.55) { c.visible = false; return; } c.visible = true;
    const baseY = CH / 2 + i * (CH + 0.012);
    c.position.y = baseY + fall(t, tl, 0.55, 7.5, 0.06);
    const dt = t - tl; const sq = dt > 0 ? ring(dt, 5, 9) * 0.08 : 0;
    c.scale.set(1 + sq * 0.5, 1 - sq, 1);
    c.rotation.z = dt > 0 ? ring(dt, 2.6, 4) * 0.05 * (i % 2 ? -1 : 1) : (1 - seg(t, tl - 0.55, tl)) * 0.25 * (i % 2 ? 1 : -1);
  });
  redraw(folTex, Math.round(eo3(seg(t, 7.28, 7.9)) * 10) / 10);
  // la torre y el dashboard caen planos al revelar el verdadero problema
  const topple = seg(t, 15.5, 16.25);
  towerInner.rotation.z = (Math.PI / 2) * ei3(topple) + (topple >= 1 ? ring(t - 16.25, 3, 8) * 0.04 : 0);
  towerInner.position.x = -CH * 0 - 0.06 * topple;
  const dUp = spring(t - 8.6, 1.6, 6) * (1 - ei3(seg(t, 15.55, 16.2)));
  dashHinge.rotation.x = -Math.PI / 2 * (1 - dUp);
  dash.visible = t > 8.5;
  redraw(dashTex, Math.round(eo3(seg(t, 9.0, 10.4)) * 20) / 20);

  // ── DM «¿Precio?»
  dm.visible = t > 10.45 && t < 13.9;
  if (dm.visible) {
    const k = spring(t - 10.45, 2.2, 6.5);
    dm.position.set(0.45 + 7 * ei3(seg(t, 13.1, 13.85)), 2.45 + 0.04 * Math.sin(t * 3), 1.0);
    dm.scale.setScalar(Math.max(0.001, k)); dm.rotation.set(0, -0.25, 0.08 * (1 - k) + ring(t - 11.0, 4, 4) * 0.02);
  }

  // ── la caja intenta «convencer»
  const conv = Math.sin(Math.PI * seg(t, 11.25, 13.0)) ** 0.7;
  const wob = Math.sin(t * 34) * conv;
  offerInner.scale.set(1 + 0.06 * conv + 0.012 * wob, 1 + 0.08 * conv - 0.015 * wob, 1 + 0.06 * conv);
  offerInner.position.x = 0.025 * Math.sin(t * 51) * conv;
  sweat.forEach((s, i) => {
    const t0 = 11.6 + i * 0.22; const u = seg(t, t0, t0 + 1.1);
    s.visible = t > t0 && t < t0 + 1.1;
    const x = [-1.1, 0.95, -0.35, 1.25][i];
    const slide = Math.min(1, u * 1.6);
    s.position.set(x, BOX.h - 0.02 - slide * (BOX.h * 0.75) - (u > 0.62 ? 6 * (u - 0.62) ** 2 : 0), BOX.d / 2 + 0.05);
    s.scale.set(1, 1.35 + slide * 0.4, 1);
  });

  // ── la línea
  setLine(L1, 0, eio(seg(t, 15.46, 17.35)));
  setLine(L2, 0, eio(seg(t, 17.35, 18.55)));
  setLine(L3, eio(seg(t, 26.55, 27.2)), eo3(seg(t, 20.2, 21.6)));
  setLine(L4, eio(seg(t, 29.95, 30.5)), eio(seg(t, 27.05, 28.2)));
  setLine(L5, eio(seg(t, 34.95, 35.42)), eio(seg(t, 30.55, 31.9)));
  setLine(L6, eio(seg(t, 47.3, 48.3)), eio(seg(t, 36.38, 37.6)) * 0.42 + eio(seg(t, 38.9, 39.9)) * 0.58);
  setLine(L7, 0, eioQ(seg(t, 50.6, 52.3)));
  // luz práctica en la punta activa
  const active = [[L1, 15.46, 17.35], [L2, 17.35, 18.55], [L3, 20.2, 21.6], [L4, 27.05, 28.2], [L5, 30.55, 31.9], [L6, 36.38, 39.9], [L7, 50.6, 52.3]].find(([L, a, b]) => t >= a && t <= b + 0.4);
  if (active) { const L = active[0]; tipLight.position.copy(L.curve.getPointAt(clamp(L.b, 0, 0.999))); tipLight.intensity = 6; } else tipLight.intensity = 0;
  slotGlowMats.forEach((m, i) => { m.opacity = 0.75 * eo3(seg(t, 18.0 + i * 0.18, 18.3 + i * 0.18)) * (0.75 + 0.25 * Math.sin(t * 4 + i)); });

  // ── piezas
  const DOCK = (i) => V3(SLOT_X[i], BOX.h + PH / 2 - 0.1, 0);
  // gris → fragmentos
  grey.visible = t > 22.35 && t < 24.62;
  if (grey.visible) { const k = eo3(seg(t, 22.35, 23.0)); grey.position.set(-3.5 * (1 - k) + 0.04 * Math.sin(t * 1.7), 2.25 + 0.04 * Math.sin(t * 2.3), 3.6); grey.rotation.set(0.04 * Math.sin(t * 1.3), (1 - k) * 0.7 + 0.05 * Math.sin(t), 0.03 * Math.sin(t * 2)); }
  frags.forEach((f) => {
    const dt = t - 24.62; f.m.visible = dt >= 0 && dt < 1.6;
    if (!f.m.visible) return;
    f.m.position.set(f.off.x + f.v.x * dt, 2.25 + f.off.y + f.v.y * dt - 2.2 * dt * dt, 3.6 + f.v.z * dt * 0.6);
    f.m.rotation.set(f.w.x * dt, f.w.y * dt, f.w.z * dt);
  });
  // pieza 1: resultado
  piece1.visible = t > 24.75;
  if (piece1.visible) {
    const asm = seg(t, 24.75, 25.25);
    const fly = seg(t, 26.5, 27.0);
    const big = 1.5;
    const p = tmpV.lerpVectors(P1, DOCK(0), eio(fly)); p.y += Math.sin(Math.PI * fly) * 0.6;
    if (t > 27.0) p.y -= ring(t - 27.0, 6, 10) * 0.03;
    piece1.position.copy(p);
    const s = lerp(big, 1, eio(fly));
    const ax = eoBack(asm, 2.2);
    const click = t > 27.0 ? ring(t - 27.0, 7, 12) * 0.1 : 0;
    piece1.scale.set(s * Math.max(0.02, ax) * (1 + click * 0.5), s * (0.15 + 0.85 * eo3(asm)) * (1 - click), s);
    piece1.rotation.set(0, 0, (1 - eo3(asm)) * 0.3);
    redraw(p1Tex, Math.round(30 * eioQ(seg(t, 25.84, 26.45)) * 20) / 20);
  }
  // pieza 2: plazo (calendario)
  piece2.visible = t > 27.75;
  if (piece2.visible) {
    const k = spring(t - 27.75, 1.8, 6);
    const fly = seg(t, 29.9, 30.35);
    const p = tmpV.lerpVectors(V3(P1.x, P1.y + 0.05, P1.z), DOCK(1), eio(fly)); p.y += Math.sin(Math.PI * fly) * 0.5;
    piece2.position.copy(p);
    const s = lerp(1.5, 1, eio(fly)) * Math.max(0.001, k);
    const click = t > 30.35 ? ring(t - 30.35, 7, 12) * 0.1 : 0;
    piece2.scale.set(s * (1 + click * 0.5), s * (1 - click), s);
    const flip = seg(t, 28.25, 29.65);
    const n = Math.max(1, Math.round(90 * eio(flip)));
    redraw(p2Tex, t < 28.25 ? 1 : n);
    const ph = flip > 0 && flip < 1 ? ((t - 28.25) / 0.11) % 1 : 0;
    pagePivot.rotation.x = -Math.PI * 0.98 * eio(ph);
    page.visible = flip > 0 && flip < 1;
  }
  // pieza 3: escudo
  piece3.visible = t > 31.75;
  if (piece3.visible) {
    const k = spring(t - 31.75, 1.7, 5.5);
    const fly = seg(t, 35.0, 35.42);
    const p = tmpV.lerpVectors(V3(P1.x, P1.y + 0.1, P1.z), V3(SLOT_X[2], BOX.h + 0.3, 0), eio(fly)); p.y += Math.sin(Math.PI * fly) * 0.5;
    piece3.position.copy(p);
    const s = lerp(1.2, 0.68, eio(fly)) * Math.max(0.001, k);
    const click = t > 35.42 ? ring(t - 35.42, 7, 12) * 0.1 : 0;
    piece3.scale.set(s * (1 + click * 0.4), s * (1 - click), s);
    piece3.rotation.y = (1 - k) * 1.2 + (t < 35.42 ? 0.06 * Math.sin(t * 2) : 0);
  }

  // ── pulido del vidrio
  const pol = eio(seg(t, 35.45, 36.15));
  glassMat.roughness = lerp(0.85, 0.07, pol);
  glassMat.clearcoat = pol; glassMat.color.setRGB(lerp(0.53, 0.17, pol), lerp(0.57, 0.3, pol), lerp(0.66, 0.78, pol));
  glassMat.opacity = lerp(0.93, 0.72, pol);
  coreMat.opacity = 0.55 * pol + 0.1 * pol * Math.sin(t * 2.2);
  coreLight.intensity = 9 * pol;
  panelMat.uniforms.uSweep.value = t < 35.45 ? -0.2 : lerp(-0.15, 1.2, eio(seg(t, 35.45, 36.15)));
  // durante la estrategia la cara frontal se atenúa como «base»
  const clink = t > 35.45 ? ring(t - 35.45, 10, 9) * 0.012 : 0;
  offer.scale.setScalar(1 + clink);

  // ── contraste
  cardX.visible = t > 36.9 && t < 47.9;
  if (cardX.visible) {
    const k = spring(t - 36.95, 1.4, 6);
    const sink = eo3(seg(t, 38.95, 39.5));
    cardX.position.copy(CS.x).add(V3(-6 * (1 - k), -0.08 * sink, -0.35 * sink));
    cardX.rotation.set(0.1 * sink, (1 - k) * 0.6, 0);
    const out = ei3(seg(t, 47.25, 47.9)); cardX.position.y += 9 * out;
  }
  xMark.visible = t > 38.35;
  if (xMark.visible) { const u = seg(t, 38.35, 38.55); xMark.position.z = 0.12 + 2.5 * (1 - ei3(u)); const s = u < 1 ? 1.4 - 0.4 * u : 1 + ring(t - 38.55, 6, 10) * 0.15; xMark.scale.setScalar(s); xMark.rotation.z = (1 - u) * 0.6; }
  cardOk.visible = t > 38.95 && t < 47.9;
  if (cardOk.visible) {
    const k = spring(t - 39.0, 1.5, 5.5);
    const press = t > 46.55 ? ring(t - 46.55, 3, 6) * 0.12 + (t < 46.75 ? 0.06 : 0) : 0;
    cardOk.position.copy(CS.ok).add(V3(0, -3.2 * (1 - k), 0.12 * k - press));
    cardOk.rotation.set(-0.5 * (1 - k), 0, 0);
    const out = ei3(seg(t, 47.25, 47.9)); cardOk.position.y -= 9 * out;
    redraw(okTex, { a: Math.round(seg(t, 40.46, 40.8) * 20) / 20, b: Math.round(seg(t, 41.54, 41.88) * 20) / 20, c: Math.round(seg(t, 42.52, 42.95) * 20) / 20 });
    const CT = [40.46, 41.54, 42.52];
    okChips.forEach((m, i) => { const d = t - CT[i]; m.visible = d > -0.25; const u = seg(t, CT[i] - 0.25, CT[i]); m.position.y = KH / 2 + 0.02 + 1.2 * (1 - u * u) - (d > 0 ? ring(d, 6, 10) * 0.03 : 0); });
  }
  okMark.visible = t > 43.2;
  if (okMark.visible) { const u = seg(t, 43.2, 43.4); okMark.position.z = 0.14 + 2.5 * (1 - ei3(u)); okMark.scale.setScalar(u < 1 ? 1.4 - 0.4 * u : 1 + ring(t - 43.4, 6, 10) * 0.15); }
  [bookX, bookOk].forEach((b, i) => { const k = spring(t - 44.1 - i * 0.12, 1.8, 6); b.visible = t > 44.05; b.rotation.x = -Math.PI / 2 * (1 - k); b.scale.setScalar(Math.max(0.001, k)); });
  // cursor
  cursor.visible = t > 45.55 && t < 47.4;
  if (cursor.visible) {
    const a = CS.x.clone().add(V3(0.35, -0.05, 0.4)), b = CS.ok.clone().add(V3(0.25, -0.05, 0.4)), s0 = CS.ok.clone().add(V3(2.2, -1.6, 1.2));
    let p;
    if (t < 45.95) p = tmpV.lerpVectors(s0, a, eo3(seg(t, 45.55, 45.95)));
    else if (t < 46.25) p = a.clone().add(V3(0.06 * Math.sin((t - 45.95) * 18), 0.03 * Math.sin((t - 45.95) * 11), 0));
    else p = tmpV.lerpVectors(a, b, eio(seg(t, 46.25, 46.52)));
    cursor.position.copy(p);
    if (t > 47.0) cursor.position.y -= 4 * ei3(seg(t, 47.0, 47.4));
    const pr = t > 46.52 && t < 46.72 ? Math.sin(Math.PI * seg(t, 46.52, 46.72)) : 0;
    cursor.scale.setScalar(1 - 0.15 * pr); cursor.position.z -= 0.08 * pr;
    cursor.rotation.z = 0.15;
  }
  wave.visible = t > 46.6 && t < 47.6;
  if (wave.visible) { const u = seg(t, 46.6, 47.5); wave.position.copy(CS.ok).add(V3(0, 0, 0.12)); const s = 0.3 + 3.2 * eo3(u); wave.scale.set(s, s * 0.6, s); wave.material.opacity = 1; wave.scale.z = 1 + 2 * u; }

  // ── burbuja de comentario (en espacio de cámara)
  bubble.visible = t > 47.35 && t < 51.3;
  if (bubble.visible) {
    const k = spring(t - 47.35, 1.6, 6);
    const yTarget = H ? -0.15 : -0.55;
    let y = lerp(0.2, yTarget, eo3(seg(t, 47.35, 48.1)));
    y -= 6 * ei3(seg(t, 50.55, 51.25));
    bubble.position.set(H ? 0 : -0.12, y, -5.2);
    bubble.scale.setScalar(Math.max(0.001, k) * (H ? 0.95 : 0.78));
    bubble.rotation.set(0.05 * Math.sin(t * 1.6), -0.06 * Math.sin(t * 1.1), 0.03 * Math.sin(t * 1.9));
    const ex = [[47.95, 49.35], [49.4, 50.25], [50.25, 51.3]];
    let i = ex.findIndex(([a, b]) => t >= a && t < b); if (i < 0) i = 0;
    const n = Math.floor(clamp((t - ex[i][0]) / 0.055, 0, EX[i].length));
    redraw(bubTex, { i, n: t < 47.95 ? 0 : n, caret: Math.floor(t * 3) % 2 });
  }

  renderer.render(scene, camera);
  renderDOM(t);
}

// ───────────────────────── arranque determinista ─────────────────────────
const ready = (async () => {
  const faces = [500, 600, 700, 800, 900].map((w) => document.fonts.load(`${w} 40px InterX`));
  await Promise.all(faces); await document.fonts.ready;
  TEX.forEach((t) => { const u = t.userData; if (u.draw) { u.g.clearRect(0, 0, u.w, u.h); u.draw(u.g, u.w, u.h, undefined); u.last = null; t.needsUpdate = true; } });
  render(0);
})();
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {}; window.__hf.buildReady.scene = ready;
window.addEventListener('hf-seek', (e) => { render(e.detail.time); });
window.__render = render;
render(0);
