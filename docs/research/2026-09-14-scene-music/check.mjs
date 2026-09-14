import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const output=path.dirname(new URL(import.meta.url).pathname), revision='e42b3bc';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-music-before-'));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=user-gesture-required']});
const captures=[],checks=[],errors=[];
async function shot(page,name){
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});
 const file=path.join(output,name+'.png'); await page.screenshot({path:file});
 const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
 captures.push({file:name+'.png',sha256:createHash('sha256').update(bytes).digest('hex')});
}
try {
 execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
 for(const side of ['before','after']) {
  const server=await createServer({root:side==='before'?tmp:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try {
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install({time:new Date('2026-09-14T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-14T00:00:01Z'));
   await page.addInitScript(()=>{
    let n=20260914;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
    window.musicSources=[];
    const original=AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource=function(){
     const source=original.call(this),item={source,context:this,stopped:false};window.musicSources.push(item);
     const stop=source.stop.bind(source);source.stop=(...args)=>{item.stopped=true;return stop(...args);};
     return source;
    };
   });
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   const active=()=>page.evaluate(()=>window.musicSources.filter(x=>x.source.loop&&!x.stopped&&x.context.state==='running').map(x=>x.source.buffer.duration));
   const waitMusic=async expected=>{
    await page.waitForFunction(e=>{
     const a=window.musicSources.filter(x=>x.source.loop&&!x.stopped&&x.context.state==='running');
     return e===0?a.length===0:a.length===1&&Math.abs(a[0].source.buffer.duration-e)<.1;
    },expected,{polling:100,timeout:15000});
   };
   await page.goto('http://127.0.0.1:5199',{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await shot(page,side+'-menu');
   await click('#btn-title-settings');
   if(side==='after') {
    await waitMusic(64*60/112);
    await click('#switch-music');await waitMusic(0);
    assert.equal(await page.locator('#switch-sound').getAttribute('aria-checked'),'true');
    await click('#switch-music');await waitMusic(64*60/112);
   }
   await shot(page,side+'-settings');
   await click('#btn-settings-back');await click('#mode-timeAttack');
   if(side==='after') await waitMusic(64*60/112);
   await click('#btn-intro-start');
   if(side==='after') await waitMusic(64*60/124);
   await shot(page,side+'-game-intro');
   await click('#lesson-intro');
   if(side==='after') {
    await waitMusic(64*60/124);
    await click('#btn-pause');await waitMusic(0);
    await click('#btn-primary');await waitMusic(64*60/124);
    // All five pair lessons are played to reach the actual GREAT clip.
    for(let stage=1;stage<=5;stage++) {
     const pair=await page.locator('.tile:not(.cleared)').evaluateAll(tiles=>{
      for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++)
       if(Number(tiles[i].dataset.v)+Number(tiles[j].dataset.v)===10)return [tiles[i].dataset.i,tiles[j].dataset.i];
      throw Error('No pair');
     });
     for(const index of pair) { await page.locator(`#board .tile[data-i="${index}"]`).tap({force:true});await page.clock.runFor(30); }
     await page.clock.runFor(600);
    }
    await waitMusic(0);await page.clock.runFor(2200);
    assert.equal(await page.locator('#cheer-word').textContent(),'GREAT!');
    await shot(page,'after-great-video');
    await click('#cheer');await waitMusic(64*60/124);
    await click('#lesson-intro');await page.clock.runFor(61000);await waitMusic(0);
    await page.clock.runFor(4200);await shot(page,'after-result-video');
    await page.clock.runFor(16000);await click('#cheer');await click('#btn-secondary');
    await waitMusic(64*60/112);
    await click('#btn-title-settings');await click('#switch-music');await waitMusic(0);
    await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await click('#btn-title-settings');
    assert.equal(await page.locator('#switch-music').getAttribute('aria-checked'),'false');
    assert.deepEqual(await active(),[]);
    checks.push('Real decoded menu/game loops with exclusive playback','Menu selection retains lobby music','Instructions and play use 124 BPM game loop','Pause/resume stops and resumes','Actual stage 5 GREAT and timeout results stop BGM','Return to menu restores lobby','Independent Music toggle persists across reload');
   }
  } finally {await context.close();await server.close();}
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree based on '+revision,browser:browser.version(),viewport:{width:390,height:844},deviceScaleFactor:2,conditions:'Fresh profile, fixed clock and seeded number randomness. Color crypto randomness and actual media timing differ. Real Web Audio decoding, instrumented source start/stop; not a listening-quality assertion. Historical git archive uses current installed Vite.',checks,errors,captures},null,2)+'\n');
 console.log(checks);
} finally {await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
