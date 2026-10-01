// Research tooling only. Does not enter the shipped game/runtime.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {checkSelectionToggle, tapWithMotion, selectionState} from '../../../tests/browser/selection-toggle.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd(), out = process.env.CAPTURE_OUT;
const revision = 'cae2e49b5af230a95b2f1890daf01b47b321b621';
let before = process.env.BEFORE_SOURCE;
if (!before) {
  before = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-neutral-replay-'));
  execFileSync('tar', ['-xf', '-', '-C', before], {input: execFileSync('git', ['archive', revision], {maxBuffer: 512 * 1024 * 1024})});
  execFileSync('tar', ['-xzf', path.join(root, 'docs/research/2026-10-01-neutral-flat-ui/before-source-overlay.tar.gz'), '-C', before]);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(before, 'node_modules'), 'dir');
}
assert(out && !fs.existsSync(out), 'Use a NEW CAPTURE_OUT, preserve previous evidence');
fs.mkdirSync(out, {recursive: true});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const runtimeFiles = ['index.html', 'src/ui/boardView.ts', 'src/ui/screens/cheer.ts', 'src/ui/styles/tokens.css',
  'src/ui/styles/title.css', 'src/ui/styles/game.css', 'src/ui/styles/picker.css', 'src/ui/styles/overlay.css',
  'src/ui/styles/tutorial.css', 'src/ui/styles/motion.css', 'src/ui/styles/storage.css', 'src/ui/styles/safeArea.css'];
const report = {capturedAt: new Date().toISOString(), revision,
  beforeSource: 'git archive revision plus the exact src/index/config snapshot preserved BEFORE neutral-theme edits',
  conditions: {viewport: [390, 844], dpr: 2, png: [780, 1688], clock: '2026-10-01T00:00:00Z',
    seed: 20261001, locale: 'en-US', timezone: 'Asia/Seoul', sound: false, animationPhase: 'finite finished; infinite paused at 0'},
  captures: [], sourceHashes: {}, metrics: {before: {}, after: {}}, surfaces: {}, interactions: {}, appCancel: {}, errors: [],
  limitations: ['Chrome on macOS with real dispatched touch input, not a physical Android/WebView.',
    'Before includes uncommitted safe-area/grade/white-background/toggle fixes; it is NOT a pure released commit.',
    'Progress and best scores are controlled fixtures, not user-earned results.',
    'Artwork, cover, launcher icons and studio opening retain their own colours.',
    'Current dependencies reused; current checkout was never replaced by old sources.']};
for (const side of ['before', 'after']) report.sourceHashes[side] = Object.fromEntries(runtimeFiles.map(file =>
  [file, hash(fs.readFileSync(path.join(side === 'before' ? before : root, file)))]));
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
async function capture(p, side, name, selectors) {
  await settle(p);
  const file = `${side}-${name}.png`;
  await p.screenshot({path: path.join(out, file)});
  const bytes = fs.readFileSync(path.join(out, file));
  assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  report.captures.push({file, sha256: hash(bytes)});
  report.metrics[side][name] = await p.evaluate(selectors => Object.fromEntries(selectors.map(selector => {
    const e = document.querySelector(selector), r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return [selector, {x: r.x, y: r.y, width: r.width, height: r.height, family: c.fontFamily,
      size: c.fontSize, weight: c.fontWeight, line: c.lineHeight}];
  })), selectors);
  if (side === 'after') {
    const surfaces = await p.evaluate(() => {
      const nodes = [...document.querySelectorAll('button, .board, .sum-term, .switch-knob, .intro-mark, .run-stat, #selection-sum, .panel, .brand-mark')];
      return nodes.filter(e => e.getClientRects().length && !e.closest('.hidden')).map(e => {
        const c = getComputedStyle(e);
        return {id: e.id, classes: e.className, image: c.backgroundImage, background: c.backgroundColor,
          color: c.color, border: c.borderColor, shadow: c.boxShadow, textShadow: c.textShadow, filter: c.filter};
      });
    });
    report.surfaces[name] = surfaces;
    for (const s of surfaces) {
      assert(!s.image.includes('gradient'), `${name} ${s.id || s.classes} gradient`);
      // Cool grays are slightly blue-tinted, never saturated coloured controls.
      for (const value of [s.background, s.color, s.border]) for (const rgb of value.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
        const channels = rgb.slice(1).map(Number);
        assert(Math.max(...channels) - Math.min(...channels) <= 32, `${name} ${s.id || s.classes} ${value}`);
      }
      if (s.classes === 'brand-mark') assert.equal(s.filter, 'none');
      if (s.classes.includes('mode-btn') || s.classes.includes('wood-btn') || s.classes.includes('icon-btn') || s.classes === 'switch') {
        assert.equal(s.shadow, 'none', `${name} ${s.id} bevel/shadow`);
      }
      if (s.classes.includes('tile') && !s.classes.includes('cleared')) {
        assert.equal(s.image, 'none'); assert.equal(s.textShadow, 'none');
        if (!s.classes.includes('sel') && !s.classes.includes('bust')) assert.equal(s.background, 'rgb(255, 255, 255)');
      }
    }
  }
}
async function load(p, base, stage = 31) {
  await p.goto(base, {waitUntil: 'networkidle'});
  await p.evaluate(stage => localStorage.setItem('makezero.progress.v1', JSON.stringify({learningStage: stage, bestEndless: 123, bestTimeless: 456})), stage);
  await p.reload({waitUntil: 'networkidle'}); await p.clock.runFor(8000); await settle(p);
}
const gameSelectors = ['#run-title', '.run-stat-label', '.run-stat-value', '#board', '#board .tile', '#notice',
  '#selection-sum', '.sum-label', '.sum-total'];
