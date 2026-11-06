// "Pacientes que se escapan" · estilo Directo. render(t) es una función pura del tiempo.
(function () {
'use strict';
const BG = '#0A0A0A', LINE = '#F2F2F2', Y = '#FFC602', SUB = '#8A8A8A', G9 = '#9A9A9A',
      G6 = '#6A6A6A', G5 = '#5A5A5A', INK = '#141414', EYE = '#FFFDF5';
const W = 1080, H = 1920, FONT = 'InterX';
const cv = document.getElementById('cv'), X = cv.getContext('2d');
const layer = document.createElement('canvas'); layer.width = W; layer.height = H;
const LX = layer.getContext('2d');

// ---------- utilidades ----------
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pr = (t, a, b) => cl((t - a) / (b - a));
const eOut = p => 1 - Math.pow(1 - p, 3);
const eIn = p => p * p * p;
const eIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const back = (p, s = 1.9) => { p = cl(p); return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
let SEED = 11;
const R = () => rng(SEED++);

// ---------- trazos a mano ----------
function seg(r, x1, y1, x2, y2, out) {        // recta con 9 tramos, comba en seno ±4 px, temblor ±0,6
  const n = 9, off = (r() * 2 - 1) * 4, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L, k = Math.min(1, L / 120);
  for (let i = out.length ? 1 : 0; i <= n; i++) {
    const u = i / n, b = Math.sin(Math.PI * u) * off * k, j = (i > 0 && i < n) ? 1 : 0;
    out.push([x1 + dx * u + nx * b + (r() * 2 - 1) * .6 * j, y1 + dy * u + ny * b + (r() * 2 - 1) * .6 * j]);
  }
  return out;
}
function mk(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; }
function line(x1, y1, x2, y2) { return mk(seg(R(), x1, y1, x2, y2, [])); }
function poly(ps, close) { const r = R(), o = []; const q = close ? ps.concat([ps[0]]) : ps; for (let i = 0; i < q.length - 1; i++) seg(r, q[i][0], q[i][1], q[i + 1][0], q[i + 1][1], o); return mk(o); }
function rrect(x, y, w, h, rad) {
  const r = R(), o = [];
  const arc = (cx, cy, a0) => { for (let i = 1; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; o.push([cx + Math.cos(a) * rad + (r() * 2 - 1) * .5, cy + Math.sin(a) * rad + (r() * 2 - 1) * .5]); } };
  seg(r, x + rad, y, x + w - rad, y, o); arc(x + w - rad, y + rad, -Math.PI / 2);
  seg(r, x + w, y + rad, x + w, y + h - rad, o); arc(x + w - rad, y + h - rad, 0);
  seg(r, x + w - rad, y + h, x + rad, y + h, o); arc(x + rad, y + h - rad, Math.PI / 2);
  seg(r, x, y + h - rad, x, y + rad, o); arc(x + rad, y + rad, Math.PI);
  o.push([o[0][0] + 6, o[0][1] + (r() - .5)]);  // pequeño solape al cerrar
  return mk(o);
}
function circ(cx, cy, rad, n = 56) {
  const r = R(), a0 = r() * 6.28, ph = r() * 6.28, o = [];
  for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI * 2 * 1.04, rr = rad * (1 + .03 * Math.sin(2 * a + ph)); o.push([cx + Math.cos(a) * rr + (r() * 2 - 1) * .6, cy + Math.sin(a) * rr + (r() * 2 - 1) * .6]); }
  return mk(o);
}
function curve(fn, n = 40) { const r = R(), o = []; for (let i = 0; i <= n; i++) { const p = fn(i / n); o.push([p[0] + (r() * 2 - 1) * .6, p[1] + (r() * 2 - 1) * .6]); } return mk(o); }
const bz = (a, b, c, d) => u => { const v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]; };
function chain(...fns) { return u => { const k = Math.min(fns.length - 1, Math.floor(u * fns.length)); return fns[k](u * fns.length - k); }; }

function st(c, s, p, col = LINE, w = 7, a = 1) {
  if (p <= 0 || a <= 0) return;
  const lim = s.L * cl(p), P = s.pts;
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) {
    if (s.cum[i] <= lim) c.lineTo(P[i][0], P[i][1]);
    else { const f = (lim - s.cum[i - 1]) / (s.cum[i] - s.cum[i - 1]); c.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); break; }
  }
  c.stroke(); c.restore();
}
function fillPath(c, s, col, a = 1) { c.save(); c.globalAlpha *= a; c.fillStyle = col; c.beginPath(); s.pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath(); c.fill(); c.restore(); }
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function scaled(c, cx, cy, s, fn) { c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy); fn(); c.restore(); }

// ---------- texto ----------
function txt(c, s, x, y, size, weight, col, align = 'center', ls = 0, a = 1) {
  c.save(); c.globalAlpha *= a; c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.letterSpacing = ls + 'px'; c.fillText(s, x, y); c.restore();
}
function writeText(c, s, x, y, size, weight, col, ls, t0, t, dur = .5, a = 1) {   // letras que se escriben en orden
  c.save(); c.font = `${weight} ${size}px ${FONT}`; c.letterSpacing = ls + 'px';
  const wTot = c.measureText(s).width; let cx = x - wTot / 2;
  for (let i = 0; i < s.length; i++) {
    const p = pr(t, t0 + i / s.length * dur, t0 + i / s.length * dur + .12);
    const cw = c.measureText(s[i]).width + ls;
    if (p > 0) txt(c, s[i], cx, y, size, weight, col, 'left', 0, a * p);
    cx += cw;
  }
  c.restore();
}

