// Focused follow-up; reuse the preserved prior candidate's measurements.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'New output folder required');
fs.mkdirSync(out, { recursive: true });
const prior = JSON.parse(fs.readFileSync('docs/research/2026-10-02-main-logo-icon/attempt-2/verification.json'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tapten-logo-review-'));
const old = path.join(tmp,'before'); fs.mkdirSync(old);
execFileSync('tar',['-xf','-','-C',old],{input:execFileSync('git',['archive',prior.revision,'src','public','index.html','package.json','tsconfig.json'],{maxBuffer:128*1024*1024})});
fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(old,'node_modules'));
const hash = b => createHash('sha256').update(b).digest('hex');
const report = { capturedAt:new Date().toISOString(), priorCandidate:'../attempt-2/verification.json',settingsBeforeRevision:prior.revision,
  conditions:{...prior.conditions,native:'trackNativeFrame(true) simulation, legacy hapticsOn:true, navigator.vibrate spy'},screens:[],settings:{},errors:[],captures:[] };
const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const servers=[];
async function page(url,width=390,height=844,native=true){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await context.addInitScript(()=>{ localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:true}));
    localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:10,bestEndless:123,bestTimeless:456}));
    window.__buzz=0;navigator.vibrate=()=>{window.__buzz++;return true;};let seed=20261002;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
  if(native)await context.route('**/src/main.ts',async r=>{const response=await r.fetch();const body=await response.text();await r.fulfill({response,body:body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/,'trackNativeFrame(true)')});});
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));
  await p.goto(url,{waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);return {p,context};
}
async function settle(p){await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});await p.screenshot();await p.clock.runFor(400);await p.screenshot();await p.clock.runFor(40);
  // rAF can start a CSS transition after the first finish pass. Finish that
  // newly started transition too, so Settings is not captured halfway faded.
  await p.evaluate(()=>{for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations!==Infinity)a.finish();}});await p.screenshot();}
async function shot(p,name){const bytes=await p.screenshot({path:path.join(out,name)});report.captures.push({file:name,sha256:hash(bytes),size:[780,1688]});}
try{
  const urls={};for(const[name,dir]of [['before',old],['after',process.cwd()]]){const s=await createServer({root:dir,cacheDir:path.join(tmp,`cache-${name}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await s.listen();servers.push(s);urls[name]=s.resolvedUrls.local[0];}
  for(const previous of prior.screens){const {p,context}=await page(urls.after,previous.width,previous.height,previous.native);
    const next=await p.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}};
      const logo=document.querySelector('.brand-mark');return{logo:rect(logo),block:rect(document.querySelector('.brand-block')),
        center:{x:logo.getBoundingClientRect().x+logo.getBoundingClientRect().width/2,y:logo.getBoundingClientRect().y+logo.getBoundingClientRect().height/2},
        others:[...document.querySelectorAll('#screen-title .mode-btn,#screen-title .title-links')].map(e=>({rect:rect(e),font:getComputedStyle(e).font,color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}))};});
    assert(Math.abs(next.logo.width-previous.after.logo.width*.8)<.05,'Previous painted width ×80%');
    assert(Math.abs(next.logo.height-previous.after.logo.height*.8)<.05,'Previous painted height ×80%');
    assert(Math.abs(next.center.x-previous.after.center.x)<.05&&Math.abs(next.center.y-previous.after.center.y)<.05,'Logo center unchanged');
    assert.deepEqual(next.others,previous.after.others,'Other menu UI unchanged');assert.deepEqual(next.block,previous.after.block,'Reserved flex space unchanged');
    report.screens.push({size:[previous.width,previous.height],native:previous.native,prior:previous.after.logo,after:next.logo,pass:true});
    if(previous.width===390&&previous.height===844&&previous.native){await shot(p,'after-main.png');
      await p.locator('#btn-title-settings').click();await settle(p);await shot(p,'after-settings.png');
      assert.equal(await p.locator('#switch-haptics').count(),0);assert.equal(await p.locator('#settings-note').count(),0);
      assert.equal(await p.locator('#screen-settings .switch-row').count(),2);
      const progress=await p.evaluate(()=>localStorage.getItem('makezero.progress.v1'));
      await p.locator('#switch-music').click();await p.clock.runFor(60);assert.equal(await p.locator('#switch-music').getAttribute('aria-checked'),'true');
      await p.locator('#switch-music').click();await p.clock.runFor(60);
      await p.locator('#switch-sound').click();await p.clock.runFor(60);assert.equal(await p.locator('#switch-sound').getAttribute('aria-checked'),'true');
      await p.locator('#switch-sound').click();await p.clock.runFor(60);
      await p.evaluate(async()=>{const {feedback}=await import('/src/ui/feedback.ts');feedback.pick(1);feedback.reject();feedback.clear(2);});
      assert.equal(await p.evaluate(()=>window.__buzz),0,'Legacy true cannot re-enable vibration');
      assert.equal(await p.evaluate(()=>localStorage.getItem('makezero.progress.v1')),progress,'Progress/records untouched');
      const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('makezero.settings.v1')));
      assert.deepEqual(saved,{musicOn:false,soundOn:false,hapticsOn:true},'Other settings and old save field preserved');
      report.settings={switches:2,musicToggle:true,soundToggle:true,legacyHapticsIgnored:true,buzzCalls:0,progressPreserved:true,pass:true};
    }await context.close();
  }
  const {p,context}=await page(urls.before);await p.locator('#btn-title-settings').click();await settle(p);await shot(p,'before-settings.png');await context.close();
  assert.equal(report.errors.length,0);report.pass=true;
}finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await Promise.all(servers.map(s=>s.close()));}
console.log(JSON.stringify({pass:report.pass,screens:report.screens.length,settings:report.settings,errors:report.errors},null,2));
