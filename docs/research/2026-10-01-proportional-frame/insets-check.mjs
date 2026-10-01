// Research only: Chromium env() / Capacitor inset / native-overlap combinations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.CAPTURE_OUT;assert(out&&!fs.existsSync(out),'New evidence directory required');fs.mkdirSync(out,{recursive:true});
const server=await createServer({root:process.cwd(),configFile:false,server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const report={verifiedAt:new Date().toISOString(),browser:browser.version(),kind:'macOS Chromium simulation, NOT Android device',cases:[],errors:[]};
try{
 for(const resizeObserver of [true,false]){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  if(!resizeObserver)await ctx.addInitScript(()=>{window.ResizeObserver=undefined;});
  const p=await ctx.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  const base=server.resolvedUrls.local[0];await p.route(base,async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<script type="module" src="/src/main.ts"></script>','<script type="module">import "/src/ui/styles/index.css";import {trackViewport} from "/src/ui/viewport.ts";import {trackNativeFrame} from "/src/ui/nativeFrame.ts";trackViewport();trackNativeFrame(true);</script>')});});
  await p.goto(base,{waitUntil:'networkidle'});await p.evaluate(()=>{for(const e of document.querySelectorAll('.screen'))e.classList.add('hidden');document.querySelector('#screen-title').classList.remove('hidden');document.querySelector('#btn-title-music').classList.remove('hidden');});
  const cdp=await ctx.newCDPSession(p);
  for(const c of [
   {env:[0,0],cap:null,overlap:null,expected:[0,0]},
   {env:[24,48],cap:null,overlap:null,expected:[24,48]},
   {env:[24,48],cap:[24,48],overlap:[24,48],expected:[24,48]},
   {env:[24,48],cap:[24,48],overlap:[0,0],expected:[0,0]},
   {env:[24,48],cap:[24,48],overlap:[10,20],expected:[10,20]},
   {env:[24,48],cap:[0,0],overlap:null,expected:[0,0]},
  ]){
   await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:c.env[0],bottom:c.env[1],left:0,right:0}});
   await p.evaluate(c=>{for(const [i,side]of ['top','bottom'].entries())for(const [key,values]of [[`--safe-area-inset-${side}`,c.cap],[`--android-game-inset-${side}`,c.overlap]]){if(values===null)document.documentElement.style.removeProperty(key);else document.documentElement.style.setProperty(key,`${values[i]}px`);}},c);
   // env() values may update without a style attribute mutation: visual/window
   // resize is the event delivered when the native viewport actually changes.
   await p.evaluate(()=>window.dispatchEvent(new Event('resize')));await p.waitForTimeout(120);
   const result=await p.evaluate(()=>{const app=document.querySelector('#app'),a=app.getBoundingClientRect(),r=document.querySelector('#btn-title-music').getBoundingClientRect(),s=getComputedStyle(document.querySelector('#screen-title'));return{frame:{x:a.x,y:a.y,width:a.width,height:a.height},prompt:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},padding:{top:parseFloat(s.paddingTop),bottom:parseFloat(s.paddingBottom)}};});
   const scale=(844-c.expected[0]-c.expected[1])/844;
   assert(Math.abs(result.frame.y-c.expected[0])<.1);assert(Math.abs(result.frame.height-844*scale)<.1);
   assert(Math.abs(result.frame.width-390*scale)<.1);assert(Math.abs(result.padding.top-25.32)<.02);assert(Math.abs(result.padding.bottom-21.1)<.02);
   assert(result.prompt.x>=result.frame.x-.1&&result.prompt.right<=result.frame.x+result.frame.width+.1&&result.prompt.bottom<=result.frame.y+result.frame.height+.1);
   report.cases.push({resizeObserver,...c,result});
  }
  await p.evaluate(()=>{window.rootMutations=0;new MutationObserver(()=>window.rootMutations++).observe(document.documentElement,{attributes:true,attributeFilter:['style']});document.documentElement.style.setProperty('--android-game-inset-top','13px');});
  await p.waitForTimeout(120);const mutations=await p.evaluate(()=>window.rootMutations);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>window.rootMutations),mutations,'no root-style feedback loop');
  await cdp.detach();await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.pass=false;report.failure=String(error);throw error;}
finally{fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();console.log(JSON.stringify({out,cases:report.cases.length,pass:report.pass,failure:report.failure}));}
