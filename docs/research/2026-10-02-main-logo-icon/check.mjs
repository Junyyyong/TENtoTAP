// Research-only local browser checks. TAPtoTALK is read-only; Vite caches live
// in a temporary folder. No Android build, release or Git mutation here.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { default: sharp } = await import(process.env.SHARP_MODULE || 'sharp');
const root = process.cwd(), reference = '/Users/scdi/Documents/ChatGPT/TAPtoTALK';
const out = process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'Use a new output folder; never overwrite evidence');
fs.mkdirSync(out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-logo-before-'));
const old = path.join(tmp, 'before'); fs.mkdirSync(old);
const revision = '97b9b0c222b78cdd4d9f579107d27771fe60ee1b';
// Extract the actual historical runtime, not years of unrelated research PNGs.
execFileSync('tar', ['-xf', '-', '-C', old], { input: execFileSync('git', ['archive', revision,
  'src', 'public', 'index.html', 'package.json', 'tsconfig.json', 'android/app/src/main/res', 'store/icon-source.png'],
  { maxBuffer: 256 * 1024 * 1024 }) });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(old, 'node_modules'));
const sha = b => createHash('sha256').update(b).digest('hex');
const referenceFiles = ['src/ui/styles/title.css', 'src/ui/styles/nativeFrame.css', 'src/ui/styles/nativeResponsive.css',
  'public/assets/brand/taptotalk-logo-0911.png', 'src/ui/nativeFrame.ts', 'index.html'];
const referenceHashes = Object.fromEntries(referenceFiles.map(f => [f, sha(fs.readFileSync(path.join(reference, f)))]));
const report = { capturedAt: new Date().toISOString(), revision, beforeDirectory: old, referenceHashes,
  conditions: { viewport: [390, 844], dpr: 2, png: [780, 1688], clock: '2026-10-02T00:00:00Z', seed: 20261002,
    locale: 'en-US', timezone: 'Asia/Seoul', profile: 'fresh localStorage, music/sound/haptics off',
    native: 'trackNativeFrame(true) source-route simulation; no Android WebView or physical device',
    animation: 'finite finished, infinite paused at zero' }, alpha: {}, screens: [], density: [], icons: [], errors: [] };
