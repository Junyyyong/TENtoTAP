import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='13edebf';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-equation-before-'));
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
   await page.clock.install({time:new Date('2026-09-20T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-20T00:00:01Z'));
   await page.addInitScript(()=>{let n=20260920;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
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

   const play = async (count,stage) => {
     const indices=await answer(count);assert.ok(indices);
     const values=await page.locator('#board .tile').evaluateAll((es,ids)=>ids.map(i=>Number(es[i].dataset.v)),indices);
     for(const i of indices){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(30);}
     if(side==='after') {
       const time=await page.locator('#stat-a-value').innerText();
       assert.equal(await page.locator('#sum-total').innerText(),'10');
       assert.equal(await page.locator('#sum-terms .sum-term').count(),values.length);
       if([1,6,14,23].includes(stage))await shot(page,'after-correct-'+values.length+'-blocks');
       await page.clock.runFor(1000);
       assert.equal(await page.locator('#stat-a-value').innerText(),time);
       assert.equal(await page.locator('#stat-c-value').innerText(),String(stage));
       assert.equal(await page.locator('#sum-total').innerText(),'10');
       await page.clock.runFor(1100);
     } else {
       await page.clock.runFor(600);
       if(stage===1)await shot(page,'before-correct');
     }
   };
   const words=[];
   for(let stage=1;stage<=30;stage++){
     if([1,6,14,23,30].includes(stage))await click('#lesson-intro');
     assert.equal(await page.locator('#stat-c-value').innerText(),String(stage));
     if(stage===1){
       const pair=await page.locator('#board .tile').evaluateAll(es=>{
         for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++)
          if(Number(es[i].dataset.v)+Number(es[j].dataset.v)!==10)return [i,j];
       });
       const sum=await page.locator('#board .tile').evaluateAll((es,ids)=>ids.reduce((s,i)=>s+Number(es[i].dataset.v),0),pair);
       for(const i of pair){await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(30);}
       if(side==='after'){
         assert.equal(await page.locator('#sum-total').innerText(),String(sum));
         assert.match(await page.locator('#selection-sum').getAttribute('class'),/incorrect/);
         const time=await page.locator('#stat-a-value').innerText();
         await page.clock.runFor(1000);assert.equal(await page.locator('#stat-a-value').innerText(),time);
       }
       await shot(page,side+'-incorrect');await page.clock.runFor(1600);
     }
     const count=stage<=5?2:stage<=13?3:stage<=22?4:stage<=29?5:0;
     let moves=0;
     while(await page.locator('#stat-c-value').innerText()===String(stage)){await play(count,stage);assert.ok(++moves<6);}
     if([5,13,22,30].includes(stage)){
       const word=await page.locator('#cheer-word').textContent();words.push(word);
       assert.notEqual(word,'NOT BAD!');
       if(side==='before')assert.equal(word,'GREAT!');
       else {
         await page.clock.runFor(2100);
         await page.waitForFunction(()=>{const v=document.querySelector('#cheer-clip');return v.videoWidth>0&&v.currentTime>.1&&!v.paused;},null,{polling:100,timeout:15000});
         await shot(page,'after-video-'+stage);
       }
       await click('#cheer');
     }
     if(side==='before' && stage===5)break;
   }
   if(side==='after'){
     assert.equal(new Set(words).size,4);
     assert.equal(await page.locator('#lesson-intro-title').innerText(),'MAKE 10\nIN 60 SECONDS');
     checks.push('All 30 lessons complete after automatic equation review','Actual sums retained for incorrect answers','2/3/4/5 block correct equations retain 10 for >1 second','Time and stage frozen during review','Four distinct non-NOT-BAD clips at 5/13/22/30 decoded and progressed in Chrome','Main-round intro still reached');
   }

  }finally{await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile; fixed clock 2026-09-20T00:00:01Z and seeded random; finite animations finished. Fresh profile; each mode launched from the menu. No saved-stage fixture. Color randomness uses crypto and is intentionally not seeded. Historical source extracted using git archive to a separate temporary directory. Video uses real media playback, not deterministic frames.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
