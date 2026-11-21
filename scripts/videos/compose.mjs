// Turns simulator recordings into finished 1080×1920 promo videos:
// caption on top, the phone screen in a brand frame below, then the Kero Lock end card.
//
//   node scripts/videos/compose.mjs <spec.json> <recordings dir> <out dir>
//
// Recordings come from scripts/videos/record.sh (<id>-<lang>.mov + .timeline.json + .meta.json).
// Writes <out>/<id>-<lang>.mp4. Needs playwright (chromium) and ffmpeg.
// Captions: `*word*` gets the yellow highlight.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [specPath, recDir, outDir] = process.argv.slice(2);
if (!specPath || !recDir || !outDir) throw new Error('usage: compose.mjs <spec.json> <recordings dir> <out dir>');
fs.mkdirSync(outDir, { recursive: true });

const W = 1080, H = 1920, FPS = 30;
const PHONE = { x: 204, y: 420, w: 672, h: 1460, r: 60 }; // 1320×2868 screen scaled to 1460 high
const INK = '#0A0A0A', CREAM = '#F2F1EC', Y = '#FFD43B';
const font = (f) => pathToFileURL(path.resolve('assets/fonts', f)).href;
const ENDCARD = path.resolve('marketing/video/endcard/endcard.html');
const ENDCARD_SECONDS = 3.5, SNAP = 0.75; // must match endcard.html / render.py