for (const [name, file] of [['TEN', path.join(root, 'public/cover-logo.svg')], ['TALK', path.join(reference, referenceFiles[3])]]) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const thresholds = {};
  for (const threshold of [0, 8, 32]) {
    let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * info.channels + info.channels - 1] > threshold) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    thresholds[threshold] = { x0, x1, y0, y1, widthRatio: (x1 - x0 + 1) / info.width, heightRatio: (y1 - y0 + 1) / info.height };
  }
  report.alpha[name] = { sha256: sha(fs.readFileSync(file)), rasterSize: [info.width, info.height], thresholds };
}
assert.equal(sha(fs.readFileSync(path.join(old, 'public/cover-logo.svg'))), report.alpha.TEN.sha256);
assert.equal(sha(fs.readFileSync(path.join(old, 'store/icon-source.png'))), sha(fs.readFileSync('store/icon-source.png')));
for (const f of ['public/studio-logo.png', 'public/cover.webp', 'src/ui/styles/tokens.css', 'src/ui/styles/nativeResponsive.css', 'src/ui/nativeFrame.ts']) {
  assert.equal(sha(fs.readFileSync(path.join(old, f))), sha(fs.readFileSync(path.join(root, f))), `${f} is preserved`);
}
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
report.conditions.browser = browser.version();
const servers = [];
try {
  const urls = {};
  for (const [name, dir] of [['before', old], ['after', root], ['talk', reference]]) {
    const server = await createServer({ root: dir, cacheDir: path.join(tmp, `cache-${name}`),
      server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
    await server.listen(); servers.push(server); urls[name] = server.resolvedUrls.local[0];
  }
  async function capture(name, width, height, native, file) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      locale: 'en-US', timezoneId: 'Asia/Seoul' });
    await context.addInitScript(() => {
      const settings = JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false });
      localStorage.setItem('makezero.settings.v1', settings); localStorage.setItem('taptotalk.preferences.v1', settings);
      let seed = 20261002; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    });
    if (native) await context.route('**/src/main.ts', async route => {
      const response = await route.fetch(), body = await response.text();
      const next = body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/, 'trackNativeFrame(true)')
        .replace(/trackTalkTitleLayout\(Capacitor\.getPlatform\(\) === ["']android["']\)/, 'trackTalkTitleLayout(true)');
      assert.notEqual(next, body); await route.fulfill({ response, body: next });
    });
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(String(e)));
    await page.clock.install({ time: new Date(report.conditions.clock) }); await page.clock.pauseAt(new Date(report.conditions.clock));
    await page.goto(urls[name], { waitUntil: 'networkidle' }); await page.clock.runFor(8000);
    await page.evaluate(async () => { await document.fonts.ready; for (const a of document.getAnimations()) {
      if (a.effect?.getTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
    } });
    await page.screenshot(); await page.clock.runFor(400); await page.screenshot(); await page.clock.runFor(40);
    const metrics = await page.evaluate(() => {
      const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
      const art = document.querySelector('.brand-mark'), screen = document.querySelector('#screen-title'), css = getComputedStyle(screen);
      return { app: rect(document.querySelector('#app')), logo: rect(art), block: rect(document.querySelector('.brand-block')),
        logicalWidth: parseFloat(getComputedStyle(document.querySelector('#app')).width), logicalHeight: parseFloat(getComputedStyle(document.querySelector('#app')).height),
        others: [...document.querySelectorAll('#screen-title .mode-btn, #screen-title .title-links')].map(e => ({ rect: rect(e),
          font: getComputedStyle(e).font, color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor })),
        modeTop: document.querySelector('.mode-list').getBoundingClientRect().top, gap: parseFloat(css.rowGap),
        center: { x: art.getBoundingClientRect().x + art.getBoundingClientRect().width / 2,
          y: art.getBoundingClientRect().y + art.getBoundingClientRect().height / 2 }, factor: art.style.getPropertyValue('--main-logo-scale') || '1' };
    });
    metrics.visibleWidth = metrics.logo.width * report.alpha[name === 'talk' ? 'TALK' : 'TEN'].thresholds[8].widthRatio;
    if (file) { const png = await page.screenshot({ path: path.join(out, file) }); const m = await sharp(png).metadata();
      assert.equal(m.width, 780); assert.equal(m.height, 1688); metrics.capture = { file, sha256: sha(png) }; }
    await context.close(); return metrics;
  }
  const cases = [[390,844,true], [360,740,true], [430,932,true], [390,640,true], [800,1280,true], [1024,768,true], [390,844,false], [390,560,false]];
  for (const [width,height,native] of cases) {
    const shots = width === 390 && height === 844 ? (native ? 'native' : 'web') : null;
    const before = await capture('before',width,height,native,shots && `before-${shots}.png`);
    const after = await capture('after',width,height,native,shots && `after-${shots}.png`);
    const talk = await capture('talk',width,height,native,shots && `reference-talk-${shots}.png`);
    assert.deepEqual(after.others, before.others, 'Menu/buttons/settings positions and styles unchanged');
    assert.deepEqual(after.block, before.block, 'Original flex space unchanged');
    assert(Math.abs(after.center.x - before.center.x) < .02 && Math.abs(after.center.y - before.center.y) < .02, 'Logo center unchanged');
    assert(Math.abs(after.logo.width / after.logo.height - before.logo.width / before.logo.height) < .00001, 'Original artwork aspect unchanged');
    assert(after.logo.x >= after.app.x - .02 && after.logo.y >= after.app.y - .02, 'No logo clipping');
    assert(after.logo.y + after.logo.height <= after.modeTop + .02, 'No logo overlap with menu');
    const capped = after.visibleWidth < talk.visibleWidth - .5;
    if (!capped) assert(Math.abs(after.visibleWidth - talk.visibleWidth) < .15, 'Same actual visible width as TALK');
    report.screens.push({ width,height,native,before,after,talk,capped,pass:true });
  }
  for (const density of [2,2.4,3,3.6,4]) {
    const metrics = await capture('after',1080/density,2340/density,true,null);
    const normalized = { width:metrics.logo.width*density,height:metrics.logo.height*density,x:metrics.logo.x*density,y:metrics.logo.y*density };
    if (report.density.length) for (const [k,v] of Object.entries(normalized)) assert(Math.abs(v-report.density[0].physical[k])<.15, 'Same-device density keeps logo geometry');
    report.density.push({density,physical:normalized,pass:true});
  }
  const source=fs.readFileSync('store/icon-source.png');
  for (const [density,scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
    for (const [file,size] of [['ic_launcher.png',48*scale],['ic_launcher_round.png',48*scale],['ic_launcher_foreground.png',108*scale]]) {
      const f=`android/app/src/main/res/mipmap-${density}/${file}`,b=fs.readFileSync(f),m=await sharp(b).metadata(); assert.equal(m.width,size);assert.equal(m.height,size);
      report.icons.push({file:f,size,sha256:sha(b)});
    }
    const layer=await sharp(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`).extract({left:18*scale,top:18*scale,width:72*scale,height:72*scale}).raw().toBuffer();
    const expected=await sharp(source).resize(72*scale,72*scale,{fit:'cover',position:'centre',kernel:'lanczos3'}).toColourspace('srgb').raw().toBuffer();
    assert.deepEqual(layer,expected,'Adaptive mask viewport exactly equals edge-to-edge original artwork');
  }
  assert(fs.readFileSync('android/app/src/main/res/values/ic_launcher_background.xml','utf8').includes('#00000000'));
  for (const [name,dir] of [['before',old],['after',root]]) {
    const layer=await sharp(path.join(dir,'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png'))
      .flatten({background:name==='before'?'#ea5836':'#fff'}).extract({left:72,top:72,width:288,height:288}).png().toBuffer();
    const mask=Buffer.from('<svg width="288" height="288"><circle cx="144" cy="144" r="144" fill="white"/></svg>');
    await sharp(layer).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toFile(path.join(out,`${name}-icon-circle.png`));
  }
  for (const f of referenceFiles) assert.equal(sha(fs.readFileSync(path.join(reference,f))), referenceHashes[f], 'Read-only reference remains unchanged');
  assert.equal(report.errors.length,0); report.pass=true;
} finally {
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close(); await Promise.all(servers.map(s=>s.close()));
}
console.log(JSON.stringify({pass:report.pass,screens:report.screens.length,density:report.density.length,icons:report.icons.length,
  referencePhone:report.screens[0],errors:report.errors},null,2));
