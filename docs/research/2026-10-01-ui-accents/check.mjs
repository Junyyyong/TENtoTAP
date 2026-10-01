// Research-only: never imported by the game. Replay old sources outside checkout.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), dir=path.join(root,'docs/research/2026-10-01-ui-accents'), out=process.env.CAPTURE_OUT;
assert(out && !fs.existsSync(out), 'Use a NEW output folder; preserve previous evidence');
fs.mkdirSync(out,{recursive:true});
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function replay(overlay){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-accent-replay-'));
 execFileSync('tar',['-xf','-','-C',temp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
 if(overlay)execFileSync('tar',['-xzf',path.join(dir,'before-source-overlay.tar.gz'),'-C',temp]);
 fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),'dir');return temp;
}
const sources={before:replay(true),after:root,original:replay(false)};
const report={capturedAt:new Date().toISOString(),revision,overlaySha256:hash(fs.readFileSync(path.join(dir,'before-source-overlay.tar.gz'))),
 conditions:{viewport:[390,844],dpr:2,png:[780,1688],clock:'2026-10-01T00:00:00Z',seed:20261001,colorSeed:20261001,locale:'en-US',timezone:'Asia/Seoul',animation:'Finite finished; repeating paused at 0; audio muted'},
 captures:[],metrics:{before:{},after:{}},originalAccents:[],frameChecks:[],preservedHashes:{},sourceHashes:{},errors:[],pass:false,
 limitations:['Chrome/macOS simulation, not a physical Android or Galaxy WebView test.',
 'Before is git archive plus approved uncommitted source snapshot; original accent reference is the unchanged HEAD commit.',
 'Equation, urgent clock, penalty, grade and result views use labelled controlled fixtures, not earned play records.']};