// ---------- titulares ----------
const HCACHE = {};
function headLayout(white, key) {
  const id = white + '|' + key; if (HCACHE[id]) return HCACHE[id];
  const size = 96, ls = -4 * size / 96, lh = 1.06 * size, maxW = 940;
  X.save(); X.font = `600 ${size}px ${FONT}`; X.letterSpacing = '0px';
  const words = []; white.split(' ').forEach(w => w && words.push([w, LINE])); words.push([key, Y]);
  const cw = ch => X.measureText(ch).width + ls;
  const wW = w => [...w].reduce((s, ch) => s + cw(ch), 0), sp = cw(' ');
  const lines = [[]]; let cur = 0;
  words.forEach(wd => { const ww = wW(wd[0]); if (lines[lines.length - 1].length && cur + sp + ww > maxW) { lines.push([]); cur = 0; } cur += (lines[lines.length - 1].length ? sp : 0) + ww; lines[lines.length - 1].push(wd); });
  const chars = [];
  lines.forEach((ln, li) => {
    const tot = ln.reduce((s, wd, i) => s + wW(wd[0]) + (i ? sp : 0), 0) - ls; let x = 540 - tot / 2; const y = 300 + .82 * size + li * lh;
    ln.forEach((wd, i) => { if (i) x += sp; [...wd[0]].forEach(ch => { chars.push({ ch, x, y, col: wd[1] }); x += cw(ch); }); });
  });
  X.restore();
  return (HCACHE[id] = { chars, size });
}
function headline(c, white, key, tIn, tOut, t) {
  if (t < tIn) return;
  const L = headLayout(white, key), q = tOut ? pr(t, tOut - .35, tOut) : 0;
  if (q >= 1) return;
  c.save(); c.font = `600 ${L.size}px ${FONT}`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  L.chars.forEach((o, i) => {
    const p = eOut(pr(t, tIn + i * .03, tIn + i * .03 + .32)); if (p <= 0) return;
    const a = p * (1 - q), bl = 16 * (1 - p) + 18 * q, dy = 22 * (1 - p) - 14 * q;
    c.globalAlpha = a; c.filter = bl > .3 ? `blur(${bl.toFixed(1)}px)` : 'none'; c.fillStyle = o.col; c.fillText(o.ch, o.x, o.y + dy);
  });
  c.restore();
}

// ---------- subtítulos ----------
function subtitles(c, t) {
  const PH = C.PH;
  for (let i = 0; i < 9; i++) {
    const [s, e] = PH[i], next = i < 8 ? PH[i + 1][0] : 1e9;
    const outEnd = Math.min(e + .35, next - .12), outStart = Math.min(e + .1, outEnd - .15);
    const a = pr(t, s - .1, s + .15) * (1 - pr(t, outStart, outEnd));
    if (a <= 0) continue;
    c.save(); c.font = `500 30px ${FONT}`; c.letterSpacing = '0px'; c.fillStyle = SUB; c.globalAlpha = a; c.textAlign = 'center';
    const words = GUION[i].split(' '), lines = [''];
    words.forEach(w => { const tryL = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (c.measureText(tryL).width > 820) lines.push(w); else lines[lines.length - 1] = tryL; });
    lines.forEach((l, k) => c.fillText(l, 540, 1490 + k * 41));
    c.restore();
  }
}

// ---------- mascota ----------
function dropPath(c) {
  c.beginPath(); c.moveTo(0, -200);
  c.bezierCurveTo(34, -200, 95, -112, 95, -72); c.bezierCurveTo(95, -26, 55, 0, 0, 0);
  c.bezierCurveTo(-55, 0, -95, -26, -95, -72); c.bezierCurveTo(-95, -112, -34, -200, 0, -200); c.closePath();
}
// cfg: {x0,x1,y,s,t0,look:[dx,dy] | fn, mood: fn(t)->'n'|'s'|'h', blinks:[t], bounce:[t], alpha}
function mascot(c, t, cfg) {
  if (t < cfg.t0) return;
  const u = pr(t, cfg.t0, cfg.t0 + .55), pos = u => lerp(cfg.x0, cfg.x1, eOut(cl(u)));
  const mood = cfg.mood ? cfg.mood(t) : 'n';
  let sx = 1, sy = 1, x = pos(u), y = cfg.y, s = cfg.s;
  if (u < 1) { sx = 1 + .07 * Math.sin(Math.PI * u); sy = 1 / sx; }
  const v = pr(t, cfg.t0 + .55, cfg.t0 + .9);
  if (v > 0 && v < 1) { const k = Math.sin(v * Math.PI * 2) * (1 - v) * .12; sy *= 1 - k; sx *= 1 + k; }
  const idle = t - cfg.t0 - .9;
  if (idle > 0) {
    if (mood === 'h') y -= 7 * Math.abs(Math.sin(idle * Math.PI * 1.4)); else x += 4 * Math.sin(idle * 2.2);
  }
  (cfg.bounce || []).forEach(b => { const p = pr(t, b, b + .45); if (p > 0 && p < 1) { y -= 26 * Math.sin(Math.PI * p); const k = p > .85 ? (p - .85) / .15 : 0; sy *= 1 - .1 * Math.sin(Math.PI * k); } });
  const al = cfg.alpha ? cfg.alpha(t) : 1; if (al <= 0) return;
  const look = typeof cfg.look === 'function' ? cfg.look(t) : (cfg.look || [0, 0]);
  if (u < 1) for (let g = 3; g >= 1; g--) { const gu = u - g * .07; if (gu > 0) drawDrop(c, pos(gu), y, s, sx, sy, look, mood, 1, .14 * al, true); }
  let bl = 1; (cfg.blinks || []).forEach(b => { const p = pr(t, b, b + .16); if (p > 0 && p < 1) bl = Math.min(bl, 1 - .88 * Math.sin(Math.PI * p)); });
  drawDrop(c, x, y, s, sx, sy, look, mood, bl, al, false);
}
function drawDrop(c, x, y, s, sx, sy, look, mood, blink, a, ghost) {
  c.save(); c.translate(x, y); c.scale(s * sx, s * sy); c.globalAlpha = a;
  const g = c.createLinearGradient(0, -200, 0, 0);
  g.addColorStop(0, '#FFDD66'); g.addColorStop(.45, '#FFC602'); g.addColorStop(.78, 'rgba(255,214,90,0.55)'); g.addColorStop(1, 'rgba(255,214,90,0)');
  c.fillStyle = g;
  if (!ghost) { c.save(); c.filter = `blur(${18 * s}px)`; c.globalAlpha = a * .85; dropPath(c); c.fill(); c.restore(); }
  c.save(); c.filter = `blur(${2.5 * s}px)`; dropPath(c); c.fill(); c.restore();
  if (!ghost) {
    const py = mood === 's' ? 4 : mood === 'h' ? -3 : 0;
    [-38, 38].forEach(ex => {
      c.save(); c.translate(ex, -120); c.scale(1, blink);
      c.fillStyle = EYE; c.beginPath(); c.arc(0, 0, 27, 0, 7); c.fill();
      if (blink > .4) { c.fillStyle = INK; c.beginPath(); c.arc(cl(look[0], -1, 1) * 8, cl(look[1], -1, 1) * 8 + py, 9, 0, 7); c.fill(); }
      c.restore();
      c.lineCap = 'round';
      if (mood === 's') { c.strokeStyle = 'rgba(40,40,40,.55)'; c.lineWidth = 5; c.beginPath(); c.moveTo(ex - Math.sign(ex) * 18, -160); c.lineTo(ex + Math.sign(ex) * 14, -150); c.stroke(); }
      else { c.strokeStyle = EYE; c.lineWidth = 5; c.beginPath(); c.arc(ex, -122, 40, Math.PI * 1.32, Math.PI * 1.68); c.stroke(); }
    });
  }
  c.restore();
}

