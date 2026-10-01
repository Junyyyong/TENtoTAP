// Research only: before is git archive HEAD plus documented pre-existing UI edits.
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
const baselineRevision = 'cae2e49b5af230a95b2f1890daf01b47b321b621';
let before = process.env.BEFORE_SOURCE;
if (!before) {
  before = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-white-replay-'));
  execFileSync('tar', ['-xf', '-', '-C', before], {
    input: execFileSync('git', ['archive', baselineRevision], {maxBuffer: 512 * 1024 * 1024}),
  });
  // The overlay preserves earlier approved but not-yet-committed UI changes.
  // It was copied BEFORE this task's edits, not recreated from today's source.
  execFileSync('tar', ['-xzf', path.join(root, 'docs/research/2026-10-01-white-background-toggle/before-source-overlay.tar.gz'), '-C', before]);
  fs.symlinkSync(path.join(root, 'node_modules'), path.join(before, 'node_modules'), 'dir');
}
assert(fs.existsSync(path.join(before, 'src/ui/boardView.ts')), 'BEFORE_SOURCE must be the preserved pre-edit source snapshot');
assert(out && !fs.existsSync(out), 'Use a NEW CAPTURE_OUT; do not replace evidence');
fs.mkdirSync(out, {recursive: true});
const hash = b => createHash('sha256').update(b).digest('hex');
const files = ['index.html', 'src/ui/boardView.ts', 'src/ui/styles/tokens.css', 'src/ui/styles/title.css',
  'src/ui/styles/game.css', 'src/ui/styles/safeArea.css', 'src/ui/styles/index.css', 'src/ui/screens/cheer.ts'];
const report = {capturedAt: new Date().toISOString(), revision: baselineRevision,
  afterBaseRevision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  beforeSource: 'git archive HEAD, overlaid with src/ and index.html/vite.config.ts from the working tree before this change',
  conditions: {css: [390, 844], dpr: 2, png: [780, 1688], clock: '2026-10-01T00:00:00Z',
    seed: 20261001, locale: 'en-US', timezone: 'Asia/Seoul', sound: false},
  sources: {}, captures: [], metrics: {before: {}, after: {}}, interactions: {}, appCancel: {}, errors: [],
  limitations: ['Desktop Chrome with touch input, not a physical Android/WebView test.',
    'Pre-existing uncommitted safe-area/grade changes are included in BOTH sides; before is not a pure committed release.',
    'Progress and controlled test boards are fixtures, not earned game results.',
    'Existing dependencies reused; no current files were checked out to an old revision.',
    'Cards/buttons keep their original warm surfaces and shadows; artwork and the orange studio screen remain unchanged.']};
