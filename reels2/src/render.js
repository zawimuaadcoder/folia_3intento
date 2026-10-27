// node render.js <reel> [--stills t1,t2] [--cover] [--check]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), B = path.join(ROOT, 'build'), OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const name = process.argv[2], meta = JSON.parse(fs.readFileSync(path.join(B, 'timeline.json')))[name];
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'reel.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([n, m]) => window.setup(n, m), [name, meta]);
  const fps = 30, n = Math.round(meta.total * fps);
  if (process.argv.includes('--check')) {
    const issues = new Set();
    for (let f = 0; f < n; f += 3) { await page.evaluate(t => window.render(t), f / fps); (await page.evaluate(() => window.check())).forEach(x => issues.add(x.replace(/ .*/, '') + ' ' + x.split(' ')[1])); }
    console.log(issues.size ? 'LAYOUT ISSUES: ' + [...issues].join(', ') : 'layout OK (no overlaps, safe zones respected)');
  } else if (arg('--stills')) {
    for (const t of arg('--stills').split(',').map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: path.join(B, `${name}-${t}.png`), scale: 'css' });
    }
  } else if (process.argv.includes('--cover')) {
    await page.evaluate(t => window.render(t, { full: true, nosub: true }), meta.scenes[0].dur - 0.2);
    await page.screenshot({ path: path.join(OUT, `${name}-portada.png`), scale: 'css' });
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'png', '-i', '-',
      '-i', path.join(B, name + '.m4a'), '-map', '0:v', '-map', '1:a',
      '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'copy', '-movflags', '+faststart', '-shortest', path.join(OUT, name + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => window.render(t), f / fps);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(name, f, '/', n);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
