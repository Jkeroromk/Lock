// Turns raw simulator screenshots into App Store posters (headline + device).
//
//   node scripts/screenshots/posters.mjs <raw dir> <out dir>
//
// <raw>/<device>/<lang>/<shot>.png → <out>/<locale>/<device>/<NN>-<shot>.jpg
// device: iphone69 (1320×2868, the 6.9" slot) | duo (1398×2034, iPhone Duo outer).
// Needs playwright (npx playwright install chromium).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const [rawDir, outDir] = process.argv.slice(2);
if (!rawDir || !outDir) throw new Error('usage: posters.mjs <raw dir> <out dir>');
const FONTS = path.resolve('assets/fonts');
const font = (f) => pathToFileURL(path.join(FONTS, f)).href;

const INK = '#0A0A0A', CREAM = '#F2F1EC', Y = '#FFD43B';

// App Store order. `[...]` marks the accent part of a headline.
const SHOTS = [
  { shot: 'photo', theme: 'yellow', rot: -2,
    zh: { h: '拍一下，<br>记好了。', s: 'AI 认出盘里每样菜，热量、三大营养素、纤维和钠一次算好。', tag: '纤维 · 钠 也算' },
    en: { h: 'Snap it.<br>Logged.', s: 'AI breaks your plate into calories, macros, fiber and sodium in seconds.', tag: 'Fiber + sodium too' } },
  { shot: 'today', theme: 'ink', rot: 2,
    zh: { h: '一天，<br>[一个表盘]。', s: '剩余热量、宏量、喝水和步数，一屏看完。' },
    en: { h: 'Your day.<br>[One dial.]', s: 'Calories left, macros, water and steps, all on one screen.' } },
  { shot: 'train', theme: 'cream', rot: -2,
    zh: { h: '按计划，<br>练到位。', s: '一组一组跟着练，带着上次的重量，组间休息自动计时。', tag: '自动加重' },
    en: { h: 'Train with<br>a plan.', s: "Follow every set with last time's numbers and a rest timer.", tag: 'Auto progression' } },
  { shot: 'buddy', theme: 'ink', rot: 2,
    zh: { h: '陪你变强的<br>[小伙伴]。', s: '3D 教练豆豆带着你的伙伴一起长大。你练、你走、你吃好，它就长大。', tag: '3D 伙伴' },
    en: { h: 'A buddy that<br>[grows with you.]', s: 'Train, walk and eat well, and your 3D buddy grows up with you.', tag: '3D buddy' } },
  { shot: 'couple', theme: 'yellow', rot: -2,
    zh: { h: '拉上 TA，<br>一起坚持。', s: '情侣空间：看彼此的一天，提醒喝水、戳 TA 去练，一起布置小家。', tag: '情侣空间' },
    en: { h: 'Lock in<br>together.', s: "A couple space: see each other's day, nudge, and build your room together.", tag: 'Couple space' } },
  { shot: 'friends', theme: 'cream', rot: 2,
    zh: { h: '好友排行，<br>互相较劲。', s: '和朋友比连续打卡，摸摸他们的伙伴，给彼此打气。' },
    en: { h: 'Friends keep<br>you going.', s: "A streak leaderboard, and pat a friend's buddy to cheer them on." } },
  { shot: 'log', theme: 'ink', rot: -2,
    zh: { h: '忘了记？<br>[补上就行]。', s: '按照片的拍摄时间补记，最近吃过的点一下再记一次。', tag: '30 天内可补记' },
    en: { h: 'Forgot to log?<br>[Add it later.]', s: 'Backdate by photo time, or re-log a recent meal in one tap.', tag: 'Backdate 30 days' } },
];

const DEVICES = {
  iphone69: { W: 1320, H: 2868, size: 180, sub: 50, top: 150, frameTop: 860, frameW: 1060, radius: 150, border: 28 },
  duo: { W: 1398, H: 2034, size: 132, sub: 42, top: 110, frameTop: 610, frameW: 1080, radius: 120, border: 26 },
};

