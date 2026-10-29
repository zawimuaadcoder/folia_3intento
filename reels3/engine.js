// Shared motion engine for reels 15+ (Apple-style kinetic type + Claude Design components).
// Scenes: [id, start, end, ui]. Component markup comes verbatim from the Claude Design canvas (comp2/*.html).
const $ = id => document.getElementById(id);
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), p = (t, a, d) => cl((t - a) / d), lerp = (a, b, k) => a + (b - a) * k;
// motion system: quint ease-out for type, cubic in-out for state changes, two springs (pop ~12% overshoot, soft ~5%)
const out = x => 1 - Math.pow(1 - x, 3), out5 = x => 1 - Math.pow(1 - x, 5), io = x => x < .5 ? 4 * x ** 3 : 1 - Math.pow(-2 * x + 2, 3) / 2;
const pop = x => x >= 1 ? 1 : 1 - Math.exp(-7.5 * x) * Math.cos(10.5 * x);
const soft = x => x >= 1 ? 1 : 1 - Math.exp(-6.5 * x) * Math.cos(7.5 * x);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})` };
function popIn(el, t, a, o = {}) {
  const d = o.d ?? .5, k = pop(p(t, a, d)), e = out5(p(t, a, d * .5)); el.style.opacity = e * (o.op ?? 1);
  el.style.filter = e < 1 ? `blur(${(1 - e) * (o.bl ?? 10)}px)` : 'none';
  el.style.transform = `translate(${(1 - k) * (o.dx ?? 0)}px,${(1 - k) * (o.dy ?? 30)}px) scale(${lerp(o.s ?? .85, 1, k)})`; return k
}
const dash = (el, k) => { const L = el.getTotalLength(); el.style.strokeDasharray = L; el.style.strokeDashoffset = L * (1 - k); el.style.opacity = k > 0 ? 1 : 0 };
// ---------- words / timeline ----------
let W = [], TOTAL = 50, CH = [], SC = [];
const w = i => W[i].t, we = i => W[i].e;
function at(word, n = 1) { let c = 0; for (let i = 0; i < W.length; i++) if (W[i].w.toLowerCase() === word.toLowerCase() && ++c === n) return i; throw new Error('word not found: ' + word + ' #' + n) }
const T = (word, n) => w(at(word, n));
// ---------- kinetic type ----------
function mk(host, key, html, size, o = {}) {
  let g = host.querySelector(`[data-k="${key}"]`);
  if (!g) { g = document.createElement('div'); g.dataset.k = key; g.innerHTML = html.map(x => `<span class="kw" style="font-size:${size}px;${o.w ? 'font-weight:' + o.w + ';' : ''}">${x}</span>`).join(''); host.appendChild(g) }
  return [...g.children]
}
// build a line word by word, re-centring as it grows (Apple "could mean 150 devices")
function line(host, key, t, items, size, y, o = {}) {
  const els = mk(host, key, items.map(i => i[1]), size, o), gap = size * .24, ws = els.map(e => e.offsetWidth);
  const pr = items.map(i => out5(p(t, i[0], .28))), pk = items.map(i => pop(p(t, i[0], .45)));
  const Wd = ws.reduce((a, x, i) => a + (x + (i ? gap : 0)) * pr[i], 0); let x = 540 - Wd / 2; const ex = o.out != null ? io(p(t, o.out, .2)) : 0;
  els.forEach((el, i) => {
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = items[i][2] || ''; el.style.opacity = pr[i] * (1 - ex);
    el.style.filter = (pr[i] < 1 || ex) ? `blur(${(1 - pr[i]) * 12 + ex * 14}px)` : 'none';
    el.style.transform = `translateY(${(1 - pk[i]) * 34 - ex * 30}px) scale(${lerp(.9, 1, pk[i])})`; x += (ws[i] + gap) * pr[i]
  })
}
// one word / phrase at a time in the same spot
function swap(host, key, t, items, size, y, o = {}) {
  const els = mk(host, key, items.map(i => i[1]), size, o);
  els.forEach((el, i) => {
    const a = items[i][0], b = i < items.length - 1 ? items[i + 1][0] : (o.end ?? 1e9);
    const k = pop(p(t, a, .45)), e = out5(p(t, a, .22)), x = io(p(t, b - .05, .16));
    el.style.left = (540 - el.offsetWidth / 2) + 'px'; el.style.top = y + 'px'; el.style.color = items[i][2] || '';
    el.style.opacity = e * (1 - x); el.style.filter = (e < 1 || x) ? `blur(${(1 - e) * 14 + x * 16}px)` : 'none';
    el.style.transform = `translateY(${(1 - k) * 40 - x * 36}px) scale(${lerp(.86, 1, k) + x * .05})`
  })
}
// letter by letter (Apple "one day." typed in), optional wave settle
function letters(host, key, t, t0, text, size, y, o = {}) {
  let g = host.querySelector(`[data-k="${key}"]`);
  if (!g) {
    g = document.createElement('div'); g.dataset.k = key; g.className = 'kw'; g.style.fontSize = size + 'px'; if (o.w) g.style.fontWeight = o.w;
    g.innerHTML = [...text].map(c => `<span style="display:inline-block;white-space:pre">${c}</span>`).join(''); host.appendChild(g)
  }
  g.style.left = (540 - g.offsetWidth / 2) + 'px'; g.style.top = y + 'px'; g.style.color = o.color || '';
  const st = o.st ?? .028, ex = o.out != null ? io(p(t, o.out, .2)) : 0; g.style.opacity = 1 - ex; g.style.filter = ex ? `blur(${ex * 14}px)` : 'none';
  [...g.children].forEach((s, i) => {
    const a = t0 + i * st, k = pop(p(t, a, .42)), e = out5(p(t, a, .2)), wv = o.wave ? Math.sin((t - a) * 9) * Math.exp(-(t - a) * 4) * 14 * (t > a) : 0;
    s.style.opacity = e; s.style.filter = e < 1 ? `blur(${(1 - e) * 10}px)` : 'none'; s.style.transform = `translateY(${(1 - k) * (o.dy ?? 46) + wv}px) scale(${lerp(.7, 1, k)})`;
    if (o.blueFrom != null) s.style.color = i >= o.blueFrom ? '#3B87F2' : ''
  })
}
// word with motion trails that collapse into it (Apple "Big")
function echo(host, key, t, t0, text, size, y, o = {}) {
  const els = mk(host, key, [text, text, text, text, text], size, o);
  els.forEach((el, i) => {
    const k = soft(p(t, t0 + i * .03, .6)), e = out5(p(t, t0, .25)), off = [0, -1, 1, -2, 2][i];
    el.style.left = (540 - el.offsetWidth / 2) + 'px'; el.style.top = y + 'px'; el.style.zIndex = i ? 1 : 2;
    el.style.color = i ? (o.trail || 'rgba(59,135,242,.55)') : (o.color || '');
    el.style.opacity = i ? e * (1 - k) * .9 : e; el.style.filter = i ? `blur(${2 + Math.abs(off) * 2}px)` : (e < 1 ? `blur(${(1 - e) * 12}px)` : 'none');
    el.style.transform = `translateX(${i ? off * size * .55 * (1 - k) : 0}px) scale(${i ? 1 : lerp(.9, 1, pop(p(t, t0, .45)))})`
  })
}
// text rising from behind a mask line (Apple "with not so small")
function rise(host, key, t, t0, html, size, y, o = {}) {
  let g = host.querySelector(`[data-k="${key}"]`);
  if (!g) { g = document.createElement('div'); g.dataset.k = key; g.style.cssText = `position:absolute;overflow:hidden;left:0;right:0;text-align:center;height:${size * 1.25}px`; g.innerHTML = `<span class="kw" style="position:relative;display:inline-block;font-size:${size}px;${o.w ? 'font-weight:' + o.w : ''}">${html}</span>`; host.appendChild(g) }
  g.style.top = y + 'px'; const s = g.firstChild, k = soft(p(t, t0, .55)), ex = o.out != null ? io(p(t, o.out, .25)) : 0;
  s.style.transform = `translateY(${(1 - k) * size * 1.3 - ex * size * 1.3}px)`; s.style.color = o.color || ''
}
// iMessage-style typing dots, used as a beat between phrases
function dots(host, key, t, t0, t1, y, color) {
  let g = host.querySelector(`[data-k="${key}"]`);
  if (!g) { g = document.createElement('div'); g.dataset.k = key; g.style.cssText = 'position:absolute;left:0;right:0;display:flex;justify-content:center;gap:18px'; g.innerHTML = '<i></i><i></i><i></i>'; host.appendChild(g);[...g.children].forEach(d => d.style.cssText = 'width:26px;height:26px;border-radius:50%;display:block') }
  g.style.top = y + 'px'; const e = pop(p(t, t0, .35)) * (1 - io(p(t, t1 - .15, .15)));
  [...g.children].forEach((d, i) => { d.style.background = color; d.style.opacity = e * (.35 + .65 * (.5 + .5 * Math.sin((t - t0) * 9 - i * 1.1))); d.style.transform = `scale(${e}) translateY(${-8 * Math.max(0, Math.sin((t - t0) * 9 - i * 1.1))}px)` })
}
// ---------- subtitles (component scenes only) ----------
function buildSubs() { let cur = []; W.forEach((x, i) => { cur.push(i); if (/[.,:?!…]$/.test(x.w) || cur.length >= 5) { CH.push(cur); cur = [] } }); if (cur.length) CH.push(cur) }
function subs(t, on) {
  const el = $('sub'); if (!on) { el.style.opacity = 0; return }
  let c = CH.find(c => t >= W[c[0]].t - .1 && t < (W[c[c.length - 1]].e + .2)); if (!c) { el.style.opacity = 0; return }
  const key = c.join(','); if (el.dataset.k !== key) { el.dataset.k = key; el.innerHTML = c.map(i => `<span>${W[i].w}</span>`).join('') }
  [...el.children].forEach((s, j) => { const k = out(p(t, W[c[j]].t - .05, .15)); s.style.color = `rgba(29,31,32,${.25 + .75 * k})` });
  const k0 = out5(p(t, W[c[0]].t - .1, .2)); el.style.opacity = k0; el.style.transform = `translateY(${(1 - k0) * 10}px)`
}
// ---------- frame ----------
const HOOKS = {};
function frame(t) {
  let cur; for (const s of SC) { const on = t >= s[1] && t < s[2]; $(s[0]).style.display = on ? 'block' : 'none'; if (on) cur = s }
  const [id, a, b, ui] = cur, l = t - a, sc = $(id); subs(t, ui);
  const ein = soft(p(l, 0, .55)), eout = io(p(t, b - .18, .18)), push = 1 + .022 * Math.min(l, 4);
  const stage = sc.querySelector('.st'), kt = sc.querySelector('.kt');
  if (stage) { if (!sc.dataset.bg) { const r = stage.firstElementChild; sc.style.background = r.style.background || r.style.backgroundColor; sc.dataset.bg = 1 }
    const s = +(stage.dataset.z || 1.8) * push * lerp(.94, 1, ein); stage.style.transform = `translate(${540 - 300 * s}px,${880 - 300 * s}px) scale(${s})` }
  if (kt) kt.style.transform = `scale(${push})`;
  sc.style.filter = eout ? `blur(${eout * 18}px)` : 'none'; sc.style.opacity = 1 - eout * .6;
  HOOKS[id] && HOOKS[id](t, a, b, l)
}
window.render = frame;
