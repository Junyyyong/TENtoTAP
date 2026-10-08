// Research-only: real browser input, development App exposed by a test route.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { tapWithMotion, checkSelectionToggle } from '../../../tests/browser/selection-toggle.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const out = process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'Use a fresh output directory');
fs.mkdirSync(out, { recursive: true });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-combo-'));
const before = path.join(tmp, 'before'); fs.mkdirSync(before);
execFileSync('tar', ['-xf', '-', '-C', before], { input: execFileSync('git', ['archive', revision,
  'src', 'public', 'index.html', 'package.json', 'tsconfig.json'], { maxBuffer: 128 * 1024 * 1024 }) });
fs.symlinkSync(path.join(root, 'node_modules'), path.join(before, 'node_modules'));
const report = { capturedAt: new Date().toISOString(), beforeRevision: revision,
  conditions: { css: [390,844], dpr: 2, png: [780,1688], clock: '2026-10-08T00:00:00Z',
    randomSeed: 20261008, profile: 'fresh localStorage, learningStage31, music/sound off',
    native: 'trackNativeFrame(true) simulation; no physical phone or native Preferences',
    fixture: 'App main round, controlled 9×9 alternating 4/6 board, 60 seconds frozen; real touch answers',
    harness: 'route exposes development App; no game source changed for inspection' },
  cases: [], captures: [], errors: [] };