// ---------- muñecos de palo ----------
function stick(c, x, y, s, o = {}) {
  const col = o.col || LINE, a = o.a == null ? 1 : o.a, ph = o.walk;
  if (a <= 0) return;
  const sw = ph == null ? 0 : Math.sin(ph), bob = ph == null ? 0 : -5 * Math.abs(Math.cos(ph));
  c.save(); c.translate(x, y + bob * s); c.scale(s, s); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.arc(0, -190, 26, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(0, -164); c.lineTo(0, -70);
  c.moveTo(0, -70); c.lineTo(22 * sw + (ph == null ? -20 : 0), 0); c.moveTo(0, -70); c.lineTo(-22 * sw + (ph == null ? 20 : 0), 0);
  c.moveTo(0, -140); c.lineTo(-26 - 14 * sw, -92);
  const hx = o.phone ? 26 : 26 + 14 * sw, hy = o.phone ? -112 : -92;
  c.moveTo(0, -140); c.lineTo(hx, hy); c.stroke();
  c.fillStyle = col; c.beginPath(); c.arc(-9, -194, 3.2, 0, 7); c.arc(9, -194, 3.2, 0, 7); c.fill();
  c.lineWidth = 4; c.beginPath();
  if (o.mood === 's') c.arc(0, -168, 9, Math.PI * 1.2, Math.PI * 1.8); else if (o.mood === 'h') c.arc(0, -184, 9, Math.PI * .2, Math.PI * .8); else { c.moveTo(-7, -177); c.lineTo(7, -177); }
  c.stroke();
  if (o.phone) {
    c.save(); c.translate(hx + 4, hy - 8); c.rotate(-.25);
    c.lineWidth = 4; rr(c, -9, -16, 18, 30, 4); c.stroke();
    c.globalAlpha *= .5 + .5 * (.5 + .5 * Math.sin((o.t || 0) * 5 + x * .01)); c.fillStyle = Y; rr(c, -6, -13, 12, 24, 2); c.fill();
    c.restore();
  }
  c.restore();
}
function grow(t, t0) { return t < t0 ? 0 : .6 + .4 * back(pr(t, t0, t0 + .35)); }

// ---------- vídeo real ----------
const FR = {};
Object.keys(window.CLIPS).forEach(k => { FR[k] = []; for (let i = 0; i < CLIPS[k]; i++) { const im = new Image(); im.src = `assets/clips/${k}/${String(i).padStart(3, '0')}.jpg`; FR[k].push(im); } });
function frame(k, vt) { const a = FR[k]; return a[cl(Math.floor(vt * 30), 0, a.length - 1)]; }
function cover(c, im, x, y, w, h, zoom = 1) {
  if (!im || !im.complete || !im.naturalWidth) return;
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * zoom, iw = im.naturalWidth * s, ih = im.naturalHeight * s;
  c.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
// vídeo dentro de un marco: clip = función que traza la forma interior; revela desde el centro con máscara circular
function video(c, k, vt, clip, bx, by, bw, bh, tReveal, t, a = 1, zoom = 1) {
  const p = eOut(pr(t, tReveal, tReveal + .4)); if (p <= 0 || a <= 0) return;
  c.save(); c.globalAlpha *= a; clip(c); c.clip();
  const cx = bx + bw / 2, cy = by + bh / 2; c.beginPath(); c.arc(cx, cy, Math.hypot(bw, bh) / 2 * p + 1, 0, 7); c.clip();
  c.fillStyle = BG; c.fillRect(bx, by, bw, bh);
  if (p < 1) c.filter = `blur(${(12 * (1 - p)).toFixed(1)}px)`;
  cover(c, frame(k, vt), bx, by, bw, bh, zoom);
  c.restore();
}

// ====================== ESCENAS ======================
const S = C.S, END = C.END;
const sceneEnd = i => i < 8 ? S[i + 1] : END + 1;

// ---- E1: calendario ----
function calendar(ox, oy) {
  const o = { frame: rrect(ox, oy, 580, 480, 18), head: line(ox + 4, oy + 92, ox + 576, oy + 92),
    rings: [rrect(ox + 118, oy - 30, 24, 60, 12), rrect(ox + 438, oy - 30, 24, 60, 12)], cells: [] };
  const gx = ox + (580 - 488) / 2, gy = oy + 92 + 42;
  for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) o.cells.push({ x: gx + k * 102, y: gy + r * 82, s: rrect(gx + k * 102, gy + r * 82, 80, 58, 8) });
  return o;
}
const CAL1 = calendar(250, 650);
const FILL1 = [0, 2, 6, 8, 11, 13], EMPTY1 = [13, 11, 8, 6];
function drawCalendar(c, cal, t, t0, fills, empties) {
  st(c, cal.frame, pr(t, t0, t0 + .55));
  st(c, cal.head, pr(t, t0 + .3, t0 + .55));
  cal.rings.forEach((r, i) => st(c, r, pr(t, t0 + .4 + i * .08, t0 + .65 + i * .08), LINE, 6));
  cal.cells.forEach((cell, i) => {
    const e = empties.find(q => q.i === i), gray = e ? pr(t, e.t, e.t + .2) : 0;
    st(c, cell.s, pr(t, t0 + .45 + i * .02, t0 + .75 + i * .02), gray > 0 ? mix(LINE, G6, gray) : LINE, 5);
    const f = fills.find(q => q.i === i);
    if (f && t > f.t) {
      let sc = back(pr(t, f.t, f.t + .3)); if (e) sc *= 1 - eIn(pr(t, e.t, e.t + .2));
      if (sc > 0) scaled(c, cell.x + 40, cell.y + 29, sc, () => { c.fillStyle = Y; rr(c, cell.x + 6, cell.y + 6, 68, 46, 6); c.fill(); });
    }
  });
}
function mix(a, b, p) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], p))).join(',')})`; }
function E1(c, t) {
  const t0 = .3, fills = FILL1.map((i, k) => ({ i, t: C.e1_pac + k * .08 })), emp = EMPTY1.map((i, k) => ({ i, t: C.e1_pierde + .15 + k * .14 }));
  drawCalendar(c, CAL1, t, t0, fills, emp);
}
function E1top(c, t) {
  mascot(c, t, { x0: 1250, x1: 905, y: 1330, s: .62, t0: C.e1_clin, look: [-1, .1], mood: t => t > C.e1_pierde + .5 ? 's' : 'n', blinks: [C.e1_clin + 1.0] });
}

// ---- E2: móvil sin llamadas ----
const PHONE = rrect(330, 620, 420, 760, 48), PHONE_SPK = line(500, 650, 580, 650);
function E2(c, t) {
  const s = S[1];
  st(c, PHONE, pr(t, s + .2, s + .85)); st(c, PHONE_SPK, pr(t, s + .8, s + 1.0), LINE, 5);
  video(c, 'e2_mostrador', t - (s + .65), c2 => { rr(c2, 343, 633, 394, 734, 36); }, 343, 633, 394, 734, s + .2 + .65 * .7, t, 1, 1 + .06 * pr(t, s, sceneEnd(1)));
  // notificación que no llega (dos intentos)
  [[C.e2_nunca, 1], [C.e2_nunca + .45, .6]].forEach(([tn, k]) => {
    const p = pr(t, tn, tn + .35); if (p <= 0 || p >= 1) return;
    const sc = p < .4 ? .3 * eOut(p / .4) : .3 * (1 - eIn((p - .4) / .6));
    c.save(); c.globalAlpha = k; c.fillStyle = Y; c.beginPath(); c.arc(728, 642, 34 * sc / .3 * .5 + 2, 0, 7); c.fill(); c.restore();
  });
  // puntos suspensivos sobre el móvil
  const d0 = C.e2_llam; if (t > d0) for (let i = 0; i < 3; i++) {
    const p = pr(t, d0 + i * .1, d0 + i * .1 + .25), out = 1 - pr(t, d0 + 1.0, d0 + 1.4);
    const pulse = 1 + .25 * Math.sin((t - d0) * 9 - i);
    c.save(); c.globalAlpha = eOut(p) * out; c.fillStyle = LINE; c.beginPath(); c.arc(500 + i * 40, 590 - 0, 9 * pulse, 0, 7); c.fill(); c.restore();
  }
}
function E2top(c, t) {
  mascot(c, t, { x0: -200, x1: 185, y: 1216, s: .6, t0: S[1] + .25, look: [1, -.4], mood: t => t > C.PH[1][1] - .2 ? 's' : 'n', blinks: [S[1] + 1.6] });
}

// ---- E3: búsqueda, multitud, tarjetas ----
const BAR = rrect(170, 640, 740, 100, 50), LUPA = circ(232, 684, 20), LUPA_H = line(247, 699, 262, 714);
const CROWD = (() => { const r = rng(77), o = [];
  for (let i = 0; i < 8; i++) o.push({ x: 140 + i * 115 + r() * 20, y: 1010, s: .5, col: G9, a: .4, d: r() * .8 });
  for (let i = 0; i < 6; i++) o.push({ x: 175 + i * 146 + r() * 20, y: 1110, s: .7, col: G9, a: .7, d: r() * .8 });
  for (let i = 0; i < 5; i++) o.push({ x: 160 + i * 190 + r() * 16, y: 1210, s: .95, col: LINE, a: 1, d: r() * .8 });
  return o; })();
const CARDS = [0, 1, 2].map(i => { const x = 370, y = 680 + i * 230; return { x, y, f: rrect(x, y, 340, 200, 18), house: poly([[x + 34, y + 120], [x + 34, y + 160], [x + 104, y + 160], [x + 104, y + 120]]), roof: poly([[x + 26, y + 124], [x + 69, y + 82], [x + 112, y + 124]]), b1: line(x + 140, y + 92, x + 300, y + 92), b2: line(x + 140, y + 130, x + 250, y + 130), border: rrect(x - 3, y - 3, 346, 206, 20) }; });
const CHECK3 = poly([[-16, 0], [-4, 13], [18, -12]]);
function E3(c, t) {
  const s = S[2], cmp = C.e3_comp, el = C.e3_eligen, fadeA = 1 - pr(t, cmp - .1, cmp + .25);
  if (fadeA > 0) {
    c.save(); c.globalAlpha = fadeA;
    st(c, BAR, pr(t, s + .2, s + .75)); st(c, LUPA, pr(t, s + .55, s + .8), LINE, 6); st(c, LUPA_H, pr(t, s + .78, s + .88), LINE, 6);
    const q = 'injerto capilar', n = Math.floor(pr(t, s + .6, s + 1.7) * q.length);
    c.font = `500 42px ${FONT}`; c.letterSpacing = '0px'; c.fillStyle = LINE; c.textAlign = 'left'; c.fillText(q.slice(0, n), 282, 705);
    if (t > s + .55 && Math.floor((t - s) * 2.4) % 2 === 0) { const wq = c.measureText(q.slice(0, n)).width; c.fillRect(288 + wq, 666, 4, 50); }
    CROWD.forEach(f => { const g = grow(t, s + .7 + f.d); if (g > 0) stick(c, f.x, f.y, f.s * g, { col: f.col, a: f.a, phone: true, t, mood: 'n' }); });
    c.restore();
  }
  CARDS.forEach((cd, i) => {
    const t0 = cmp + i * .12; if (t < t0) return;
    const pin = eOut(pr(t, t0, t0 + .45)), win = i === 0 ? eOut(pr(t, el, el + .35)) : 0, dim = i ? 1 - .65 * pr(t, el, el + .35) : 1;
    c.save(); c.globalAlpha = pin * dim; c.translate(0, 70 * (1 - pin));
    scaled(c, cd.x + 170, cd.y + 100, 1 + .06 * win, () => {
      st(c, cd.f, pr(t, t0, t0 + .5)); st(c, cd.house, pr(t, t0 + .25, t0 + .5), LINE, 5); st(c, cd.roof, pr(t, t0 + .35, t0 + .55), LINE, 5);
      st(c, cd.b1, pr(t, t0 + .4, t0 + .6), G5, 12); st(c, cd.b2, pr(t, t0 + .5, t0 + .7), G5, 12);
      if (i === 0 && win > 0) st(c, cd.border, pr(t, el, el + .35), Y, 6);
      if (i === 2 && t > el + .2) writeText(c, 'TU CLÍNICA', cd.x + 170, cd.y - 14, 20, 700, G9, 3, el + .2, t, .4);
      if (i === 0) { const p = back(pr(t, C.e3_prim, C.e3_prim + .3)); if (p > 0) scaled(c, cd.x + 340, cd.y, p, () => {
        c.fillStyle = Y; c.beginPath(); c.arc(cd.x + 340, cd.y, 34, 0, 7); c.fill();
        c.save(); c.translate(cd.x + 340, cd.y); st(c, CHECK3, pr(t, C.e3_prim + .12, C.e3_prim + .4), INK, 7); c.restore(); }); }
    });
    c.restore();
  });
}
function E3top(c, t) {
  mascot(c, t, { x0: -200, x1: 175, y: 1340, s: .5, t0: C.e3_prim - .2, look: [1, -.3], mood: t => t > C.e3_prim + .6 ? 's' : 'n', blinks: [C.e3_prim + .9] });
}

// ---- E4: pacientes que se van ----
const GROUND4 = line(-40, 1210, 1120, 1210);
function clinic(x, y, w, h, roofH) {
  return { body: poly([[x, y + h], [x, y + roofH], [x + w, y + roofH], [x + w, y + h]]), roof: poly([[x - 14, y + roofH + 6], [x + w / 2, y], [x + w + 14, y + roofH + 6]]) };
}
const CL4 = clinic(70, 850, 250, 360, 90), DOOR4 = poly([[165, 1210], [165, 1118], [225, 1118], [225, 1210]]);
const OTHER = poly([[800, 1210], [800, 950], [1040, 950], [1040, 1210]]), OTHER_R = poly([[788, 956], [920, 870], [1052, 956]]);
const TAG = poly([[-90, -80], [130, -80], [130, 80], [-90, 80], [-130, 0]], true);
function E4(c, t) {
  const s = S[3];
  st(c, GROUND4, pr(t, s + .15, s + .75), LINE, 8);
  st(c, CL4.body, pr(t, s + .3, s + .9)); st(c, CL4.roof, pr(t, s + .6, s + 1.0), LINE, 8); st(c, DOOR4, pr(t, s + .85, s + 1.1), LINE, 5);
  if (t > s + .9) writeText(c, 'TU CLÍNICA', 195, 990, 22, 700, LINE, 3, s + .9, t, .45);
  // otra clínica (discontinua)
  if (t > C.e4_otra - .1) { c.save(); c.setLineDash([10, 14]); st(c, OTHER, pr(t, C.e4_otra - .1, C.e4_otra + .5), G6, 7); st(c, OTHER_R, pr(t, C.e4_otra + .3, C.e4_otra + .6), G6, 7); c.restore(); }
  [0, 1, 2, 3].forEach(i => {
    const t0 = C.e4_cada + i * .22; if (t < t0 - .3) return;
    const x = 470 + i * 100 + Math.max(0, t - t0) * 135, fa = 1 - pr(x, 870, 960);
    if (fa <= 0) return;
    const g = grow(t, t0 - .3);
    stick(c, x, 1210, .6 * g, { walk: t > t0 ? (t - t0) * 9 + i : null, phone: true, t, a: fa, mood: 'n' });
    const tp = pr(t, C.e4_miles + i * .1, C.e4_miles + i * .1 + .3);
    if (tp > 0) {
      const lit = pr(x, 800, 840);
      c.save(); c.translate(x, 1210 - .6 * 230 - 36); c.scale(.3 * back(tp), .3 * back(tp)); c.globalAlpha = fa;
      if (lit > 0) { c.globalAlpha = fa * lit; fillPath(c, TAG, Y); }
      st(c, TAG, 1, lit > .5 ? Y : LINE, 7 / .3 * .6);
      txt(c, '€', 0, 38, 110, 700, lit > .5 ? INK : LINE, 'center');
      c.restore();
    }
  });
}
function E4top(c, t) {
  mascot(c, t, { x0: -200, x1: 405, y: 1216, s: .52, t0: S[3] + .35, look: [1, 0], mood: () => 's', blinks: [C.e4_miles + .4] });
}

// ---- E5: no es tu clínica / boca a boca ----
const GROUND5 = line(-40, 1210, 1120, 1210);
const CL5 = clinic(320, 720, 440, 490, 120);
const WIN5 = [rrect(350, 930, 150, 150, 10), rrect(590, 930, 150, 150, 10)], DOOR5 = poly([[510, 1210], [510, 1100], [580, 1100], [580, 1210]]);
const CHECK5 = poly([[-24, 0], [-6, 20], [28, -18]]);
const AXY = line(200, 700, 200, 1180), AXX = line(200, 1180, 880, 1180);
const ZIG = (() => { const r = rng(5), p = []; for (let i = 0; i < 10; i++) p.push([235 + i * 62, 1110 - r() * 330 - (i % 2 ? 0 : 40)]); return poly(p); })();
const BUBBLE = rrect(-60, -40, 120, 80, 22);
function E5(c, t) {
  const s = S[4], es = C.e5_es, fA = 1 - pr(t, es - .25, es + .05);
  st(c, GROUND5, pr(t, s + .1, s + .7), LINE, 8);
  if (fA > 0) {
    c.save(); c.globalAlpha = fA;
    st(c, CL5.body, pr(t, s + .25, s + .9)); st(c, CL5.roof, pr(t, s + .55, s + 1.0), LINE, 8);
    if (t > s + .85) writeText(c, 'TU CLÍNICA', 540, 895, 24, 700, LINE, 3, s + .85, t, .45);
    WIN5.forEach((wn, i) => {
      const t0 = s + .8 + i * .15; st(c, wn, pr(t, t0, t0 + .5), LINE, 6);
      const vx = 359 + i * 240;
      video(c, i ? 'e5_recepcion' : 'e5_medico', t - (t0 + .35), c2 => rr(c2, vx, 939, 132, 132, 6), vx, 939, 132, 132, t0 + .35, t);
    });
    st(c, DOOR5, pr(t, s + 1.1, s + 1.35), LINE, 5);
    const pc = back(pr(t, C.e5_clin, C.e5_clin + .3));
    if (pc > 0) scaled(c, 855, 736, pc, () => { c.fillStyle = Y; c.beginPath(); c.arc(855, 736, 62, 0, 7); c.fill(); c.save(); c.translate(855, 738); st(c, CHECK5, pr(t, C.e5_clin + .15, C.e5_clin + .45), INK, 9); c.restore(); });
    c.restore();
  }
  // boca a boca
  const bb = C.e5_boca, fB = pr(t, es, es + .25) * (1 - pr(t, bb + .05, bb + .35));
  if (fB > 0) {
    stick(c, 360, 1210, .95 * grow(t, es), { a: fB, mood: 'n' });
    stick(c, 720, 1210, .95 * grow(t, es + .1), { a: fB, mood: 'n' });
    const p = eIO(pr(t, es + .3, bb - .05));
    if (p > 0 && p < 1) { const bx = lerp(390, 690, p), by = 930 - Math.sin(Math.PI * p) * 120; c.save(); c.globalAlpha = fB; c.translate(bx, by); st(c, BUBBLE, 1, LINE, 6); c.restore(); }
  }
  if (t > bb) {
    st(c, AXY, pr(t, bb + .05, bb + .35)); st(c, AXX, pr(t, bb + .2, bb + .5));
    st(c, ZIG, pr(t, bb + .25, bb + .7), Y, 7);
    const q = back(pr(t, bb + .7, bb + .95)); if (q > 0) { const e = ZIG.pts[ZIG.pts.length - 1]; scaled(c, e[0] + 70, e[1] - 10, q, () => txt(c, '?', e[0] + 70, e[1] + 25, 96, 700, LINE)); }
  }
}
function E5top(c, t) {
  const es = C.e5_es;
  mascot(c, t, { x0: -200, x1: 185, y: 1216, s: .6, t0: S[4] + .5, look: [1, -.5], mood: t => t > C.e5_clin + .2 ? 'h' : 'n', blinks: [S[4] + 1.5], alpha: t => 1 - pr(t, es - .25, es + .05), bounce: [C.e5_clin + .15] });
  mascot(c, t, { x0: 1250, x1: 905, y: 1216, s: .5, t0: es + .1, look: t => [Math.sin((t - es) * 2.2) > 0 ? -1 : -.2, -.3], mood: () => 'n', blinks: [C.e5_boca + .6] });
}

// ---- E6: solo capilares ----
const ICX = [105, 285, 465, 645, 825].map(x => x + 75), ICY = 955;
const CARD6 = ICX.map(x => rrect(x - 75, ICY - 75, 150, 150, 24));
const ICONS = [
  [curve(chain(bz([-28, -22], [-30, -44], [-6, -40], [0, -32]), bz([0, -32], [6, -40], [30, -44], [28, -22]), bz([28, -22], [26, 0], [18, 10], [14, 36]), bz([14, 36], [8, 40], [4, 20], [0, 14]), bz([0, 14], [-4, 20], [-8, 40], [-14, 36]), bz([-14, 36], [-18, 10], [-26, 0], [-28, -22])), 60)],
  [curve(chain(bz([-40, 0], [-20, -28], [20, -28], [40, 0]), bz([40, 0], [20, 28], [-20, 28], [-40, 0])), 40), circ(0, 0, 11, 30)],
  [curve(chain(bz([0, 32], [-26, 12], [-38, -4], [-34, -18]), bz([-34, -18], [-30, -36], [-6, -38], [0, -20]), bz([0, -20], [6, -38], [30, -36], [34, -18]), bz([34, -18], [38, -4], [26, 12], [0, 32])), 60)],
  [curve(chain(bz([-30, 30], [-34, -10], [0, -36], [32, -32]), bz([32, -32], [34, 0], [10, 34], [-30, 30])), 40), line(-30, 30, 14, -12)],
  [curve(bz([4, -42], [-14, -20], [16, 0], [0, 22]), 30), circ(0, 30, 10, 28), line(-8, 40, -16, 48), line(8, 40, 16, 48)],
];
function E6(c, t) {
  const so = C.e6_solo, ca = C.e6_cap, mv = eIO(pr(t, ca, ca + .3));
  ICX.forEach((x, i) => {
    const t0 = so - .15 + i * .08, foll = i === 4;
    const a = foll ? 1 : 1 - pr(t, ca, ca + .3);
    if (a <= 0 || t < t0) return;
    c.save(); c.globalAlpha = a * eOut(pr(t, t0, t0 + .2));
    st(c, CARD6[i], pr(t, t0, t0 + .45), LINE, 6, foll ? 1 - pr(t, ca, ca + .3) : 1);
    let cx = x, cy = ICY, sc = 1;
    if (foll) { cx = lerp(x, 540, mv); cy = lerp(ICY, 960, mv); sc = lerp(1, 2.2, mv); const sm = eIO(pr(t, ca + .45, ca + .75)); cx = lerp(cx, 540, sm); cy = lerp(cy, 1118, sm); sc = lerp(sc, .8, sm); }
    c.translate(cx, cy); c.scale(sc, sc);
    ICONS[i].forEach((ic, k) => st(c, ic, pr(t, t0 + .2 + k * .1, t0 + .55 + k * .1), LINE, 6 / Math.max(1, sc * .8)));
    c.restore();
  });
  if (t > ca + .2) {
    const ring = CIRC6; const pp = pr(t, ca + .2, ca + .5);
    video(c, 'e6_medico', t - (ca + .4), c2 => { c2.beginPath(); c2.arc(540, 960, 150, 0, 7); }, 390, 810, 300, 300, ca + .4, t);
    st(c, ring, pp, Y, 8);
    if (t > ca + .45) { // folículo encima como adorno, dibujado de nuevo para que quede por delante del vídeo
      const sm = eIO(pr(t, ca + .45, ca + .75)); c.save(); c.translate(540, lerp(960, 1118, sm)); c.scale(lerp(2.2, .8, sm), lerp(2.2, .8, sm));
      c.fillStyle = BG; c.beginPath(); c.arc(0, 0, 50, 0, 7); c.globalAlpha = sm; c.fill(); c.globalAlpha = 1;
      ICONS[4].forEach(ic => st(c, ic, 1, LINE, 6)); c.restore();
    }
  }
}
const CIRC6 = circ(540, 960, 160, 64);
function E6top(c, t) {
  mascot(c, t, { x0: 1250, x1: 880, y: 1400, s: .55, t0: S[5] + .3, look: [-1, -.6], mood: () => 'h', blinks: [S[5] + 1.3], bounce: [C.e6_cap + .9] });
}

// ---- E7: un sistema ----
function gear(cx, cy, r, n) {
  const h = r * .2, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, d = Math.PI * 2 / n;
    [[0, r], [.12, r], [.22, r + h], [.48, r + h], [.58, r]].forEach(([f, rad]) => pts.push([cx + Math.cos(a + f * d) * rad, cy + Math.sin(a + f * d) * rad])); }
  return poly(pts, true);
}
const GEARS = [{ cx: 540, cy: 900, r: 150, n: 12, col: Y, sp: 1 }, { cx: 300, cy: 1100, r: 90, n: 9, col: LINE, sp: -1.62 }, { cx: 790, cy: 1120, r: 100, n: 10, col: LINE, sp: -1.47 }]
  .map(g => ({ ...g, s: gear(0, 0, g.r, g.n), hub: circ(0, 0, g.r * .32, 36) }));
const CAL7 = calendar(0, 0);
function E7(c, t) {
  const s = S[6], sy = C.e7_sis, pa = C.e7_pac, ag = C.e7_agenda;
  const shrink = eIO(pr(t, pa - .1, pa + .5));
  c.save(); c.translate(540, 1000); c.scale(1 - .4 * shrink, 1 - .4 * shrink); c.translate(-540, -1000 - 330 * shrink);
  GEARS.forEach((g, i) => {
    const t0 = sy - .15 + i * .12; if (t < t0) return;
    const pop = back(pr(t, t0, t0 + .4)), rot = Math.max(0, t - t0) * .9 * g.sp;
    c.save(); c.translate(g.cx, g.cy); c.scale(pop, pop); c.rotate(rot);
    st(c, g.s, pr(t, t0, t0 + .6), g.col, 7);
    if (i === 0) {
      const vs = sy + .35, ve = vs + 2.7, hubA = 1 - pr(t, vs, vs + .3) + pr(t, ve - .3, ve);
      c.rotate(-rot);
      video(c, 'e7_tablet', t - vs, c2 => { c2.beginPath(); c2.arc(0, 0, 66, 0, 7); }, -66, -66, 132, 132, vs, t, 1 - pr(t, ve - .3, ve));
      if (hubA > 0) { c.globalAlpha = cl(hubA) * eOut(pr(t, t0 + .3, t0 + .6)); c.fillStyle = Y; c.beginPath(); c.arc(0, 0, 48, 0, 7); c.fill(); c.globalAlpha = 1; }
      st(c, circ7, pr(t, t0 + .3, t0 + .6), Y, 6);
    } else st(c, g.hub, pr(t, t0 + .3, t0 + .6), g.col, 6);
    c.restore();
  });
  c.restore();
  // paciente que camina hasta la agenda
  if (t > pa - .1) {
    const p = pr(t, pa, ag - .1), x = lerp(-80, 470, p);
    stick(c, x, 1250, .7 * grow(t, pa - .1), { walk: p < 1 ? (t - pa) * 9 : null, phone: true, t, mood: p >= 1 ? 'h' : 'n' });
  }
  const c0 = pa + .6; if (t > c0) {
    c.save(); c.translate(600, 900); c.scale(.7, .7);
    drawCalendar(c, CAL7, t, c0, [{ i: 7, t: ag }], []);
    c.restore();
  }
}
const circ7 = circ(0, 0, 70, 40);
function E7top(c, t) {
  mascot(c, t, { x0: 540, x1: 540, y: 1400, s: .5, t0: S[6] + .3, look: [0, -1], mood: () => 'h', blinks: [S[6] + 1.2, C.e7_agenda + .3], alpha: t => pr(t, S[6] + .3, S[6] + .6) });
}

// ---- E8: garantía ----
const MONTHS = [0, 1, 2].map(i => rrect(170 + i * 260, 640, 220, 140, 18));
const DOTS = []; for (let r = 0; r < 5; r++) for (let k = 0; k < 6; k++) DOTS.push({ x: 310 + k * 92, y: 880 + r * 92, s: circ(310 + k * 92, 880 + r * 92, 22, 28) });
const SHIELD = curve(chain(bz([0, -130], [40, -110], [80, -112], [105, -118]), bz([105, -118], [110, -40], [100, 60], [0, 135]), bz([0, 135], [-100, 60], [-110, -40], [-105, -118]), bz([-105, -118], [-80, -112], [-40, -110], [0, -130])), 80);
const CHECK8 = poly([[-44, 0], [-12, 32], [48, -34]]);
function E8(c, t) {
  const tr = C.e8_tres, tt = C.e8_treinta, ce = C.e8_cual_e, sn = C.e8_sin;
  MONTHS.forEach((m, i) => st(c, m, pr(t, tr + i * .15, tr + .5 + i * .15)));
  const dim = 1 - .6 * pr(t, sn, sn + .3);
  DOTS.forEach((d, i) => {
    st(c, d.s, pr(t, tr + .4 + i * .015, tr + .7 + i * .015), LINE, 4, dim);
    const tf = tt + i / 29 * (ce - tt - .1); const p = back(pr(t, tf, tf + .25));
    if (p > 0) { c.save(); c.globalAlpha = dim; c.fillStyle = Y; c.beginPath(); c.arc(d.x, d.y, 22 * p, 0, 7); c.fill(); c.restore(); }
  });
  if (t > sn - .05) {
    c.save(); c.translate(540, 1064);
    const a = pr(t, sn - .05, sn + .15); c.globalAlpha = a; fillPath(c, SHIELD, BG); c.globalAlpha = 1;
    st(c, SHIELD, pr(t, sn - .05, sn + .35), LINE, 8);
    st(c, CHECK8, pr(t, sn + .35, sn + .6), Y, 12);
    const pu = pr(t, sn + .5, sn + 1.3); if (pu > 0 && pu < 1) { c.strokeStyle = Y; c.globalAlpha = .8 * (1 - pu); c.lineWidth = 6; c.beginPath(); c.arc(0, 0, lerp(140, 280, eOut(pu)), 0, 7); c.stroke(); }
    c.restore();
  }
}
function E8top(c, t) {
  mascot(c, t, { x0: 1250, x1: 890, y: 1400, s: .55, t0: S[7] + .3, look: [-1, -.5], mood: () => 'h', blinks: [S[7] + 1.4, C.e8_cual_e], bounce: [C.e8_sin + .4] });
}

// ---- E9: CTA ----
const ARROW = line(540, 1100, 540, 1290), ARROWH = poly([[505, 1252], [540, 1292], [575, 1252]]);
function E9bg(c, t) {
  const s = S[8], k = pr(t, s + 2.4, s + 2.8);
  c.save(); c.filter = 'blur(40px)';
  if (k < 1) { c.globalAlpha = 1 - k; cover(c, frame('e9_fondo_a', t - s), -60, -60, W + 120, H + 120); }
  if (k > 0) { c.globalAlpha = k; cover(c, frame('e9_fondo_b', t - s - 2.4), -60, -60, W + 120, H + 120); }
  c.restore(); c.fillStyle = 'rgba(10,10,10,.82)'; c.fillRect(0, 0, W, H);
}
function E9(c, t) {
  const ca = C.e9_calc, en = C.e9_en;
  if (t > ca) {
    const p = back(pr(t, ca, ca + .4)), pulse = t > ca + .4 ? 1 + .025 * Math.sin((t - ca - .4) * Math.PI * 2 * 4) : 1;
    scaled(c, 540, 960, p * pulse, () => { c.fillStyle = Y; rr(c, 220, 890, 640, 140, 70); c.fill(); txt(c, 'Calcula tu potencial', 540, 978, 50, 600, INK, 'center', -1); });
  }
  if (t > en) {
    const bo = t > en + .45 ? 14 * Math.sin((t - en - .45) * Math.PI * 2 * 5) : 0;
    c.save(); c.translate(0, bo); st(c, ARROW, pr(t, en, en + .3)); st(c, ARROWH, pr(t, en + .25, en + .45)); c.restore();
  }
}
function E9top(c, t) {
  mascot(c, t, { x0: 1250, x1: 860, y: 1330, s: .5, t0: S[8] + .35, look: [-1, -1], mood: () => 'h', blinks: [C.e9_calc + .8] });
}

// ---------- titulares por escena ----------
const HEADS = [
  [0, '¿Cuántos pacientes', 'pierde?', () => S[0] + .3, () => S[1]],
  [1, 'Nunca llegan', 'a llamarte', () => S[1] + .3, () => S[2]],
  [2, 'La que aparece', 'primero', () => S[2] + .3, () => S[3]],
  [3, 'Miles de', 'euros', () => S[3] + .3, () => S[4]],
  [4, 'No es tu', 'clínica', () => S[4] + .3, () => C.e5_es - .1],
  [4, 'Boca a', 'boca', () => C.e5_es - .1, () => S[5]],
  [5, 'Solo clínicas', 'capilares', () => S[5] + .3, () => S[6]],
  [6, 'Un', 'sistema', () => S[6] + .3, () => S[7]],
  [7, 'Seguimos sin', 'cobrarte', () => C.e8_seg, () => S[8]],
  [8, 'Calcula tu', 'potencial', () => S[8] + .3, () => null],
];
const SCENES = [[E1, E1top], [E2, E2top], [E3, E3top], [E4, E4top], [E5, E5top], [E6, E6top], [E7, E7top], [E8, E8top], [E9, E9top]];

function drawScene(c, i, t) {
  const s = S[i], e = sceneEnd(i), lt = (t - s) / Math.max(1, e - s), dir = i % 2 ? -1 : 1;
  c.clearRect(0, 0, W, H);
  if (i === 8) E9bg(c, t);
  c.save();
  const z = 1 + .05 * cl(lt), dx = dir * 18 * Math.sin(cl(lt) * Math.PI / 2);
  c.translate(540, 960); c.scale(z, z); c.translate(-540 + dx, -960);
  SCENES[i][0](c, t); SCENES[i][1](c, t);
  c.restore();
  HEADS.filter(h => h[0] === i).forEach(h => {
    const tin = h[3](), tout = h[4]();
    // la salida del 1.º titular de E5 ocurre justo antes de que entre el 2.º
    headline(c, h[1], h[2], tin, tout && i === 4 && h[2] === 'clínica' ? tout : (tout != null ? tout : null), t);
  });
}

function render(t) {
  t = cl(t, 0, END);
  X.setTransform(1, 0, 0, 1, 0, 0); X.filter = 'none'; X.globalAlpha = 1;
  X.fillStyle = BG; X.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {
    const s = S[i], e = sceneEnd(i);
    if (t < s - .2 || t > e + .2) continue;
    let a = 1, bl = 0, z = 1;
    if (i > 0 && t < s + .2) { const p = pr(t, s - .2, s + .2); a = p; bl = 22 * (1 - p); z = 1.06 - .06 * eOut(p); }
    if (i < 8 && t > e - .2) { const p = pr(t, e - .2, e + .2); a = Math.min(a, 1 - p); bl = Math.max(bl, 22 * p); z = 1 - .04 * eIn(p); }
    if (a <= 0) continue;
    drawScene(LX, i, t);
    X.save(); X.globalAlpha = a; if (bl > .3) X.filter = `blur(${bl.toFixed(1)}px)`;
    X.translate(540, 960); X.scale(z, z); X.translate(-540, -960); X.drawImage(layer, 0, 0); X.restore();
  }
  if (!(window.__hfVariables && window.__hfVariables.subs === false)) subtitles(X, t);
}
window.__render = render;
})();
