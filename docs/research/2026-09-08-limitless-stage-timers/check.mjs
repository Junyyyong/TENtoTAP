import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='cff9c60';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-limitless-before-'));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const captures=[],checks=[],errors=[];
async function shot(page,name){
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});
 const file=path.join(output,name+'.png');await page.screenshot({path:file});
 const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
 captures.push({file:name+'.png',sha256:createHash('sha256').update(bytes).digest('hex')});
}
try{
 execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
 for(const side of ['before','after']){
  const server=await createServer({root:side==='before'?tmp:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install({time:new Date('2026-09-08T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-08T00:00:01Z'));
   await page.addInitScript(()=>{let n=20260908;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await shot(page,side+'-menu');await click('#mode-timeAttack');await shot(page,side+'-intro');
   await click('#btn-intro-start');await shot(page,side+'-stage1');
   if(side==='after')assert.match(await page.locator('#stat-a-value').innerText(),/00:14|00:15/);
   // Matched saved-progress fixture, not a participant's earned stage.
   await page.evaluate(()=>{const key='makezero.progress.v1';const p=JSON.parse(localStorage.getItem(key))??{};p.learningStage=5;localStorage.setItem(key,JSON.stringify(p));});
   await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await click('#mode-timeAttack');await click('#btn-intro-start');
   await shot(page,side+'-stage5-fixture');
   for(const i of [0,1,2,3,4,5,6,7,8]){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(50);}
   await page.clock.runFor(600);await shot(page,side+'-stage5-cleared');
   if(side==='after'){
    assert.equal(await page.locator('#cheer-headline').innerText(),'BONUS BREAK');
    const timer=await page.locator('#stat-a-value').innerText();
    await page.clock.runFor(5000);
    assert.equal(await page.locator('#stat-a-value').innerText(),timer);
    assert.equal(await page.locator('#stat-c-value').innerText(),'6');
    await shot(page,'after-bonus-video');
    await click('#cheer');await page.clock.runFor(1500);
    assert.notEqual(await page.locator('#stat-a-value').innerText(),timer);
    await shot(page,'after-stage6-resumed');
    checks.push('Stage 1 starts with 15 seconds','Stage 5 clear opens BONUS BREAK','Stage 6 clock frozen during bonus','Tap resumes stage 6 countdown');
   }
  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile; fixed clock 2026-09-08T00:00:01Z and seeded random; finite animations finished. Stage 5 saved-progress fixture. Historical source extracted using git archive to a separate temporary directory. Video uses real media playback, not deterministic frames.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