try {
  for (const side of ['before', 'after']) {
    const server = await createServer({root: side === 'before' ? before : root, configFile: false, cacheDir: path.join(before, `cache-${side}`),
      server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
    await server.listen(); const base = server.resolvedUrls.local[0];
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      locale: 'en-US', timezoneId: 'Asia/Seoul'});
    try {
      await ctx.addInitScript(() => {
        localStorage.setItem('makezero.settings.v1', JSON.stringify({musicOn: false, soundOn: false, hapticsOn: false}));
        let n = 20261001; Math.random = () => {n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296;};
      });
      const p = await ctx.newPage(); p.setDefaultTimeout(15000);
      p.on('pageerror', e => report.errors.push({side, error: String(e)}));
      await p.clock.install({time: new Date(report.conditions.clock)}); await p.clock.pauseAt(new Date(report.conditions.clock));
      await load(p, base);
      await capture(p, side, 'home', ['.brand-mark', '.mode-btn', '.mode-name', '.mode-desc', '#btn-title-settings']);
      await click(p, '#btn-title-settings');
      const settingsSelectors = ['.picker-title', '.switch-row', '.switch-text b', '.switch-text small', '.switch', '.switch-knob', '.settings-links'];
      await capture(p, side, 'settings-off', settingsSelectors);
      await p.locator('.switch').first().click(); await capture(p, side, 'settings-on', settingsSelectors);
      assert.equal(await p.locator('.switch').first().getAttribute('aria-checked'), 'true');
      await p.locator('.switch').first().click(); await click(p, '#btn-settings-back');
      for (const [mode, stage, name] of [['timeAttack', 1, 'lesson-1'], ['timeAttack', 6, 'lesson-6'],
        ['timeAttack', 31, 'limitless'], ['timeless', 31, 'timeless'], ['endless', 31, 'endless']]) {
        await load(p, base, stage); await click(p, `#mode-${mode}`);
        if (stage === 31) await capture(p, side, `${name}-intro`, ['.intro-title', '.intro-mark', '.intro-mark-art', '#btn-intro-start']);
        await click(p, '#btn-intro-start');
        if (await p.locator('#lesson-intro').isVisible()) await click(p, '#lesson-intro');
        await capture(p, side, `${name}-game`, gameSelectors);
        const client = await ctx.newCDPSession(p);
        const index = await p.locator('#board .tile:not(.cleared)').evaluateAll(es => Number(es[0].dataset.i));
        await tapWithMotion(p, client, index);
        if (name === 'limitless') await capture(p, side, 'limitless-selected', [...gameSelectors, '.tile.sel', '.sum-term']);
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
          await capture(p, side, 'limitless-wrong', gameSelectors);
          await click(p, '#btn-pause'); await capture(p, side, 'pause', ['#overlay .panel', '#overlay-title', '#overlay-body', '#btn-primary', '#btn-secondary']);
        }
        await client.detach();
      }
      await load(p, base);
      // Check the pressed appearance before releasing the mode button.
      const rect = await p.locator('#mode-timeAttack').boundingBox();
      await p.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await p.mouse.down();
      await capture(p, side, 'home-pressed', ['.brand-mark', '.mode-btn', '.mode-name', '.mode-desc']);
      await p.mouse.up(); await p.close();
      report.interactions[side] = await checkSelectionToggle(ctx, base, {expectFixed: true});
    } finally {await ctx.close(); await server.close();}
  }
  for (const [name, items] of Object.entries(report.metrics.before)) for (const [selector, expected] of Object.entries(items)) {
    const actual = report.metrics.after[name][selector];
    for (const key of ['family', 'size', 'weight', 'line']) assert.equal(actual[key], expected[key], `${name} ${selector} ${key}`);
    for (const key of ['x', 'y', 'width', 'height']) assert(Math.abs(actual[key] - expected[key]) < 0.1,
      `${name} ${selector} ${key}: ${actual[key]} != ${expected[key]}`);
  }
  assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {report.pass = false; report.failure = String(error); throw error;}
finally {
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  await browser.close();
  console.log(JSON.stringify({out, pass: report.pass, captures: report.captures.length, surfaces: Object.keys(report.surfaces).length,
    interactions: Object.fromEntries(Object.entries(report.interactions).map(([side, cases]) => [side, cases.length])), failure: report.failure}));
}