const THEMES = {
  yellow: { bg: Y, fg: INK, sub: '#3A3A37', frame: INK, shadow: INK, accent: INK, tagBg: CREAM },
  ink: { bg: INK, fg: CREAM, sub: '#C9C8C2', frame: CREAM, shadow: Y, accent: Y, tagBg: Y },
  cream: { bg: CREAM, fg: INK, sub: '#3A3A37', frame: INK, shadow: INK, accent: INK, tagBg: Y },
};

function html({ dev, theme, copy, img, rot, zh }) {
  const d = DEVICES[dev], t = THEMES[theme];
  const h = copy.h.replace(/\[(.+?)\]/g, `<span style="color:${t.accent}">$1</span>`);
  const tag = copy.tag
    ? `<div class="tag" style="top:${d.frameTop - 70}px;transform:rotate(${rot > 0 ? -5 : 5}deg)">${copy.tag}</div>`
    : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;900&display=block" rel="stylesheet">
<style>
@font-face{font-family:Brico;src:url(${font('BricolageGrotesque-ExtraBold.ttf')});font-weight:800}
@font-face{font-family:Brico;src:url(${font('BricolageGrotesque-Medium.ttf')});font-weight:500}
html,body{margin:0}
.p{width:${d.W}px;height:${d.H}px;background:${t.bg};color:${t.fg};position:relative;overflow:hidden;
  font-family:${zh ? "'Noto Sans SC','PingFang SC'" : "Brico,'Noto Sans SC'"},sans-serif}
.copy{position:absolute;left:${Math.round(d.W * 0.08)}px;right:${Math.round(d.W * 0.08)}px;top:${d.top}px}
h1{margin:0;font-weight:${zh ? 900 : 800};font-size:${d.size}px;line-height:${zh ? 1.12 : 0.95};letter-spacing:${zh ? '-0.01em' : '-0.04em'}}
p{margin:${Math.round(d.sub * 0.8)}px 0 0;font-size:${d.sub}px;font-weight:500;line-height:1.38;color:${t.sub}}
.dev{position:absolute;left:${(d.W - d.frameW) / 2}px;top:${d.frameTop}px;width:${d.frameW}px;box-sizing:border-box;
  border:${d.border}px solid ${t.frame};border-radius:${d.radius}px;overflow:hidden;background:${t.frame};
  box-shadow:24px 24px 0 ${t.shadow};transform:rotate(${rot}deg)}
.dev img{display:block;width:100%;border-radius:${d.radius - d.border}px}
.tag{position:absolute;right:${Math.round(d.W * 0.05)}px;padding:16px 28px;border-radius:22px;border:5px solid ${INK};
  background:${t.tagBg};color:${INK};font-family:${zh ? "'Noto Sans SC'" : 'Brico'},sans-serif;font-weight:900;
  font-size:${Math.round(d.sub * 0.9)}px;box-shadow:9px 9px 0 ${INK};white-space:nowrap;z-index:2}
</style></head><body><div class="p">
<div class="copy"><h1>${h}</h1><p>${copy.s}</p></div>
<div class="dev"><img src="${pathToFileURL(img).href}"></div>${tag}
</div></body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
let made = 0;
for (const dev of Object.keys(DEVICES)) {
  for (const lang of ['zh-CN', 'en-US']) {
    const locale = lang === 'zh-CN' ? 'zh-Hans' : 'en-US';
    for (const [i, s] of SHOTS.entries()) {
      const img = path.resolve(rawDir, dev, lang, `${s.shot}.png`);
      if (!fs.existsSync(img)) continue;
      const d = DEVICES[dev];
      const zh = lang === 'zh-CN';
      const file = path.resolve(outDir, locale, dev, `${String(i + 1).padStart(2, '0')}-${s.shot}.jpg`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = path.resolve(outDir, '.tmp.html');
      fs.writeFileSync(tmp, html({ dev, theme: s.theme, copy: zh ? s.zh : s.en, img, rot: s.rot, zh }));
      await page.setViewportSize({ width: d.W, height: d.H });
      await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // JPEG: App Store Connect rejects screenshots with an alpha channel.
      await page.screenshot({ path: file, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: d.W, height: d.H } });
      made++;
      console.log(path.relative(outDir, file));
    }
  }
}
fs.rmSync(path.resolve(outDir, '.tmp.html'), { force: true });
await browser.close();
console.log(`${made} posters`);
