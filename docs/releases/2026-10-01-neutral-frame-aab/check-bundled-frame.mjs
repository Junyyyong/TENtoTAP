// Release audit only. Exercises the unmodified web payload extracted from AAB.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir=import.meta.dirname,root=path.resolve(dir,'../../..');
const output=path.join(dir,process.argv[2]||'bundled-frame-verification.json');
assert(!fs.existsSync(output),'Do not overwrite evidence');
const release=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
const bundle=path.join(root,release.artifact),temp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-frame-bundle-'));
execFileSync('unzip',['-q',bundle,'base/assets/public/*','-d',temp]);
const web=path.join(temp,'base/assets/public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(web,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(web+path.sep)){res.writeHead(403);res.end();return;}
 try{res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={verifiedAt:new Date().toISOString(),artifact:release.artifact,sha256:createHash('sha256').update(fs.readFileSync(bundle)).digest('hex'),browser:browser.version(),frames:[],screens:[],touches:[],errors:[],pass:false,
 limitations:'macOS Chrome with CapacitorCustomPlatform android and web Preferences test storage; unmodified extracted AAB assets. Not native Android/WebView, OEM setting, video/audio decoding, or real app update verification.'};
let p;
async function settle(){await new Promise(r=>setTimeout(r,60));await p.clock.runFor(320);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});}
async function tap(s){await p.locator(s).tap();await settle();}
async function home(){await p.goto(base,{waitUntil:'networkidle'});await p.clock.runFor(8000);await settle();}
async function checkFrame(width,height,top,bottom){
 await p.setViewportSize({width,height});await p.evaluate(({top,bottom})=>{for(const [k,v]of Object.entries({top,bottom,left:0,right:0}))document.documentElement.style.setProperty(`--android-game-inset-${k}`,`${v}px`);window.dispatchEvent(new Event('resize'));},{top,bottom});await settle();
 const m=await p.locator('#app').evaluate(e=>{const r=e.getBoundingClientRect();return{logical:[e.clientWidth,e.clientHeight],rect:[r.x,r.y,r.width,r.height],scale:r.width/390,native:e.classList.contains('is-native-frame')};});
 const scale=Math.min(width/390,(height-top-bottom)/844);
 assert(m.native);assert.deepEqual(m.logical,[390,844]);assert(Math.abs(m.scale-scale)<.000001);assert(Math.abs(m.rect[3]/m.rect[2]-844/390)<.000001);assert(m.rect[0]>=-.1&&m.rect[0]+m.rect[2]<=width+.1&&m.rect[1]>=top-.1&&m.rect[1]+m.rect[3]<=height-bottom+.1);
 report.frames.push({viewport:[width,height],remainingInsets:[top,bottom],expectedScale:scale,...m});
}
async function screen(name){
 const m=await p.evaluate(()=>{
  const app=document.querySelector('#app'),r=app.getBoundingClientRect(),scale=r.width/390;
  const buttons=[...document.querySelectorAll('.icon-btn')].filter(e=>e.getClientRects().length&&!e.closest('.hidden')).map(e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{id:e.id,size:[b.width/scale,b.height/scale],radius:c.borderRadius,color:c.color,background:c.backgroundColor,border:c.borderColor};});
  // Body and Settings may be transparent; the shared app owns the white.
  const visible=document.querySelector('#app > .screen:not(.hidden)');
  return{buttons,white:getComputedStyle(app).backgroundColor,screenBackground:getComputedStyle(visible).backgroundColor,screenImage:getComputedStyle(visible).backgroundImage,blue:getComputedStyle(document.querySelector('.mode-name')).color,settings:getComputedStyle(document.querySelector('#btn-title-settings')).color,reaction:getComputedStyle(document.querySelector('#cheer-word')).color};
 });
 for(const b of m.buttons){assert.deepEqual(b.size.map(n=>Math.round(n)),[44,44]);assert.equal(b.radius,'50%');assert.equal(b.color,'rgb(54, 60, 70)');assert.equal(b.border,'rgb(205, 210, 218)');}
 assert.equal(m.white,'rgb(255, 255, 255)');assert(['rgba(0, 0, 0, 0)','rgb(255, 255, 255)'].includes(m.screenBackground));assert.equal(m.screenImage,'none');assert.equal(m.blue,'rgb(44, 127, 224)');assert.equal(m.settings,'rgb(212, 54, 0)');assert.equal(m.reaction,'rgb(255, 181, 0)');report.screens.push({name,...m});
}
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
 await ctx.addInitScript(()=>{
  window.CapacitorCustomPlatform={name:'android'};
  for(const prefix of ['','CapacitorStorage.']){
   localStorage.setItem(prefix+'makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
   localStorage.setItem(prefix+'makezero.progress.v1',JSON.stringify({learningStage:31,bestLimitlessScore:123,bestTimeless:456,bestEndless:123}));
  }
 });
 p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(String(e)));await p.clock.install({time:new Date('2026-10-01T00:00:00Z')});await p.clock.pauseAt(new Date('2026-10-01T00:00:00Z'));
 await home();await screen('home');
 for(const args of [[390,844,0,0],[320,700,24,48],[480,1000,24,48],[360,780,24,48],[270,585,18,36]])await checkFrame(...args);
 await checkFrame(390,844,0,0);await tap('#btn-title-settings');await screen('settings');await tap('#btn-settings-back');
 for(const [mode,name]of [['timeAttack','limitless'],['timeless','timeless'],['endless','endless']]){
  await home();await tap(`#mode-${mode}`);await screen(name+'-start');await tap('#btn-intro-start');if(await p.locator('#lesson-intro').isVisible())await tap('#lesson-intro');await screen(name+'-game');
  await checkFrame(320,700,24,48);await tap('#board .tile:not(.cleared) >> nth=0');assert.equal(await p.locator('#board .tile.sel').count(),1);
  const point=await p.locator('#board .tile.sel').evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};});
  const cdp=await ctx.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x+3,y:point.y+3}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();await settle();assert.equal(await p.locator('#board .tile.sel').count(),0);report.touches.push({mode:name,retapWithMotionCancelled:true});
  await tap('#btn-pause');assert(await p.locator('#overlay').isVisible());await screen(name+'-pause');await tap('#btn-primary');assert(!(await p.locator('#overlay').isVisible()));report.touches.push({mode:name,pauseResume:true});
  if(name!=='endless'){await tap('#btn-back');assert(await p.locator('#screen-title').isVisible());report.touches.push({mode:name,back:true});}
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e);throw e;}
finally{fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({pass:report.pass,frames:report.frames.length,screens:report.screens.length,touches:report.touches.length,failure:report.failure,output}));}
