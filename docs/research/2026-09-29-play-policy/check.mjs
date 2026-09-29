import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.CAPTURE_OUT || import.meta.dirname;
if (fs.existsSync(path.join(out, 'verification.json'))) throw new Error('Choose a new CAPTURE_OUT to preserve the original research.');
fs.mkdirSync(out, { recursive: true });
const revision = '2515854260cbc2e9a6d2950499238649644d28f0';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-policy-before-'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['index.html', 'src/ui/screens/settingsScreen.ts', 'src/ui/screens/legalDocuments.ts', 'src/ui/styles/picker.css',
  'public/privacy.html', 'public/licenses.html', 'public/legal/legal.css', 'public/legal/dependencies.json'];
const sourceHashes = Object.fromEntries(files.map(f => [f, sha(fs.readFileSync(f))]));
const captures = [], checks = [], errors = [], externalRequests = [];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
async function click(page, selector) { await page.locator(selector).click({ force: true }); await page.clock.runFor(300); }
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    }
  });
  const file = path.join(out, name + '.png');
  assert(!fs.existsSync(file), `Refusing to overwrite ${file}`);
  await page.screenshot({ path: file });
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  captures.push({ file: name + '.png', sha256: sha(bytes) });
}
async function storage(page) {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage).sort(([a],[b]) => a.localeCompare(b))));
}
async function openDocument(page, id, title) {
  await click(page, id);
  const frame = page.frameLocator('#legal-frame');
  await frame.locator('h1').first().waitFor();
  assert.equal(await frame.locator('h1').first().innerText(), title);
  await frame.locator('body').evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('#legal-dialog').evaluate(e => e.open), true);
  return frame;
}
try {
  execFileSync('tar', ['-xf', '-', '-C', temp], { input: execFileSync('git', ['archive', revision], { maxBuffer: 512*1024*1024 }) });
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  let originalSwitches;
  for (const side of ['before', 'after']) {
    const server = await createServer({ root: side === 'before' ? temp : process.cwd(), configFile: false,
      server: { host: '127.0.0.1', port: 5199, strictPort: true }, logLevel: 'error' }); await server.listen();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
    try {
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1' && /^https?:$/.test(url.protocol)) {
          externalRequests.push(url.href); return route.abort();
        }
        return route.continue();
      });
      await context.addInitScript(() => {
        if (window !== window.top) return;
        localStorage.setItem('makezero.settings.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false }));
        localStorage.setItem('makezero.progress.v1', JSON.stringify({ learningStage: 10, bestEndless: 123, bestTimeless: 456 }));
        localStorage.setItem('makezero.daily.v1', JSON.stringify({ date: '2026-09-29', games: 3, best: 70 }));
        let n = 20260929; Math.random = () => { n = (Math.imul(n,1664525)+1013904223) >>> 0; return n/4294967296; };
      });
      const page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({ time: new Date('2026-09-29T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-09-29T00:00:01Z'));
      await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle' }); await page.clock.runFor(8000);
      await click(page, '#btn-title-settings');
      const bounds = await page.locator('.switch-list').boundingBox();
      if (side === 'before') originalSwitches = bounds; else assert.deepEqual(bounds, originalSwitches);
      await shot(page, side + '-settings');
      if (side === 'before') continue;
      const stored = await storage(page);
      const privacy = await openDocument(page, '#btn-privacy', 'Privacy policy');
      assert.match(await privacy.locator('body').innerText(), /TapeeTepee openstudio/);
      assert.match(await privacy.locator('body').innerText(), /wsndydtml@gmail.com/);
      assert.equal(await privacy.locator('script, input, form').count(), 0);
      assert.equal(await privacy.locator('a[href^="http"], a[href^="mailto:"]').count(), 0);
      await shot(page, 'after-privacy');
      await privacy.locator('a[href="#korean"]').click({ force: true });
      assert.ok(await privacy.locator('#korean').evaluate(e => e.getBoundingClientRect().top < 100));
      // Closing from focus inside the embedded document must also work.
      await privacy.locator('a[href="#korean"]').press('Escape');
      assert.equal(await page.locator('#legal-dialog').evaluate(e => e.open), false);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-privacy');
      const licenses = await openDocument(page, '#btn-licenses', 'Open-source licenses');
      await shot(page, 'after-licenses');
      const first = licenses.locator('details').first(); await first.locator('summary').click({ force: true });
      assert.match(await first.innerText(), /Permission is hereby granted/);
      await click(page, '#btn-legal-close');
      assert.deepEqual(await storage(page), stored);
      checks.push('Settings switches retain their exact previous bounds.', 'Privacy and licenses open and close inside the app, with opener focus restored.',
        'Korean anchor and Escape within the iframe work.', 'Copyright/license full text is expandable.',
        'Opening, reading and closing documents changes no localStorage entries.');
      for (const [width, height] of [[320,568],[390,844],[768,1024]]) {
        await page.setViewportSize({ width, height }); await page.clock.runFor(100);
        for (const [id,title] of [['#btn-privacy','Privacy policy'],['#btn-licenses','Open-source licenses']]) {
          const frame = await openDocument(page, id, title);
          const size = await frame.locator('html').evaluate(e => ({ scroll: e.scrollWidth, client: e.clientWidth }));
          assert(size.scroll <= size.client, `${width}: document overflow`);
          await frame.locator('body').evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          const close = await page.locator('#btn-legal-close').boundingBox();
          assert(close.y >= 0 && close.y + close.height <= height, `${width}: close button not visible`);
          await click(page, '#btn-legal-close');
        }
      }
      checks.push('320×568, 390×844 and 768×1024: no document horizontal overflow; Close remains visible after scrolling.');
      await page.setViewportSize({ width: 390, height: 844 }); await click(page, '#btn-settings-back');
      await click(page, '#mode-timeAttack'); await click(page, '#btn-intro-start');
      const progress = JSON.parse((await storage(page))['makezero.progress.v1']);
      assert.equal(progress.learningStage, 10); assert.equal(await page.locator('#board .tile').count(), 9);
      checks.push('Returning to LIMITLESS preserves stage 10 and starts a nine-block lesson.');
      // The same static documents also work without app JavaScript, via a public URL.
      for (const url of ['/privacy.html', '/licenses.html']) {
        const response = await page.goto('http://127.0.0.1:5199' + url);
        assert.equal(response.status(), 200); assert.match(await page.locator('body').innerText(), /TapeeTepee openstudio/);
      }
      checks.push('Both standalone documents serve as unauthenticated HTML pages; no third-party HTTP requests were made.');
    } finally { await context.close(); await server.close(); }
  }
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ capturedAt: new Date().toISOString(), before: revision,
    after: 'Uncommitted working tree based on ' + revision, sourceHashes, browser: browser.version(),
    viewport: { width:390, height:844 }, deviceScaleFactor:2,
    conditions: 'Before uses git archive in a temporary directory; both use the same installed dependencies, headless Chrome, fresh profiles, en-US/Asia-Seoul, fixed 2026-09-29 clock, seeded Math.random, muted audio and stage-10 test save. Screenshots at 390×844 DPR2 only; extra layout tests use other sizes. All third-party HTTP blocked and logged. Android WebView/offline/update tests are not claimed.',
    checks, errors, externalRequests, captures }, null, 2) + '\n', { flag:'wx' });
  console.log(JSON.stringify({ checks, captures: captures.length }, null, 2));
} finally {
  await browser.close();
  fs.rmSync(temp, { recursive:true, force:true }); // only this script's exact mkdtemp directory
}
