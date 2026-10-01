// Research-only regression/capture tooling; never imported by the game.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {checkSelectionToggle, tapWithMotion, selectionState} from '../../../../tests/browser/selection-toggle.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd(), out = process.env.CAPTURE_OUT;
const revision = 'cae2e49b5af230a95b2f1890daf01b47b321b621';
const entry = path.join(root, 'docs/research/2026-10-01-neutral-flat-ui');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function replay(overlay) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-block-replay-'));
  execFileSync('tar', ['-xf', '-', '-C', dir], {input: execFileSync('git', ['archive', revision], {maxBuffer: 512 * 1024 * 1024})});
  execFileSync('tar', ['-xzf', overlay, '-C', dir]);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
  return dir;
}
const before = process.env.BEFORE_SOURCE || replay(path.join(entry, 'color-blocks-correction/before-source-overlay.tar.gz'));
const reference = process.env.COLOR_REFERENCE || replay(path.join(entry, 'before-source-overlay.tar.gz'));
assert(out && !fs.existsSync(out), 'Use a NEW CAPTURE_OUT; preserve old evidence');
fs.mkdirSync(out, {recursive: true});
const files = ['index.html', 'src/ui/boardView.ts', 'src/ui/styles/tokens.css', 'src/ui/styles/game.css',
  'src/ui/styles/tutorial.css', 'src/ui/styles/motion.css', 'src/ui/styles/title.css', 'src/ui/styles/overlay.css',
  'src/ui/styles/picker.css', 'src/ui/styles/safeArea.css'];
const report = {capturedAt: new Date().toISOString(), revision, pass: false,
  conditions: {viewport: [390, 844], dpr: 2, png: [780, 1688], clock: '2026-10-01T00:00:00Z',
    seed: 20261001, locale: 'en-US', timezone: 'Asia/Seoul', sound: false, animations: 'finite finished; infinite paused at zero'},
  sourceHashes: {}, captures: [], metrics: {}, surfaces: {}, blockReference: {}, interactions: {}, appCancel: {}, errors: [],
  limitations: ['Before is the uncommitted grayscale candidate reconstructed over git archive, not a released commit.',
    'Original block reference is the pre-neutral uncommitted source snapshot reconstructed over the same commit.',
    'Fresh profiles and controlled progress/records are test fixtures, not user-earned results.',
    'Chrome/macOS dispatched touch tests do not establish physical Android rendering.',
    'Only block-related styles are compared to the original reference; screen/background/navigation intentionally stay neutral.']};
