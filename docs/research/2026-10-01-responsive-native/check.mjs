// Research-only Chromium simulation. Never imported by the shipped game.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {tapWithMotion,selectionState} from '../../../tests/browser/selection-toggle.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(),out=process.env.CAPTURE_OUT;
assert(out&&!fs.existsSync(out),'Use a new CAPTURE_OUT; never overwrite evidence');
fs.mkdirSync(out,{recursive:true});
const revision='02cd27c',before=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-responsive-before-'));
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
fs.symlinkSync(path.join(root,'node_modules'),path.join(before,'node_modules'),'dir');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={capturedAt:new Date().toISOString(),revision:execFileSync('git',['rev-parse',revision],{encoding:'utf8'}).trim(),beforeDirectory:before,
 conditions:{viewport:[390,844],dpr:2,png:[780,1688],clock:'2026-10-01T00:00:00Z',seed:20261001,locale:'en-US',timezone:'Asia/Seoul',
  native:'Both before/after invoke trackNativeFrame(true); Java overlap represented by CSS variables; real web Preferences.',
  animation:'Finite animations finished; infinite paused at 0; muted audio. Grade layout fixtures hide video except separate store capture.'},
 captures:[],sourceHashes:{},referenceHashes:{},preservedHashes:{},screens:[],splashes:[],ratios:[],density:[],live:[],web:[],grades:[],touch:[],errors:[],
 limitations:['macOS Chrome, not an Android System WebView or connected physical phone.',
  'Results/reactions are labelled layout fixtures, not earned scores. Store reaction uses an actual decoded existing video frame.',
  'OS density/insets are simulated. Accessibility magnification above visualViewport scale 1.01 is deliberately not overridden.']};
