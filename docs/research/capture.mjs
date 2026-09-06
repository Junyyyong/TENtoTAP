// npm run dev -- --host 127.0.0.1; node docs/research/capture.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const out = process.env.CAPTURE_OUT ?? 'docs/research/2026-09-06-baseline';
const baseURL = process.env.CAPTURE_URL ?? 'http://127.0.0.1:5173';
fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
const browser = await chromium.launch({ headless: true,
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [], captures = [];
page.on('pageerror', error => errors.push(error.message));
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
async function shot(id, caption) {
  await page.evaluate(() => document.fonts.ready);
  // Complete finite screen transitions, retaining the repeating guidance glow.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    }
  });
  const file = `screenshots/${id}.png`;
  await page.screenshot({ path: path.join(out, file), animations: 'allow' });
  const data = fs.readFileSync(path.join(out, file));
  assert.equal(data.readUInt32BE(16), 780);
  assert.equal(data.readUInt32BE(20), 1688);
  captures.push({ id, caption, file, sha256: createHash('sha256').update(data).digest('hex'),
    width: 780, height: 1688, displayedClock: await page.locator('#screen-game .run-stat-value').allTextContents() });
}
async function click(selector) {
  await page.locator(selector).click({ force: true });
  await page.clock.runFor(400);
}
try {
  await page.clock.install({ time: new Date('2026-09-06T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
  await page.addInitScript(() => {
    let seed = 20260906;
    Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await Promise.all([...document.images].filter(i => i.src).map(i => i.decode().catch(() => {}))); });
  await shot('01-studio', '커버 전 스튜디오 로고. 투명 PNG의 흰 글씨 포함.');
  await page.clock.runFor(3400);
  await shot('02-cover', '현재 커버. 모바일 화면에 맞춘 실제 표시 범위.');
  await page.clock.runFor(4000);
  await shot('03-menu', '세 게임 모드와 하단 메뉴.');
  await click('#mode-timeAttack');
  assert.equal(await page.locator('.time-level:visible').count(), 4);
  assert.equal(await page.locator('#btn-intro-start').isVisible(), false);
  await shot('04-level-select', '60초 아이콘, 색으로 구분한 레벨 4개와 최고기록. 신규 프로필.');
  for (const [level, size] of [[1,2],[2,5],[3,7],[4,9]]) {
    await click(`.time-level-${level}`);
    assert.equal(await page.locator('#board .tile').count(), size * size);
    await shot(`0${4+level}-level-${level}`, `LEVEL ${level} 시작 판: ${size}×${size}.`);
    await click('#btn-back');
    await click('#mode-timeAttack');
  }
  await click('#btn-intro-back');
  for (const mode of ['endless', 'timeless']) {
    await click(`#mode-${mode}`);
    await shot(`09-${mode}-intro`, `${mode} 시작 안내.`);
    await click('#btn-intro-start');
    await shot(`10-${mode}-game`, `${mode} 초기 게임판.`);
    await click('#btn-back');
  }
  await click('#btn-title-tutorial');
  for (let step = 1; step <= 5; step++) {
    const targets = await page.locator('#tutorial-board .tutorial-target').count();
    assert.ok(targets >= 2);
    await page.clock.runFor(150);
    await shot(`11-tutorial-${step}`, `How to Play ${step}단계. 금빛 안내 효과의 한 프레임.`);
    while (await page.locator('#tutorial-board .tutorial-target').count()) {
      // The paused animation clock prevents Playwright's stability wait.
      // Force only bypasses that wait; input still follows the touch handler.
      await page.locator('#tutorial-board .tutorial-target').first().tap({ force: true });
      await page.clock.runFor(100);
    }
    assert.equal(await page.locator('#btn-tutorial-next').isVisible(), true);
    if (step === 1) await shot('12-tutorial-success', '첫 연습 성공 후 Next 안내.');
    await click('#btn-tutorial-next');
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ capturedAt: new Date().toISOString(),
    revision: git('rev-parse', process.env.CAPTURE_REVISION ?? 'HEAD'), sourceChanges: git('diff', '--name-only', 'HEAD', '--', 'src', 'index.html', 'public'),
    browser: browser.version(), viewport: { width:390, height:844 }, deviceScaleFactor:2,
    method: 'Local source; mobile Chromium emulation; controlled clock; seeded Math.random; fresh browser storage; finite transitions finished before capture, repeating guidance retained. Not an actual phone photograph or participant study.',
    captures, errors }, null, 2) + '\n');
  console.log(`Saved ${captures.length} PNGs; 4 level entry checks and 5 tutorial completion checks passed.`);
} finally { await browser.close(); }