const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kl-video-'));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function frameHtml(caption, lang) {
  const text = esc(caption || '').replace(/\*(.+?)\*/g, '<mark>$1</mark>').replace(/\n/g, '<br>');
  const zh = lang === 'zh';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: 'Bricolage'; src: url('${font('BricolageGrotesque-ExtraBold.ttf')}'); font-weight: 800; }
    @font-face { font-family: 'GeistMono'; src: url('${font('GeistMono-SemiBold.ttf')}'); font-weight: 600; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: ${INK}; overflow: hidden; }
    .brand { position: absolute; top: 54px; left: 0; right: 0; text-align: center; font: 600 26px 'GeistMono', monospace;
             letter-spacing: 8px; color: #8C8B86; }
    .cap { position: absolute; top: 110px; left: 64px; right: 64px; height: 270px; display: flex; align-items: center; justify-content: center; }
    .cap div { text-align: center; color: ${CREAM}; line-height: 1.12; text-wrap: balance;
               font-family: ${zh ? "'PingFang SC', 'Noto Sans CJK SC', 'Bricolage', sans-serif" : "'Bricolage', 'PingFang SC', sans-serif"};
               font-weight: ${zh ? 900 : 800}; letter-spacing: ${zh ? '1px' : '-1.5px'}; }
    mark { background: ${Y}; color: ${INK}; padding: 0 14px; border-radius: 14px; -webkit-box-decoration-break: clone; }
    .frame { position: absolute; left: ${PHONE.x - 6}px; top: ${PHONE.y - 6}px; width: ${PHONE.w + 12}px; height: ${PHONE.h + 12}px;
             border-radius: ${PHONE.r + 6}px; background: ${CREAM}; box-shadow: 16px 16px 0 ${Y}; }
  </style></head><body>
    <div class="brand">KERO LOCK</div>
    <div class="cap"><div id="t">${text}</div></div>
    <div class="frame"></div>
    <script>
      // Shrink until it fits the caption box (2 lines at most for normal copy).
      // (Block scope: setContent reuses the window, so top-level consts would clash on the next frame.)
      {
        const el = document.getElementById('t'), box = el.parentElement;
        let size = 92; el.style.fontSize = size + 'px';
        while (size > 44 && (el.scrollHeight > box.clientHeight || el.scrollWidth > box.clientWidth)) { size -= 4; el.style.fontSize = size + 'px'; }
      }
    </script>
  </body></html>`;
}

const maskHtml = `<!DOCTYPE html><html><body style="margin:0;background:#000;width:${PHONE.w}px;height:${PHONE.h}px">
  <div style="width:${PHONE.w}px;height:${PHONE.h}px;border-radius:${PHONE.r}px;background:#fff"></div></body></html>`;

async function renderEndcards(page) {
  const click = path.join(tmp, 'click.wav');
  const expr = '0.9*sin(2*PI*85*t)*exp(-t*38)+0.35*(random(0)*2-1)*exp(-t*140)';
  ff(['-f', 'lavfi', '-i', `aevalsrc=${expr}:s=48000:d=0.3`,
    '-af', `lowpass=f=2400,adelay=${Math.round(SNAP * 1000)}:all=1,apad,atrim=0:${ENDCARD_SECONDS},volume=0.9`,
    '-ac', '2', '-c:a', 'pcm_s16le', click]);
  const cards = {};
  for (const lang of ['en', 'zh']) {
    const dir = fs.mkdtempSync(path.join(tmp, `end-${lang}-`));
    await page.goto(pathToFileURL(ENDCARD).href + `?lang=${lang}`);
    await page.evaluate('document.fonts.ready');
    for (let i = 0; i < Math.round(ENDCARD_SECONDS * FPS); i++) {
      await page.evaluate(`render(${i / FPS})`);
      await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.png`) });
    }
    cards[lang] = path.join(tmp, `endcard-${lang}.mp4`);
    ff(['-framerate', String(FPS), '-i', path.join(dir, '%04d.png'), '-i', click,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', cards[lang]]);
  }
  return cards;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const cards = await renderEndcards(page);

const maskPage = await browser.newPage({ viewport: { width: PHONE.w, height: PHONE.h } });
await maskPage.setContent(maskHtml);
const mask = path.join(tmp, 'mask.png');
await maskPage.screenshot({ path: mask });

let made = 0;
for (const v of spec.videos) {
  for (const lang of v.langs ?? ['en', 'zh']) {
    const name = `${v.id}-${lang}`;
    const mov = path.join(recDir, `${name}.mov`);
    if (!fs.existsSync(mov)) { console.warn(`skip ${name}: no recording`); continue; }
    const tl = JSON.parse(fs.readFileSync(path.join(recDir, `${name}.timeline.json`), 'utf8'));
    const { goOffset } = JSON.parse(fs.readFileSync(path.join(recDir, `${name}.meta.json`), 'utf8'));
    const scenes = tl.filter((s) => s.scene !== 'end');
    const endMs = tl.find((s) => s.scene === 'end')?.start ?? scenes.at(-1).start + 3000;

    // Each scene keeps only its last `ms` (the settled screen): loading, analysis spinners and
    // 3D warm-up before that are cut, however long they took on the simulator.
    const segs = scenes.map((s, i) => {
      const end = (i + 1 < scenes.length ? scenes[i + 1].start : endMs) / 1000;
      const want = (v.scenes[i]?.ms ?? 3000) / 1000;
      const from = Math.max(s.start / 1000, end - want);
      return { from: goOffset + from, dur: Math.max(0.2, end - from), caption: v.scenes[i]?.caption?.[lang] ?? '' };
    });
    const total = segs.reduce((a, b) => a + b.dur, 0);

    const inputs = [];
    for (const sg of segs) inputs.push('-ss', sg.from.toFixed(3), '-t', sg.dur.toFixed(3), '-i', mov);
    for (const [i, sg] of segs.entries()) {
      const png = path.join(tmp, `${name}-bg${i}.png`);
      await page.setContent(frameHtml(sg.caption, lang));
      await page.evaluate('document.fonts.ready');
      await page.screenshot({ path: png });
      inputs.push('-loop', '1', '-framerate', String(FPS), '-t', sg.dur.toFixed(3), '-i', png);
    }
    const n = segs.length; // inputs: 0..n-1 recording pieces, n..2n-1 backgrounds, 2n mask, 2n+1 silence
    const body = path.join(tmp, `${name}-body.mp4`);
    const graph = [
      `${segs.map((_, i) => `[${i}:v]fps=${FPS},setpts=PTS-STARTPTS[r${i}]`).join(';')}`,
      `${segs.map((_, i) => `[r${i}]`).join('')}concat=n=${n}:v=1:a=0,scale=${PHONE.w}:${PHONE.h}:flags=lanczos,format=rgba[ph]`,
      `${segs.map((_, i) => `[${n + i}:v]`).join('')}concat=n=${n}:v=1:a=0,fps=${FPS},format=yuv420p[bg]`,
      `[${2 * n}:v]format=gray,scale=${PHONE.w}:${PHONE.h}[m]`,
      `[ph][m]alphamerge[phm]`,
      `[bg][phm]overlay=${PHONE.x}:${PHONE.y}:shortest=1,format=yuv420p[v]`,
    ].join(';');
    ff([...inputs,
      '-loop', '1', '-i', mask,
      '-f', 'lavfi', '-t', total.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo',
      '-filter_complex', graph, '-map', '[v]', '-map', `${2 * n + 1}:a`,
      '-t', total.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', body]);
    const bgs = segs;

    const out = path.join(outDir, `${name}.mp4`);
    ff(['-i', body, '-i', cards[lang] ?? cards.en, '-filter_complex',
      '[0:v]setsar=1[v0];[1:v]setsar=1[v1];[0:a]aformat=channel_layouts=stereo[a0];[1:a]aformat=channel_layouts=stereo[a1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]',
      '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-r', String(FPS), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
    // A still from the middle of each scene, for a quick look without playing the video.
    bgs.reduce((t, b, i) => {
      ff(['-ss', (t + b.dur / 2).toFixed(2), '-i', out, '-frames:v', '1', '-vf', 'scale=540:-1', path.join(outDir, `${name}-scene${i + 1}.jpg`)]);
      return t + b.dur;
    }, 0);
    console.log(`${out} (${(total + ENDCARD_SECONDS).toFixed(1)} s)`);
    made++;
  }
}
await browser.close();
if (!made) { console.error('No videos were composed'); process.exit(1); }