const sourceFiles=['src/ui/nativeFrame.ts','src/ui/titleLayout.ts','src/ui/boardView.ts','src/ui/app.ts','src/ui/styles/nativeFrame.css','src/ui/styles/nativeResponsive.css','src/ui/styles/title.css','scripts/build-launcher-icons.mjs','store/icon-source.png'];
for(const [side,base]of [['before',before],['after',root]])report.sourceHashes[side]=Object.fromEntries(sourceFiles.map(f=>[f,fs.existsSync(path.join(base,f))?hash(fs.readFileSync(path.join(base,f))):null]));
const references=['src/ui/nativeFrame.ts','src/ui/pickLayout.ts','src/ui/styles/nativeResponsive.css','src/ui/styles/title.css','src/ui/styles/tokens.css'];
for(const file of references){const bytes=fs.readFileSync(path.join('/Users/scdi/Documents/ChatGPT/TaptoPick',file));report.referenceHashes[file]=hash(bytes);const dest=path.join(out,'reference-source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});}
function walk(base){return fs.readdirSync(base,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(base,e.name)):[path.join(base,e.name)]);}
for(const folder of ['src/core','src/content','public'])for(const file of walk(path.join(before,folder))){const f=path.relative(before,file),h=hash(fs.readFileSync(file));assert.equal(hash(fs.readFileSync(path.join(root,f))),h,f);report.preservedHashes[f]=h;}
for(const f of ['src/ui/storage.ts','src/ui/persistentStore.ts','src/ui/blockColors.ts','src/ui/styles/tokens.css','src/ui/styles/game.css','src/ui/styles/picker.css','src/ui/styles/overlay.css','index.html','capacitor.config.ts','android/app/build.gradle','android/app/src/main/java/io/github/junyyyong/makezero/MainActivity.java']){const h=hash(fs.readFileSync(path.join(before,f)));assert.equal(hash(fs.readFileSync(path.join(root,f))),h,f);report.preservedHashes[f]=h;}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser=browser.version();const servers=[];
for(const source of [before,root]){const s=await createServer({root:source,configFile:false,cacheDir:path.join(before,`cache-${servers.length}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await s.listen();servers.push(s);}
const bases=servers.map(s=>s.resolvedUrls.local[0]);
const zero={top:0,right:0,bottom:0,left:0};
const title=['.brand-mark','.mode-list','.mode-btn','.mode-name','.mode-desc','#btn-title-settings'];
const intro=['#intro-title','#intro-mark','#intro-note','#intro-stats','#btn-intro-start'];
const game=['#run-title','.run-stat','.run-stat-label','.run-stat-value','#board','#board .tile','#selection-sum','.sum-total','#btn-back','#btn-pause'];
const panel=['#overlay .panel','#overlay-title','#overlay-body','#btn-primary','#btn-secondary'];
const settings=['#screen-settings .picker-title','.switch-row','.switch-text b','.switch-text small','.switch','.settings-links'];
async function context(native=true,size={width:390,height:844},dpr=2){
 const c=await browser.newContext({viewport:size,deviceScaleFactor:dpr,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
 await c.addInitScript(()=>{localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));let s=20261001;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};});
 if(native)await c.route('**/src/main.ts',async r=>{const response=await r.fetch(),body=await response.text(),next=body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/,'trackNativeFrame(true)');assert.notEqual(next,body);await r.fulfill({response,body:next});});
 return c;
}
async function page(ctx,base){const p=await ctx.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>report.errors.push(String(e)));await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));await p.goto(base,{waitUntil:'networkidle'});return p;}
async function settle(p){await p.clock.runFor(350);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});
 // Virtual rAF is separate from Chromium's real layout/ResizeObserver delivery.
 // A compositor flush lets observers see the final flex boxes before assertions.
 await p.screenshot();await p.clock.runFor(40);await p.screenshot();}
async function click(p,s){await p.locator(s).click();await settle(p);}
async function home(p,stage=31){await p.evaluate(stage=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:stage,bestEndless:123,bestTimeless:456})),stage);await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);}
async function insets(p,v=zero,fallback=v){await p.evaluate(({v,fallback})=>{for(const s of ['top','right','bottom','left']){const st=document.documentElement.style;if(v===null)st.removeProperty(`--android-game-inset-${s}`);else st.setProperty(`--android-game-inset-${s}`,`${v[s]}px`);st.setProperty(`--safe-area-inset-${s}`,`${fallback[s]}px`);}},{v,fallback});await settle(p);}
async function splashCheck(p,w,h,bar){await insets(p,bar);const studio=await p.evaluate(()=>{const s=document.querySelector('#screen-studio'),e=s.querySelector('img'),r=s.getBoundingClientRect(),b=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,color:getComputedStyle(s).backgroundColor,fit:getComputedStyle(e).objectFit,logoWidth:b.width,logoHeight:b.height};});
 assert(Math.abs(studio.x)<.05&&Math.abs(studio.y)<.05&&Math.abs(studio.width-w)<.05&&Math.abs(studio.height-h)<.05,'Studio full-window paint');assert.equal(studio.color,'rgb(233, 85, 50)');assert.equal(studio.fit,'contain');assert(studio.logoWidth<=w&&studio.logoHeight<=h*.7+.1);
 await p.clock.runFor(3200);await settle(p);const cover=await p.evaluate(()=>{const s=document.querySelector('#screen-splash'),e=s.querySelector('img'),r=s.getBoundingClientRect(),b=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,left:b.left,imageWidth:b.width,imageHeight:b.height,center:b.top+b.height/2,naturalRatio:e.naturalHeight/e.naturalWidth,color:getComputedStyle(s).backgroundColor,backgroundImage:getComputedStyle(s).backgroundImage,images:s.querySelectorAll('img').length};});
 assert(Math.abs(cover.left)<.05&&Math.abs(cover.imageWidth-w)<.05,'Cover fills width, no horizontal crop');assert(Math.abs(cover.center-h/2)<.05);assert(Math.abs(cover.imageHeight-w*cover.naturalRatio)<.1);assert.equal(cover.color,'rgb(255, 255, 255)');assert.equal(cover.backgroundImage,'none');assert.equal(cover.images,1);report.splashes.push({size:[w,h],bar,studio,cover,pass:true});}
async function read(p,selectors){return p.evaluate(selectors=>{const a=document.querySelector('#app'),r=a.getBoundingClientRect(),scale=a.classList.contains('is-native-frame')?r.width/parseFloat(getComputedStyle(a).width):1;
 const rect=e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{x:(b.x-r.x)/scale,y:(b.y-r.y)/scale,width:b.width/scale,height:b.height/scale,size:c.fontSize,weight:c.fontWeight,family:c.fontFamily,color:c.color,background:c.backgroundColor};};
 return{frame:{x:r.x,y:r.y,width:r.width,height:r.height,scale,logicalWidth:parseFloat(getComputedStyle(a).width),logicalHeight:parseFloat(getComputedStyle(a).height)},items:Object.fromEntries(selectors.map(s=>[s,rect(document.querySelector(s))]))};},selectors);}
function same(a,b,label,tolerance=.18){for(const [s,v]of Object.entries(a.items))for(const[k,x]of Object.entries(v)){if(s==='.run-stat-value'&&['x','width'].includes(k))continue;const y=b.items[s][k];if(typeof x==='number')assert(Math.abs(x-y)<=tolerance,`${label}: ${s}.${k} ${x} vs ${y}`);else assert.equal(y,x,`${label}: ${s}.${k}`);}}
async function bounds(p,name){const b=await p.evaluate(()=>{const a=document.querySelector('#app').getBoundingClientRect(),bad=[];let count=0;
 for(const e of document.querySelectorAll('#app button, #app .brand-mark, #app .board')){if(e.closest('.hidden')||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')continue;const r=e.getBoundingClientRect();count++;
 if(r.left<a.left-.25||r.right>a.right+.25||r.top<a.top-.25||r.bottom>a.bottom+.25)bad.push({id:e.id,classes:e.className,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}});}
 const board=document.querySelector('#board'),wrap=document.querySelector('#board-wrap');let boardFit=true,square=true;
 let boardMeasure;
 if(board.getClientRects().length){const r=board.getBoundingClientRect(),w=wrap.getBoundingClientRect();boardFit=r.width<=w.width+.25&&r.height<=w.height+.25;const t=board.querySelector('.tile').getBoundingClientRect();square=Math.abs(t.width-t.height)<.02;boardMeasure={width:r.width,height:r.height,wrapWidth:w.width,wrapHeight:w.height,tileWidth:t.width,tileHeight:t.height};}
 return{count,bad,boardFit,square,boardMeasure};});assert.deepEqual(b.bad,[],`${name} outside safe canvas`);assert(b.boardFit&&b.square,`${name} board fit/squares: ${JSON.stringify(b)}`);return b;}
async function capture(p,side,name,selectors){await settle(p);const file=`${side}-${name}.png`;await p.screenshot({path:path.join(out,file)});const bytes=fs.readFileSync(path.join(out,file));assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);report.captures.push({file,sha256:hash(bytes)});report.screens.push({side,name,metrics:await read(p,selectors),...(side==='after'&&!['studio','cover'].includes(name)?{bounds:await bounds(p,name)}:{})});}
async function result(p,mode){await p.evaluate(async mode=>{const {Overlay}=await import('/src/ui/screens/overlay.ts');new Overlay(()=>{}).open({title:mode==='timeless'?'Board cleared':mode==='endless'?'The board is full':'Time up',body:'Score 123\nBest 456',primary:{label:'Play again',action:()=>{}},secondary:{label:'Menu',action:()=>{}}});},mode);await settle(p);}
async function grade(p,band){await p.evaluate(async band=>{window.layoutCheer?.stop();document.querySelector('#overlay').classList.add('hidden');const {Cheer}=await import('/src/ui/screens/cheer.ts');window.layoutCheer=new Cheer();window.layoutCheer.play('STAGE CLEARED',123,()=>{},band,true,1000000);document.querySelector('#cheer-card').classList.add('hidden');document.querySelector('#cheer-clip').classList.add('hidden');},band);await settle(p);}
async function screens(p,bar,callback,lessons=false){await home(p);await insets(p,bar);await callback('home',title);
 await click(p,'#btn-title-settings');await callback('settings',settings);await click(p,'#btn-privacy');await callback('privacy',['#legal-dialog','#legal-title','#btn-legal-close','#legal-frame']);await click(p,'#btn-legal-close');
 for(const[mode,name]of [['timeAttack','limitless'],['timeless','timeless'],['endless','endless']]){await home(p);await insets(p,bar);await click(p,`#mode-${mode}`);await callback(`${name}-start`,intro);await click(p,'#btn-intro-start');await callback(`${name}-announcement`,['#lesson-intro-title','#lesson-intro-tap']);await click(p,'#lesson-intro');await callback(`${name}-game`,game);
 const c=await p.context().newCDPSession(p);const i=await p.locator('#board .tile:not(.cleared)').first().evaluate(e=>Number(e.dataset.i));await tapWithMotion(p,c,i);assert.deepEqual((await selectionState(p)).indices,[i]);await tapWithMotion(p,c,i,1);assert.deepEqual((await selectionState(p)).indices,[]);await c.detach();report.touch.push({name,bar,pass:true});
 await click(p,'#btn-pause');await callback(`${name}-pause`,panel);await result(p,mode);await callback(`${name}-result`,panel);}
 if(lessons)for(const stage of [1,6,14,23,30]){await home(p,stage);await insets(p,bar);await click(p,'#mode-timeAttack');await click(p,'#btn-intro-start');await callback(`lesson-${stage}-announcement`,['#lesson-intro-title','#lesson-intro-tap']);await click(p,'#lesson-intro');await callback(`lesson-${stage}-game`,game);}
 if(lessons)await click(p,'#btn-pause');await grade(p,1);await callback('long-grade',['#cheer-word','#cheer-tap']);}
try{
 const refValues={};
 if(!process.env.MATRIX_ONLY)for(const[index,side]of ['before','after'].entries()){const ctx=await context(),p=await page(ctx,bases[index]);try{
  await insets(p,{top:24,right:0,bottom:48,left:0});await capture(p,side,'studio',['.studio-logo']);await p.clock.runFor(3200);await capture(p,side,'cover',['.splash-cover']);
  await screens(p,{top:24,right:0,bottom:48,left:0},async(name,sel)=>{await capture(p,side,name,sel);},true);
 }finally{await ctx.close();}console.log(`Captured ${side}`);}
 // Every requested screen across phone/tablet shapes. No portrait letterbox.
 const ratios=[[320,568],[360,640],[390,844],[412,915],[540,1170],[768,1024],[1024,768],[800,600],[844,390]];
 for(const[w,h]of ratios){const ctx=await context(true,{width:w,height:h}),p=await page(ctx,bases[1]);const checks=[];try{
  const bar={top:24,right:8,bottom:48,left:8};await splashCheck(p,w,h,bar);await screens(p,bar,async(name,sel)=>{const m=await read(p,sel);assert(Math.abs(m.frame.x-bar.left)<.05);assert(Math.abs(m.frame.y-bar.top)<.05);assert(Math.abs(m.frame.width-(w-16))<.1);assert(Math.abs(m.frame.height-(h-72))<.1);
   if(name==='privacy'){const d=m.items['#legal-dialog'];assert(d.x>=0&&d.y>=0&&d.x+d.width<=m.frame.logicalWidth+.1&&d.y+d.height<=m.frame.logicalHeight+.1,'Native top-layer policy stays safe');}
   checks.push({name,frame:m.frame,bounds:await bounds(p,name)});});
  report.ratios.push({size:[w,h],checks,pass:true});
 }finally{await ctx.close();}console.log(`All screens fit: ${w}×${h}`);}
 // Same physical 1080×2340 and bars 72/144: density must cancel out.
 for(const density of [2,2.4,3,3.6,4]){const ctx=await context(true,{width:1080/density,height:2340/density},density),p=await page(ctx,bases[1]);const values={};try{
  await screens(p,{top:72/density,right:0,bottom:144/density,left:0},async(name,sel)=>{const m=await read(p,sel);if(density===2)refValues[name]=m;else same(refValues[name],m,`density ${density} ${name}`);values[name]=m;});report.density.push({density,values,pass:true});
 }finally{await ctx.close();}console.log(`Same-device density: ${density}`);}
 // Live density/inset changes: keep the board, selected tile and saved progress.
 const ctx=await context(),p=await page(ctx,bases[1]);try{await home(p,6);await click(p,'#mode-timeAttack');await click(p,'#btn-intro-start');await click(p,'#lesson-intro');
 const c=await ctx.newCDPSession(p),numbers=await p.locator('#board .tile').allTextContents(),saved=await p.evaluate(()=>localStorage.getItem('makezero.progress.v1'));await tapWithMotion(p,c,0);
 let baseline;
 for(const density of [2,2.4,3,3.6,4]){await p.setViewportSize({width:1080/density,height:2340/density});await insets(p,{top:72/density,right:0,bottom:144/density,left:0});const m=await read(p,game);if(!baseline)baseline=m;else same(baseline,m,'live density');assert.deepEqual(await p.locator('#board .tile').allTextContents(),numbers);assert.equal(await p.evaluate(()=>localStorage.getItem('makezero.progress.v1')),saved);assert.deepEqual((await selectionState(p)).indices,[0]);report.live.push({density,frame:m.frame,pass:true});}
 await tapWithMotion(p,c,0,1);assert.deepEqual((await selectionState(p)).indices,[]);await c.detach();
 for(const[bar,fallback]of [[zero,{top:24,right:0,bottom:48,left:0}],[{top:40,right:16,bottom:24,left:12},zero],[null,{top:24,right:0,bottom:48,left:0}]]){await p.setViewportSize({width:390,height:844});await insets(p,bar,fallback);const m=await read(p,game);assert.equal(m.frame.y,(bar??fallback).top);report.live.push({bar,fallback,frame:m.frame,bounds:await bounds(p,'live inset'),pass:true});}
 for(let band=0;band<6;band++){await grade(p,band);const m=await p.locator('#cheer-word').evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);const t=r.getBoundingClientRect(),b=e.getBoundingClientRect();return{word:e.textContent,width:t.width,box:b.width,color:getComputedStyle(e).color};});assert(m.width<=m.box+.1);assert.equal(m.color,'rgb(255, 181, 0)');report.grades.push(m);}
 }finally{await ctx.close();}
 // Web menu/game/Settings/overlays must retain existing geometry and type.
 const webCtx=await context(false),p0=await page(webCtx,bases[0]),p1=await page(webCtx,bases[1]);try{
 for(const[w,h]of [[320,568],[390,580],[390,660],[390,700],[390,844],[412,915],[800,600]]){
  for(const p of [p0,p1])await p.setViewportSize({width:w,height:h});
  const snapshots=[{},{}];for(const[i,p]of[p0,p1].entries())await screens(p,zero,async(name,sel)=>{snapshots[i][name]=await read(p,sel);});for(const name of Object.keys(snapshots[0]))same(snapshots[0][name],snapshots[1][name],`web ${w}×${h} ${name}`,1.1);report.web.push({size:[w,h],pass:true});console.log(`Web unchanged: ${w}×${h}`);
 }
 }finally{await webCtx.close();}
 // Controlled board fixture: actual touch drag, transformed pop/finished art,
 // and blocking storage retry outside the inert responsive app.
 for(const[w,h]of [[320,568],[390,844],[1024,768]]){const ctx=await context(),p=await ctx.newPage();try{
  await p.setViewportSize({width:w,height:h});await p.route(bases[1],async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('<script type="module" src="/src/main.ts"></script>','<script type="module">import "/src/ui/styles/index.css";</script>')});});
  await p.goto(bases[1],{waitUntil:'networkidle'});await p.evaluate(async()=>{const{trackNativeFrame}=await import('/src/ui/nativeFrame.ts');trackNativeFrame(true);const{BoardView}=await import('/src/ui/boardView.ts');const{Hud}=await import('/src/ui/screens/hud.ts');
   for(const e of document.querySelectorAll('.screen'))e.classList.add('hidden');const q=window.responsiveProbe={commits:[],board:{width:9,cells:Array.from({length:81},(_,i)=>({value:i===0?1:i===1?2:i===2?7:9,cleared:false}))},hud:new Hud()};
   q.view=new BoardView({wrap:document.querySelector('#board-wrap'),grid:document.querySelector('#board'),requiredCount:()=>3,isValid:indices=>indices.length===3&&indices.reduce((sum,i)=>sum+q.board.cells[i].value,0)===10,onCommit:indices=>q.commits.push([...indices]),onSelectionChange:(v,c)=>q.hud.setSelection(v,c)});q.view.setBoard(q.board);
   if(document.querySelector('#board').style.cssText.includes('NaN'))throw new Error('Hidden board measurement wrote NaN');document.querySelector('#screen-game').classList.remove('hidden');});
  await p.waitForTimeout(60);const client=await ctx.newCDPSession(p);await tapWithMotion(p,client,0);await tapWithMotion(p,client,0,1);assert.deepEqual((await selectionState(p)).indices,[]);
  const centers=await p.locator('#board .tile').evaluateAll(es=>es.slice(0,3).map(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}));
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...centers[0],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...centers[2],id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await p.evaluate(()=>window.responsiveProbe.commits),[[0,1,2]]);await client.detach();
  const measure=await p.evaluate(async()=>{window.responsiveProbe.view.clearSelection();window.responsiveProbe.view.popScore(0,10);const pop=document.querySelector('.pop');pop.style.animation='none';pop.style.transform='translateX(-50%)';const t=document.querySelector('#board .tile').getBoundingClientRect(),r=pop.getBoundingClientRect();
   const{App}=await import('/src/ui/app.ts');App.prototype.showFinishedPlate.call({},1,()=>{});const d=document.querySelector('#plate-done');d.style.animation='none';const b=document.querySelector('#board').getBoundingClientRect(),a=d.getBoundingClientRect();return{popCenter:r.x+r.width/2,tileCenter:t.x+t.width/2,popTop:r.y,tileTop:t.y,board:{x:b.x,y:b.y,width:b.width,height:b.height},art:{x:a.x,y:a.y,width:a.width,height:a.height}};});
  assert(Math.abs(measure.popCenter-measure.tileCenter)<.1&&Math.abs(measure.popTop-measure.tileTop)<.1);for(const k of ['x','y','width','height'])assert(Math.abs(measure.board[k]-measure.art[k])<.1,`Finished picture ${k}`);
  await p.evaluate(async()=>{const{StorageNotice}=await import('/src/ui/storageNotice.ts');const n=new StorageNotice();window.retryWorked=false;n.show(true,async()=>{window.retryWorked=true;n.hide();});});assert(await p.locator('#app').evaluate(e=>e.inert));await p.locator('#storage-notice button').click();assert(await p.evaluate(()=>window.retryWorked));assert.equal(await p.locator('#app').evaluate(e=>e.inert),false);report.touch.push({size:[w,h],fixture:'single-event drag + pop + finished art + storage retry',measure,pass:true});
 }finally{await ctx.close();}}
 // This runner only reads/copies TEST. Another chat may edit that repository
 // while our test runs; preserve exact starting snapshots and report drift,
 // instead of mislabelling it as a TAPtoTEN layout failure.
 report.referenceEndHashes=Object.fromEntries(references.map(f=>[f,hash(fs.readFileSync(path.join('/Users/scdi/Documents/ChatGPT/TaptoPick',f)))]));
 report.referenceChangedDuringRun=references.filter(f=>report.referenceEndHashes[f]!==report.referenceHashes[f]);
 for(const[f,h]of Object.entries(report.sourceHashes.after))if(h)assert.equal(hash(fs.readFileSync(path.join(root,f))),h,`Source changed during verification: ${f}`);
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.pass=false;report.failure=String(e);throw e;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();for(const s of servers)await s.close();console.log(JSON.stringify({out,pass:report.pass,captures:report.captures.length,ratios:report.ratios.length,density:report.density.length,web:report.web.length,failure:report.failure}));}
