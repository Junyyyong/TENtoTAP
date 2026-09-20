import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out=path.dirname(new URL(import.meta.url).pathname),revision='9c59eb1';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-live-equation-'));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const captures=[],checks=[];
try{
 execFileSync('tar',['-xf','-','-C',tmp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(tmp,'node_modules'),'dir');
 for(const side of ['before','after']){
  const server=await createServer({root:side==='before'?tmp:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:5199,strictPort:true},logLevel:'silent'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false}));let n=20260920;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);});
   await page.clock.install({time:new Date('2026-09-20T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-20T00:00:01Z'));
   const click=async s=>{await page.locator(s).click({force:true});await page.clock.runFor(600);};
   const tap=async i=>{await page.locator(`#board .tile[data-i="${i}"]`).tap({force:true});await page.clock.runFor(20);};
   const shot=async name=>{await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});const file=path.join(out,name+'.png');await page.screenshot({path:file});const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);captures.push({file:name+'.png',sha256:createHash('sha256').update(bytes).digest('hex')});};
   await page.goto('http://127.0.0.1:5199');await page.clock.runFor(8000);await click('#mode-timeAttack');await click('#btn-intro-start');await click('#lesson-intro');
   const pairs=await page.locator('#board .tile').evaluateAll(es=>{const v=es.map(e=>Number(e.dataset.v)),r={};for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++)r[v[i]+v[j]===10?'right':'wrong']=[i,j];return {v,...r};});
   for(const i of pairs.wrong)await tap(i);
   await page.clock.runFor(1000);await shot(side+'-wrong-1s');
   if(side==='after'){
    assert.equal(await page.locator('#sum-total').innerText(),String(pairs.wrong.reduce((s,i)=>s+pairs.v[i],0)));
    assert.match(await page.locator('#selection-sum').getAttribute('class'),/incorrect/);
    assert.notEqual(await page.locator('#stat-a-value').innerText(),'00:15');
    await tap(pairs.right[0]);assert.equal(await page.locator('#sum-terms .sum-term').count(),1);
    assert.equal(await page.locator('#sum-total').innerText(),String(pairs.v[pairs.right[0]]));
    assert.ok(!(await page.locator('#selection-sum').getAttribute('class')).includes('incorrect'));
    await tap(pairs.right[1]);
   }else{await page.clock.runFor(700);for(const i of pairs.right)await tap(i);}
   await page.clock.runFor(600);await shot(side+'-correct-600ms');
   assert.equal(await page.locator('#stat-c-value').innerText(),side==='after'?'2':'1');
   if(side==='after'){
    assert.equal(await page.locator('#sum-total').innerText(),'10');
    await page.clock.runFor(2000);assert.equal(await page.locator('#sum-total').innerText(),'10');
    await tap(0);assert.equal(await page.locator('#sum-terms .sum-term').count(),1);
    checks.push('Incorrect result persists while clock advances','Next input replaces incorrect equation immediately','Correct answer advances immediately, result survives board replacement and 2 seconds','Next digit replaces correct result');
   }
   assert.deepEqual(errors,[]);
  }finally{await context.close();await server.close();}
 }
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({date:new Date().toISOString(),before:revision,after:'working tree',viewport:{width:390,height:844},deviceScaleFactor:2,browser:browser.version(),conditions:'Same fixed clock and number seed, fresh muted profiles; historical git archive, current Vite; crypto block colors differ.',checks,captures},null,2));
 console.log(checks);
}finally{await browser.close();fs.rmSync(tmp,{recursive:true,force:true});}
