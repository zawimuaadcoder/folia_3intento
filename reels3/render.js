// node render.js [test|reel] [--stills t1,t2]
// test: 7 s style test (test.html). reel: full reel (reel.html + build/timeline.json + audio).
// 60 fps (Instagram's max) with motion blur: SUB subframes per frame across a 180° shutter, averaged.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const mode = process.argv[2] === 'reel' ? 'reel' : (['test2','comp4','test3'].includes(process.argv[2]) ? process.argv[2] : 'test');
const meta = mode === 'reel' ? JSON.parse(fs.readFileSync(path.join(__dirname, 'build', 'timeline.json'))) : (mode === 'test3' ? { total: 20.4, name: 'test3' } : mode === 'comp4' ? { total: 12.6, name: 'comp4' } : mode === 'test2' ? { total: 10, name: 'test2' } : { total: 7, name: 'test' });
const FPS = 60, SUB = 4, SHUTTER = 0.5, si = process.argv.indexOf('--stills');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, mode + '.html'));
  await page.evaluate(() => document.fonts.ready);
  if (mode === 'reel') await page.evaluate(m => setup(m), meta);
  if (si > 0) {
    for (const t of process.argv[si + 1].split(',').map(Number)) { await page.evaluate(t => render(t), t); await page.screenshot({ path: path.join(OUT, `still-${t}.png`) }); }
  } else {
    const audio = mode === 'reel' ? ['-i', path.join(__dirname, 'build', meta.name + '.m4a'), '-map', '0:v', '-map', '1:a', '-c:a', 'copy', '-shortest'] : [];
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-', ...audio,
      '-vf', `tmix=frames=${SUB},framestep=${SUB},format=yuv420p`, '-r', String(FPS),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', path.join(OUT, meta.name + '.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    const n = Math.round(meta.total * FPS);
    for (let f = 0; f < n; f++) {
      for (let s = 0; s < SUB; s++) {
        await page.evaluate(t => render(t), Math.max(0, (f + SHUTTER * (s / SUB - 0.5)) / FPS));
        const buf = await page.screenshot({ type: 'png' });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      if (f % 300 === 0) console.log(f, '/', n);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
