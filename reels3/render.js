// node render.js [--stills t1,t2]  -> renders test.html (7 s) to out/test.mp4
// 60 fps output with motion blur: SUB subframes rendered per output frame and averaged.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const DUR = 7, FPS = 60, SUB = 4, SHUTTER = 0.5, si = process.argv.indexOf('--stills');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'test.html'));
  await page.evaluate(() => document.fonts.ready);
  if (si > 0) {
    for (const t of process.argv[si + 1].split(',').map(Number)) { await page.evaluate(t => render(t), t); await page.screenshot({ path: path.join(OUT, `still-${t}.png`) }); }
  } else {
    // subframes piped in at FPS*SUB, averaged by tmix, then decimated to FPS
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'png', '-i', '-',
      '-vf', `tmix=frames=${SUB},framestep=${SUB},format=yuv420p`, '-r', String(FPS),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', path.join(OUT, 'test.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < DUR * FPS; f++) for (let s = 0; s < SUB; s++) {
      await page.evaluate(t => render(t), (f + SHUTTER * (s / SUB - 0.5)) / FPS);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
