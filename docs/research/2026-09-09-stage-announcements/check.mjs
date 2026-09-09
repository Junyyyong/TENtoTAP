import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='bd3d5e2';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-lesson-intro-before-'));
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
   await page.clock.install({time:new Date('2026-09-09T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-09T00:00:01Z'));
   await page.addInitScript(()=>{let n=20260909;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await shot(page,side+'-menu');await click('#mode-timeAttack');await shot(page,side+'-intro');
   await click('#btn-intro-start');await shot(page,side+'-stage1');
   if(side==='after')assert.match(await page.locator('#stat-a-value').innerText(),/00:14|00:15/);
   if(side==='before'){
    for(const stage of [6,14,23,30]){
      await page.evaluate(stage=>{localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:stage}));},stage);
      await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await click('#mode-timeAttack');await click('#btn-intro-start');
      await shot(page,'before-stage'+stage);
    }
   }else{
    for(let stage=1;stage<=30;stage++){
      assert.equal(await page.locator('#stat-c-value').innerText(),String(stage));
      const count=stage<=5?2:stage<=13?3:stage<=22?4:stage<=29?5:0;
      const intro=[1,6,14,23,30].includes(stage);
      assert.equal(await page.locator('#lesson-intro').evaluate(e=>!e.classList.contains('hidden')),intro);
      if(intro){
        assert.equal(await page.locator('#board .tutorial-target').count(),0);
        const timer=await page.locator('#stat-a-value').innerText();
        await page.clock.runFor(2000);
        assert.equal(await page.locator('#stat-a-value').innerText(),timer);
        await shot(page,'after-announcement'+stage);
        await click('#lesson-intro');
        assert.equal(await page.locator('#board .sel').count(),0);
      }
      assert.equal(await page.locator('#notice').innerText(),'');
      assert.equal(await page.locator('#board .tutorial-target').count(),[1,2,6,7,14,15,23,24].includes(stage)?count:0);
      if([6,7,8,14,15,16,23,24,25,30].includes(stage))await shot(page,'after-stage'+stage);
      let moves=0;
      while(await page.locator('#stat-c-value').innerText()===String(stage)){
        const answer=await page.locator('#board .tile').evaluateAll((es,count)=>{
          const values=es.map(e=>e.classList.contains('cleared')?0:Number(e.textContent));
          for(let mask=1;mask<2**values.length;mask++){
            const indices=values.flatMap((_,i)=>mask&(1<<i)?[i]:[]);
            if((count?indices.length===count:indices.length>=2&&indices.length<=5)&&indices.every(i=>values[i]>0)&&indices.reduce((sum,i)=>sum+values[i],0)===10)return indices;
          }
          return [];
        },count);
        assert.ok(answer.length>0);
        for(const i of answer){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(50);}
        assert.equal(await page.locator('#board').evaluate(e=>getComputedStyle(e).transform),'none');
        await page.clock.runFor(600);moves++;assert.ok(moves<=5);
      }
      if(stage===30)assert.ok(moves>1);
      const bonus=[5,13,22,30].includes(stage);
      assert.equal(await page.locator('#cheer').evaluate(e=>!e.classList.contains('hidden')),bonus);
      if(bonus){
        await shot(page,'after-bonus'+stage);
        const timer=await page.locator('#stat-a-value').innerText();await page.clock.runFor(1500);
        assert.equal(await page.locator('#stat-a-value').innerText(),timer);
        await click('#cheer');
      }
    }
    await shot(page,'after-stage31');
    checks.push('Five full-screen announcements pause timer and hide guidance until tapped','No click-through selection when starting','All 30 tutorial stages played with real taps','Exact guidance on first two stages of each count','No scale transform during stage transitions','Stage 30 requires multiple clears','Bonuses only after 5/13/22/30 and timers paused','Stage 31 reached');
   }
  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile; fixed clock 2026-09-09T00:00:01Z and seeded random; finite animations finished. Before 6/14/23/30 use saved-progress fixtures; after progresses from stage 1 through real answers. Color randomness uses crypto and is intentionally not seeded. Historical source extracted using git archive to a separate temporary directory. Video uses real media playback, not deterministic frames.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
