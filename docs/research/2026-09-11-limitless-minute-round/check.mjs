import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='989471e';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-minute-round-before-'));
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
   await click('#mode-timeAttack');await click('#btn-intro-start');
   const answer = async count => page.locator('#board .tile').evaluateAll((es,count)=>{
     const values=es.map(e=>e.classList.contains('cleared')?0:Number(e.textContent));
     function find(chosen,start,sum){
       if(sum===10 && (count?chosen.length===count:chosen.length>=2))return chosen;
       if(chosen.length>=(count||5))return null;
       for(let i=start;i<values.length;i++)if(values[i]>0&&sum+values[i]<=10){
         const found=find([...chosen,i],i+1,sum+values[i]);if(found)return found;
       }
       return null;
     }
     return find([],0,0);
   },count);
   const play = async count => {
     const indices=await answer(count);assert.ok(indices);
     for(const i of indices){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(30);}
     await page.clock.runFor(600);
   };
   for(let stage=1;stage<=30;stage++){
     if([1,6,14,23,30].includes(stage))await click('#lesson-intro');
     assert.equal(await page.locator('#stat-c-value').innerText(),String(stage));
     if(stage===30)await shot(page,side+'-tutorial30');
     const count=stage<=5?2:stage<=13?3:stage<=22?4:stage<=29?5:0;
     let moves=0;
     while(await page.locator('#stat-c-value').innerText()===String(stage)){await play(count);assert.ok(++moves<6);}
     if([5,13,22,30].includes(stage)){
       assert.equal(await page.locator('#cheer-word').textContent(),'GREAT!');
       assert.equal(await page.locator('#cheer').evaluate(e=>!e.classList.contains('hidden')),true);
       if(stage===30)await shot(page,side+'-clear30');
       await click('#cheer');
     }
   }
   if(side==='after'){
     assert.equal(await page.locator('#lesson-intro-title').innerText(),'MAKE 10\nIN 60 SECONDS');
     assert.equal(await page.locator('#stat-b-value').innerText(),'0');
     assert.equal(await page.locator('#stat-a-value').innerText(),'01:00');
     await page.clock.runFor(2000);
     assert.equal(await page.locator('#stat-a-value').innerText(),'01:00');
     await shot(page,'after-main-intro');
     await click('#lesson-intro');
     assert.equal(await page.locator('#run-title').innerText(),'LIMITLESS');
     assert.match(await page.locator('#stat-c').innerText(),/BEST/);
     assert.equal(await page.locator('#board .tile').count(),81);
     await play(0);
     const score=await page.locator('#stat-b-value').innerText();assert.ok(Number(score)>0);
     await shot(page,'after-main-playing');
     await page.clock.runFor(60000);await page.clock.runFor(5000);
     assert.equal(await page.locator('#cheer-word').innerText(),'GOOD TRY!');
     await shot(page,'after-main-result-video');
     await page.clock.runFor(16000);await click('#cheer');
     assert.ok(!(await page.locator('#overlay-body').innerText()).includes('STAGE'));
     assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('makezero.progress.v1')).bestLimitlessScore),Number(score));
     await click('#btn-primary');
     assert.equal(await page.locator('#stat-b-value').innerText(),'0');
     assert.equal(await page.locator('#stat-a-value').innerText(),'01:00');
     checks.push('All 30 tutorial stages played','GREAT at 5/13/22/30','Fresh zero score and 60 seconds after tutorial','Main has BEST instead of STAGE and 9×9 board','Main timeout graded from its own score','Separate main best saved','Retry starts main round directly');
   }else{await shot(page,'before-stage31');}

  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile; fixed clock 2026-09-11T00:00:01Z and seeded random; finite animations finished. Fresh profile; each mode launched from the menu. No saved-stage fixture. Color randomness uses crypto and is intentionally not seeded. Historical source extracted using git archive to a separate temporary directory. Video uses real media playback, not deterministic frames.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
