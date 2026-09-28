import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.CAPTURE_OUT || path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(output, 'verification.json'))) throw new Error('Choose a new CAPTURE_OUT; do not overwrite research originals.');
fs.mkdirSync(output, { recursive: true });
const revision = 'abc869d0cb157fd203676a0f787106f79592395f';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-storage-before-'));
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const progressKey = 'makezero.progress.v1';
const fixture = {
  [progressKey]: JSON.stringify({ learningStage: 10, bestLimitlessScore: 1400, bestEndless: 800,
    bestTimeless: 960, fewestLeft: 0, bestLearningScore: 130, futureField: 'preserved' }),
  'makezero.daily.v1': JSON.stringify({ date: '2026-09-28', best: 400, games: 2 }),
  'makezero.settings.v1': JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false }),
};
const disk = new Map();
let failRead = false, failWrite = false;
const captures = [], checks = [], errors = [];
const sourceHashes = Object.fromEntries(['src/main.ts', 'src/ui/storage.ts', 'src/ui/persistentStore.ts',
  'src/ui/storageNotice.ts', 'src/ui/styles/storage.css', 'package-lock.json'].map(file =>
  [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));

async function openContext({ native = false, seed = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
  if (native) {
    await context.exposeFunction('__researchPreferences', async (method, { key, value }) => {
      if (method === 'get') {
        if (failRead) throw new Error('Simulated bridge read failure');
        return { value: disk.get(key) ?? null };
      }
      if (method === 'set') {
        if (failWrite) throw new Error('Simulated bridge write failure');
        disk.set(key, value); return;
      }
      throw new Error(`Unexpected method: ${method}`);
    });
  }
  await context.addInitScript(({ fixture, native, seed }) => {
    if (seed && !localStorage.getItem('__researchSeeded')) {
      for (const [key, value] of Object.entries(fixture)) localStorage.setItem(key, value);
      localStorage.setItem('__researchSeeded', 'true');
    }
    let random = 20260928;
    Math.random = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random / 4294967296; };
    if (native) {
      window.androidBridge = {};
      window.Capacitor = {
        PluginHeaders: [{ name: 'Preferences', methods: [
          { name: 'get', rtype: 'promise' }, { name: 'set', rtype: 'promise' },
        ] }],
        nativePromise: (_plugin, method, options) => window.__researchPreferences(method, options),
      };
    }
  }, { fixture, native, seed });
  const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-09-28T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-28T00:00:01Z'));
  await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle' });
  await page.clock.runFor(8000);
  return { context, page };
}
async function click(page, selector) {
  await page.locator(selector).click({ force: true }); await page.clock.runFor(300);
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { for (const a of document.getAnimations()) if (a.effect?.getTiming().iterations !== Infinity) a.finish(); });
  const file = path.join(output, `${name}.png`); await page.screenshot({ path: file });
  const bytes = fs.readFileSync(file);
  assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  captures.push({ file: `${name}.png`, sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function checkIntros(page, side) {
  const expectations = { timeAttack: ['10', '1,400'], timeless: ['960', '0'], endless: ['800'] };
  for (const [mode, texts] of Object.entries(expectations)) {
    await click(page, `#mode-${mode}`);
    const text = await page.locator('#screen-intro').innerText();
    for (const expected of texts) assert.ok(text.includes(expected), `${mode} missing ${expected}: ${text}`);
    await shot(page, `${side}-${mode}-records`);
    await click(page, '#btn-intro-back');
  }
}

try {
  execFileSync('tar', ['-xf', '-', '-C', tmp], {
    input: execFileSync('git', ['archive', revision], { maxBuffer: 512 * 1024 * 1024 }),
  });
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
  for (const side of ['before', 'after']) {
    const server = await createServer({ root: side === 'before' ? tmp : process.cwd(), configFile: false,
      server: { host: '127.0.0.1', port: 5199, strictPort: true }, logLevel: 'error' });
    await server.listen();
    try {
      const { context, page } = await openContext({ native: side === 'after' });
      try {
        await checkIntros(page, side);
        if (side === 'before') {
          await page.reload({ waitUntil: 'networkidle' }); await page.clock.runFor(8000);
          await click(page, '#mode-timeAttack');
          assert.match(await page.locator('#screen-intro').innerText(), /10/);
          checks.push('Historical version already retains stage 10 on same-origin reload; no update-reset bug was reproduced.');
        } else {
          assert.equal(disk.get(progressKey), fixture[progressKey]);
          await click(page, '#mode-timeAttack'); await click(page, '#btn-intro-start');
          assert.equal(await page.locator('#stat-c-value').innerText(), '10');
          const answer = await page.locator('#board .tile').evaluateAll(es => {
            const n = es.map(e => Number(e.textContent));
            for (let a = 0; a < n.length; a++) for (let b = a + 1; b < n.length; b++)
              for (let c = b + 1; c < n.length; c++) if (n[a] + n[b] + n[c] === 10) return [a,b,c];
            return null;
          });
          assert.ok(answer);
          failWrite = true;
          for (const i of answer) { await page.locator(`#board .tile[data-i="${i}"]`).tap({ force: true }); await page.clock.runFor(30); }
          await page.clock.runFor(600);
          await page.locator('#storage-notice:not([hidden])').waitFor();
          assert.equal(JSON.parse(disk.get(progressKey)).learningStage, 10);
          await shot(page, 'after-save-error');
          failWrite = false; await click(page, '#storage-notice button');
          await page.waitForFunction(() => document.getElementById('storage-notice').hidden);
          assert.equal(JSON.parse(disk.get(progressKey)).learningStage, 11);
          assert.equal(JSON.parse(disk.get(progressKey)).futureField, 'preserved');
          await shot(page, 'after-stage11-saved');
          checks.push('Existing WebView fixture migrated to Preferences proxy without deletion.',
            'Actual correct 3-block selection advances stage 10 to 11; simulated save failure stays pending and Retry saves it.',
            'All three mode records and sound settings retained, including unknown additive fields.');
        }
      } finally { await context.close(); }
      if (side === 'after') {
        const { context, page } = await openContext({ native: true, seed: false });
        try {
          assert.equal(await page.evaluate(() => localStorage.getItem('makezero.progress.v1')), null);
          await click(page, '#mode-timeAttack'); await shot(page, 'after-new-runtime-stage11');
          await click(page, '#btn-intro-start');
          assert.equal(await page.locator('#stat-c-value').innerText(), '11');
          const beforeFailure = JSON.stringify([...disk]);
          failRead = true; await page.reload({ waitUntil: 'networkidle' });
          await page.locator('#storage-notice.storage-blocking:not([hidden])').waitFor();
          assert.equal(await page.locator('#app').evaluate(e => e.inert), true);
          assert.equal(JSON.stringify([...disk]), beforeFailure);
          await shot(page, 'after-load-error');
          failRead = false; await click(page, '#storage-notice button');
          await page.locator('#storage-notice').waitFor({ state: 'hidden' });
          await page.clock.runFor(8000);
          await click(page, '#mode-timeAttack'); await click(page, '#btn-intro-start');
          assert.equal(await page.locator('#stat-c-value').innerText(), '11');
          checks.push('New JS runtime with empty WebView storage resumes stage 11 from the same simulated native store.',
            'Read failure blocks game startup without changing stored data; Retry loads stage 11.');
        } finally { await context.close(); }
        // The browser build must also keep the old origin/key behavior.
        const { context: webContext, page: webPage } = await openContext();
        try {
          await webPage.reload({ waitUntil: 'networkidle' }); await webPage.clock.runFor(8000);
          await click(webPage, '#mode-timeAttack'); await click(webPage, '#btn-intro-start');
          assert.equal(await webPage.locator('#stat-c-value').innerText(), '10');
          checks.push('Current non-native browser build still reads existing stage 10 after reload.');
        } finally { await webContext.close(); }
      }
    } finally { await server.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify({ date: new Date().toISOString(), before: revision,
    after: 'working tree based on ' + revision, sourceHashes, browser: browser.version(), viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, conditions: 'Fresh contexts; fixed 2026-09-28 clock; seeded Math.random; crypto color randomness not seeded. Same injected stage/score/settings fixture, not a claimed historical user save. Historical source from git archive; current dependencies. After native route uses the actual Capacitor JS plugin with a test Preferences bridge backed by a Node Map. This is NOT an Android device or installed-app update test.',
    checks, errors, captures }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, screenshots: captures.length }, null, 2));
} finally {
  await browser.close(); fs.rmSync(tmp, { recursive: true, force: true });
}
