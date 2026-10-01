// Development/research only. Does not run in or ship with the game.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), output=process.env.CAPTURE_OUT || path.join(import.meta.dirname,'final');
assert(!fs.existsSync(output),'Preserve existing evidence: choose a fresh CAPTURE_OUT');
fs.mkdirSync(output,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-style-history-'));
execFileSync('tar',['-xf','-','-C',temp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),'dir');
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={capturedAt:new Date().toISOString(),previousCommit:revision,currentBaseline:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),
  conditions:{viewport:[390,844],dpr:2,png:[780,1688],locale:'en-US',timezone:'Asia/Seoul',clock:'2026-10-01T00:00:00Z',seed:20261001,profile:'fresh context, local stage10/best scores fixture, audio off'},
  screenshots:[],metrics:{},matrix:[],grades:[],modes:[],errors:[],sourceHashes:{},notes:['Historical commit extracted with git archive; current files never replaced.',
  'macOS Chrome captures, not an actual Android/Safari device reproduction. Shared dependencies reused for historical execution.',
  'Grade shots are explicit component fixtures, not earned scores. Video frame decoding can differ between captures.',
  'Real OEM font/bold/Easy Mode and in-place Play update NOT TESTED. OS density and magnifier are not modified.']};
for(const file of ['index.html','src/ui/styles/tokens.css','src/ui/styles/title.css','src/ui/styles/typography.css','src/ui/screens/cheer.ts','public/assets/fonts/NotoSansKR-Variable.woff2'])report.sourceHashes[file]=sha(fs.readFileSync(path.join(root,file)));
async function settle(page){await page.clock.runFor(350);await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()});}
async function shot(page,name){await settle(page);const file=path.join(output,`${name}.png`);await page.screenshot({path:file});const b=fs.readFileSync(file);assert.equal(b.readUInt32BE(16),780);assert.equal(b.readUInt32BE(20),1688);report.screenshots.push({file:path.basename(file),sha256:sha(b)});}
async function titleMetrics(page){return page.evaluate(()=>{
  const read=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return {width:r.width,height:r.height,font:c.fontFamily,size:c.fontSize,weight:c.fontWeight,line:c.lineHeight}};
  return {viewport:[innerWidth,innerHeight],logo:read('.brand-mark'),button:read('.mode-btn'),name:read('.mode-name'),desc:read('.mode-desc'),fontLoaded:Array.from(document.fonts).some(f=>f.family==='TAP Sans KR'&&f.status==='loaded')};
});}
async function fonts(page,selector){const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root:dom}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector});const result=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});await cdp.detach();return result.fonts;}
try {
 for(const side of ['before','after']){
  const server=await createServer({root:side==='before'?temp:root,configFile:false,cacheDir:path.join(temp,`cache-${side}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  try {
   await context.addInitScript(()=>{if(location.hostname!=='127.0.0.1')return;localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));if(!localStorage.getItem('makezero.progress.v1'))localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:10,bestEndless:123,bestTimeless:456}));let seed=20261001;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({side,error:String(e)}));page.setDefaultTimeout(15000);
   await page.clock.install({time:new Date(report.conditions.clock)});await page.goto(server.resolvedUrls.local[0],{waitUntil:'networkidle'});await page.clock.runFor(8000);
   await page.locator('#screen-title').waitFor({state:'visible'});await shot(page,`${side}-title`);
   report.metrics[side]={title:await titleMetrics(page),fonts:await fonts(page,'.mode-name')};
   if(side==='after'){
    assert(report.metrics.after.title.fontLoaded);assert(report.metrics.after.fonts.every(f=>f.isCustomFont),'Bundled font actually renders title');
    for(const width of [320,375,390,412,430]){
     let previous;
     for(const height of [660,700,701,844,932]){
      await page.setViewportSize({width,height});await settle(page);const m=await titleMetrics(page);report.matrix.push(m);
      assert.equal(m.name.size,'18px');assert.equal(m.name.weight,'600');assert.equal(m.desc.size,'12px');assert.equal(m.button.height,64);
      if(previous){assert.equal(m.logo.width,previous.logo.width);assert.equal(m.button.width,previous.button.width);}previous=m;
     }
    }
    await page.setViewportSize({width:390,height:844});await settle(page);
   }
   await page.locator('#btn-title-settings').click();await shot(page,`${side}-settings`);await page.locator('#btn-settings-back').click();await settle(page);
   await page.locator('#mode-timeAttack').click();await settle(page);await page.locator('#btn-intro-start').click();await settle(page);
   assert.equal(await page.locator('#board .tile').count(),9);await shot(page,`${side}-stage10`);
   await page.evaluate(async()=>{const {Cheer}=await import('/src/ui/screens/cheer.ts');window.styleCheer=new Cheer();window.styleCheer.setSound(false);window.styleCheer.play('FIXTURE',0,()=>{},0,true,0)});
   await shot(page,`${side}-grade-fixture`);
   if(side==='after'){
    for(const width of [320,375,390,412,430]){
     await page.setViewportSize({width,height:844});await settle(page);
     for(let band=0;band<6;band++){
      await page.evaluate(b=>window.styleCheer.play('FIXTURE',0,()=>{},b,true,0),band);await settle(page);
      const m=await page.locator('#cheer-word').evaluate(e=>{const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();return {word:e.textContent,left:r.left,right:r.right,width:innerWidth}});report.grades.push(m);assert(m.left>=0&&m.right<=width,`Grade fits: ${JSON.stringify(m)}`);
     }
    }
    // Reload for each mode: real UI flow, separate fresh board, identical saves.
    for(const mode of ['timeAttack','timeless','endless']){
     await page.setViewportSize({width:390,height:844});await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await settle(page);
     if(mode==='timeAttack'){
      await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('makezero.progress.v1'));p.learningStage=31;localStorage.setItem('makezero.progress.v1',JSON.stringify(p));});
      await page.reload({waitUntil:'networkidle'});await page.clock.runFor(8000);await settle(page);
     }
     await page.locator(`#mode-${mode}`).click();await settle(page);await page.locator('#btn-intro-start').click();await settle(page);
     if(await page.locator('#lesson-intro').isVisible()){await page.locator('#lesson-intro').click();await settle(page);}
     const m=await page.evaluate(()=>{const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};return {title:document.querySelector('#run-title').textContent,board:r(document.querySelector('#board')),wrap:r(document.querySelector('#board-wrap')),sum:r(document.querySelector('#selection-sum')),font:getComputedStyle(document.querySelector('.tile')).fontFamily,tiles:document.querySelectorAll('#board .tile').length}});
     report.modes.push({mode,...m});assert.equal(m.tiles,81);assert(m.board.left>=0&&m.board.right<=390);assert(m.board.bottom<=m.wrap.bottom+1);assert(m.sum.bottom<=844);
     await shot(page,`after-${mode}-game`);
    }
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('makezero.progress.v1')));assert.equal(saved.bestEndless,123);assert.equal(saved.bestTimeless,456);
   }
  }finally{await context.close();await server.close()}
 }
 assert.deepEqual(report.errors,[]);
 fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({output,screenshots:report.screenshots.length,matrix:report.matrix.length,grades:report.grades.length,modes:report.modes,fonts:report.metrics.after.fonts,errors:report.errors},null,2));
}finally {await browser.close()}
