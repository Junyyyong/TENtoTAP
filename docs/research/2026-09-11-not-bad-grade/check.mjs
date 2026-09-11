import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='989471e';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-notbad-before-'));
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
   await page.clock.install({time:new Date('2026-09-11T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-11T00:00:01Z'));
   await page.addInitScript(()=>{let n=20260911;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await click('#mode-timeAttack');await click('#btn-intro-start');await click('#lesson-intro');
   await page.clock.runFor(15000);await page.clock.runFor(4200);
   await page.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2);
   assert.equal(await page.locator('#cheer-word').innerText(),side==='before'?'GOOD TRY!':'NOT BAD!');
   await shot(page,side+'-zero-score-video');
   if(side==='after') {
     assert.match(await page.locator('#cheer-clip').evaluate(e=>e.currentSrc),/6\.webm/);
     await page.clock.runFor(16000);await click('#cheer');
     assert.equal(await page.locator('#overlay-title').innerText(),'Time up');
     checks.push('Actual zero-score timeout plays NOT BAD video','Video decodes in Chrome','Tap proceeds to result');
   }
  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile; fixed clock 2026-09-11T00:00:01Z and seeded random; finite animations finished. Fresh profile; each mode launched from the menu. No saved-stage fixture. Color randomness uses crypto and is intentionally not seeded. Historical source extracted using git archive to a separate temporary directory. Video uses real media playback, not deterministic frames.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
