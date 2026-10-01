// Research-only browser/geometry verification. NOT an Android device test.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {tapWithMotion, selectionState} from '../../../tests/browser/selection-toggle.mjs';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), dir=path.join(root,'docs/research/2026-10-01-proportional-frame');
const out=process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'Use a NEW CAPTURE_OUT; never overwrite evidence');
fs.mkdirSync(out,{recursive:true});
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621';
const before=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-frame-replay-'));
execFileSync('tar',['-xf','-','-C',before],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
execFileSync('tar',['-xzf',path.join(dir,'before-source-overlay.tar.gz'),'-C',before]);
fs.symlinkSync(path.join(root,'node_modules'),path.join(before,'node_modules'),'dir');
const hash=b=>createHash('sha256').update(b).digest('hex');
const report={capturedAt:new Date().toISOString(),revision,beforeOverlaySha256:hash(fs.readFileSync(path.join(dir,'before-source-overlay.tar.gz'))),
  conditions:{viewport:[390,844],dpr:2,png:[780,1688],clock:'2026-10-01T00:00:00Z',seed:20261001,locale:'en-US',timezone:'Asia/Seoul',
    nativeSimulation:'Invoke trackNativeFrame(true) in served main.ts; keep real web Preferences. CSS insets simulate Java reports.',
    animation:'Finite animations finished; repeating animations paused at 0; muted music/sound.'},
  captures:[],metrics:{before:{},after:{}},webChecks:[],densityChecks:[],insetChecks:[],touchChecks:[],gradeChecks:[],boundsChecks:[],errors:[],sourceHashes:{},preservedHashes:{},
  limitations:['macOS Chrome, not Galaxy or Android System WebView. No connected adb devices.',
    'Before is git archive plus preserved approved/uncommitted source overlay, not a pure released commit.',
    'Result and grade layout fixtures instantiate the real Overlay/Cheer; not earned scores, video or audio quality evidence.',
    'Physical pixels/density/insets simulated. Java contract separately tests overlap calculations; no OS settings changed.']};
const files=['src/main.ts','src/ui/nativeFrame.ts','src/ui/styles/nativeFrame.css','src/ui/styles/title.css','src/ui/styles/game.css','src/ui/styles/picker.css',
  'src/ui/styles/overlay.css','src/ui/styles/safeArea.css','src/ui/boardView.ts','src/ui/screens/cheer.ts','src/ui/app.ts','src/ui/storageNotice.ts'];
for(const side of ['before','after']){
 report.sourceHashes[side]=Object.fromEntries(files.map(file=>[file,fs.existsSync(path.join(side==='before'?before:root,file))?hash(fs.readFileSync(path.join(side==='before'?before:root,file))):null]));
}
for(const folder of ['src/core','src/content','public']){
 const walk=base=>fs.readdirSync(base,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(base,e.name)):[path.join(base,e.name)]);
 for(const file of walk(path.join(before,folder))){const relative=path.relative(before,file),h=hash(fs.readFileSync(file));assert.equal(hash(fs.readFileSync(path.join(root,relative))),h,`preserved ${relative}`);report.preservedHashes[relative]=h;}
}
for(const file of ['src/ui/storage.ts','src/ui/persistentStore.ts','src/ui/blockColors.ts','src/ui/styles/tokens.css','index.html']){
 const h=hash(fs.readFileSync(path.join(before,file)));assert.equal(hash(fs.readFileSync(path.join(root,file))),h,`preserved ${file}`);report.preservedHashes[file]=h;
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser=browser.version();
const servers=[];
for(const source of [before,root]){const s=await createServer({root:source,configFile:false,cacheDir:path.join(before,`cache-${servers.length}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await s.listen();servers.push(s);}
const bases=servers.map(s=>s.resolvedUrls.local[0]);
async function context(native=false,size={width:390,height:844},dpr=2){
 const ctx=await browser.newContext({viewport:size,deviceScaleFactor:dpr,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
  let seed=20261001;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 });
 if(native)await ctx.route('**/src/main.ts',async route=>{
  const response=await route.fetch(),body=await response.text();
  const replaced=body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ["']android["']\)/,'trackNativeFrame(true)');
  assert.notEqual(replaced,body,'Android simulation activation');await route.fulfill({response,body:replaced});
 });
 return ctx;
}
async function page(ctx,base){const p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push(String(e)));await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));await p.goto(base,{waitUntil:'networkidle'});return p;}
async function settle(p){await p.clock.runFor(350);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});}
async function click(p,s){await p.locator(s).click();await settle(p);}
async function home(p,base,stage=31){
 await p.evaluate(stage=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:stage,bestEndless:123,bestTimeless:456})),stage);
 assert(p.url().startsWith(base));await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);
}
async function insets(p,overlap={top:24,right:0,bottom:48,left:0},fallback=overlap){
 await p.evaluate(({overlap,fallback})=>{for(const side of ['top','right','bottom','left']){
  const style=document.documentElement.style,key=`--android-game-inset-${side}`;
  if(overlap===null)style.removeProperty(key);else style.setProperty(key,`${overlap[side]}px`);
  style.setProperty(`--safe-area-inset-${side}`,`${fallback[side]}px`);
 }},{overlap,fallback});await settle(p);
}
async function read(p,selectors){return p.evaluate(selectors=>{
 const app=document.querySelector('#app'),a=app.getBoundingClientRect(),native=app.classList.contains('is-native-frame'),scale=native?a.width/390:1;
 return {app:{x:a.x,y:a.y,width:a.width,height:a.height,scale,logicalWidth:app.clientWidth,logicalHeight:app.clientHeight},
  items:Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s);if(!e)return[s,null];const r=e.getBoundingClientRect(),c=getComputedStyle(e);return[s,{x:(r.x-a.x)/scale,y:(r.y-a.y)/scale,width:r.width/scale,height:r.height/scale,
    size:c.fontSize,weight:c.fontWeight,family:c.fontFamily,line:c.lineHeight,color:c.color,background:c.backgroundColor}];}))};
 },selectors);}
function same(a,b,label,tolerance=.15){for(const [selector,item]of Object.entries(a.items)){const actual=b.items[selector];assert(actual,`${label} ${selector}`);for(const [key,value]of Object.entries(item)){
 // A live timer can have different digits after automation actionability waits.
 // Compare its font, height and baseline plus the stat container, not glyph width/x.
 if(selector==='.run-stat-value' && ['x','width'].includes(key))continue;
 if(typeof value==='number')assert(Math.abs(actual[key]-value)<tolerance,`${label} ${selector} ${key}: ${actual[key]} != ${value}`);else assert.equal(actual[key],value,`${label} ${selector} ${key}`);}}}
const title=['.brand-mark','.mode-btn','.mode-name','.mode-desc','#btn-title-settings'];
const intro=['#intro-title','#intro-mark','#intro-mark-art','#intro-note','#intro-stats','#btn-intro-start'];
const game=['#run-title','.run-stat','.run-stat-label','.run-stat-value','#board','#board .tile','#selection-sum','.sum-label','.sum-total','#btn-pause','#btn-back'];
const panel=['#overlay .panel','#overlay-title','#overlay-body','#btn-primary','#btn-secondary'];
const settings=['#screen-settings .picker-title','.switch-row','.switch-text b','.switch-text small','.switch','.settings-links'];
async function capture(p,side,name,selectors){await settle(p);const file=`${side}-${name}.png`;await p.screenshot({path:path.join(out,file)});const b=fs.readFileSync(path.join(out,file));assert.equal(b.readUInt32BE(16),780);assert.equal(b.readUInt32BE(20),1688);report.captures.push({file,sha256:hash(b)});report.metrics[side][name]=await read(p,selectors);
 if(side==='after'){
  const bounds=await p.evaluate(()=>{const a=document.querySelector('#app').getBoundingClientRect();let count=0;const issues=[];
   for(const e of document.querySelectorAll('#app button, #app img, #app .board')){if(e.closest('.hidden')||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden')continue;const r=e.getBoundingClientRect();count++;if(r.left<a.left-.15||r.right>a.right+.15||r.top<a.top-.15||r.bottom>a.bottom+.15)issues.push({id:e.id,classes:e.className});}return{count,issues};});
  assert.deepEqual(bounds.issues,[],`${name} clipped controls/art`);report.boundsChecks.push({name,...bounds});
 }
}
async function resultFixture(p,mode){
 await p.evaluate(async mode=>{
  const {Overlay}=await import('/src/ui/screens/overlay.ts');
  const titles={timeAttack:'Time up',timeless:'Board cleared',endless:'The board is full'};
  const bodies={timeAttack:'Score 0\nBoards cleared 0\nBest 0',timeless:'Nothing left standing.\nTime 01:20\nScore 456',endless:'Score 123\nBest today 123\nAll-time best 123'};
  new Overlay(()=>{}).open({title:titles[mode],body:bodies[mode],primary:{label:mode==='timeAttack'?'Retry':'Play again',action:()=>{}},secondary:{label:'Menu',action:()=>{}}});
 },mode);await settle(p);
}
async function gradeFixture(p,band=1){
 await p.evaluate(async band=>{document.querySelector('#overlay').classList.add('hidden');const {Cheer}=await import('/src/ui/screens/cheer.ts');window.frameCheer=new Cheer();window.frameCheer.play('STAGE CLEARED',123,()=>{},band,true,1000000);
  // Controlled still-layout: avoid testing a decoder by accident.
  document.querySelector('#cheer-card').classList.add('hidden');document.querySelector('#cheer-clip').classList.add('hidden');
 },band);await settle(p);
}
try{
 if(!process.env.FIXTURES_ONLY){
 // Before/after at identical mobile capture conditions, with simulated bars.
 for(const [index,side]of ['before','after'].entries()){
  const ctx=await context(side==='after'),p=await page(ctx,bases[index]);
  try{
   await home(p,bases[index]);await insets(p);await capture(p,side,'home',title);
   await click(p,'#btn-title-settings');await capture(p,side,'settings',settings);
   await click(p,'#btn-privacy');await capture(p,side,'privacy',['#legal-dialog','#legal-title','#btn-legal-close','#legal-frame']);await click(p,'#btn-legal-close');
   for(const [mode,name]of [['timeAttack','limitless'],['timeless','timeless'],['endless','endless']]){
    await home(p,bases[index]);await insets(p);await click(p,`#mode-${mode}`);await capture(p,side,`${name}-start`,intro);
    await click(p,'#btn-intro-start');await capture(p,side,`${name}-announcement`,['#lesson-intro','#lesson-intro-title','#lesson-intro-tap']);await click(p,'#lesson-intro');
    await capture(p,side,`${name}-game`,game);
    const client=await ctx.newCDPSession(p);await tapWithMotion(p,client,0);await tapWithMotion(p,client,0,1);assert.deepEqual((await selectionState(p)).indices,[]);await client.detach();
    await click(p,'#btn-pause');await capture(p,side,`${name}-pause`,panel);
    await resultFixture(p,mode);await capture(p,side,`${name}-result`,panel);
   }
   for(const stage of [1,6,14,23,30]){
    await home(p,bases[index],stage);await insets(p);await click(p,'#mode-timeAttack');await click(p,'#btn-intro-start');
    await capture(p,side,`lesson-${stage}-announcement`,['#lesson-intro-title','#lesson-intro-tap']);await click(p,'#lesson-intro');await capture(p,side,`lesson-${stage}-game`,game);
   }
   await click(p,'#btn-pause');await gradeFixture(p);await capture(p,side,'long-grade',['#cheer-word','#cheer-tap']);
  }finally{await ctx.close();}
 }
 // Web must remain exactly responsive, including each pre-existing breakpoint.
 const ctx=await context(),p0=await page(ctx,bases[0]),p1=await page(ctx,bases[1]);
 try{
  for(const size of [{width:320,height:568},{width:390,height:520},{width:390,height:580},{width:390,height:620},{width:390,height:660},{width:390,height:700},{width:390,height:701},{width:390,height:844},{width:412,height:915}]){
   for(const p of [p0,p1])await p.setViewportSize(size);
   for(const [i,p]of [p0,p1].entries())await home(p,bases[i]);
   same(await read(p0,title),await read(p1,title),`web menu ${JSON.stringify(size)}`);
   for(const mode of ['timeAttack','timeless','endless']){
    for(const p of [p0,p1])await click(p,`#mode-${mode}`);
    same(await read(p0,intro),await read(p1,intro),`web START ${mode} ${JSON.stringify(size)}`);
    for(const p of [p0,p1]){await click(p,'#btn-intro-start');await click(p,'#lesson-intro');}
    same(await read(p0,game),await read(p1,game),`web game ${mode} ${JSON.stringify(size)}`);
    for(const p of [p0,p1])await click(p,'#btn-pause');
    same(await read(p0,panel),await read(p1,panel),`web pause ${mode} ${JSON.stringify(size)}`);
    for(const [i,p]of [p0,p1].entries())await home(p,bases[i]);
   }
   for(const p of [p0,p1])await click(p,'#btn-title-settings');same(await read(p0,settings),await read(p1,settings),`web settings ${JSON.stringify(size)}`);
   report.webChecks.push({size,pass:true,modes:['timeAttack','timeless','endless']});console.log(`Web parity passed: ${size.width}×${size.height}`);
  }
 }finally{await ctx.close();}
 // Device display-size simulation at a constant physical 1080×2340 screen.
 // All computed CSS values and canvas-local positions must equal 390×844 web.
 const refCtx=await context(),ref=await page(refCtx,bases[1]);
 await home(ref,bases[1]);const refs={home:await read(ref,title)};
 for(const mode of ['timeAttack','timeless','endless']){
  await home(ref,bases[1]);await click(ref,`#mode-${mode}`);refs[`${mode}-start`]=await read(ref,intro);
  await click(ref,'#btn-intro-start');await click(ref,'#lesson-intro');refs[`${mode}-game`]=await read(ref,game);
  await click(ref,'#btn-pause');refs[`${mode}-pause`]=await read(ref,panel);await resultFixture(ref,mode);refs[`${mode}-result`]=await read(ref,panel);
 }
 await home(ref,bases[1]);await click(ref,'#btn-title-settings');refs.settings=await read(ref,settings);await click(ref,'#btn-privacy');refs.privacy=await read(ref,['#legal-dialog','#legal-title','#btn-legal-close','#legal-frame']);
 await refCtx.close();
 for(const density of [2,2.4,3,3.6,4]){
  const size={width:Math.round(1080/density),height:Math.round(2340/density)},ctx=await context(true,size,density),p=await page(ctx,bases[1]);
  try{
   const overlap={top:72/density,bottom:144/density,right:0,left:0};await home(p,bases[1]);await insets(p,overlap);
   same(refs.home,await read(p,title),`density ${density} menu`);
   const frame=(await read(p,title)).app;assert.equal(frame.logicalWidth,390);assert.equal(frame.logicalHeight,844);
   assert(frame.y>=overlap.top-.1 && frame.y+frame.height<=size.height-overlap.bottom+.1);
   assert(frame.x>=-.1&&frame.x+frame.width<=size.width+.1);
   report.densityChecks.push({density,size,overlap,frame});
   for(const mode of ['timeAttack','timeless','endless']){
    await home(p,bases[1]);await insets(p,overlap);await click(p,`#mode-${mode}`);same(refs[`${mode}-start`],await read(p,intro),`density ${density} ${mode} START`);
    await click(p,'#btn-intro-start');await click(p,'#lesson-intro');same(refs[`${mode}-game`],await read(p,game),`density ${density} ${mode} game`);
    const client=await ctx.newCDPSession(p),index=await p.locator('#board .tile:not(.cleared)').first().evaluate(e=>Number(e.dataset.i));await tapWithMotion(p,client,index);assert.deepEqual((await selectionState(p)).indices,[index]);await tapWithMotion(p,client,index,1);assert.deepEqual((await selectionState(p)).indices,[]);await client.detach();
    report.touchChecks.push({density,mode,type:'real dispatched touch; select/cancel',pass:true});
    await click(p,'#btn-pause');same(refs[`${mode}-pause`],await read(p,panel),`density ${density} ${mode} pause`);
    await resultFixture(p,mode);same(refs[`${mode}-result`],await read(p,panel),`density ${density} ${mode} result`);
   }
   await home(p,bases[1]);await insets(p,overlap);await click(p,'#btn-title-settings');same(refs.settings,await read(p,settings),`density ${density} settings`);
   await click(p,'#btn-privacy');same(refs.privacy,await read(p,['#legal-dialog','#legal-title','#btn-legal-close','#legal-frame']),`density ${density} top-layer policy`,.25);console.log(`Density passed: ${density}`);
  }finally{await ctx.close();}
 }
 // Live display/viewport and inset changes: no page reload or lost progress.
 const liveCtx=await context(true),live=await page(liveCtx,bases[1]);
 try{
  await home(live,bases[1],6);await click(live,'#mode-timeAttack');await click(live,'#btn-intro-start');await click(live,'#lesson-intro');
  const baseline=await read(live,game),numbers=await live.locator('#board .tile').allTextContents(),storage=await live.evaluate(()=>localStorage.getItem('makezero.progress.v1'));
  const cases=[{size:[320,568],native:{top:24,right:0,bottom:48,left:0},fallback:{top:24,right:0,bottom:48,left:0}},
    {size:[412,915],native:{top:0,right:0,bottom:0,left:0},fallback:{top:24,right:0,bottom:48,left:0}},
    {size:[390,844],native:{top:40,right:16,bottom:24,left:12},fallback:{top:24,right:0,bottom:48,left:0}},
    {size:[800,600],native:null,fallback:{top:24,right:0,bottom:48,left:0}}];
  for(const c of cases){await live.setViewportSize({width:c.size[0],height:c.size[1]});await insets(live,c.native,c.fallback);same(baseline,await read(live,game),'live settings');assert.deepEqual(await live.locator('#board .tile').allTextContents(),numbers);assert.equal(await live.evaluate(()=>localStorage.getItem('makezero.progress.v1')),storage);
   const fit=(await read(live,game)).app,bar=c.native??c.fallback;assert(fit.x>=bar.left-.1&&fit.y>=bar.top-.1&&fit.x+fit.width<=c.size[0]-bar.right+.1&&fit.y+fit.height<=c.size[1]-bar.bottom+.1);report.insetChecks.push({...c,fit});
  }
  for(const band of [0,1,2,3,4,5]){await gradeFixture(live,band);const measure=await live.locator('#cheer-word').evaluate(e=>{const r=document.createRange();r.selectNodeContents(e);const a=document.querySelector('#app').getBoundingClientRect();return{word:e.textContent,width:r.getBoundingClientRect().width/(a.width/390),font:getComputedStyle(e).fontSize};});assert(measure.width<=362.5,JSON.stringify(measure));report.gradeChecks.push(measure);}
 }finally{await liveCtx.close();}
 }
 // Independent controlled board: rapid drag, painted score pop, finished art,
 // and an error retry outside the inert game. Not user-earned game outcomes.
 for(const size of [{width:320,height:568},{width:390,height:844},{width:540,height:1170}]){
  const ctx=await context(true,size),p=await ctx.newPage();
  try{
   await p.route(bases[1],async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<script type="module" src="/src/main.ts"></script>','<script type="module">import "/src/ui/styles/index.css";</script>')});});
   await p.goto(bases[1],{waitUntil:'networkidle'});
   await p.evaluate(async()=>{
    const {trackNativeFrame}=await import('/src/ui/nativeFrame.ts');trackNativeFrame(true);
    const {BoardView}=await import('/src/ui/boardView.ts');const {Hud}=await import('/src/ui/screens/hud.ts');
    for(const e of document.querySelectorAll('.screen'))e.classList.add('hidden');document.querySelector('#screen-game').classList.remove('hidden');
    const q=window.frameProbe={commits:[],board:{width:9,cells:Array.from({length:81},(_,i)=>({value:i===0?1:i===1?2:i===2?7:9,cleared:false}))},hud:new Hud()};
    q.view=new BoardView({wrap:document.querySelector('#board-wrap'),grid:document.querySelector('#board'),requiredCount:()=>3,
      isValid:indices=>indices.length===3&&indices.reduce((s,i)=>s+q.board.cells[i].value,0)===10,
      onCommit:indices=>q.commits.push([...indices]),onSelectionChange:(v,c)=>q.hud.setSelection(v,c)});q.view.setBoard(q.board);
   });await insets(p);await p.evaluate(async()=>{await document.fonts.ready;});
   const client=await ctx.newCDPSession(p);await tapWithMotion(p,client,0);await tapWithMotion(p,client,0,1);assert.deepEqual((await selectionState(p)).indices,[]);
   const centers=await p.locator('#board .tile').evaluateAll(es=>es.slice(0,3).map(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};}));
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...centers[0],id:1}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...centers[2],id:1}]});
   await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await p.evaluate(()=>window.frameProbe.commits),[[0,1,2]]);await client.detach();
   const positions=await p.evaluate(async()=>{
    window.frameProbe.view.clearSelection();window.frameProbe.view.popScore(0,10);const pop=document.querySelector('.pop');pop.style.animation='none';pop.style.transform='translateX(-50%)';
    const tile=document.querySelector('#board .tile').getBoundingClientRect(),r=pop.getBoundingClientRect(),popCenter=r.x+r.width/2;
    const {App}=await import('/src/ui/app.ts');App.prototype.showFinishedPlate.call({},1,()=>{});const done=document.querySelector('#plate-done');done.style.animation='none';
    const b=document.querySelector('#board').getBoundingClientRect(),d=done.getBoundingClientRect();
    return{popCenter,tileCenter:tile.x+tile.width/2,popTop:r.top,tileTop:tile.top,board:{x:b.x,y:b.y,width:b.width,height:b.height},done:{x:d.x,y:d.y,width:d.width,height:d.height}};
   });assert(Math.abs(positions.popCenter-positions.tileCenter)<.1);assert(Math.abs(positions.popTop-positions.tileTop)<.1);
   for(const key of ['x','y','width','height'])assert(Math.abs(positions.board[key]-positions.done[key])<.1,`finished art ${key}`);
   await p.evaluate(async()=>{const {StorageNotice}=await import('/src/ui/storageNotice.ts');window.noticeFixture=new StorageNotice();window.retryWorked=false;window.noticeFixture.show(true,async()=>{window.retryWorked=true;window.noticeFixture.hide();});});
   assert.equal(await p.locator('#app').evaluate(e=>e.inert),true);await p.locator('#storage-notice button').click();assert.equal(await p.evaluate(()=>window.retryWorked),true);assert.equal(await p.locator('#app').evaluate(e=>e.inert),false);
   report.touchChecks.push({size,type:'controlled fixture: single-event drag + score pop + finished art + blocking storage retry',positions,pass:true});
  }finally{await ctx.close();}
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.pass=false;report.failure=String(error);throw error;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();for(const s of servers)await s.close();console.log(JSON.stringify({out,pass:report.pass,captures:report.captures.length,webSizes:report.webChecks.length,densityCases:report.densityChecks.length,failure:report.failure}));}