for (const [side, dir] of Object.entries({before, after: root, reference})) {
  report.sourceHashes[side] = Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(dir, f)))]));
}
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser = browser.version();
async function settle(p) {
  await p.clock.runFor(320);
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (const a of document.getAnimations()) {
      if (a.effect?.getTiming().iterations === Infinity) {a.pause(); a.currentTime = 0;}
      else a.finish();
    }
  });
}
async function click(p, selector) {await p.locator(selector).click(); await settle(p);}
async function load(p, base, stage = 31) {
  await p.goto(base, {waitUntil: 'networkidle'});
  await p.evaluate(stage => localStorage.setItem('makezero.progress.v1', JSON.stringify({learningStage: stage, bestEndless: 123, bestTimeless: 456})), stage);
  await p.reload({waitUntil: 'networkidle'}); await p.clock.runFor(8000); await settle(p);
}
async function capture(p, side, name) {
  await settle(p);
  const file = `${side}-${name}.png`;
  await p.screenshot({path: path.join(out, file)});
  const bytes = fs.readFileSync(path.join(out, file));
  assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  report.captures.push({file, sha256: hash(bytes)});
  const data = await p.evaluate(() => {
    const selector = 'button, .brand-mark, .mode-name, .mode-desc, #board, .run-stat, .run-stat-label, .run-stat-value, #selection-sum, .sum-term, .panel';
    const nodes = [...document.querySelectorAll(selector)].filter(e => e.getClientRects().length && !e.closest('.hidden'));
    return nodes.map(e => {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      return {id: e.id, classes: e.className, colorId: e.dataset.color, rect: [r.x, r.y, r.width, r.height],
        type: [c.fontFamily, c.fontSize, c.fontWeight, c.lineHeight], image: c.backgroundImage,
        background: c.backgroundColor, color: c.color, border: c.borderColor, shadow: c.boxShadow,
        textShadow: c.textShadow, filter: c.filter};
    });
  });
  report.metrics[side][name] = data.map(({id, classes, rect, type}) => ({id, classes, rect, type}));
  report.surfaces[side][name] = data;
  if (side !== 'after') return;
  assert.equal(await p.locator('html').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(255, 255, 255)');
  for (const [index, s] of data.entries()) {
    if (s.classes.split(' ').includes('tile') || s.classes === 'sum-term') continue;
    assert(!s.image.includes('gradient'), `${name} ${s.id || s.classes}: neutral UI gradient`);
    for (const value of [s.background, s.color, s.border]) for (const rgb of value.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
      const n = rgb.slice(1).map(Number);
      assert(Math.max(...n) - Math.min(...n) <= 32, `${name} ${s.id || s.classes}: ${value}`);
    }
    if (s.classes === 'brand-mark') assert.equal(s.filter, 'none');
    if (/mode-btn|wood-btn|icon-btn/.test(s.classes)) assert.equal(s.shadow, 'none');
    const original = report.surfaces.before[name][index];
    assert.deepEqual(s, original, `${name} element ${index}: neutral UI must remain unchanged`);
  }
  const tiles = data.filter(s => s.classes.split(' ').includes('tile') && !/cleared|bust/.test(s.classes));
  for (const s of tiles) {
    assert(s.image.includes('linear-gradient'), `${name}: block gradient missing`);
    assert.notEqual(s.shadow, 'none', `${name}: block bevel/selection effect missing`);
    if (!s.classes.split(' ').includes('sel')) assert.equal(s.color, 'rgb(255, 255, 255)');
  }
}
async function originalBlockStyles(p) {
  // Offscreen CSS fixtures only; screenshots always show real App states.
  return p.evaluate(() => {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;--tile:38px';
    host.innerHTML = `<div class="board">${Array.from({length: 9}, (_, i) => `<button class="tile" data-color="${i + 1}">1</button>`).join('')}<button class="tile sel" data-color="1">1</button></div><div class="board ok"><button class="tile sel" data-color="1">1</button></div><div class="learning-run"><button class="tile tutorial-target" data-color="1">1</button><button class="tile bust" data-color="1">1</button></div>${Array.from({length: 9}, (_, i) => `<span class="sum-term" data-color="${i + 1}">1</span>`).join('')}`;
    document.body.append(host);
    for (const a of host.getAnimations({subtree: true})) {a.pause(); a.currentTime = 0;}
    const data = [...host.querySelectorAll('.tile, .sum-term')].map(e => {
      const c = getComputedStyle(e);
      return {classes: e.className, colorId: e.dataset.color, image: c.backgroundImage, color: c.color,
        border: c.borderColor, shadow: c.boxShadow, textShadow: c.textShadow, outline: c.outline};
    });
    host.remove(); return data;
  });
}
try {
  for (const [side, dir] of Object.entries({before, after: root, reference})) {
    const server = await createServer({root: dir, configFile: false, cacheDir: path.join(before, `cache-${side}`),
      server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
    await server.listen(); const base = server.resolvedUrls.local[0];
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true,
      hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul'});
    try {
      await ctx.addInitScript(() => {
        localStorage.setItem('makezero.settings.v1', JSON.stringify({musicOn: false, soundOn: false, hapticsOn: false}));
        let n = 20261001; Math.random = () => {n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296;};
      });
      const p = await ctx.newPage(); p.setDefaultTimeout(15000);
      p.on('pageerror', e => report.errors.push({side, error: String(e)}));
      await p.clock.install({time: new Date(report.conditions.clock)}); await p.clock.pauseAt(new Date(report.conditions.clock));
      await load(p, base);
      report.blockReference[side] = await originalBlockStyles(p);
      if (side === 'reference') {await p.close(); continue;}
      report.metrics[side] = {}; report.surfaces[side] = {};
      await capture(p, side, 'home');
      await click(p, '#btn-title-settings'); await capture(p, side, 'settings');
      for (const [mode, stage, name] of [['timeAttack', 1, 'lesson-1'], ['timeAttack', 6, 'lesson-6'],
        ['timeAttack', 14, 'lesson-14'], ['timeAttack', 23, 'lesson-23'], ['timeAttack', 31, 'limitless'],
        ['timeless', 31, 'timeless'], ['endless', 31, 'endless']]) {
        await load(p, base, stage); await click(p, `#mode-${mode}`); await click(p, '#btn-intro-start');
        if (await p.locator('#lesson-intro').isVisible()) await click(p, '#lesson-intro');
        await capture(p, side, `${name}-game`);
        const client = await ctx.newCDPSession(p);
        const index = await p.locator('#board .tile:not(.cleared)').evaluateAll(es => Number(es[0].dataset.i));
        await tapWithMotion(p, client, index);
        if (name === 'limitless') await capture(p, side, 'limitless-selected');
        const stats = await p.locator('.run-stat-value').allTextContents();
        await tapWithMotion(p, client, index, 3);
        const actual = await selectionState(p);
        assert.deepEqual(actual.indices, []); assert.equal(actual.incorrect, false); assert.equal(actual.penalty, false);
        assert.deepEqual(await p.locator('.run-stat-value').allTextContents(), stats);
        report.appCancel[`${side}-${name}`] = actual;
        if (name === 'limitless') {
          const indices = await p.locator('#board .tile:not(.cleared)').evaluateAll(es => [9, 3].map(v => Number(es.find(e => Number(e.textContent) === v).dataset.i)));
          for (const i of indices) await tapWithMotion(p, client, i);
          assert.equal((await selectionState(p)).total, '12'); assert.equal((await selectionState(p)).incorrect, true);
          await capture(p, side, 'limitless-wrong');
          await click(p, '#btn-pause'); await capture(p, side, 'pause');
        }
        await client.detach();
      }
      await p.close(); report.interactions[side] = await checkSelectionToggle(ctx, base, {expectFixed: true});
    } finally {await ctx.close(); await server.close();}
  }
  assert.deepEqual(report.metrics.after, report.metrics.before, 'Geometry/type/classes stay unchanged');
  assert.deepEqual(report.blockReference.after, report.blockReference.reference, 'Exact original block/chip/pulse colours and effects');
  assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {report.failure = String(error); throw error;}
finally {
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  await browser.close();
  console.log(JSON.stringify({out, pass: report.pass, captures: report.captures.length,
    interactions: Object.fromEntries(Object.entries(report.interactions).map(([k, v]) => [k, v.length])), failure: report.failure}));
}
