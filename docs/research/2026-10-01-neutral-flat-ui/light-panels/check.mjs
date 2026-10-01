// Research-only tooling: no imports from the shipped app.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd(), out = process.env.CAPTURE_OUT;
const revision = 'cae2e49b5af230a95b2f1890daf01b47b321b621';
let before = process.env.BEFORE_SOURCE;
if (!before) {
  before = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-light-panels-replay-'));
  execFileSync('tar', ['-xf', '-', '-C', before], {input: execFileSync('git', ['archive', revision], {maxBuffer: 512 * 1024 * 1024})});
  execFileSync('tar', ['-xzf', path.join(root, 'docs/research/2026-10-01-neutral-flat-ui/light-panels/before-source-overlay.tar.gz'), '-C', before]);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(before, 'node_modules'), 'dir');
}
assert(out && !fs.existsSync(out), 'Preserve evidence: choose a new CAPTURE_OUT');
fs.mkdirSync(out, {recursive: true});
const hash = b => createHash('sha256').update(b).digest('hex');
const files = ['index.html', 'src/ui/boardView.ts', 'src/ui/styles/tokens.css', 'src/ui/styles/game.css', 'src/ui/styles/title.css', 'src/ui/styles/tutorial.css'];
const report = {capturedAt: new Date().toISOString(), revision, conditions: {viewport: [390, 844], dpr: 2,
  png: [780, 1688], clock: '2026-10-01T00:00:00Z', seed: 20261001, colorSeed: 20261001, locale: 'en-US', timezone: 'Asia/Seoul'},
  sourceHashes: {}, captures: [], states: {}, errors: [], pass: false,
  limitations: ['Before is a git archive plus uncommitted source snapshot, not a released commit.',
    'Controlled progress/records are fixtures. Current dependencies are reused.', 'Chrome/macOS, not a physical Android/WebView test.']};
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser = browser.version();
async function settle(p) {
  await p.clock.runFor(320);
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (const a of document.getAnimations()) {
      if (a.effect?.getTiming().iterations === Infinity) {a.pause(); a.currentTime = 0;} else a.finish();
    }
  });
}
async function click(p, s) {await p.locator(s).click(); await settle(p);}
async function load(p, base) {
  await p.goto(base, {waitUntil: 'networkidle'});
  await p.evaluate(() => localStorage.setItem('makezero.progress.v1', JSON.stringify({learningStage: 31, bestEndless: 123, bestTimeless: 456})));
  await p.reload({waitUntil: 'networkidle'}); await p.clock.runFor(8000); await settle(p);
}
async function capture(p, side, name) {
  await settle(p);
  const file = `${side}-${name}.png`; await p.screenshot({path: path.join(out, file)});
  const bytes = fs.readFileSync(path.join(out, file)); assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  report.captures.push({file, sha256: hash(bytes)});
  report.states[side][name] = await p.evaluate(() => {
    const boxes = '.mode-btn, .icon-btn, .run-stat, .selection-sum, .round-btn, .panel, .switch-row, .chip';
    const nodes = [...document.querySelectorAll(`${boxes}, .tile, .sum-term, .brand-mark, html, #app`)];
    return nodes.filter(e => e.getClientRects().length && !e.closest('.hidden')).map(e => {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      return {id: e.id, classes: e.className, box: e.matches(boxes), colorId: e.dataset.color,
        geometry: [r.x, r.y, r.width, r.height], type: [c.fontFamily, c.fontSize, c.fontWeight, c.lineHeight],
        background: c.backgroundColor, image: c.backgroundImage, color: c.color, border: c.borderColor,
        shadow: c.boxShadow, textShadow: c.textShadow, filter: c.filter};
    });
  });
}
try {
  for (const [side, dir] of Object.entries({before, after: root})) {
    report.sourceHashes[side] = Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(dir, f)))]));
    report.states[side] = {};
    const server = await createServer({root: dir, configFile: false, cacheDir: path.join(before, `cache-${side}`), server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
    await server.listen(); const base = server.resolvedUrls.local[0];
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul'});
    try {
      await ctx.addInitScript(() => {
        localStorage.setItem('makezero.settings.v1', JSON.stringify({musicOn: false, soundOn: false, hapticsOn: false}));
        let n = 20261001; Math.random = () => {n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296;};
        // Colours use crypto randomness independently of the puzzle seed.
        // Control it ONLY in this browser profile, never in the game source.
        let colorSeed = 20261001;
        const original = crypto.getRandomValues.bind(crypto);
        Object.defineProperty(crypto, 'getRandomValues', {value: buffer => {
          if (!(buffer instanceof Uint32Array)) return original(buffer);
          for (let i = 0; i < buffer.length; i++) {
            colorSeed = (Math.imul(colorSeed, 1664525) + 1013904223) >>> 0;
            buffer[i] = colorSeed;
          }
          return buffer;
        }});
      });
      const p = await ctx.newPage(); p.on('pageerror', e => report.errors.push({side, error: String(e)}));
      await p.clock.install({time: new Date(report.conditions.clock)}); await p.clock.pauseAt(new Date(report.conditions.clock));
      await load(p, base); await capture(p, side, 'home');
      await click(p, '#btn-title-settings'); await capture(p, side, 'settings');
      for (const [mode, name] of [['timeAttack', 'limitless'], ['timeless', 'timeless'], ['endless', 'endless']]) {
        await load(p, base); await click(p, `#mode-${mode}`); await click(p, '#btn-intro-start');
        if (await p.locator('#lesson-intro').isVisible()) await click(p, '#lesson-intro');
        await capture(p, side, name);
        if (name === 'limitless') {await click(p, '#btn-pause'); await capture(p, side, 'pause');}
      }
      await p.close();
    } finally {await ctx.close(); await server.close();}
  }
  report.boxesChecked = 0; report.elementsChecked = 0;
  for (const [name, expected] of Object.entries(report.states.before)) {
    const actual = report.states.after[name]; assert.equal(actual.length, expected.length);
    for (const [index, b] of expected.entries()) {
      const a = actual[index]; report.elementsChecked++;
      if (b.box) {
        assert.equal(b.background, 'rgb(255, 255, 255)'); assert.equal(a.background, 'rgb(245, 246, 248)');
        assert.deepEqual({...a, background: b.background}, b, `${name} ${b.classes}: only box fill may change`);
        report.boxesChecked++;
      } else assert.deepEqual(a, b, `${name} ${b.classes}: block/artwork/white screen remains unchanged`);
    }
  }
  assert(report.boxesChecked > 0); assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {report.failure = String(error); throw error;}
finally {
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  await browser.close(); console.log(JSON.stringify({out, pass: report.pass, captures: report.captures.length,
    elements: report.elementsChecked, boxes: report.boxesChecked, failure: report.failure}));
}
