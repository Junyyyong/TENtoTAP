// Research only; no game imports. Preserve old sources/captures outside checkout.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),dir=path.join(root,'docs/research/2026-10-01-ui-accents/navigation-review'),out=process.env.CAPTURE_OUT;
assert(out&&!fs.existsSync(out),'New output folder required; never overwrite captures');fs.mkdirSync(out,{recursive:true});
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621',hash=b=>createHash('sha256').update(b).digest('hex');
const before=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-circular-navigation-'));
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
execFileSync('tar',['-xzf',path.join(dir,'before-source-overlay.tar.gz'),'-C',before]);
fs.symlinkSync(path.join(root,'node_modules'),path.join(before,'node_modules'),'dir');
const report={capturedAt:new Date().toISOString(),revision,beforeOverlaySha256:hash(fs.readFileSync(path.join(dir,'before-source-overlay.tar.gz'))),
 conditions:{viewport:[390,844],dpr:2,png:[780,1688],clock:'2026-10-01T00:00:00Z',seed:20261001,colorSeed:20261001,locale:'en-US',timezone:'Asia/Seoul',animations:'Finite finished, infinite paused at 0, sound off'},
 captures:[],metrics:{before:{},after:{}},preservedHashes:{},gameCssHashes:{},reactionChecks:[],navigationChecks:[],touchChecks:[],errors:[],pass:false,
 limitations:['macOS Chrome browser simulation, not physical Android/WebView.',
 'Before: base git archive plus pre-navigation approved/uncommitted snapshot, not a released commit.',
 'Results and reactions are controlled real-component layout fixtures, not earned scores; clips are hidden deliberately. No video/audio playback claim.']};