const servers = [], contexts = [];
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
report.conditions.browser = await browser.version();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function settle(p) {
  await p.evaluate(async () => { await document.fonts.ready;
    for (const a of document.getAnimations()) {
      if (a.effect?.getTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish();
    }
  });
  await p.clock.runFor(60);
  await p.evaluate(() => { for (const a of document.getAnimations()) if (a.effect?.getTiming().iterations !== Infinity) a.finish(); });
  await p.screenshot();
}
async function capture(p, file) {
  await settle(p);
  const bytes = await p.screenshot({ path: path.join(out, file) });
  report.captures.push({ file, sha256: sha(bytes), dimensions: [780,1688] });
}
const snapshot = p => p.evaluate(() => { const a = window.__comboApp; return {
  score: a.state.score, combo: a.state.limitlessCombo ?? null, remainingMs: a.state.remainingMs,
  notice: document.querySelector('#notice').textContent,
  selected: [...document.querySelectorAll('#board .sel')].map(e => Number(e.dataset.i)),
  best: a.progress.bestLimitlessScore, flow: a.flow.current,
  sum: document.querySelector('#sum-total').textContent,
}; });
async function open(url, native = true) {
  const context = await browser.newContext({ viewport: { width:390,height:844 }, deviceScaleFactor:2,
    isMobile:true, hasTouch:true, locale:'en-US', timezoneId:'Asia/Seoul' }); contexts.push(context);
  await context.addInitScript(() => {
    localStorage.setItem('makezero.settings.v1', JSON.stringify({ musicOn:false,soundOn:false,hapticsOn:false }));
    localStorage.setItem('makezero.progress.v1', JSON.stringify({ learningStage:31,bestLimitlessScore:25,bestEndless:123,bestTimeless:456 }));
    let seed = 20261008; Math.random = () => { seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed / 4294967296; };
  });
  const p = await context.newPage(); p.on('pageerror', e => report.errors.push(String(e)));
  await p.route('**/src/main.ts', async route => {
    const response = await route.fetch(); let body = await response.text();
    assert(body.includes('new App();'), 'App exposure fixture must match');
    body = body.replace('new App();', 'window.__comboApp = new App();');
    if (native) body = body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/, 'trackNativeFrame(true)');
    await route.fulfill({ response, body });
  });
  await p.clock.install({ time:new Date(report.conditions.clock) }); await p.clock.pauseAt(new Date(report.conditions.clock));
  await p.goto(url, { waitUntil:'networkidle' }); await p.clock.runFor(8000); await settle(p);
  await p.locator('#mode-timeAttack').click(); await settle(p);
  await p.locator('#btn-intro-start').click(); await settle(p);
  await p.locator('#lesson-intro').click();
  await p.evaluate(() => {
    const a = window.__comboApp; a.stopClock();
    assertMain(a.state.config);
    function assertMain(c) { if (!c.scoreAttack || c.learningStage) throw new Error('Main round required'); }
    a.state = { ...a.state, remainingMs:60000, elapsedMs:0,
      board:{ width:9,cells:Array.from({ length:81 }, (_,i) => ({ value:i===80?1:i%2===0?4:6,cleared:false })) } };
    a.view.setBoard(a.state.board); a.render();
  }); await settle(p);
  return { p,context,client:await context.newCDPSession(p) };
}
const answer = async (p,client,n) => { await tapWithMotion(p,client,2*n); await tapWithMotion(p,client,2*n+1); };
try {
  const urls = {};
  for (const [name,dir] of [['before',before],['after',root]]) {
    const server = await createServer({ root:dir, cacheDir:path.join(tmp,`cache-${name}`), logLevel:'error', server:{ host:'127.0.0.1',port:0 } });
    await server.listen(); servers.push(server); urls[name] = server.resolvedUrls.local[0];
  }
  for (const name of ['before','after']) {
    const { p,client } = await open(urls[name]);
    for (let n=0;n<6;n++) {
      await answer(p,client,n); const s = await snapshot(p);
      assert.equal(s.score, name==='before' ? 10*(n+1) : n<4 ? 10*(n+1) : n===4 ? 70 : 100);
      if (name==='after') assert.equal(s.combo,n+1);
      assert.equal(s.remainingMs,60000);
      assert.equal(s.best,Math.max(25,s.score));
      const pop = await p.locator('.pop').last().textContent();
      assert.equal(pop,name==='after' && n>=4 ? '+30' : '+10');
      report.cases.push({ version:name,action:`answer ${n+1}`,state:s,pop,pass:true });
      if (n>=4) await capture(p,`${name}-${n+1}-combo.png`);
    }
    await tapWithMotion(p,client,12); await tapWithMotion(p,client,14);
    const pending = await snapshot(p); assert.deepEqual(pending.selected,[12,14]);
    await tapWithMotion(p,client,12,3);
    const cancelled = await snapshot(p);
    assert.deepEqual(cancelled.selected,[14]); assert.equal(cancelled.score,name==='before'?60:100);
    assert.equal(cancelled.remainingMs,60000);
    if (name==='after') assert.equal(cancelled.combo,0);
    report.cases.push({ version:name,action:'cancel one selected tile with real 3px touch movement',state:cancelled,pass:true });
    await capture(p,`${name}-cancel.png`);
    if (name==='after') {
      await tapWithMotion(p,client,14); // Remove the remaining partial selection.
      for (let n=6;n<11;n++) { await answer(p,client,n); assert.equal((await snapshot(p)).combo,n-5); }
      assert.equal((await snapshot(p)).score,170);
      await tapWithMotion(p,client,22);
      await p.locator('#btn-pause').click(); await settle(p);
      assert.equal((await snapshot(p)).combo,5);
      await p.getByRole('button',{name:'Resume',exact:true}).click();
      await p.evaluate(() => window.__comboApp.stopClock()); await settle(p);
      assert.equal((await snapshot(p)).combo,5);
      report.cases.push({ action:'pause/resume automatic deselection preserves earned streak',state:await snapshot(p),pass:true });
      await tapWithMotion(p,client,22);
      const beforeBlank=await snapshot(p);
      report.cases.push({action:'blank tap setup',state:beforeBlank});
      assert.deepEqual(beforeBlank.selected,[22]);
      const blank = await p.locator('#board-wrap').evaluate(e => {
        const r=e.getBoundingClientRect(),grid=document.querySelector('#board').getBoundingClientRect();
        // Aim well away from tiles: Chrome can retarget a touch within 1px of
        // a button's edge to that button even though elementFromPoint is blank.
        const x=r.x+r.width/2,y=(r.y+grid.y)/2;
        const target=document.elementFromPoint(x,y);
        if(target?.closest('#board-wrap')!==e || target.closest('.tile')) throw new Error('Blank tap must hit the wrapper away from a tile'); return {x,y,target:target.id};
      });
      await p.touchscreen.tap(blank.x,blank.y);
      const blanked=await snapshot(p);
      report.cases.push({action:'blank touch diagnostics',blank,state:blanked});
      assert.equal(blanked.combo,0); assert.deepEqual(blanked.selected,[]);
      report.cases.push({ action:'tap blank board area cancels pending selection, no time/point cost',state:blanked,pass:true });
      for (let n=11;n<16;n++) await answer(p,client,n);
      const beforeWrong=await snapshot(p); assert.equal(beforeWrong.combo,5);
      await tapWithMotion(p,client,33); await tapWithMotion(p,client,35); // 6+6 is a confirmed mistake.
      const wrong=await snapshot(p); assert.equal(wrong.combo,0); assert.equal(wrong.score,beforeWrong.score); assert.equal(wrong.remainingMs,beforeWrong.remainingMs-1000);
      report.cases.push({ action:'wrong answer resets and keeps existing -1 second penalty',state:wrong,pass:true });
      const data=await p.evaluate(() => JSON.parse(localStorage.getItem('makezero.progress.v1')));
      assert.equal(data.bestEndless,123); assert.equal(data.bestTimeless,456); assert.equal(data.learningStage,31);
      assert.equal(data.bestLimitlessScore,wrong.score);
      report.cases.push({ action:'best includes earned bonus; other records/stage preserved',data,pass:true });
    }
    await client.detach();
  }
  const regressionContext=await browser.newContext({ viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true }); contexts.push(regressionContext);
  report.selectionRegression = await checkSelectionToggle(regressionContext,urls.after);
  assert.equal(report.errors.length,0); report.pass=true;
} finally {
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await Promise.all(contexts.map(c=>c.close())); await browser.close(); await Promise.all(servers.map(s=>s.close()));
}
console.log(JSON.stringify({pass:report.pass,cases:report.cases.length,captures:report.captures.length,
  selectionRegression:report.selectionRegression?.length,errors:report.errors},null,2));
