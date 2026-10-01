// Research only. Historical sources live in git archive, never in the checkout.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), out=process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'Choose a NEW CAPTURE_OUT; existing evidence is immutable');
fs.mkdirSync(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621';
const archive=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-reference-'));
execFileSync('tar',['-xf','-','-C',archive],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(root,'node_modules'),path.join(archive,'node_modules'),'dir');
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={date:new Date().toISOString(),revision,browser:browser.version(),conditions:{viewport:[390,844],dpr:2,png:[780,1688],clock:'2026-10-01T00:00:00Z',seed:20261001,locale:'en-US',timezone:'Asia/Seoul'},captures:[],metrics:{before:{},after:{}},matrix:[],grades:[],errors:[],sourceHashes:{},limitations:['macOS Chrome, not a physical Android/WebView test.','Nonzero system-bar insets are simulated native CSS inputs, not measured from the user phone.','Stage/best-score fixtures and explicit grade fixtures are not earned results.','Current dependencies reused for git archive; original sources unchanged.','System font choice intentionally retained: different OS glyphs can differ.','Media frame timings and random block colours are not pixel-diff assertions.']};
for(const file of ['src/ui/styles/title.css','src/ui/styles/tokens.css','src/ui/styles/game.css','src/ui/styles/picker.css','src/ui/styles/overlay.css','src/ui/styles/safeArea.css','src/ui/screens/cheer.ts']) report.sourceHashes[file]=sha(fs.readFileSync(file));
async function settle(p){await p.clock.runFor(320);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()});}
async function click(p,s){await p.locator(s).click({force:true});await settle(p);}
async function shot(p,side,name){await settle(p);const file=`${side}-${name}.png`;await p.screenshot({path:path.join(out,file)});const b=fs.readFileSync(path.join(out,file));assert.equal(b.readUInt32BE(16),780);assert.equal(b.readUInt32BE(20),1688);report.captures.push({file,sha256:sha(b)});}
async function metrics(p,selectors){return p.evaluate(ss=>Object.fromEntries(ss.map(s=>{const e=document.querySelector(s);const r=e.getBoundingClientRect(),c=getComputedStyle(e);return [s,{x:r.x,y:r.y,width:r.width,height:r.height,size:c.fontSize,weight:c.fontWeight,family:c.fontFamily,line:c.lineHeight}]})),selectors);}
async function capture(p,side,name,selectors){await shot(p,side,name);report.metrics[side][name]=await metrics(p,selectors);}
async function insets(p,top=0,bottom=0){await p.evaluate(({top,bottom})=>{for(const [edge,v] of Object.entries({top,bottom,left:0,right:0}))document.documentElement.style.setProperty(`--safe-area-inset-${edge}`,`${v}px`)},{top,bottom});await settle(p);}
async function seed(p,stage){await p.evaluate(s=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:s,bestEndless:123,bestTimeless:456})),stage);await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);}
async function start(p,mode){await click(p,`#mode-${mode}`);await click(p,'#btn-intro-start');if(await p.locator('#lesson-intro').isVisible())await click(p,'#lesson-intro');}
const gameSelectors=['#run-title','.run-stat-label','.run-stat-value','#board','#board .tile','#notice','#selection-sum','.sum-label','.sum-total'];
async function bounds(p,selectors){return p.evaluate(ss=>ss.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {selector:s,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}}),selectors);}
function fits(rect,w,h,t,b){assert(rect.left>=-1&&rect.right<=w+1&&rect.top>=t-1&&rect.bottom<=h-b+1,JSON.stringify({rect,w,h,t,b}));}
try {
 for(const side of ['before','after']){
  const server=await createServer({root:side==='before'?archive:root,configFile:false,cacheDir:path.join(archive,`cache-${side}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  try {
   await ctx.addInitScript(()=>{if(location.hostname!=='127.0.0.1')return;localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));let n=20261001;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
   const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push({side,error:String(e)}));await p.clock.install({time:new Date(report.conditions.clock)});await p.goto(server.resolvedUrls.local[0],{waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);
   await capture(p,side,'home',['.brand-mark','.mode-btn','.mode-name','.mode-desc','#btn-title-settings']);
   await click(p,'#btn-title-settings');await capture(p,side,'settings',['.picker-title','.switch-row','.switch-text b','.switch-text small','.settings-links']);
   for(const name of ['privacy','licenses']){await click(p,`#btn-${name}`);await capture(p,side,name,['#legal-dialog','#legal-title','#btn-legal-close']);await click(p,'#btn-legal-close');}
   await click(p,'#btn-settings-back');
   for(const stage of [1,6,14,23,30]){
    await seed(p,stage);await click(p,'#mode-timeAttack');if(stage===1)await capture(p,side,'limitless-intro',['.intro-title','.intro-mark','#btn-intro-start']);await click(p,'#btn-intro-start');
    await capture(p,side,`lesson-${stage}`,['.lesson-intro-title','.lesson-intro-tap']);await click(p,'#lesson-intro');await capture(p,side,`stage-${stage}`,gameSelectors);
   }
   await seed(p,31);
   for(const mode of ['timeAttack','timeless','endless']){
    await click(p,`#mode-${mode}`);await capture(p,side,`${mode}-intro`,['.intro-title','.intro-mark','#btn-intro-start']);await click(p,'#btn-intro-start');if(await p.locator('#lesson-intro').isVisible()){await capture(p,side,`${mode}-instruction`,['.lesson-intro-title','.lesson-intro-tap']);await click(p,'#lesson-intro');}
    await capture(p,side,`${mode}-game`,gameSelectors);await click(p,'#btn-pause');await capture(p,side,`${mode}-pause`,['#overlay .panel','#overlay-title','#overlay-body','#btn-primary','#btn-secondary']);await click(p,'#btn-secondary');
   }
   await start(p,'timeAttack');await p.clock.fastForward(61000);await settle(p);await capture(p,side,'timeout-card',['.cheer-headline','.cheer-score']);
   await p.locator('#cheer').dispatchEvent('pointerdown');await capture(p,side,'timeout-result',['#overlay .panel','#overlay-title','#overlay-body','#btn-primary']);await click(p,'#btn-secondary');
   await start(p,'timeAttack');
   await p.evaluate(async()=>{const {Cheer}=await import('/src/ui/screens/cheer.ts');window.reviewCheer=new Cheer();window.reviewCheer.setSound(false);window.reviewCheer.play('FIXTURE',0,()=>{},0,true,0)});await capture(p,side,'grade-fixture',['#cheer-word','#cheer-tap']);
   if(side==='after'){
    // Every recorded text size, weight, family and zero-inset layout should
    // remain identical. Dynamic media and random board colours are excluded.
    for(const [name,items] of Object.entries(report.metrics.before))for(const [selector,expected]of Object.entries(items)){
     const actual=report.metrics.after[name][selector];
     for(const key of ['size','weight','family','line'])assert.equal(actual[key],expected[key],`${name} ${selector} ${key}`);
     for(const key of ['x','y','width','height'])assert(Math.abs(actual[key]-expected[key])<1.1,`${name} ${selector} ${key}: ${actual[key]} != ${expected[key]}`);
    }
    await seed(p,31);
    for(const [w,h] of [[320,568],[360,740],[390,660],[390,700],[390,701],[390,844],[412,915],[430,932]])for(const [t,b]of [[0,0],[24,48]]){
     await p.setViewportSize({width:w,height:h});await p.waitForTimeout(100);await insets(p,t,b);
     report.viewportDiagnostic=await p.evaluate(()=>({inner:[innerWidth,innerHeight],visual:[visualViewport.width,visualViewport.height,visualViewport.scale],body:getComputedStyle(document.body).height,app:getComputedStyle(document.querySelector('#app')).height,css:document.documentElement.style.getPropertyValue('--app-h'),logo:getComputedStyle(document.querySelector('.brand-mark')).width}));
     for(const r of await bounds(p,['.mode-list','#btn-title-settings']))fits(r,w,h,t,b);
     for(const mode of ['timeAttack','timeless','endless']){
      await start(p,mode);const rects=await bounds(p,['.hud','#board','#selection-sum']);rects.forEach(r=>fits(r,w,h,t,b));
      const frame=await bounds(p,['#board-wrap']);assert(rects[1].top>=frame[0].top-1&&rects[1].bottom<=frame[0].bottom+1);
      const m=await metrics(p,['.run-title','.run-stat-value','#board .tile']);report.matrix.push({w,h,t,b,mode,rects,metrics:m});await click(p,'#btn-back');
     }
    }
    await p.setViewportSize({width:390,height:844});await insets(p,24,48);
    await shot(p,side,'inset-home');await click(p,'#btn-title-settings');await shot(p,side,'inset-settings');await click(p,'#btn-privacy');(await bounds(p,['#legal-dialog','#btn-legal-close'])).forEach(r=>fits(r,390,844,24,48));await shot(p,side,'inset-privacy');await click(p,'#btn-legal-close');await click(p,'#btn-settings-back');
    await start(p,'timeAttack');await shot(p,side,'inset-game');await click(p,'#btn-pause');(await bounds(p,['#overlay .panel'])).forEach(r=>fits(r,390,844,24,48));await shot(p,side,'inset-pause');await click(p,'#btn-primary');
    await p.evaluate(async()=>{const {Cheer}=await import('/src/ui/screens/cheer.ts');window.reviewCheer=new Cheer();window.reviewCheer.setSound(false)});
    for(const w of [320,375,390,412,430]){await p.setViewportSize({width:w,height:844});for(let band=0;band<6;band++){
     await p.evaluate(b=>window.reviewCheer.play('FIXTURE',0,()=>{},b,true,0),band);await settle(p);
     const m=await p.locator('#cheer-word').evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);const b=r.getBoundingClientRect();return{word:e.textContent,left:b.left,right:b.right,width:innerWidth,size:getComputedStyle(e).fontSize}});assert(m.left>=0&&m.right<=w);report.grades.push(m);(await bounds(p,['#cheer-tap'])).forEach(r=>fits(r,w,844,24,48));
    }}
    await p.setViewportSize({width:390,height:844});await p.evaluate(()=>window.reviewCheer.play('FIXTURE',0,()=>{},0,true,0));await shot(p,side,'inset-grade');
   }
  }finally{await ctx.close();await server.close();}
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.pass=false;report.failure=String(error);throw error;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();console.log(JSON.stringify({out,pass:report.pass,captures:report.captures.length,cases:report.matrix.length,grades:report.grades.length,failure:report.failure}));}
