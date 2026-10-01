// Seven store assets: real app markup/assets, not mockup artwork.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CAPTURE_OUT;assert(out&&!fs.existsSync(out),'New output only');fs.mkdirSync(out,{recursive:true});
const report={capturedAt:new Date().toISOString(),conditions:{css:[360,640],dpr:3,png:[1080,1920],clock:'2026-10-01T00:00:00Z',seed:20261001,locale:'en-US',timezone:'Asia/Seoul',native:'Chromium trackNativeFrame(true), zero insets, no OS chrome'},assets:[],
 notes:['Separate from 780×1688 research evidence; captured directly at 1080×1920, not stretched/resized.',
  'Saved progress and record values are controlled capture data. GOOD TRY is earned by a real ENDLESS pair clear, then letting the board fill. Existing movie/1.webm is held at t=0.8s.',
  'No Android physical device validation. Existing artwork and video are unchanged.']};
const server=await createServer({root:process.cwd(),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});report.browser=browser.version();
const ctx=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
await ctx.addInitScript(()=>{localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));let s=20261001;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};});
await ctx.route('**/src/main.ts',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/,'trackNativeFrame(true)')});});
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));
async function settle(){await p.clock.runFor(350);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});await p.clock.runFor(40);}
async function click(s){await p.locator(s).click();await settle();}
async function save(file,label){await settle();await p.screenshot({path:path.join(out,file)});const b=fs.readFileSync(path.join(out,file));assert.equal(b.readUInt32BE(16),1080);assert.equal(b.readUInt32BE(20),1920);report.assets.push({file,label,sha256:createHash('sha256').update(b).digest('hex')});}
async function home(stage){await p.evaluate(stage=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:stage,bestEndless:123,bestTimeless:456})),stage);await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle();}
try{
 await p.goto(server.resolvedUrls.local[0],{waitUntil:'networkidle'});await p.clock.runFor(3500);await save('01-cover.png','커버');
 await home(1);await save('02-main.png','메인');await click('#mode-timeAttack');await save('03-limitless-start.png','LIMITLESS START');
 await click('#btn-intro-start');await save('04-lesson-instruction.png','튜토리얼 안내');await click('#lesson-intro');await save('05-lesson-game.png','튜토리얼 2×2');
 await home(31);await click('#mode-timeless');await click('#btn-intro-start');await click('#lesson-intro');await save('06-timeless.png','TIMELESS 9×9');
 // Earn the matching original ENDLESS screenshot through actual game input.
 await home(31);await click('#mode-endless');await click('#btn-intro-start');await click('#lesson-intro');
 const pair=await p.locator('#board .tile:not(.cleared)').evaluateAll(es=>{
  for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++)if(Number(es[i].textContent)+Number(es[j].textContent)===10)return[es[i].dataset.i,es[j].dataset.i];return null;
 });assert(pair,'An actual sum-ten pair exists');for(const i of pair)await click(`#board .tile[data-i="${i}"]`);
 report.reaction={mode:'endless',clearedPair:pair,displayedStats:await p.locator('.run-stat-value').allTextContents()};
 for(let i=0;i<180;i++){await p.clock.runFor(1000);if(await p.locator('#cheer').evaluate(e=>e.classList.contains('cheer-run')))break;}
 assert.equal(await p.locator('#cheer-word').textContent(),'GOOD TRY!');await settle();
 await p.waitForFunction(()=>document.querySelector('#cheer-clip').readyState>=2&&document.querySelector('#cheer-clip').videoWidth>0);
 report.video=await p.evaluate(async()=>{const v=document.querySelector('#cheer-clip');v.pause();await new Promise((resolve,reject)=>{v.addEventListener('seeked',resolve,{once:true});v.addEventListener('error',reject,{once:true});v.currentTime=.8;});return{source:new URL(v.currentSrc).pathname,time:v.currentTime,width:v.videoWidth,height:v.videoHeight,readyState:v.readyState};});
 await save('07-good-try.png','GOOD TRY 리액션');assert.deepEqual(errors,[]);report.pass=true;
}catch(e){report.pass=false;report.failure=String(e);throw e;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();console.log(JSON.stringify({out,pass:report.pass,assets:report.assets.length,failure:report.failure}));}