const walk=f=>fs.readdirSync(f,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(f,e.name)):[path.join(f,e.name)]);
for(const f of [...walk(path.join(before,'src')),...walk(path.join(before,'public')),path.join(before,'index.html')]){
 const rel=path.relative(before,f),h=hash(fs.readFileSync(f));
 if(rel==='src/ui/styles/game.css'){report.gameCssHashes.before=h;report.gameCssHashes.after=hash(fs.readFileSync(path.join(root,rel)));continue;}
 assert.equal(hash(fs.readFileSync(path.join(root,rel))),h,`unchanged ${rel}`);report.preservedHashes[rel]=h;
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser=browser.version();const servers=[];
async function settle(p){await p.clock.runFor(320);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});}
async function tap(p,s){await p.locator(s).tap();await settle(p);}
async function home(p,base){await p.goto(base,{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:31,bestLimitlessScore:123,bestTimeless:456,bestEndless:123})));await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);}
async function capture(p,side,name){
 // A mobile tap may retain :active until the next touch. Capture the idle
 // navigation face, not a pressed pause button: tap non-interactive top space.
 if(await p.locator('.icon-btn:active').count())await p.touchscreen.tap(195,4);
 await settle(p);const file=`${side}-${name}.png`;await p.screenshot({path:path.join(out,file)});const b=fs.readFileSync(path.join(out,file));assert.equal(b.readUInt32BE(16),780);assert.equal(b.readUInt32BE(20),1688);report.captures.push({file,sha256:hash(b)});
 report.metrics[side][name]=await p.evaluate(()=>[...document.querySelectorAll('#app,#app *')].filter(e=>e.getClientRects().length&&!e.closest('.hidden')&&getComputedStyle(e).visibility!=='hidden').map(e=>{
  const c=getComputedStyle(e),r=e.getBoundingClientRect();return{id:e.id,classes:e.getAttribute('class')||'',navigation:!!e.closest('.icon-btn'),button:e.matches('.icon-btn'),
   text:e.children.length?'':e.textContent.trim(),geometry:[r.x,r.y,r.width,r.height],type:[c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing],
   paint:{color:c.color,background:c.backgroundColor,image:c.backgroundImage,border:c.borderColor,borderWidth:c.borderWidth,borderStyle:c.borderStyle,radius:c.borderRadius,shadow:c.boxShadow,textShadow:c.textShadow,stroke:c.stroke,filter:c.filter}};
 }));
 if(side==='after')for(const e of report.metrics[side][name].filter(e=>e.button)){
  assert.equal(e.paint.radius,'50%');assert.equal(e.paint.color,'rgb(54, 60, 70)');assert.equal(e.paint.background,'rgb(245, 246, 248)');assert.equal(e.paint.border,'rgb(205, 210, 218)');assert.equal(e.paint.shadow,'none');report.navigationChecks.push({name,id:e.id,...e.paint});
 }
}
try{
 for(const [side,source]of Object.entries({before,after:root})){
  const server=await createServer({root:source,configFile:false,cacheDir:path.join(before,`cache-${side}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();servers.push(server);const base=server.resolvedUrls.local[0];
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
  await ctx.addInitScript(()=>{
   localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
   let n=20261001;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
   let seed=20261001;const original=crypto.getRandomValues.bind(crypto);Object.defineProperty(crypto,'getRandomValues',{value:b=>{if(!(b instanceof Uint32Array))return original(b);for(let i=0;i<b.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;b[i]=seed;}return b;}});
  });
  const p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push({side,error:String(e)}));
  await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));
  try{
   await home(p,base);await capture(p,side,'home');await tap(p,'#btn-title-settings');await capture(p,side,'settings-off');await tap(p,'#switch-sound');await tap(p,'#switch-haptics');await capture(p,side,'settings-on');
   await tap(p,'#btn-settings-back');assert(await p.locator('#screen-title').isVisible());report.touchChecks.push({side,action:'Settings back',pass:true});
   for(const [mode,name]of [['timeAttack','limitless'],['timeless','timeless'],['endless','endless']]){
    await home(p,base);await tap(p,`#mode-${mode}`);await capture(p,side,`${name}-start`);
    await tap(p,'#btn-intro-back');assert(await p.locator('#screen-title').isVisible());report.touchChecks.push({side,action:`${name} START back`,pass:true});
    await tap(p,`#mode-${mode}`);await tap(p,'#btn-intro-start');if(await p.locator('#lesson-intro').isVisible())await tap(p,'#lesson-intro');await capture(p,side,name);
    await tap(p,'#btn-pause');assert(await p.locator('#overlay').isVisible());if(name==='limitless')await capture(p,side,'pause');
    await tap(p,'#btn-primary');assert(!(await p.locator('#overlay').isVisible()));report.touchChecks.push({side,action:`${name} pause/resume`,pass:true});
    if(name!=='endless'){await tap(p,'#btn-back');assert(await p.locator('#screen-title').isVisible());report.touchChecks.push({side,action:`${name} game back`,pass:true});}
   }
   await tap(p,'#btn-pause');await p.evaluate(async()=>{const {Overlay}=await import('/src/ui/screens/overlay.ts');new Overlay(()=>{}).open({title:'Board cleared',body:'Time 01:20\nScore 456\nBest 456',primary:{label:'Play again',action:()=>{}},secondary:{label:'Menu',action:()=>{}}});});await capture(p,side,'result-fixture');
   for(let band=0;band<6;band++){
    await p.evaluate(async band=>{document.querySelector('#overlay').classList.add('hidden');window.reviewCheer?.stop();const {Cheer}=await import('/src/ui/screens/cheer.ts');window.reviewCheer=new Cheer();window.reviewCheer.setSound(false);window.reviewCheer.play('STAGE CLEARED',456,()=>{},band,true,1000000);document.querySelector('#cheer-card').classList.add('hidden');document.querySelector('#cheer-clip').classList.add('hidden');},band);
    await capture(p,side,`reaction-${band}-fixture`);
    const reaction=await p.locator('#cheer-word').evaluate(e=>{const c=getComputedStyle(e),r=e.getBoundingClientRect();return{text:e.textContent,color:c.color,textShadow:c.textShadow,stroke:c.webkitTextStroke,box:[r.x,r.y,r.width,r.height]};});
    assert.equal(reaction.color,'rgb(255, 181, 0)');assert(reaction.textShadow.includes('rgb(212, 54, 0)'));assert.equal(reaction.stroke,'3px rgb(42, 10, 6)');assert(reaction.box[0]>=0&&reaction.box[0]+reaction.box[2]<=390+.1);report.reactionChecks.push({side,band,...reaction});
   }
  }finally{await ctx.close();}
 }
 report.elementsChecked=0;report.maxGeometryDeltaCssPx=0;
 for(const [name,before]of Object.entries(report.metrics.before)){
  const after=report.metrics.after[name];assert.equal(after.length,before.length,`${name} node count`);
  for(let i=0;i<before.length;i++){
   const a=after[i],b=before[i];assert.equal(a.id,b.id);assert.equal(a.classes,b.classes);assert.equal(a.text,b.text,`${name} text`);assert.deepEqual(a.type,b.type,`${name} typography`);
   a.geometry.forEach((v,k)=>{const d=Math.abs(v-b.geometry[k]);report.maxGeometryDeltaCssPx=Math.max(report.maxGeometryDeltaCssPx,d);assert(d<.1,`${name} geometry ${b.id}`);});
   if(b.navigation){
    // SVG descendants have an unused border-color default of currentColor.
    // Ignore that inherited ink only after proving no border is painted;
    // the button's real border must still be identical before/after.
    if(!b.button){assert.equal(b.paint.borderWidth,'0px');assert.equal(b.paint.borderStyle,'none');}
    assert.deepEqual({...a.paint,color:b.paint.color,stroke:b.paint.stroke,radius:b.paint.radius,...(!b.button?{border:b.paint.border}:{})},b.paint,`${name} only navigation radius/ink change`);
   }
   else assert.deepEqual(a.paint,b.paint,`${name} other colours/effects unchanged ${b.id||b.classes}`);
   report.elementsChecked++;
  }
 }
 const gallery=await browser.newPage({viewport:{width:1100,height:900}});
 try{
  await gallery.goto(servers[1].resolvedUrls.local[0]+'docs/research/2026-10-01-ui-accents/navigation-review/index.html');
  await gallery.locator('#gallery section').last().waitFor();
  await gallery.evaluate(()=>{for(const img of document.images)img.loading='eager';});
  await gallery.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth===780&&img.naturalHeight===1688));
  report.galleryCheck=await gallery.evaluate(()=>({sections:document.querySelectorAll('#gallery section').length,thumbnails:document.querySelectorAll('#overview img').length,images:document.images.length,brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),horizontalOverflow:document.documentElement.scrollWidth>innerWidth}));
  assert.equal(report.galleryCheck.sections,17);assert.equal(report.galleryCheck.thumbnails,17);assert.equal(report.galleryCheck.images,51);assert.deepEqual(report.galleryCheck.brokenAnchors,[]);assert.equal(report.galleryCheck.horizontalOverflow,false);
 }finally{await gallery.close();}
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e);throw e;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await Promise.all(servers.map(s=>s.close()));await browser.close();console.log(JSON.stringify({out,pass:report.pass,captures:report.captures.length,elements:report.elementsChecked,navigation:report.navigationChecks.length,reactions:report.reactionChecks.length,touches:report.touchChecks.length,failure:report.failure}));}
