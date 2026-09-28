import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.CAPTURE_OUT || path.dirname(fileURLToPath(import.meta.url));
if (fs.existsSync(path.join(out, 'verification.json'))) throw new Error('Choose a new CAPTURE_OUT to preserve existing research.');
fs.mkdirSync(out, { recursive: true });
const revision = 'abc869d0cb157fd203676a0f787106f79592395f';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-penalty-before-'));
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const captures = [], checks = [], errors = [];
const sourceHashes = Object.fromEntries(['src/core/game.ts', 'src/ui/app.ts', 'src/ui/screens/hud.ts',
  'src/ui/styles/game.css', 'index.html'].map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const seconds = async page => (await page.locator('#stat-a-value').innerText()).split(':').reduce((m,s) => m*60 + Number(s), 0);
const visiblePenalty = page => page.locator('#time-penalty.is-visible').count();
async function click(page, selector) { await page.locator(selector).click({ force: true }); await page.clock.runFor(300); }
async function tap(page, index) { await page.locator(`#board .tile[data-i="${index}"]`).tap({ force: true }); }
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.animationName === 'time-penalty') { animation.pause(); animation.currentTime = 100; }
      else if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    }
  });
  const file = path.join(out, name + '.png'); await page.screenshot({ path: file });
  const bytes = fs.readFileSync(file); assert.equal(bytes.readUInt32BE(16), 780); assert.equal(bytes.readUInt32BE(20), 1688);
  captures.push({ file: name + '.png', sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function start(page, mode = 'timeAttack', stage = 31) {
  await page.evaluate(stage => localStorage.setItem('makezero.progress.v1', JSON.stringify({ learningStage: stage })), stage);
  await page.reload({ waitUntil: 'networkidle' }); await page.clock.runFor(8000);
  await click(page, '#mode-' + mode); await click(page, '#btn-intro-start');
  if (await page.locator('#lesson-intro').evaluate(el => !el.classList.contains('hidden'))) await click(page, '#lesson-intro');
}
async function indices(page, kind, count = 2) {
  return page.locator('#board .tile').evaluateAll((tiles, { kind, count }) => {
    const values = tiles.map(e => e.classList.contains('cleared') ? 0 : Number(e.dataset.v));
    function visit(chosen, next, sum) {
      if (chosen.length === count) return (kind === 'right' ? sum === 10 : sum > 10 || (count === 5 && sum < 10)) ? chosen : null;
      if (sum >= 10) return null;
      for (let i = next; i < values.length; i++) if (values[i]) {
        const answer = visit([...chosen, i], i + 1, sum + values[i]); if (answer) return answer;
      }
      return null;
    }
    return visit([], 0, 0);
  }, { kind, count });
}
async function wrong(page, count = 2) {
  const answer = await indices(page, 'wrong', count); assert.ok(answer, `no wrong ${count}-block fixture`);
  for (const i of answer) await tap(page, i);
}
try {
  execFileSync('tar', ['-xf', '-', '-C', temp], { input: execFileSync('git', ['archive', revision], { maxBuffer: 512*1024*1024 }) });
  fs.symlinkSync(path.join(process.cwd(), 'node_modules'), path.join(temp, 'node_modules'), 'dir');
  let originalBoardRect;
  for (const side of ['before', 'after']) {
    const server = await createServer({ root: side === 'before' ? temp : process.cwd(), configFile: false,
      server: { host: '127.0.0.1', port: 5199, strictPort: true }, logLevel: 'error' }); await server.listen();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Seoul' });
    try {
      await context.addInitScript(() => {
        localStorage.setItem('makezero.settings.v1', JSON.stringify({ musicOn: false, soundOn: false, hapticsOn: false }));
        let n = 20260928; Math.random = () => { n = (Math.imul(n,1664525)+1013904223) >>> 0; return n/4294967296; };
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.clock.install({ time: new Date('2026-09-28T00:00:00Z') }); await page.clock.pauseAt(new Date('2026-09-28T00:00:01Z'));
      await page.goto('http://127.0.0.1:5199', { waitUntil: 'networkidle' });
      await start(page);
      const boardRect = await page.locator('#board').boundingBox();
      if (side === 'before') originalBoardRect = boardRect; else assert.deepEqual(boardRect, originalBoardRect);
      const initialSeconds = await seconds(page);
      const pair = await indices(page, 'wrong');
      await tap(page, pair[0]); assert.equal(await seconds(page), initialSeconds); // partial
      await tap(page, pair[0]); assert.equal(await seconds(page), initialSeconds); // deselect
      await tap(page, pair[0]); await page.locator('#board').dispatchEvent('pointercancel');
      assert.equal(await seconds(page), initialSeconds);
      assert.equal(await visiblePenalty(page), 0);
      await wrong(page);
      assert.equal(await seconds(page), initialSeconds - (side === 'after' ? 1 : 0));
      assert.match(await page.locator('#selection-sum').getAttribute('class'), /incorrect/);
      assert.equal(await page.locator('#stat-b-value').innerText(), '0');
      await page.clock.runFor(100); await shot(page, side + '-wrong-answer');
      const right = await indices(page, 'right'); assert.ok(right);
      await tap(page, right[0]); assert.equal(await page.locator('#sum-terms .sum-term').count(), 1);
      await tap(page, right[1]); assert.equal(await page.locator('#stat-b-value').innerText(), '10');
      await shot(page, side + '-immediate-correct');
      if (side === 'after') {
        assert.equal(await visiblePenalty(page), 1);
        const time = await seconds(page);
        await page.clock.runFor(250); await wrong(page);
        assert.equal(await seconds(page), time - 1);
        await page.clock.runFor(300); assert.equal(await visiblePenalty(page), 1); // renewed timer
        await page.clock.runFor(201); assert.equal(await visiblePenalty(page), 0);
        checks.push('One-second deduction and unchanged points on an actual wrong pair.', 'Partial, deselected and cancelled input has no penalty.',
          'Correct input scores immediately while the badge is still visible.', 'Repeated mistakes each deduct one second and restart the 500ms badge.');
        for (const count of [3,4,5]) {
          const before = await seconds(page); await wrong(page, count); assert.equal(await seconds(page), before - 1);
        }
        checks.push('Wrong 3-, 4- and 5-block selections also deduct exactly one second.');

        // Let a single held gesture travel past an invalid adjacent pair.
        await start(page);
        const adjacent = await page.locator('#board .tile').evaluateAll(es => {
          const v = es.map(e => Number(e.dataset.v));
          return v.findIndex((n,i) => i%9 < 8 && n + v[i+1] > 10);
        }); assert.ok(adjacent >= 0);
        const box = await page.locator(`#board .tile[data-i="${adjacent}"]`).boundingBox();
        const box2 = await page.locator(`#board .tile[data-i="${adjacent+1}"]`).boundingBox();
        const timeBeforeDrag = await seconds(page);
        await page.mouse.move(box.x+box.width/2, box.y+box.height/2); await page.mouse.down();
        await page.mouse.move(box2.x+box2.width/2, box2.y+box2.height/2, { steps: 8 });
        await page.mouse.move(box.x+box.width/2, box.y+box.height*2, { steps: 10 }); await page.mouse.up();
        assert.equal(await seconds(page), timeBeforeDrag - 1);
        checks.push('One continuous drag charges once even when it travels farther after the rejection.');

        // Do not wait out a full game in real time: fast-forward the test clock.
        await start(page); await page.clock.fastForward(58_800);
        assert.equal(await seconds(page), 1);
        await wrong(page); assert.equal(await seconds(page), 0);
        assert.equal(await page.locator('#cheer').evaluate(el => !el.classList.contains('hidden')), true);
        assert.equal(await page.locator('#cheer-headline').innerText(), 'TIME OUT');
        checks.push('An error with less than one second remaining triggers the normal TIME OUT flow at zero.');

        for (const stage of [1,6,14,23,30]) {
          await start(page, 'timeAttack', stage);
          const before = await seconds(page); await wrong(page); assert.equal(await seconds(page), before);
          assert.equal(await visiblePenalty(page), 0);
        }
        for (const mode of ['endless','timeless']) {
          await start(page, mode);
          const before = await page.locator('.run-stats').innerText();
          if (mode === 'endless') await wrong(page);
          else {
            // Five 1s cannot make any allowed sum and cannot accept a sixth.
            const low = await page.locator('#board .tile').evaluateAll(es => es.map((e,i) => ({ i, n:Number(e.dataset.v) }))
              .filter(x => x.n === 1).slice(0,5).map(x => x.i));
            assert.equal(low.length, 5); for (const i of low) await tap(page, i);
          }
          assert.equal(await page.locator('.run-stats').innerText(), before);
          assert.equal(await visiblePenalty(page), 0);
        }
        checks.push('All five tutorial sections, TIMELESS and ENDLESS are exempt.');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await start(page); await wrong(page);
        // The existing global reduce-motion rule gives every transition 1ms.
        // Allow a frame for that transition before checking the static badge.
        await page.clock.runFor(20);
        const reduced = await page.locator('#time-penalty').evaluate(e => ({ opacity: getComputedStyle(e).opacity,
          animation: getComputedStyle(e).animationName, classes: e.className,
          reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
          instruction: document.querySelector('#lesson-intro').className,
          time: document.querySelector('#stat-a-value').textContent }));
        assert.equal(reduced.opacity, '1', JSON.stringify(reduced));
        await page.clock.runFor(501); assert.equal(await visiblePenalty(page), 0);
        checks.push('Reduced-motion mode shows a static badge, then hides it after 500ms.');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        for (const width of [320,375,390,430]) {
          await page.setViewportSize({ width, height: 844 }); await start(page); await wrong(page);
          const clock = await page.locator('#stat-a-value').boundingBox();
          const badge = await page.locator('#time-penalty').boundingBox();
          const nextStat = await page.locator('#stat-b').boundingBox();
          assert.ok(badge.x >= clock.x+clock.width, `${width}: badge overlaps clock`);
          assert.ok(badge.x+badge.width <= nextStat.x, `${width}: badge overlaps score`);
          await click(page, '#btn-back'); assert.equal(await visiblePenalty(page), 0);
        }
        checks.push('Badge does not overlap the clock or score at 320/375/390/430px; leaving clears it.', '390px board bounds match the historical version exactly.');
      }
    } finally { await context.close(); await server.close(); }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ date: new Date().toISOString(), before: revision,
    after: 'working tree based on ' + revision + ', including separately documented native-storage changes', sourceHashes,
    browser: browser.version(), viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    conditions: 'Historical git archive and current working tree; current installed dependencies. Fresh profiles, muted audio, fixed clock and Math.random seed. Stage 31 completion fixture starts the main round, not a claimed user save. Block colors use unfixed crypto randomness. Screenshots finish non-loop animations except penalty animation sampled at 100ms. Additional non-captured tests resize viewport and emulate reduced motion.',
    checks, errors, captures }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, screenshots: captures.length }, null, 2));
} finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
