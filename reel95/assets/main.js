// Reel "Todavía no" (regla 95:5). render(t) es función pura del tiempo; desenfoque de movimiento por acumulación.
(function () {
'use strict';
const BG = '#0B0B0C', CARD = '#161618', EDGE = '#2A2A2E', TXT = '#F5F5F2', SUB = '#8C8C92', Y = '#FFC602', YD = '#8A6A00', RED = '#FF4D4D', NIGHT = '#10131C';
const W = 1080, H = 1920, F = 'InterX', FPS = 30, FR = 1 / FPS;
const cv = document.getElementById('cv'), X = cv.getContext('2d');
const mkc = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const LAY = mkc(), LX = LAY.getContext('2d'), ACC = mkc(), AX = ACC.getContext('2d'), TMP = mkc(), TX = TMP.getContext('2d');

// ---------- curvas ----------
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pr = (t, a, b) => b === a ? (t >= a ? 1 : 0) : cl((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
function bez(x1, y1, x2, y2) { return x => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, u = .5; for (let i = 0; i < 24; i++) { u = (lo + hi) / 2; const bx = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u; if (bx < x) lo = u; else hi = u; } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; }; }
const eOut = bez(.16, 1, .3, 1), eIn = bez(.7, 0, .84, 0), eIO = bez(.65, 0, .35, 1);
// pop con resorte muy amortiguado: 0 -> 1 con un exceso del ~7 % y una sola oscilación
const spring = p => { p = cl(p); if (p >= 1) return 1; return 1 - Math.exp(-6 * p) * Math.cos(p * Math.PI * 1.55) ; };
const pop = (t, t0, frames = 12) => t < t0 ? 0 : spring(pr(t, t0, t0 + frames * FR));
const settle = (t, t0, d, amt = .04) => { const p = pr(t, t0, t0 + d); return p >= 1 ? 1 : eOut(p) + amt * Math.sin(Math.PI * cl((p - .55) / .45)) * (p > .55 ? 1 : 0); };

// ---------- texto ----------
function font(c, size, wgt) { c.font = `${wgt} ${size}px ${F}`; }
function txt(c, s, x, y, size, wgt, col, align = 'center', ls = 0, a = 1) {
  if (a <= 0) return; c.save(); c.globalAlpha *= a; font(c, size, wgt); c.letterSpacing = ls + 'px'; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'alphabetic'; c.fillText(s, x, y); c.restore();
}
function tw(c, s, size, wgt, ls = 0) { c.save(); font(c, size, wgt); c.letterSpacing = ls + 'px'; const w = c.measureText(s).width; c.restore(); return w; }
// destello: barrido de luz blanca al 30 % sobre lo que dibuje fn (12 fotogramas, 4 después de asentarse)
function withFlash(c, t, tSettle, bbox, fn) {
  const p = pr(t, tSettle + 4 * FR, tSettle + 16 * FR);
  if (p <= 0 || p >= 1) { fn(c); return; }
  TX.setTransform(1, 0, 0, 1, 0, 0); TX.clearRect(0, 0, W, H); TX.setTransform(c.getTransform()); fn(TX);
  TX.save(); TX.globalCompositeOperation = 'source-atop'; const [x, y, w, h] = bbox, cx = lerp(x - 160, x + w + 160, p);
  const g = TX.createLinearGradient(cx - 120, 0, cx + 120, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  TX.fillStyle = g; TX.fillRect(x - 200, y - 50, w + 400, h + 100); TX.restore();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(TMP, 0, 0); c.restore();
}
// contador tragaperras: str con cifras y otros caracteres; centrado en (cx, base)
function slot(c, str, cx, base, size, col, t0, frames, t) {
  if (t < t0) return;
  font(c, size, 700); c.letterSpacing = '0px';
  const ls = -.06 * size, dw = c.measureText('0').width;
  const cw = ch => /[0-9]/.test(ch) ? dw : c.measureText(ch).width;
  let tot = 0; [...str].forEach(ch => tot += cw(ch) + ls); tot -= ls;
  let x = cx - tot / 2; let di = 0;
  const end = t0 + frames * FR, bbox = [cx - tot / 2, base - size * .75, tot, size * .8];
  withFlash(c, t, end + 2 * FR, bbox, cc => {
    cc.save(); cc.beginPath(); cc.rect(cx - tot / 2 - 40, base - size * .78, tot + 80, size * .84); cc.clip();
    font(cc, size, 700); cc.letterSpacing = '0px'; cc.textAlign = 'center'; cc.fillStyle = col;
    [...str].forEach((ch, i) => {
      const w = cw(ch), mid = x + w / 2;
      if (/[0-9]/.test(ch)) {
        const d0 = t0 + di * 2 * FR, d1 = end + di * 2 * FR, p = pr(t, d0, d1), turns = 2 + (str.length - di);
        const target = +ch, pos = target + 10 * turns * (1 - eOut(p));       // posición en la cinta
        const over = p >= 1 ? 0 : 0; let bounce = 0;
        const q = pr(t, d1, d1 + 6 * FR); if (q > 0 && q < 1) bounce = -.04 * Math.sin(Math.PI * q);
        const sp = 1 - eOut(p), blurN = p < .85 ? 3 : 0;
        for (let k = -1; k <= 1; k++) {
          const v = Math.floor(pos) + k, off = (v - pos + bounce) * size * .9;
          const dig = ((v % 10) + 10) % 10;
          if (blurN && sp > .05) { for (let s = 0; s < blurN; s++) { cc.globalAlpha = .35; cc.fillText(String(dig), mid, base + off + (s - 1) * size * .06 * sp * 4); } }
          else { cc.globalAlpha = 1; cc.fillText(String(dig), mid, base + off); }
        }
        cc.globalAlpha = 1; di++;
      } else if (ch !== ' ') {
        const s = pop(t, end - 2 * FR, 12); if (s > 0) { cc.save(); cc.translate(mid, base - size * .3); cc.scale(s, s); cc.fillText(ch, 0, size * .3); cc.restore(); }
      }
      x += w + ls;
    });
    cc.restore();
  });
}
// palabra que entra letra a letra: 2 fotogramas entre letras, subida de 20 px y desenfoque de 10 px a 0
function letters(c, s, cx, base, size, wgt, col, t0, t, a = 1) {
  font(c, size, wgt); c.letterSpacing = (-.03 * size) + 'px'; const tot = c.measureText(s).width; let x = cx - tot / 2;
  [...s].forEach((ch, i) => {
    const p = eOut(pr(t, t0 + i * 2 * FR, t0 + i * 2 * FR + 10 * FR)), w = c.measureText(ch).width;
    if (p > 0) { c.save(); c.globalAlpha *= a * p; if (p < .97) c.filter = `blur(${(10 * (1 - p)).toFixed(1)}px)`; c.fillStyle = col; c.textAlign = 'left'; c.fillText(ch, x, base + 20 * (1 - p)); c.restore(); }
    x += w;
  });
}

// ---------- elementos ----------
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function person(c, x, y, s, col, a = 1, lw = 6) {   // (x,y) = base de los hombros
  if (a <= 0 || s <= 0) return; c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.lineWidth = lw / s; c.lineCap = 'round';
  c.beginPath(); c.arc(0, -62, 26, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 44, Math.PI, 0); c.stroke(); c.restore();
}
function bubble(c, x, y, w, h, s, a = 1, side = 'l', checks = 0, checkCol = SUB) {
  if (s <= 0 || a <= 0) return; c.save(); c.globalAlpha *= a; c.translate(x + (side === 'l' ? 0 : w), y + h); c.scale(s, s); c.translate(-(side === 'l' ? 0 : w), -h);
  c.fillStyle = CARD; c.strokeStyle = EDGE; c.lineWidth = 2; rr(c, 0, 0, w, h, Math.min(28, h / 2)); c.fill(); c.stroke();
  c.beginPath(); const tx = side === 'l' ? 14 : w - 14; c.moveTo(tx - 10, h - 6); c.lineTo(side === 'l' ? -8 : w + 8, h + 8); c.lineTo(tx + 10, h - 2); c.fill();
  c.fillStyle = EDGE; const lines = h > 70 ? [.7, .5, .35] : [.65, .4]; lines.forEach((f, i) => { rr(c, 22, 18 + i * 18, (w - 44) * f, 8, 4); c.fill(); });
  if (checks) { c.strokeStyle = checkCol; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round'; const bx = side === 'l' ? w + 14 : w - 64, by = h + 26;
    for (let k = 0; k < checks; k++) { c.beginPath(); c.moveTo(bx + k * 14, by - 8); c.lineTo(bx + 8 + k * 14, by); c.lineTo(bx + 24 + k * 14, by - 16); c.stroke(); } }
  c.restore();
}
function clock(c, x, y, r, minA, hourA, col = TXT, lw = 6, a = 1, sector = 0, secCol = Y) {
  if (a <= 0) return; c.save(); c.globalAlpha *= a; c.translate(x, y);
  if (sector > 0) { c.fillStyle = secCol; c.globalAlpha *= .9; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - lw, -Math.PI / 2, -Math.PI / 2 + sector * Math.PI * 2); c.closePath(); c.fill(); c.globalAlpha /= .9; }
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2; c.lineWidth = lw * .6; c.beginPath(); c.moveTo(Math.cos(an) * r * .84, Math.sin(an) * r * .84); c.lineTo(Math.cos(an) * r * .93, Math.sin(an) * r * .93); c.stroke(); }
  c.lineWidth = lw; const hand = (an, L) => { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(an) * L, -Math.cos(an) * L); c.stroke(); };
  hand(hourA, r * .48); hand(minA, r * .74); c.fillStyle = col; c.beginPath(); c.arc(0, 0, lw * .9, 0, 7); c.fill(); c.restore();
}
function phone(c, cx, cy, s, screen, a = 1) {
  if (a <= 0 || s <= 0) return; c.save(); c.globalAlpha *= a; c.translate(cx, cy); c.scale(s, s);
  c.fillStyle = screen; rr(c, -210, -430, 420, 860, 64); c.fill(); c.strokeStyle = TXT; c.lineWidth = 6 / Math.max(s, .6); c.stroke();
  c.fillStyle = BG; rr(c, -60, -416, 120, 30, 15); c.fill(); c.restore();
}
function shake(t, imps) { let dx = 0, dy = 0; imps.forEach((ti, k) => { const p = (t - ti) / (6 * FR); if (p >= 0 && p < 1) { const a = 6 * (1 - p); dx += a * Math.sin(p * 37 + k); dy += a * Math.cos(p * 29 + k * 2); } }); return [dx, dy]; }

// ---------- gancho: recorte con rampa (fotogramas ya preparados) + congelado + zoom-through ----------
const HK = []; for (let i = 0; i < 57; i++) { const im = new Image(); im.src = `assets/hook/${String(i).padStart(3, '0')}.jpg`; HK.push(im); }
const OBJ = [600, 980];                       // la grieta de la sandía, ya dentro del escenario
const G0 = [153, 405];                        // primera empresa de la cuadrícula
function E0(c, t) {
  const n = Math.floor(t * FPS + 1e-6), im = HK[Math.min(56, n)];
  if (!im.complete) return;
  const q = pr(t, 61 * FR, 70 * FR);
  c.save();
  if (q > 0) { const zz = 1 + 6 * eIn(q); c.translate(OBJ[0], OBJ[1]); c.scale(zz, zz); c.translate(-OBJ[0], -OBJ[1]); c.filter = `blur(${(22 * q).toFixed(1)}px)`; }
  c.drawImage(im, 0, 0, W, H); c.restore();
  if (q > 0) { const p = eIn(q), cx = lerp(OBJ[0], G0[0], eIO(q)), cy = lerp(OBJ[1], G0[1], eIO(q)); c.fillStyle = BG; c.beginPath(); c.arc(cx, cy, 2300 * p + 2, 0, 7); c.fill(); }
}

// ====================== CUADRÍCULA DE 100 EMPRESAS ======================
const B = C.B, END = C.END;
const sEnd = i => i < 9 ? B[i + 1] : END + 1;
const GX = c => 540 + (c - 4.5) * 86, GY = r => 405 + r * 90;
const READY = [[1, 6], [3, 1], [4, 8], [7, 3], [8, 7]];
const isReady = (r, k) => READY.some(p => p[0] === r && p[1] === k);
const CELLS = []; for (let r = 0; r < 10; r++) for (let k = 0; k < 10; k++) CELLS.push({ r, k, x: GX(k), y: GY(r), ready: isReady(r, k), rnd: ((r * 37 + k * 61) % 97) / 97 });
function hexmix(a, b, p) { return mixc(a, b, cl(p)); }
function mixc(a, b, p) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), Bc = h(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, Bc[i], p))).join(',')})`; }
// empresa: bright 0 = dormida (#2A2A2E), 1 = gris claro; y = 0..1 cuánto "lista" (amarillo con halo)
function company(c, x, y, s, bright, yel, a = 1) {
  if (s <= 0 || a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  if (yel > 0) {
    c.save(); c.globalAlpha *= .35 * yel; c.filter = 'blur(24px)'; c.fillStyle = Y; rr(c, -34, -42, 68, 84, 10); c.fill(); c.restore();
    c.save(); c.globalAlpha *= yel; c.fillStyle = Y; rr(c, -28, -36, 56, 72, 6); c.fill(); c.fillStyle = BG;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { c.fillRect(-14 + j * 18 - 5 + 0, -22 + i * 20, 10, 10); } c.restore();
  }
  if (yel < 1) {
    c.save(); c.globalAlpha *= 1 - yel; c.strokeStyle = hexmix(EDGE, SUB, bright); c.lineWidth = 4; rr(c, -28, -36, 56, 72, 6); c.stroke();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.strokeRect(-14 + j * 18 - 5, -22 + i * 20, 10, 10);
    c.restore();
  }
  c.restore();
}
function you(c, x, y, t, halo = .4, s = 1) {
  if (s <= 0) return; const ph = ((t % 1.2) / 1.2);
  c.save(); c.translate(x, y); c.scale(s, s);
  c.globalAlpha = halo * (1 - ph); c.fillStyle = Y; c.beginPath(); c.arc(0, 0, 22 * lerp(1, 1.4, ph) + 10, 0, 7); c.fill();
  c.globalAlpha = 1; c.save(); c.globalAlpha = .45; c.filter = 'blur(14px)'; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); c.restore();
  c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); c.restore();
}
function phoneIcon(c, x, y, s, t, t0, a = 1) {
  if (s <= 0) return; c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); c.strokeStyle = TXT; c.lineWidth = 6 / s; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-34, -40); c.quadraticCurveTo(-46, -10, -20, 22); c.quadraticCurveTo(8, 50, 38, 40); c.lineTo(42, 22); c.lineTo(22, 10); c.lineTo(10, 22); c.quadraticCurveTo(-6, 12, -14, -4); c.lineTo(-2, -16); c.lineTo(-14, -36); c.closePath(); c.stroke();
  for (let i = 0; i < 3; i++) { const p = ((t - t0) * 1.3 + i / 3) % 1; if (t < t0) break; c.globalAlpha = a * (1 - p); c.beginPath(); c.arc(-30, -36, 30 + 40 * p, -Math.PI * .45, Math.PI * .05); c.stroke(); }
  c.restore();
}
function megaphone(c, x, y, s) { if (s <= 0) return; c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TXT; c.lineWidth = 6 / s; c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-44, -16); c.lineTo(-12, -16); c.lineTo(34, -46); c.lineTo(34, 46); c.lineTo(-12, 16); c.lineTo(-44, 16); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-28, 16); c.lineTo(-18, 52); c.stroke(); c.restore(); }
function tagIcon(c, x, y, s) { if (s <= 0) return; c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TXT; c.lineWidth = 6 / s; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-40, -30); c.lineTo(20, -30); c.lineTo(50, 0); c.lineTo(20, 30); c.lineTo(-40, 30); c.closePath(); c.stroke(); c.beginPath(); c.arc(28, 0, 6, 0, 7); c.stroke();
  txt(c, '%', -10, 16, 46, 700, TXT); c.restore(); }
function vignette(c, k) { if (k <= 0) return; const g = c.createRadialGradient(540, 860, 420, 540, 860, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
function cam(c, cx, cy, z, dx = 0, dy = 0) { c.translate(cx + dx, cy + dy); c.scale(z, z); c.translate(-cx, -cy); }
const diag = o => o.r + o.k;

// ---- G1: E1 + E2 sobre la misma cuadrícula ----
function G1(c, t) {
  const eh = C.e1_ehr, ca = C.e1_calc, li = C.e1_listos, rs = C.e2_resp, cb = C.e2_cambia, en = C.e2_end, s = B[1], e = B[2];
  const push = 1 + .04 * eIO(pr(t, C.e1_pos, rs)) , zoomQ = eIO(pr(t, en, e - .05));
  c.save(); cam(c, 540, 810, push * (1 + .08 * zoomQ));
  const dimG = 1 - .5 * pr(t, rs, rs + .3);
  const blink = (() => { const p = pr(t, li + .1, li + .1 + 6 * FR); return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0; })();
  CELLS.forEach(o => {
    const first = o.r === 0 && o.k === 0;
    const sc = first ? pop(t, s, 10) : pop(t, ca + diag(o) * FR, 10);
    company(c, o.x, o.y, sc * .9, blink, 0, dimG);
  });
  // ?
  const qa = pop(t, li, 12), qs = 1 + .12 * Math.sin(Math.PI * pr(t, li + .3, li + .6)), gone = 1 - eIn(pr(t, cb, cb + .3));
  if (qa > 0 && gone > 0) { c.save(); c.translate(540, 810); c.scale(qa * qs * gone, qa * qs * gone); txt(c, '?', 0, 72, 200, 700, Y); c.restore(); }
  if (t > cb + .15) { const b = pop(t, cb + .15, 10) * (1 + .2 * (.5 + .5 * Math.sin((t - cb) * 4))); c.fillStyle = TXT; c.beginPath(); c.arc(540, 810, 12 * b, 0, 7); c.fill(); }
  c.restore();
  // nombre del instituto
  const up = eIO(pr(t, ca - .1, ca + .4));
  c.save(); c.translate(540, lerp(360, 318, up)); c.scale(lerp(1, .7, up), lerp(1, .7, up));
  letters(c, 'Ehrenberg-Bass Institute', 0, 0, 64, 600, TXT, eh, t);
  const lp = eOut(pr(t, eh + .3, eh + .3 + 10 * FR)); if (lp > 0) { c.fillStyle = Y; c.fillRect(-370, 22, 740 * lp, 3); }
  c.restore();
  vignette(c, .2 * zoomQ);
}
// ---- E3: 5 % ----
function E3(c, t) {
  const ci = C.e3_cinco;
  const a = eOut(pr(t, ci - 6 * FR, ci)); if (a > 0) txt(c, 'Alrededor del', 540, 560 + 16 * (1 - a), 80, 600, TXT, 'center', -2.4, a);
  slot(c, '5 %', 540, 880, 340, Y, ci, 16, t);
}
// ---- E4: las 95 ----
function E4(c, t) {
  const s = B[3], ci = C.e4_cien, po = C.e4_podrian, nv = C.e4_noventa, ah = C.e4_ahora;
  const z = 1 + .04 * eIO(pr(t, s, B[4])) + .2 * eIO(pr(t, B[4] - .7, B[4]));
  const cx = 540, cy = 815;
  c.save(); cam(c, cx, cy, z);
  CELLS.forEach(o => {
    const wave = (() => { const p = pr(t, ci + diag(o) * FR * .6, ci + diag(o) * FR * .6 + .25); return p > 0 && p < 1 ? Math.sin(Math.PI * p) : 0; })();
    let br = .35 + .65 * wave;
    if (!o.ready) br *= 1 - pr(t, nv + .2 + (99 - (o.r * 10 + o.k)) * FR * .25, nv + .5 + (99 - (o.r * 10 + o.k)) * FR * .25);
    let yel = 0, sc = .9;
    if (o.ready) { const wk = po + READY.findIndex(p => p[0] === o.r && p[1] === o.k) * 2 * FR + .25; yel = pr(t, wk, wk + 4 * FR); const q = pr(t, wk, wk + 10 * FR); sc *= 1 + .15 * Math.sin(Math.PI * q); }
    let dx = 0; if (!o.ready && o.rnd < .08 && t > ah) dx = 2 * Math.sin((t - ah) * 3 + o.rnd * 20);
    company(c, o.x + dx, o.y, sc, br, yel);
  });
  // los cinco puntos del 5 % vuelan a su sitio
  READY.forEach(([r, k], i) => { const p = eIO(pr(t, po - .05, po + .3)); if (p >= 1 || t < s) return;
    const sx = 540 + (i - 2) * 26, sy = 760, x = lerp(sx, GX(k), p), y = lerp(sy, GY(r), p); c.fillStyle = Y; c.beginPath(); c.arc(x, y, 9 * lerp(1, 1.4, p), 0, 7); c.fill(); });
  c.restore();
  // contador 100 -> 95
  if (t > ci) {
    const a = pop(t, ci, 12), gray = pr(t, nv, nv + .2);
    c.save(); c.translate(860, 330); c.scale(a, a); c.translate(-860, -330);
    if (t < nv) txt(c, '100', 860, 330, 120, 700, TXT, 'center', -7.2);
    else slot(c, '95', 860, 330, 120, gray > .5 ? SUB : TXT, nv, 12, t);
    c.restore();
  }
}
// ---- E5: la persecución ----
const ARROWS = []; for (let i = 0; i < 40; i++) { const side = i % 4, rr2 = ((i * 53) % 100) / 100; ARROWS.push({ i, side, rr: rr2, tg: i % 5, d: i / 40 }); }
function E5(c, t) {
  const s = B[4], ca = C.e5_casi, pe = C.e5_perseguir, ll = C.e5_llam, pd = C.e5_pide, ds = C.e5_desc;
  const cx = 540, cy = 815, z = 1.24 + .04 * eIO(pr(t, s, B[5]));
  c.save(); cam(c, cx, cy, z);
  CELLS.forEach(o => company(c, o.x, o.y, .9, 0, o.ready ? 1 : 0));
  c.restore();
  const P = ([r, k]) => [cx + (GX(k) - cx) * z, cy + (GY(r) - cy) * z];
  // flechas
  ARROWS.forEach(a => {
    const t0 = a.i < 10 ? ca + a.d * 1.2 : pe + (a.i - 10) / 30 * .9; if (t < t0) return;
    const [tx, ty] = P(READY[a.tg]); let sx, sy;
    if (a.side === 0) { sx = -60; sy = 300 + a.rr * 1000; } else if (a.side === 1) { sx = 1140; sy = 300 + a.rr * 1000; } else if (a.side === 2) { sx = 80 + a.rr * 920; sy = 230; } else { sx = 80 + a.rr * 920; sy = 1300; }
    const p = eOut(pr(t, t0, t0 + .7)), ang = Math.atan2(ty - sy, tx - sx), dist = Math.hypot(tx - sx, ty - sy) - 70 - (a.i % 3) * 18;
    const jit = t > pe ? 2 * Math.sin(t * 40 + a.i) : 0;
    const hx = sx + Math.cos(ang) * dist * p + jit, hy = sy + Math.sin(ang) * dist * p - jit;
    c.save(); c.strokeStyle = TXT; c.lineWidth = 4; c.lineCap = 'round'; c.globalAlpha = .85;
    c.beginPath(); c.moveTo(hx - Math.cos(ang) * 60, hy - Math.sin(ang) * 60); c.lineTo(hx, hy);
    c.moveTo(hx, hy); c.lineTo(hx - Math.cos(ang - .5) * 16, hy - Math.sin(ang - .5) * 16); c.moveTo(hx, hy); c.lineTo(hx - Math.cos(ang + .5) * 16, hy - Math.sin(ang + .5) * 16); c.stroke(); c.restore();
  });
  // iconos junto a tres empresas listas
  const [p0, p1, p2] = [P(READY[0]), P(READY[1]), P(READY[3])];
  phoneIcon(c, p0[0] - 110, p0[1] + 10, pop(t, ll, 12) * .9, t, ll);
  megaphone(c, p1[0] + 110, p1[1], pop(t, pd, 12) * .95);
  tagIcon(c, p2[0] + 120, p2[1], pop(t, ds, 12) * .95);
  // palabra protagonista arriba
  [[ll, pd, 'Llamadas'], [pd, ds, '“pide tu demo”'], [ds, 1e9, 'descuentos']].forEach(([a, b, w]) => {
    if (t < a) return; const inn = spring(pr(t, a, a + 12 * FR)), out = eIn(pr(t, b, b + 6 * FR)); if (out >= 1) return;
    c.save(); c.globalAlpha = 1 - out; if (out > 0) c.filter = `blur(${(10 * out).toFixed(1)}px)`;
    c.translate(540, 360 - 60 * out + 40 * (1 - Math.min(1, inn))); c.scale(lerp(.6, 1, Math.min(1.08, inn)), lerp(.6, 1, Math.min(1.08, inn)));
    txt(c, w, 0, 0, 96, 600, TXT, 'center', -2.9); c.restore();
  });
}
// ---- E6: el olvido ----
const THINK = [[2, 2], [0, 4], [5, 5], [6, 1], [3, 7], [7, 8], [9, 2]];
function E6(c, t) {
  const s = B[5], ol = C.e6_olvidan, ti = C.e6_ti;
  const pan = eIO(pr(t, s, B[6])), z = 1.04;
  c.save(); cam(c, 540, 760, .92 * z, lerp(30, -30, pan), 0);
  CELLS.forEach(o => company(c, o.x, o.y, .9, 0, o.ready ? 1 : 0));
  THINK.forEach(([r, k], i) => {
    const t0 = ol - .5 + i * .08, ap = pop(t, t0, 12), dot = 1 - pr(t, ol + .35 + i * .12, ol + .6 + i * .12), smoke = pr(t, ol + .7 + i * .1, ol + 1.2 + i * .1);
    if (ap <= 0 || smoke >= 1) return; const x = GX(k) + 30, y = GY(r) - 70;
    c.save(); c.globalAlpha = 1 - smoke; if (smoke > 0) c.filter = `blur(${(10 * smoke).toFixed(1)}px)`; c.translate(x, y - 20 * smoke); c.scale(ap * (1 + .3 * smoke), ap * (1 + .3 * smoke));
    c.fillStyle = CARD; c.strokeStyle = EDGE; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 36, 26, 0, 0, 7); c.fill(); c.stroke();
    [[-18, 34, 6], [-26, 48, 4]].forEach(([bx, by, br]) => { c.beginPath(); c.arc(bx, by, br, 0, 7); c.fill(); c.stroke(); });
    if (dot > 0) { c.globalAlpha *= dot; c.fillStyle = Y; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill(); }
    c.restore();
  });
  c.restore();
  const ys = pop(t, ti, 12); you(c, 540, 1262, t, lerp(.4, .15, pr(t, ti + .3, B[6])), ys);
}
// ---- E7: cuando les toca ----
const WAKE7 = [[0, 1], [2, 8], [5, 3], [1, 4], [6, 6], [9, 0], [4, 5], [8, 9]];
function E7(c, t) {
  const s = B[6], cu = C.e7_cuando, to = C.e7_toca, ll = C.e7_llaman;
  const shr = eIO(pr(t, s - .1, s + .4)), gs = lerp(.92, .5, shr), gy = lerp(760, 600, shr);
  const dotP = pr(t, cu, cu + 1.2), sel = WAKE7[5];
  c.save(); c.translate(540, gy); c.scale(gs, gs); c.translate(-540, -810);
  CELLS.forEach(o => {
    let yel = o.ready ? 1 - pr(t, cu + .2 + o.rnd * .8, cu + .4 + o.rnd * .8) : 0, sc = .9;
    const wi = WAKE7.findIndex(p => p[0] === o.r && p[1] === o.k);
    if (wi >= 0) { const tw0 = cu + .1 + wi * .14; yel = pr(t, tw0, tw0 + 4 * FR); sc *= 1 + .15 * Math.sin(Math.PI * pr(t, tw0, tw0 + 10 * FR)); }
    if (wi === 5 && t > to) return;
    company(c, o.x, o.y, sc, 0, yel);
  });
  c.restore();
  // la empresa elegida se separa
  if (t > to) {
    const sx = 540 + (GX(sel[1]) - 540) * gs, sy = gy + (GY(sel[0]) - 810) * gs, p = eIO(pr(t, to, to + .5));
    const x = lerp(sx, 260, p), y = lerp(sy, 1130, p);
    company(c, x, y, lerp(.45, 1.35, p), 0, 1);
    if (t > ll) {
      phoneIcon(c, x + 10, y - 110, pop(t, ll, 12) * .55, t, ll);
      const lp = eOut(pr(t, ll + .1, ll + .1 + 10 * FR));
      c.save(); c.strokeStyle = TXT; c.lineWidth = 3; c.setLineDash([]); c.beginPath();
      const N = 30; for (let i = 0; i <= N * lp; i++) { const u = i / N, bx = lerp(x + 50, 830, u), by = lerp(y - 20, 1120, u) - Math.sin(Math.PI * u) * 170; i ? c.lineTo(bx, by) : c.moveTo(bx, by); } c.stroke(); c.restore();
      const od = pop(t, ll + .1, 10); c.fillStyle = TXT; c.beginPath(); c.arc(830, 1120, 16 * od, 0, 7); c.fill();
      const fl = pr(t, ll + .1 + 10 * FR, ll + .1 + 18 * FR); if (fl > 0 && fl < 1) { c.save(); c.globalAlpha = 1 - fl; c.strokeStyle = TXT; c.lineWidth = 3; c.beginPath(); c.arc(830, 1120, 16 + 40 * fl, 0, 7); c.stroke(); c.restore(); }
    }
  }
  // línea de tiempo
  const la = eOut(pr(t, s, s + .4));
  c.save(); c.globalAlpha = la; c.strokeStyle = EDGE; c.lineWidth = 4; c.beginPath(); c.moveTo(180, 960); c.lineTo(900, 960); c.stroke();
  for (let x = 180; x <= 900; x += 80) { c.beginPath(); c.moveTo(x, 950); c.lineTo(x, 970); c.stroke(); }
  c.fillStyle = TXT; c.beginPath(); c.arc(lerp(180, 900, dotP), 960, 11, 0, 7); c.fill(); c.restore();
  you(c, 540, 1262, t, .15, 1);
}
// ---- E8: la frase ----
function E8(c, t) {
  const mj = C.e8_mejor, al = C.e8_al;
  if (t < al) {
    const a = eOut(pr(t, mj, mj + 6 * FR)), out = eIn(pr(t, al - .3, al - .08));
    c.save(); c.globalAlpha = a * (1 - out); if (out > 0) c.filter = `blur(${(12 * out).toFixed(1)}px)`; c.translate(0, -80 * out);
    txt(c, 'mejor', 540, 810, 140, 600, SUB, 'center', -4.2);
    const ww = tw(c, 'mejor', 140, 600, -4.2), p = eOut(pr(t, mj + .2, mj + .2 + 8 * FR)), tr = p > 0 && p < 1 ? 2 * Math.sin(t * 90) : 0;
    if (p > 0) { c.fillStyle = RED; c.fillRect(540 - ww / 2 - 12, 762 + tr, (ww + 24) * p, 9); }
    c.restore(); return;
  }
  const p = pr(t, al, al + 4 * FR), s = lerp(1.3, 1, eOut(p));
  c.save(); c.translate(540, 840); c.scale(s, s);
  txt(c, 'Al que', 0, -200, 90, 600, TXT, 'center', -2.7);
  withFlash(c, t, al + 4 * FR, [-480, -160, 960, 170], cc => txt(cc, 'recuerdan', 0, 0, 200, 700, Y, 'center', -6));
  c.restore();
}
// ---- E9: todavía no ----
function E9(c, t) {
  const n = C.e9_no, td = C.e9_todavia;
  const land = td + 12 * FR, ant = pr(t, td - 3 * FR, td), mv = pr(t, td, land);
  const push = t > land - 2 * FR ? settle(t, land - 2 * FR, 10 * FR, .04) : 0;
  const ns = pop(t, n, 12) * lerp(1, .6, push), ny = lerp(900, 1010, push), ncol = push > .5 ? SUB : TXT;
  if (t > n) { c.save(); c.translate(540, ny); c.scale(ns, ns); txt(c, 'NO', 0, 100, 280, 700, ncol, 'center', -16.8); c.restore(); }
  if (t > td - 3 * FR) {
    const x = t < td ? lerp(540, 520, 0) - 1300 - 20 * ant : lerp(-760, 540, eOut(mv)) + (mv >= 1 ? 0 : 0);
    const over = pr(t, land, land + 8 * FR), ox = 20 * Math.sin(Math.PI * over) * (1 - over);
    c.save(); c.translate(x + ox, 0);
    withFlash(c, t, land + 4 * FR, [-380, 700, 760, 150], cc => txt(cc, 'TODAVÍA', 0, 820, 150, 700, Y, 'center', -9));
    c.restore();
  }
}
// ---- E10 + E11: la pregunta final ----
const LINKS = CELLS.filter(o => !o.ready && ((o.r * 7 + o.k * 3) % 4 === 0)).slice(0, 24).sort((a, b) => Math.atan2(a.y - 1262, a.x - 540) - Math.atan2(b.y - 1262, b.x - 540));
const WAKE10 = LINKS.filter((o, i) => i % 2 === 0).sort((a, b) => a.rnd - b.rnd);
function E10(c, t) {
  const s = B[9], sg = C.e10_seguir, cu = C.e10_cuando, endv = C.PH[9][1];
  const rise = eOut(pr(t, s - .2, s + .5)), back = eIO(pr(t, endv, END));
  c.save(); cam(c, 540, 760, .92 * (1 - .05 * back), 0, 300 * (1 - rise));
  const gy = o => o.y;
  CELLS.forEach(o => { const wi = WAKE10.indexOf(o); const yel = wi >= 0 ? pr(t, cu + wi * .25, cu + wi * .25 + 6 * FR) : 0; const sc = .9 * (1 + (wi >= 0 ? .15 * Math.sin(Math.PI * pr(t, cu + wi * .25, cu + wi * .25 + 10 * FR)) : 0)); company(c, o.x, gy(o), sc, 0, yel); });
  c.restore();
  const k = .92 * (1 - .05 * back), map = o => [540 + (o.x - 540) * k, 760 + (o.y - 760) * k + 300 * (1 - rise)];
  LINKS.forEach((o, i) => { const p = eOut(pr(t, sg + i * 2 * FR * .5, sg + i * FR + .3)); if (p <= 0) return; const [x, y] = map(o);
    c.save(); c.strokeStyle = Y; c.globalAlpha = .5; c.lineWidth = 2; c.beginPath(); c.moveTo(540, 1262); c.lineTo(lerp(540, x, p), lerp(1262, y + 36, p)); c.stroke(); c.restore(); });
  you(c, 540, 1262, t, .4, eOut(pr(t, s - .1, s + .3)));
  const lg = pr(t, endv + .15, endv + .15 + 10 * FR); if (lg > 0) txt(c, 'MHFC', 540, 1345, 40, 700, TXT, 'center', 4, .7 * lg);
}
const SC = [E0, G1, E3, E4, E5, E6, E7, E8, E9, E10];
const TR = { 2: ['cut'], 3: ['fast', 8], 4: ['fast', 8], 5: ['whipH', 10], 6: ['fast', 10], 7: ['cut'], 8: ['fade', 14], 9: ['fast', 10] };
const IMPACTS = () => [C.e3_cinco + 16 * FR, C.e8_al, C.e9_todavia + 12 * FR];

function drawScene(c, i, t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  if (i === 0) { SC[0](c, t); return; }
  const s = B[i], e = sEnd(i), lt = cl((t - s) / Math.max(.5, e - s));
  const z = (i === 1 || i === 4 || i === 5 || i === 9) ? 1 : 1 + .04 * eIO(lt);
  const [sx, sy] = shake(t, IMPACTS());
  c.translate(540 + sx, 760 + sy); c.scale(z, z); c.translate(-540, -760);
  SC[i](c, t);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
function composite(t) {
  AX.setTransform(1, 0, 0, 1, 0, 0); AX.globalAlpha = 1; AX.filter = 'none'; AX.fillStyle = BG; AX.fillRect(0, 0, W, H);
  for (let i = 0; i <= 9; i++) {
    const s = B[i], e = sEnd(i), tin = TR[i], tout = TR[i + 1];
    const inF = i > 0 && tin && tin[0] !== 'cut' ? tin[1] * FR / 2 : 0, outF = tout && tout[0] !== 'cut' ? tout[1] * FR / 2 : 0;
    if (t < s - inF || t >= e + outF) continue;
    let a = 1, bl = 0, dx = 0;
    if (inF && t < s + inF) { const p = pr(t, s - inF, s + inF), k = tin[0];
      if (k === 'whipH') dx = W * (1 - eOut(p)); else if (k === 'fast') { a = eOut(p); bl = 10 * (1 - p); } else if (k === 'fade') a = eIO(p); }
    if (outF && t > e - outF) { const p = pr(t, e - outF, e + outF), k = tout[0];
      if (k === 'whipH') dx = -W * eIn(p); else if (k === 'fast') { a = Math.min(a, 1 - eIn(p)); bl = Math.max(bl, 10 * p); } else if (k === 'fade') a = Math.min(a, 1 - eIO(p)); }
    if (a <= 0) continue;
    drawScene(LX, i, t);
    AX.save(); AX.globalAlpha = a; if (bl > .3) AX.filter = `blur(${bl.toFixed(1)}px)`; AX.translate(dx, 0); AX.drawImage(LAY, 0, 0); AX.restore();
  }
}

// ---------- subtítulos ----------
const HIDE = new Set();
(function () { const Wd = C.W, mark = (f, from, n) => { const ix = Wd.findIndex((x, k) => x.f === f && x.w.toLowerCase().replace(/[¿?.,…:"]/g, '') === from); for (let k = 0; k < n; k++) HIDE.add(ix + k); };
  mark(2, 'cinco', 3); mark(4, 'llamadas', 1); mark(4, 'pide', 3); mark(4, 'descuentos', 1); mark(7, 'no', 6); mark(8, 'todavía', 2); })();
const BLOCKS = (() => {
  const Wd = C.W, out = []; let cur = [];
  const close = () => { if (cur.length) out.push(cur); cur = []; };
  Wd.forEach((w, k) => {
    if (HIDE.has(k)) { close(); return; }
    if (cur.length && Wd[cur[cur.length - 1]].g !== w.g) close();
    cur.push(k);
    const nx = Wd[k + 1];
    if (cur.length >= 4 || (/,$/.test(w.w) && cur.length >= 2) || (nx && /,$/.test(nx.w) && cur.length >= 3 && !HIDE.has(k + 1))) close();
  });
  close();
  // nunca una palabra sola: se une al bloque anterior del mismo tramo
  for (let i = out.length - 1; i > 0; i--) if (out[i].length === 1 && Wd[out[i - 1][out[i - 1].length - 1]].g === Wd[out[i][0]].g && out[i - 1][out[i - 1].length - 1] === out[i][0] - 1) { out[i - 1] = out[i - 1].concat(out[i]); out.splice(i, 1); }
  return out;
})();
function subtitles(c, t) {
  const Wd = C.W;
  BLOCKS.forEach((bk, bi) => {
    const s = Wd[bk[0]].s, last = Wd[bk[bk.length - 1]].e, nxt = BLOCKS[bi + 1] ? Wd[BLOCKS[bi + 1][0]].s : 1e9;
    const off = Math.min(last + .12, nxt - 5 * FR), out = pr(t, off, off + 5 * FR);
    if (t < s || out >= 1) return;
    c.save(); font(c, 54, 600); c.letterSpacing = '-0.54px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const sp = c.measureText(' ').width, ws = bk.map(k => c.measureText(Wd[k].w).width);
    const lines = [[]]; let lw = 0; bk.forEach((k, j) => { if (lines[lines.length - 1].length && lw + sp + ws[j] > 900) { lines.push([]); lw = 0; } lw += (lines[lines.length - 1].length ? sp : 0) + ws[j]; lines[lines.length - 1].push(j); });
    if (lines.length === 2 && lines[1].length === 1 && lines[0].length > 1) lines[1].unshift(lines[0].pop());
    c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 16; c.shadowOffsetY = 3;
    lines.forEach((ln, li) => {
      const tot = ln.reduce((a, j, q) => a + ws[j] + (q ? sp : 0), 0); let x = 540 - tot / 2; const y = 1440 + li * 62 - (lines.length - 1) * 31;
      ln.forEach(j => {
        const w = Wd[bk[j]], p = eOut(pr(t, w.s, w.s + 6 * FR));
        if (p > 0) {
          const act = t >= w.s && t < w.e + .02, pp = pr(t, w.s, w.s + 5 * FR), sc = act ? 1 + .06 * Math.sin(Math.PI * pp) : 1;
          c.save(); c.globalAlpha = p * (1 - out); c.fillStyle = act ? Y : TXT; c.translate(x + ws[j] / 2, y + 18 * (1 - p)); c.scale(sc, sc); c.fillText(w.w, -ws[j] / 2, 0); c.restore();
        }
        x += ws[j] + sp;
      });
    });
    c.restore();
  });
}

const SAMPLES = 6;
function render(t) {
  t = cl(t, 0, END);
  X.setTransform(1, 0, 0, 1, 0, 0); X.filter = 'none'; X.globalAlpha = 1; X.fillStyle = BG; X.fillRect(0, 0, W, H);
  const n = t < C.V0 ? 1 : SAMPLES;
  for (let k = 0; k < n; k++) {
    const ts = n === 1 ? t : t - FR / 4 + (k + .5) / n * FR / 2;   // obturador de 180°, fase −90°
    composite(Math.max(0, ts));
    X.globalAlpha = 1 / (k + 1); X.drawImage(ACC, 0, 0);
  }
  X.globalAlpha = 1;
  if (t >= C.V0) subtitles(X, t);
}
window.__render = render;
})();