for (const side of ['before', 'after']) report.sources[side] = Object.fromEntries(files.map(f => [f, hash(fs.readFileSync(path.join(side === 'before' ? before : root, f)))]));
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser = browser.version();
async function settle(p) {
  await p.clock.runFor(320);
  await p.evaluate(async () => {
    await document.fonts.ready;
    for (const a of document.getAnimations()) {
      if (a.effect?.getTiming().iterations === Infinity) {
        // A matched animation phase is required for reproducible geometry.
        // This affects the capture page only, not the game source/runtime.
        a.pause(); a.currentTime = 0;
      } else a.finish();
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
  report.metrics[side][name] = await p.evaluate(ss => Object.fromEntries(ss.map(s => {
    const e = document.querySelector(s), r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return [s, {x: r.x, y: r.y, width: r.width, height: r.height, family: c.fontFamily,
      size: c.fontSize, weight: c.fontWeight, line: c.lineHeight}];
  })), selectors);
  if (side === 'after') {
    const background = await p.evaluate(() => {
      const screen = document.querySelector('.screen:not(.hidden)');
      return Object.fromEntries([document.documentElement, document.querySelector('#app'), screen].map(e => {
        const c = getComputedStyle(e); return [e.id || e.tagName, {color: c.backgroundColor, image: c.backgroundImage}];
      }));
    });
    for (const b of Object.values(background)) {
      assert.equal(b.image, 'none'); assert(['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)'].includes(b.color));
    }
    report.metrics[side][name].background = background;
  }
}
async function load(p, base, stage) {
  await p.goto(base, {waitUntil: 'networkidle'});
  await p.evaluate(s => localStorage.setItem('makezero.progress.v1', JSON.stringify({learningStage: s, bestEndless: 123, bestTimeless: 456})), stage);
  await p.reload({waitUntil: 'networkidle'}); await p.clock.runFor(8000); await settle(p);
}
const gameSelectors = ['#run-title', '.run-stat-label', '.run-stat-value', '#board', '#board .tile',
  '#notice', '#selection-sum', '.sum-label', '.sum-total'];
try {
  for (const side of ['before', 'after']) {
    const server = await createServer({root: side === 'before' ? before : root, configFile: false,
      cacheDir: path.join(before, `cache-${side}`), server: {host: '127.0.0.1', port: 0}, logLevel: 'error'});
    await server.listen(); const base = server.resolvedUrls.local[0];
    const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul'});
    try {
      await context.addInitScript(() => {
        localStorage.setItem('makezero.settings.v1', JSON.stringify({musicOn: false, soundOn: false, hapticsOn: false}));
        let seed = 20261001;
        Math.random = () => {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296;};
      });
      const p = await context.newPage(); p.setDefaultTimeout(15000);
      p.on('pageerror', e => report.errors.push({side, error: String(e)}));
      await p.clock.install({time: new Date(report.conditions.clock)});
      await p.clock.pauseAt(new Date(report.conditions.clock));
      await load(p, base, 31);
      await capture(p, side, 'home', ['.brand-mark', '.mode-btn', '.mode-name', '.mode-desc', '#btn-title-settings']);
      await click(p, '#btn-title-settings');
      await capture(p, side, 'settings', ['.picker-title', '.switch-row', '.switch-text b', '.switch-text small', '.settings-links']);
      await click(p, '#btn-settings-back');
      for (const [mode, stage, name] of [['timeAttack', 1, 'lesson-1'], ['timeAttack', 6, 'lesson-6'],
        ['timeAttack', 31, 'limitless'], ['timeless', 31, 'timeless'], ['endless', 31, 'endless']]) {
        await load(p, base, stage); await click(p, `#mode-${mode}`);
        if (stage === 31) await capture(p, side, `${name}-intro`, ['.intro-title', '.intro-mark', '#btn-intro-start']);
        await click(p, '#btn-intro-start');
        if (await p.locator('#lesson-intro').isVisible()) await click(p, '#lesson-intro');
        await capture(p, side, `${name}-game`, gameSelectors);
        // Test actual App hooks too: cancellation must not change stats or show −1.
        const index = await p.locator('#board .tile:not(.cleared)').evaluateAll(es => Number(es.find(e => Number(e.textContent) < 10).dataset.i));
        const client = await context.newCDPSession(p);
        await tapWithMotion(p, client, index);
        const stats = await p.locator('.run-stat-value').allTextContents();
        await tapWithMotion(p, client, index, 3);
        const actual = await selectionState(p);
        assert.deepEqual(actual.indices, side === 'before' ? [index] : []);
        assert.equal(actual.incorrect, false); assert.equal(actual.penalty, false);
        assert.deepEqual(await p.locator('.run-stat-value').allTextContents(), stats);
        report.appCancel[`${side}-${name}`] = {index, stats, actual};
        if (name === 'limitless') await capture(p, side, 'cancel-motion', gameSelectors);
        await client.detach();
      }
      await p.close();
      report.interactions[side] = await checkSelectionToggle(context, base, {expectFixed: side === 'after'});
    } finally {await context.close(); await server.close();}
  }
  for (const [name, items] of Object.entries(report.metrics.before)) for (const [selector, expected] of Object.entries(items)) {
    const actual = report.metrics.after[name][selector];
    for (const key of ['size', 'weight', 'family', 'line']) assert.equal(actual[key], expected[key], `${name} ${selector} ${key}`);
    // The intentional input fix changes the selected tile/equation on this
    // comparison only. Compare geometry on identical, unselected game states.
    if (name !== 'cancel-motion') for (const key of ['x', 'y', 'width', 'height']) {
      assert(Math.abs(actual[key] - expected[key]) < 0.1,
        `${name} ${selector} ${key}: ${actual[key]} != ${expected[key]}`);
    }
  }
  assert.deepEqual(report.errors, []); report.pass = true;
} catch (error) {report.pass = false; report.failure = String(error); throw error;}
finally {
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
  await browser.close();
  console.log(JSON.stringify({out, pass: report.pass, captures: report.captures.length,
    interactions: Object.fromEntries(Object.entries(report.interactions).map(([side, cases]) => [side, cases.length])), failure: report.failure}));
}
