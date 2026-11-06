// Reel "Lo perdiste por la hora". render(t) es función pura del tiempo; desenfoque de movimiento por acumulación.
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

// ---------- huevo: el plano original tal cual, sin animación ----------
const EGGF = []; for (let i = 0; i < 83; i++) { const im = new Image(); im.src = `assets/egg/${String(i).padStart(3, '0')}.jpg`; EGGF.push(im); }
function E0(c, t) {
  const im = EGGF[Math.min(82, Math.floor(t * FPS + 1e-6))];
  if (im.complete) c.drawImage(im, 0, 0, W, H);
}

// ====================== ESCENAS ======================
const B = C.B, END = C.END;
const sEnd = i => i < 10 ? B[i + 1] : END + 1;
const ICONS = []; for (let r = 0; r < 10; r++) for (let k = 0; k < 20; k++) ICONS.push({ x: 102 + k * 46, y: 470 + r * 72, ring: Math.max(Math.abs(k - 9.5), Math.abs(r - 4.5) * 1.4), white: ((k * 7 + r * 13) % 7) === 0 });
const CLIENT = ICONS.find(o => o.x === 102 + 10 * 46 && o.y === 470 + 9 * 72);
const BUB1 = [[3, 2], [7, 6], [12, 3], [16, 7], [5, 8], [10, 5], [14, 1], [18, 4], [1, 5]].map(([k, r], i) => ({ x: 102 + k * 46, y: 470 + r * 72, d: i * .09, sw: i * 1.7 }));
function E1(c, t) {
  const h = C.e1_harvard, d = C.e1_dos, cli = C.e1_cliente;
  const dot = pop(t, B[1], 10) * (1 - pr(t, h + .2, h + .5));
  if (dot > 0) { c.fillStyle = Y; c.beginPath(); c.arc(540, 760, 14 * dot, 0, 7); c.fill(); }
  // cuadrícula de personas
  if (t > d + 18 * FR) {
    const t0 = d + 20 * FR, dim = 1 - .6 * pr(t, cli, cli + .3);
    ICONS.forEach(o => { const s = pop(t, t0 + o.ring * FR, 10); if (s <= 0 || o === CLIENT) return; person(c, o.x, o.y, .3 * s, o.white ? TXT : EDGE, dim * (o.white ? .55 : 1), 4); });
    const lit = pr(t, cli, cli + .25), cs = pop(t, t0 + CLIENT.ring * FR, 10) * (1 + .5 * spring(pr(t, cli, cli + 12 * FR)));
    person(c, CLIENT.x, CLIENT.y, .3 * cs, lit > 0 ? TXT : EDGE, 1, 4);
    if (lit > 0) { c.save(); c.globalAlpha = .35 * lit; c.filter = 'blur(14px)'; person(c, CLIENT.x, CLIENT.y, .3 * cs, TXT, 1, 8); c.restore(); }
    BUB1.forEach(b => { const p = pr(t, C.e1_tardas + b.d, C.e1_tardas + b.d + 1.6); if (p <= 0 || p >= 1) return;
      const s = pop(t, C.e1_tardas + b.d, 10), y = b.y - 40 - 150 * eOut(p), x = b.x + 10 * Math.sin(p * 6 + b.sw);
      bubble(c, x - 25, y - 30, 56, 34, s * .9, (1 - pr(p, .7, 1)) * dim); });
  }
  // Harvard
  const up = eIO(pr(t, d - .1, d + .4));
  c.save(); c.translate(540, lerp(800, 380, up)); c.scale(lerp(1, .6, up), lerp(1, .6, up)); letters(c, 'Harvard', 0, 0, 120, 600, TXT, h, t); c.restore();
  // 2.000
  if (t > d) { const dim = 1 - .45 * pr(t, cli, cli + .3); c.save(); c.globalAlpha = dim; slot(c, '2.000', 540, 860, 300, Y, d, 18, t); c.restore(); }
}
function E2(c, t) {
  const r = C.e2_res, b = C.e2_brutal;
  if (t < b) { const p = eOut(pr(t, r, r + 8 * FR)); if (p > 0) { c.fillStyle = Y; c.fillRect(140, 758, 800 * p, 4); } return; }
  const p = pr(t, b, b + 4 * FR), s = lerp(1.3, 1, eOut(p));
  c.save(); c.translate(540, 760); c.scale(s, s);
  withFlash(c, t, b + 4 * FR, [-470, -170, 940, 180], cc => { txt(cc, 'BRUTAL', 0, 0, 220, 700, TXT, 'center', -.03 * 220); cc.fillStyle = Y; cc.fillRect(-400, 50, 800, 6); });
  c.restore();
}
function E3(c, t) {
  const pm = C.e3_primera, sv = C.e3_siete, op = C.e3_oport, uh = C.e3_unahora;
  const cs = pop(t, pm, 12), mv = eIO(pr(t, sv - .15, sv + .35));
  if (cs > 0) { const turn = eIO(pr(t, pm + .1, pm + .9)); clock(c, lerp(540, 190, mv), lerp(560, 400, mv), 180 * cs * lerp(1, .5, mv), turn * Math.PI * 2, Math.PI * .3, TXT, 6, 1, turn); }
  if (t > sv) { const up = eIO(pr(t, op - .2, op + .3)); c.save(); c.translate(540, lerp(0, -150, up)); c.scale(lerp(1, .85, up), lerp(1, .85, up)); c.translate(-540, 0); slot(c, '7×', 540, 860, 340, Y, sv, 16, t); c.restore(); }
  if (t > op) {
    [[380, 330, Y, 0], [560, 330 / 7, EDGE, 3]].forEach(([x, hh, col, st]) => { const p = settle(t, op + st * FR, 14 * FR); if (p <= 0) return; const h2 = hh * p; c.fillStyle = col; rr(c, x, 1260 - h2, 140, h2, Math.min(16, h2 / 2)); c.fill(); });
  }
  if (t > uh) { const s = pop(t, uh, 12), turn = eIO(pr(t, uh + .1, uh + 1.1)); clock(c, 630, 1150, 40 * s, turn * Math.PI * 2, .3, SUB, 4, .9); }
}
function E4(c, t) {
  const dI = C.e4_dia, ss = C.e4_ses, zoomOut = eOut(pr(t, B[4], B[4] + .6));
  const dim = 1 - .4 * pr(t, C.e4_dia_e + .05, C.e4_dia_e + .15) * (t < ss ? 1 : 0);
  c.save(); c.globalAlpha = dim;
  c.translate(540, 760); c.scale(lerp(1.1, 1, zoomOut), lerp(1.1, 1, zoomOut)); c.translate(-540, -760);
  const up = eIO(pr(t, ss - .05, ss + .35)), tl = pr(t, dI - .1, dI + .2);
  c.save(); c.translate(540, lerp(760, 420, up)); c.scale(lerp(1, .6, up), lerp(1, .6, up)); c.translate(-540, -760);
  if (tl > 0) {
    c.strokeStyle = EDGE; c.lineWidth = 4; c.beginPath(); c.moveTo(220, 760); c.lineTo(220 + 640 * eOut(tl), 760); c.stroke();
    const sp = pop(t, dI - .1, 12); c.save(); c.translate(180, 760); c.scale(sp, sp); c.strokeStyle = TXT; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * 27, Math.sin(a) * 27); c.lineTo(Math.cos(a) * 36, Math.sin(a) * 36); c.stroke(); } c.restore();
    const mp = pop(t, dI, 12); c.save(); c.translate(900, 760); c.scale(mp, mp); c.fillStyle = TXT; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill(); c.fillStyle = BG; c.beginPath(); c.arc(10, -8, 22, 0, 7); c.fill(); c.restore();
    const dp = eIO(pr(t, dI, dI + .6)); c.fillStyle = TXT; c.beginPath(); c.arc(lerp(220, 860, dp), 760, 10, 0, 7); c.fill();
  }
  c.restore(); c.restore();
  if (t > ss) {
    slot(c, '60×', 540, 900, 340, RED, ss, 16, t);
    const p = settle(t, ss + .3, 14 * FR); if (p > 0) { c.fillStyle = Y; const h = 260 * p; rr(c, 380, 1260 - h, 140, h, 16); c.fill();
      const tr = Math.sin(t * 80) * 2 * (1 - pr(t, ss + .6, ss + 1.6)); c.fillStyle = RED; rr(c, 560 + tr, 1260 - 6 * p, 140, 6 * p, 3); c.fill(); }
  }
}
const ZERO0 = () => { X.save(); font(X, 340, 700); const dw = X.measureText('0').width; const ls = -.06 * 340; const xw = X.measureText('×').width; X.restore(); const tot = dw * 2 + xw + 2 * ls; return [540 - tot / 2 + dw + ls + dw / 2, 900 - 125]; };
function minuteAngle(t) {           // integral de la velocidad del minutero (vueltas)
  const a = C.e5_cuanto, b = C.e5_cont, e = C.e6_42; let rev = 0; const step = 1 / 120;
  for (let x = a; x < Math.min(t, e); x += step) { let v = x < b ? .25 : 1 + 5 * Math.pow(pr(x, b, e), 1.4); rev += v * step; }
  return rev * Math.PI * 2;
}
function E5(c, t) {
  const cu = C.e5_cuanto, md = C.e5_media, en = C.e5_end, push = eIO(pr(t, en, B[6]));
  c.save(); c.translate(540, 640); c.scale(1 + .12 * push, 1 + .12 * push); c.translate(-540, -640);
  const ma = minuteAngle(t);
  clock(c, 540, 640, 260 * pop(t, B[5] + .05, 14), ma, ma / 12 + 1, TXT, 7);
  for (let i = 0; i < 5; i++) { const s = pop(t, md + i * 3 * FR, 12), w = [300, 380, 260, 340, 290][i]; bubble(c, 540 - w / 2 - 30 + (i % 2) * 60, 940 + i * 66, w, 48, s * .95, 1, 'l', 2, SUB); }
  const q = pop(t, en, 12); if (q > 0) { const pl = 1 + .08 * Math.sin((t - en) * 9); c.save(); c.translate(870, 640); c.scale(q * pl, q * pl); txt(c, '?', 0, 40, 120, 700, Y); c.restore(); }
  c.restore();
  const v = pr(t, en, B[6]); if (v > 0) { const g = c.createRadialGradient(540, 760, 380, 540, 760, 1100); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.45 * v})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
}
const PART = (() => { const o = []; for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2; o.push({ a, tx: 300 + (i * 37 % 480), ty: 640 + (i * 53 % 220) }); } return o; })();
function E6(c, t) {
  const t0 = C.e6_42, end = t0 + 10 * FR;
  const ringR = lerp(260, 450, eOut(pr(t, t0, t0 + .5)));
  c.save(); c.translate(540, 760); c.rotate((t - t0) * .15); c.strokeStyle = EDGE; c.lineWidth = 6; c.globalAlpha = pr(t, t0 + .1, t0 + .4); c.beginPath(); c.arc(0, 0, ringR, 0, 7); c.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(Math.cos(a) * (ringR - 26), Math.sin(a) * (ringR - 26)); c.lineTo(Math.cos(a) * (ringR - 6), Math.sin(a) * (ringR - 6)); c.stroke(); } c.restore();
  const pp = pr(t, t0, end + 4 * FR); if (pp < 1) PART.forEach(p => { const sx = 540 + Math.cos(p.a) * 260, sy = 640 + Math.sin(p.a) * 260, e = eOut(pp);
    c.fillStyle = TXT; c.globalAlpha = 1 - pp; c.beginPath(); c.arc(lerp(sx, p.tx, e), lerp(sy, p.ty, e), 5, 0, 7); c.fill(); c.globalAlpha = 1; });
  slot(c, '42 h', 540, 880, 340, Y, t0, 10, t);
}
function E7(c, t) {
  const u = C.e7_una, n = C.e7_no, sh = pr(t, B[7], B[7] + .3);
  if (sh < 1) { c.strokeStyle = EDGE; c.lineWidth = 6; c.beginPath(); c.arc(540, 760, 450 * (1 - eIO(sh)) + 3, 0, 7); c.stroke(); }
  if (t > u) {
    const s = pop(t, u, 12);
    c.save(); c.translate(540, 620); c.scale(s, s);
    font(c, 110, 600); c.letterSpacing = '-3px'; const w1 = c.measureText('1').width, wr = c.measureText(' de cada 4').width, x0 = -(w1 + wr) / 2;
    withFlash(c, t, u + 12 * FR, [x0, -90, w1, 90], cc => txt(cc, '1', x0, 0, 110, 600, Y, 'left', -3));
    txt(c, ' de cada 4', x0 + w1, 0, 110, 600, TXT, 'left', -3); c.restore();
    [240, 440, 640, 840].forEach((x, i) => {
      const ps = pop(t, u + i * 3 * FR, 12); let col = TXT, a = 1;
      if (i === 0 && t > n) { col = RED; a = 1 - .8 * eIO(pr(t, n + .3, n + 1.6)); }
      person(c, x, 1000, ps * 1.15, col, a, 7);
    });
    bubble(c, 150, 1100, 180, 56, pop(t, n + .1, 12), 1 - .7 * eIO(pr(t, n + .3, n + 1.6)), 'l', 2, SUB);
  }
}
function E8(c, t) {
  const cl0 = C.e8_clin, pa = C.e8_pac, ay = C.e8_ayer, hoy = C.e8_hoy, ya = C.e8_ya;
  const sp = pop(t, cl0, 14), side = eIO(pr(t, ya, ya + .5));
  const vib = (() => { const p = pr(t, pa + .55, pa + .55 + 9 * FR); return p > 0 && p < 1 ? 4 * Math.sin(p * Math.PI * 6) : 0; })();
  const night = pr(t, ay, ay + .2) * (1 - pr(t, hoy, hoy + .6));
  const scr = night > 0 ? mixc(CARD, NIGHT, night) : CARD;
  const px = lerp(540, 330, side) + vib, py = 780, a1 = 1 - .6 * pr(t, ya + .3, ya + .8);
  phone(c, px, py, sp, scr, a1);
  // hora en la pantalla
  if (t > ay) {
    const ap = eOut(pr(t, ay, ay + 8 * FR)), hp = eIO(pr(t, hoy, hoy + .6)), hours = 22 + 12 * hp;
    c.save(); c.globalAlpha = ap * a1; c.beginPath(); c.rect(px - 150, py - 400, 300, 64); c.clip(); font(c, 44, 500); c.textAlign = 'center'; c.fillStyle = TXT;
    const hf = Math.floor(hours), fr = hours - hf;
    [0, 1].forEach(k => { const hh = (hf + k) % 24; c.fillText(String(hh).padStart(2, '0') + ':00', px, py - 350 - fr * 54 + k * 54 + 10 * (1 - ap)); });
    c.restore();
    const sun = pop(t, hoy + .55, 12); if (sun > 0) { c.save(); c.globalAlpha = a1; c.translate(px + 150, py - 375); c.scale(sun, sun); c.fillStyle = Y; c.beginPath(); c.arc(0, 0, 14, 0, 7); c.fill(); c.strokeStyle = Y; c.lineWidth = 3; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283; c.beginPath(); c.moveTo(Math.cos(an) * 20, Math.sin(an) * 20); c.lineTo(Math.cos(an) * 27, Math.sin(an) * 27); c.stroke(); } c.restore(); }
  }
  // paciente y su mensaje
  if (t > pa) {
    const ip = pop(t, pa, 12), arc = eIO(pr(t, ya + .2, ya + 1.0));
    const ix = lerp(150, 820, arc), iy = lerp(380, 380, arc) - Math.sin(Math.PI * arc) * 120;
    person(c, ix, iy, .55 * ip, TXT, 1, 5);
    const fp = eIO(pr(t, pa + .15, pa + .55)), bx = lerp(170, px - 170, fp), by = lerp(420, py - 250, fp), bs = lerp(.5, 1, fp);
    bubble(c, bx, by, 240, 74, pop(t, pa + .1, 10) * bs, a1, 'l', t > ay + .3 ? 2 : 0, SUB);
  }
  // segundo móvil: conversación
  if (t > ya + .1) {
    const s2 = pop(t, ya + .1, 14) * .6; phone(c, 820, 800, s2, CARD, 1);
    for (let i = 0; i < 5; i++) { const ti = ya + .9 + i * .38, s = pop(t, ti, 10); const l = i % 2 === 0; bubble(c, l ? 820 - 105 : 820 + 105 - 110, 620 + i * 66, 110, 44, s * .9, 1, l ? 'l' : 'r'); }
  }
}
function mixc(a, b, p) { const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = h(a), Bc = h(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, Bc[i], p))).join(',')})`; }
function E9(c, t) {
  const pre = C.e9_precio, an = C.e9_anuncios, lo = C.e9_lo;
  if (t < lo) {
    [[pre, 'precio'], [an, 'anuncios']].forEach(([t0, w], k) => {
      const nxt = k ? lo : an; if (t < t0 || t > nxt) return;
      const a = eOut(pr(t, t0, t0 + 6 * FR)) * (1 - eIn(pr(t, nxt - .35, nxt - .05)));
      txt(c, w, 540, 790 + 20 * (1 - a), 120, 600, SUB, 'center', -3.6, a);
      const ww = tw(c, w, 120, 600, -3.6), p = eOut(pr(t, t0 + .25, t0 + .25 + 8 * FR));
      if (p > 0) { c.save(); c.globalAlpha = a; c.fillStyle = RED; c.fillRect(540 - ww / 2 - 10, 748, (ww + 20) * p, 8); c.restore(); }
    });
    return;
  }
  const p = pr(t, lo, lo + 4 * FR), s = lerp(1.3, 1, eOut(p));
  c.save(); c.translate(540, 820); c.scale(s, s);
  txt(c, 'Lo perdiste por', 0, -230, 90, 600, TXT, 'center', -2.7);
  withFlash(c, t, lo + 4 * FR, [-450, -170, 900, 180], cc => txt(cc, 'LA HORA', 0, 0, 220, 700, Y, 'center', -6.6));
  c.restore();
}
function E10(c, t) {
  const m = C.e10_man, es = C.e10_esa, cu = C.e10_cual;
  const grow = eIO(pr(t, es, es + .5)), s0 = pop(t, m, 14);
  const cx = lerp(380, 540, grow), sc = s0 * lerp(1, 1.4, grow);
  const hand = (() => { const tgt = Math.PI * 2 * (9 / 12); const p = pr(t, es + .1, es + .6); return lerp(Math.PI * 2 * (4 / 12), tgt, eOut(p)) + (p > 0 && p < 1 ? 0 : 0) + .06 * Math.sin(Math.PI * cl((p - .6) / .4)) * (p > .6 ? 1 : 0); })();
  const ycol = pr(t, es + .2, es + .5);
  clock(c, cx, 720, 110 * sc, 0, hand, ycol > .5 ? Y : TXT, 6);
  const bA = 1 - eIn(pr(t, es, es + .4));
  if (bA > 0) { const bs = pop(t, m + .25, 12); bubble(c, 590, 650, 300, 74, bs, bA, 'r', 0);
    const ck = pr(t, m + .7, m + .7 + 8 * FR); if (ck > 0) { c.save(); c.globalAlpha = bA; c.strokeStyle = ck >= 1 && t > m + 1.0 ? Y : SUB; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(830, 762); c.lineTo(842, 774); c.lineTo(866, 750); c.stroke(); c.restore(); } }
  // megáfono
  const mp = pop(t, cu - .25, 12) * (1 - eIn(pr(t, cu + .2, cu + .9)));
  if (mp > 0) { c.save(); c.translate(200, 720); c.scale(mp, mp); c.strokeStyle = SUB; c.lineWidth = 6; c.lineJoin = 'round'; c.beginPath(); c.moveTo(-40, -16); c.lineTo(-10, -16); c.lineTo(30, -40); c.lineTo(30, 40); c.lineTo(-10, 16); c.lineTo(-40, 16); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(-26, 16); c.lineTo(-18, 46); c.stroke(); c.restore(); }
  // cierre
  const lg = pr(t, C.PH[9][1] + .15, C.PH[9][1] + .15 + 10 * FR);
  if (lg > 0) txt(c, 'MHFC', 540, 1250, 46, 700, TXT, 'center', 4, .7 * lg);
}
const SC = [E0, E1, E2, E3, E4, E5, E6, E7, E8, E9, E10];
// transición que entra en cada escena i: [tipo, fotogramas, punto]
const TR = { 2: ['zoom', 10, () => [CLIENT.x, CLIENT.y]], 3: ['whipV', 10], 4: ['fast', 8], 5: ['zoom', 10, ZERO0], 6: ['cut'], 7: ['fast', 8], 8: ['whipH', 10], 9: ['zoom', 10, () => [330, 780]], 10: ['fade', 14] };
const IMPACTS = () => [C.e2_brutal, C.e4_ses + 16 * FR, C.e6_42 + 10 * FR, C.e9_lo];

function drawScene(c, i, t) {
  c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none'; c.globalAlpha = 1; c.clearRect(0, 0, W, H);
  if (i === 0) { SC[0](c, t); return; }
  const s = B[i], e = sEnd(i), lt = cl((t - s) / Math.max(.5, e - s));
  let z = 1 + .04 * eIO(lt);
  if (i === 10) z *= 1 - .04 * eIO(pr(t, C.PH[9][1], END));
  if (i === 8) z = 1 + .02 * eIO(lt);
  const [sx, sy] = shake(t, IMPACTS());
  c.translate(540 + sx, 760 + sy); c.scale(z, z); c.translate(-540, -760);
  SC[i](c, t);
  c.setTransform(1, 0, 0, 1, 0, 0);
}
function composite(t) {
  AX.setTransform(1, 0, 0, 1, 0, 0); AX.globalAlpha = 1; AX.filter = 'none'; AX.fillStyle = BG; AX.fillRect(0, 0, W, H);
  for (let i = 0; i <= 10; i++) {
    const s = B[i], e = sEnd(i), tin = TR[i], tout = TR[i + 1];
    const inF = i > 0 && tin && tin[0] !== 'cut' ? tin[1] * FR / 2 : 0, outF = tout && tout[0] !== 'cut' ? tout[1] * FR / 2 : 0;
    if (t < s - inF || t >= e + outF) continue;
    let a = 1, bl = 0, zz = 1, dx = 0, dy = 0, cx = 540, cy = 760;
    if (inF && t < s + inF) { const p = pr(t, s - inF, s + inF), k = tin[0];
      if (k === 'zoom') { zz = lerp(.75, 1, eOut(p)); bl = 18 * (1 - p); a = p; }
      else if (k === 'whipV') { dy = H * (1 - eOut(p)); }
      else if (k === 'whipH') { dx = W * (1 - eOut(p)); }
      else if (k === 'fast') { a = eOut(p); bl = 10 * (1 - p); }
      else if (k === 'fade') { a = eIO(p); } }
    if (outF && t > e - outF) { const p = pr(t, e - outF, e + outF), k = tout[0];
      if (k === 'zoom') { const pt = tout[2](); cx = pt[0]; cy = pt[1]; zz *= 1 + 9 * eIn(p); bl = Math.max(bl, 24 * p); a = Math.min(a, 1 - eIn(p)); }
      else if (k === 'whipV') { dy = -H * eIn(p); }
      else if (k === 'whipH') { dx = -W * eIn(p); }
      else if (k === 'fast') { a = Math.min(a, 1 - eIn(p)); bl = Math.max(bl, 10 * p); }
      else if (k === 'fade') { a = Math.min(a, 1 - eIO(p)); } }
    if (a <= 0) continue;
    drawScene(LX, i, t);
    AX.save(); AX.globalAlpha = a; if (bl > .3) AX.filter = `blur(${bl.toFixed(1)}px)`;
    AX.translate(cx + dx, cy + dy); AX.scale(zz, zz); AX.translate(-cx, -cy); AX.drawImage(LAY, 0, 0); AX.restore();
  }
}

// ---------- subtítulos ----------
const HIDE = new Set();
(function () { const Wd = C.W, mark = (f, from, n) => { const ix = Wd.findIndex((x, k) => x.f === f && x.w.toLowerCase().replace(/[¿?.,…]/g, '') === from); for (let k = 0; k < n; k++) HIDE.add(ix + k); };
  mark(1, 'brutal', 1); mark(2, 'siete', 2); mark(3, 'sesenta', 3); mark(5, 'cuarenta', 4); mark(6, 'una', 4); mark(8, 'precio', 1); mark(8, 'anuncios', 1); mark(8, 'lo', 5); })();
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