const cssFiles=['tokens','title','picker','game','overlay','motion','storage','gallery'].map(f=>`src/ui/styles/${f}.css`);
for(const [side,source]of Object.entries(sources))report.sourceHashes[side]=Object.fromEntries(cssFiles.map(f=>[f,hash(fs.readFileSync(path.join(source,f)))]));
const walk=folder=>fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);
for(const folder of ['src/core','src/content','public'])for(const f of walk(path.join(sources.before,folder))){const rel=path.relative(sources.before,f),h=hash(fs.readFileSync(f));assert.equal(hash(fs.readFileSync(path.join(root,rel))),h,rel);report.preservedHashes[rel]=h;}
for(const f of walk(path.join(sources.before,'src')).filter(f=>!f.endsWith('.css'))){const rel=path.relative(sources.before,f),h=hash(fs.readFileSync(f));assert.equal(hash(fs.readFileSync(path.join(root,rel))),h,rel);report.preservedHashes[rel]=h;}
for(const f of ['index.html','src/ui/styles/nativeFrame.css','src/ui/styles/safeArea.css','src/ui/styles/tutorial.css']){const h=hash(fs.readFileSync(path.join(sources.before,f)));assert.equal(hash(fs.readFileSync(path.join(root,f))),h,f);report.preservedHashes[f]=h;}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
report.browser=browser.version();const servers=[];
async function context(native=false){
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
 await ctx.addInitScript(()=>{
  localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
  let n=20261001;Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
  let seed=20261001;const original=crypto.getRandomValues.bind(crypto);
  Object.defineProperty(crypto,'getRandomValues',{value:b=>{if(!(b instanceof Uint32Array))return original(b);for(let i=0;i<b.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;b[i]=seed;}return b;}});
 });
 if(native)await ctx.route('**/src/main.ts',async route=>{const r=await route.fetch(),body=await r.text(),next=body.replace(/trackNativeFrame\(Capacitor\.getPlatform\(\) === ['"]android['"]\)/,'trackNativeFrame(true)');assert.notEqual(body,next);await route.fulfill({response:r,body:next});});
 return ctx;
}
async function settle(p){await p.clock.runFor(320);await p.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations===Infinity){a.pause();a.currentTime=0;}else a.finish();}});}
async function click(p,s){await p.locator(s).click();await settle(p);}
async function home(p,base){await p.goto(base,{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:31,bestLimitlessScore:123,bestTimeless:456,bestEndless:123})));await p.reload({waitUntil:'networkidle'});await p.clock.runFor(8000);await settle(p);}
async function read(p){return p.evaluate(()=>[...document.querySelectorAll('#app, #app *')].filter(e=>e.getClientRects().length&&!e.closest('.hidden')&&getComputedStyle(e).visibility!=='hidden').map(e=>{
 const c=getComputedStyle(e),r=e.getBoundingClientRect();return{id:e.id,classes:e.getAttribute('class')||'',tag:e.tagName,text:e.children.length?'':e.textContent.trim(),
 geometry:[r.x,r.y,r.width,r.height],type:[c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight,c.letterSpacing],
 paint:{color:c.color,background:c.backgroundColor,image:c.backgroundImage,border:c.borderColor,shadow:c.boxShadow,textShadow:c.textShadow,filter:c.filter}};
}));}
async function capture(p,side,name){await settle(p);const file=`${side}-${name}.png`;await p.screenshot({path:path.join(out,file)});const b=fs.readFileSync(path.join(out,file));assert.equal(b.readUInt32BE(16),780);assert.equal(b.readUInt32BE(20),1688);report.captures.push({file,sha256:hash(b)});report.metrics[side][name]=await read(p);}
async function start(p,base,mode){await home(p,base);await click(p,`#mode-${mode}`);await click(p,'#btn-intro-start');if(await p.locator('#lesson-intro').isVisible())await click(p,'#lesson-intro');}
async function accents(p){return p.evaluate(()=>{
 const fixture=document.createElement('div');fixture.style.display='none';fixture.innerHTML='<b class="score">123</b><span class="pop">10</span><button class="wood-btn danger">Restart</button><b class="record-value">456</b><div class="round-btn armed"></div><div class="selection-sum ready"><b class="sum-total">10</b></div><div class="selection-sum incorrect"><b class="sum-total">12</b></div><span class="time-penalty">-1</span><div class="intro-mark endless"></div><p class="panel-body"><span class="rule-num">10</span></p><dl class="intro-stats"><dd>123</dd></dl>';
 document.querySelector('#app').append(fixture);
 document.querySelector('#intro-mark').classList.remove('endless');
 const specs=[['.mode-name',['color']],['#btn-title-settings',['color']],['.picker-title',['color']],['.run-title',['color']],['.icon-btn',['color']],['.intro-title',['color']],['#intro-mark',['color','backgroundImage','boxShadow']],['.intro-mark.endless',['backgroundImage']],['#intro-mark-art',['filter']],['.wood-btn',['color','backgroundImage','boxShadow','textShadow','borderColor']],['.wood-btn.ghost',['color','backgroundImage','boxShadow']],['.wood-btn.danger',['color','backgroundImage','boxShadow']],['.score',['color','textShadow']],['.pop',['color','textShadow']],['.run-stat-value',['color']],['.intro-stats dd',['color']],['.record-value',['color']],['.panel-title',['color','textShadow']],['.panel-body .rule-num',['color']],['.timer-bar span',['backgroundImage']],['.round-btn',['color','backgroundImage','boxShadow']],['#btn-split',['backgroundImage']],['#btn-undo',['backgroundImage']],['.round-btn .glyph',['filter']],['.badge',['backgroundColor']],['.round-btn.armed',['borderColor','boxShadow']],['.selection-sum.ready .sum-total',['color']],['.selection-sum.incorrect',['borderColor','borderStyle']],['.selection-sum.incorrect .sum-total',['color']],['.time-penalty',['color']],['.cheer-word',['color','textShadow']],['.cheer-score',['color','textShadow']]];
 document.querySelector('#switch-sound').setAttribute('aria-checked','true');specs.push(['#switch-sound',['backgroundImage']],['.switch-knob',['backgroundImage','boxShadow']]);
 document.querySelector('#timer-bar').classList.remove('urgent');
 const result=Object.fromEntries(specs.map(([s,props])=>{const e=document.querySelector(s);if(!e)return[s,null];const c=getComputedStyle(e);return[s,Object.fromEntries(props.map(k=>[k,c[k]]))];}));
 document.querySelector('#timer-bar').classList.add('urgent');result.urgent={image:getComputedStyle(document.querySelector('#timer-fill')).backgroundImage};fixture.remove();return result;
});}
try{
 const bases={};for(const [side,source]of Object.entries(sources)){const server=await createServer({root:source,configFile:false,cacheDir:path.join(sources.before,`cache-${side}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();servers.push(server);bases[side]=server.resolvedUrls.local[0];}
 const accentStyles={};report.accentStyles=accentStyles;
 for(const side of ['before','after','original']){
  const ctx=await context(),p=await ctx.newPage();p.setDefaultTimeout(12000);p.on('pageerror',e=>report.errors.push({side,error:String(e)}));
  await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));
  try{
   await home(p,bases[side]);
   if(side==='original'){accentStyles.original=await accents(p);continue;}
   await capture(p,side,'home');await click(p,'#btn-title-settings');await capture(p,side,'settings-off');
   await click(p,'#switch-sound');await click(p,'#switch-haptics');await capture(p,side,'settings-on');
   for(const [mode,name]of [['timeAttack','limitless'],['timeless','timeless'],['endless','endless']]){
    await home(p,bases[side]);await click(p,`#mode-${mode}`);await capture(p,side,`${name}-start`);await click(p,'#btn-intro-start');if(await p.locator('#lesson-intro').isVisible())await click(p,'#lesson-intro');await capture(p,side,name);
    if(name==='limitless'){
     await click(p,'#btn-pause');await capture(p,side,'pause');
     await p.evaluate(()=>{document.querySelector('#overlay').classList.add('hidden');document.querySelector('#timer-bar').classList.add('urgent');document.querySelector('#stat-a-value').textContent='00:05';document.querySelector('#time-penalty').style.opacity='1';});await capture(p,side,'urgent-penalty-fixture');
    }
   }
   // Pause the actual clock before controlled equation/result layout fixtures.
   await click(p,'#btn-pause');await p.evaluate(()=>document.querySelector('#overlay').classList.add('hidden'));
   for(const [correct,values,name]of [[true,[1,9],'equation-correct-fixture'],[false,[9,3],'equation-incorrect-fixture']]){
    await p.evaluate(async({correct,values})=>{const {Hud}=await import('/src/ui/screens/hud.ts');new Hud().showEquation(values,correct,[1,7]);},{correct,values});await capture(p,side,name);
   }
   await p.evaluate(async()=>{const {Overlay}=await import('/src/ui/screens/overlay.ts');new Overlay(()=>{}).open({title:'Board cleared',body:'Time 01:20\nScore 456\nBest 456',primary:{label:'Play again',action:()=>{}},secondary:{label:'Menu',action:()=>{}}});});await capture(p,side,'result-fixture');
   await p.evaluate(async()=>{document.querySelector('#overlay').classList.add('hidden');const {Cheer}=await import('/src/ui/screens/cheer.ts');window.testCheer=new Cheer();window.testCheer.play('BOARD CLEARED',456,()=>{},0,true,1000000);});await capture(p,side,'cheer-score-fixture');
   await p.evaluate(()=>{document.querySelector('#cheer-card').classList.add('hidden');document.querySelector('#cheer-clip').classList.add('hidden');});await capture(p,side,'cheer-word-fixture');
   accentStyles[side]=await accents(p);
  }finally{await ctx.close();}
 }
 report.elementsChecked=0;report.neutralBoxesChecked=0;report.gameplayChecked=0;
 for(const [name,before]of Object.entries(report.metrics.before)){
  const after=report.metrics.after[name];assert.equal(after.length,before.length,`${name} node count`);
  for(let i=0;i<before.length;i++){
   const b=before[i],a=after[i];assert.equal(a.id,b.id);assert.equal(a.classes,b.classes);assert.equal(a.text,b.text,`${name} text`);assert.deepEqual(a.type,b.type,`${name} typography ${b.id||b.classes}`);
   a.geometry.forEach((v,k)=>assert(Math.abs(v-b.geometry[k])<.1,`${name} geometry ${b.id||b.classes}`));report.elementsChecked++;
   if(/(^| )(mode-btn|icon-btn|run-stat|selection-sum|panel|switch-row|chip)( |$)/.test(b.classes)){
    assert.equal(a.paint.background,b.paint.background,`${name} neutral surface ${b.classes}`);assert.equal(a.paint.image,b.paint.image);assert.equal(a.paint.shadow,b.paint.shadow);report.neutralBoxesChecked++;
   }
   if(/(^| )(tile|sum-term)( |$)/.test(b.classes)){assert.deepEqual(a.paint,b.paint,`${name} gameplay ${b.classes}`);report.gameplayChecked++;}
  }
 }
 for(const [s,b]of Object.entries(accentStyles.original)){assert(b,`missing original selector ${s}`);assert.deepEqual(accentStyles.after[s],b,`${s} original accent paint`);report.originalAccents.push({selector:s,properties:b});}
 for(const side of ['before','after']){
  const ctx=await context(true),p=await ctx.newPage();await p.clock.install({time:new Date(report.conditions.clock)});await p.clock.pauseAt(new Date(report.conditions.clock));await home(p,bases[side]);
  for(const size of [{width:390,height:844},{width:320,height:700},{width:480,height:1000}]){
   await p.setViewportSize(size);
   // Browser resize delivery uses a real rendering cycle, while the app clock
   // is paused. Yield one paint, then explicitly deliver the resize before RAF.
   await new Promise(resolve=>setTimeout(resolve,60));
   await p.evaluate(()=>{for(const [edge,v]of Object.entries({top:24,bottom:48,left:0,right:0}))document.documentElement.style.setProperty(`--android-game-inset-${edge}`,`${v}px`);window.dispatchEvent(new Event('resize'));});await settle(p);
   const data=await p.evaluate(()=>{const a=document.querySelector('#app'),r=a.getBoundingClientRect(),s=r.width/390;return{logical:[a.clientWidth,a.clientHeight],ratio:r.height/r.width,scale:s,
    items:[...document.querySelectorAll('.mode-btn,.mode-name,#btn-title-settings,.brand-mark')].map(e=>{const b=e.getBoundingClientRect(),c=getComputedStyle(e);return{geometry:[(b.x-r.x)/s,(b.y-r.y)/s,b.width/s,b.height/s],type:[c.fontSize,c.fontWeight,c.fontFamily]};})};});
   const expectedScale=Math.min(size.width/390,(size.height-24-48)/844);
   assert.deepEqual(data.logical,[390,844]);assert(Math.abs(data.ratio-844/390)<.001);assert(Math.abs(data.scale-expectedScale)<.000001,'frame actually refitted to requested viewport');report.frameChecks.push({side,size,expectedScale,...data});
  }await ctx.close();
 }
 report.maxNativeLayoutDeltaCssPx=0;
 for(let i=0;i<3;i++){
  const b=report.frameChecks[i],a=report.frameChecks[i+3];assert.equal(a.items.length,b.items.length);
  for(let j=0;j<b.items.length;j++){
   assert.deepEqual(a.items[j].type,b.items[j].type,'native frame typography unchanged');
   a.items[j].geometry.forEach((v,k)=>{const delta=Math.abs(v-b.items[j].geometry[k]);report.maxNativeLayoutDeltaCssPx=Math.max(report.maxNativeLayoutDeltaCssPx,delta);assert(delta<.1,'native frame layout unchanged (0.1 CSS px tolerance)');});
  }
  assert(Math.abs(a.scale-b.scale)<.000001,'native frame scale unchanged');
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.failure=String(e);throw e;}
finally{
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 await Promise.all(servers.map(s=>s.close()));await browser.close();
 console.log(JSON.stringify({out,pass:report.pass,captures:report.captures.length,elements:report.elementsChecked,boxes:report.neutralBoxesChecked,gameplay:report.gameplayChecked,accents:report.originalAccents.length,failure:report.failure}));
}
