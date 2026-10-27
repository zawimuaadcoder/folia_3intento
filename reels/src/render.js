// Usage: node render.js <reel-name> [--stills t1,t2,...] [--cover]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), B = path.join(ROOT, 'build'), OUT = path.join(ROOT, 'out');
fs.mkdirSync(OUT, { recursive: true });
const name = process.argv[2], meta = JSON.parse(fs.readFileSync(path.join(B, 'timeline.json')))[name];
meta.total = meta.total;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'reel.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(([n, m]) => window.setup(n, m), [name, meta]);
  if (arg('--stills')) {
    for (const t of arg('--stills').split(',').map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: path.join(B, `${name}-${t}.png`) });
    }
  } else if (process.argv.includes('--cover')) {
    const s0 = meta.scenes[0];
    await page.evaluate(t => window.render(t, { full: true, nosub: true }), s0.dur - 0.3);
    await page.screenshot({ path: path.join(OUT, `${name}-portada.png`) });
  } else {
    const fps = 30, n = Math.round(meta.total * fps);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
      '-i', path.join(B, name + '.m4a'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', path.join(OUT, name + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < n; f++) {
      await page.evaluate(t => window.render(t), f / fps);
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log(name, f, '/', n);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
