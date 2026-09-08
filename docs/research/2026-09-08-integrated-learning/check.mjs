import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname);
const revision='490e323';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-learning-before-'));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const captures=[], checks=[], errors=[];
async function shot(page,name){
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});
 const file=path.join(output,name+'.png');await page.screenshot({path:file});
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
 captures.push({file:name+'.png',sha256:createHash('sha256').update(bytes).digest('hex')});
}
try{
 execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
 for(const side of ['before','after']){
  const server=await createServer({root:side==='before'?tmp:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});
  await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install({time:new Date('2026-09-08T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-08T00:00:01Z'));
   await page.addInitScript(()=>{let n=20260908;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await shot(page,side+'-menu');
   await click('#mode-timeAttack');await shot(page,side+'-intro');
   await click(side==='before'?'.time-level-1':'#btn-intro-start');await shot(page,side+'-stage1');
   if(side==='after'){
    assert.equal(await page.locator('#btn-title-tutorial').count(),0);
    assert.equal(await page.locator('#run-title').innerText(),'MAKE 10');
    const box=await page.locator('#board .tile').first().boundingBox();assert.ok(box.width>150);
    await page.locator('#board .tile[data-i="0"]').tap({force:true});
    await page.locator('#board .tile[data-i="2"]').tap({force:true});await page.clock.runFor(80);
    assert.equal(await page.locator('#board .bust').count(),2);
    assert.match(await page.locator('#notice').innerText(),/11.*TRY AGAIN/);
    await shot(page,'after-over-ten');
    assert.equal(await page.locator('#board .bust').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(220, 38, 38)');
    await page.clock.runFor(1200);
    for(let stage=1;stage<=3;stage++){
     for(const i of [0,1,2,3]){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(50);}
     await page.clock.runFor(650);
    }
    assert.equal(await page.locator('#board .tile').count(),9);
    assert.equal(await page.locator('#stat-c-value').innerText(),'4');
    await shot(page,'after-stage4');
    await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await click('#mode-timeAttack');await shot(page,'after-continue-intro');await click('#btn-intro-start');
    assert.equal(await page.locator('#stat-c-value').innerText(),'4');
    assert.match(await page.locator('#stat-a-value').innerText(),/00:59|01:00/);
    for(const viewport of [{width:375,height:667},{width:844,height:390},{width:390,height:844}]) {
      await page.setViewportSize(viewport);await page.clock.runFor(300);
      await new Promise(resolve=>setTimeout(resolve,150));await page.clock.runFor(100);
      const board=await page.locator('#board').boundingBox();
      const sum=await page.locator('#selection-sum').boundingBox();
      assert.ok(board.x>=0&&board.x+board.width<=viewport.width+1);
      assert.ok(board.y>=0&&board.y+board.height<=sum.y+1,JSON.stringify({viewport,board,sum}));
    }
    // Test fixture, not earned progress: inspect the terminal board size.
    await page.evaluate(()=>{const key='makezero.progress.v1';const p=JSON.parse(localStorage.getItem(key));p.learningStage=76;localStorage.setItem(key,JSON.stringify(p));});
    await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await click('#mode-timeAttack');await click('#btn-intro-start');
    assert.equal(await page.locator('#board .tile').count(),81);
    await shot(page,'after-stage76-fixture');
    checks.push('No How to Play entry','Large 2×2 tiles','MAKE 10 header','7+4 rejected with two red tiles and 11 feedback','Three pair boards progress to stage 4 / 3×3','Reload continues stage 4 with a fresh minute','375×667 and 844×390 board fits without overlapping SUM','Stage 76 fixture renders 9×9');
   }
  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,viewport:{width:390,height:844},deviceScaleFactor:2,browser:browser.version(),method:'Historical before extracted to isolated temp folder; after current source. Fresh profile, controlled clock and seeded random. Finite animations finished; force touch bypasses stability wait. Not participant data.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
