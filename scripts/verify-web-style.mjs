// Runs the actual release web payload, not Vite source. Browser != Android device.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=path.resolve(import.meta.dirname,'..');
const dir=path.resolve(root,process.argv[2]);
const reportPath=path.join(dir,process.argv[3] || 'bundled-style-and-music-verification.json');
assert(!fs.existsSync(reportPath),'Do not overwrite evidence');
const release=JSON.parse(fs.readFileSync(path.join(dir,'verification.json')));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-style-bundle-'));
execFileSync('unzip',['-q',path.join(root,release.artifact),'base/assets/public/*','-d',tmp]);
const web=path.join(tmp,'base/assets/public');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
const server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name==='/')name='/index.html';const file=path.join(web,name);try{const bytes=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(bytes)}catch{res.writeHead(404);res.end()}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const cases=[],musicCases=[],insetCases=[],errors=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{if(location.hostname==='127.0.0.1')localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));});
 await page.clock.install();await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});await page.clock.runFor(8000);
 for(const height of [660,700,701,844,932]){
  await page.setViewportSize({width:390,height});await new Promise(resolve=>setTimeout(resolve,100));await page.clock.runFor(400);await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish()});
  const m=await page.evaluate(()=>{const read=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return{size:c.fontSize,weight:c.fontWeight,width:r.width,height:r.height}};return{height:innerHeight,logo:read('.brand-mark'),button:read('.mode-btn'),name:read('.mode-name'),desc:read('.mode-desc'),faces:Array.from(document.fonts).map(f=>({family:f.family,status:f.status}))}});
  assert.equal(m.logo.width,height<=700?215:250);assert.equal(m.button.height,height<=700?64:79);assert.equal(m.name.size,height<=700?'19px':'21px');assert.equal(m.name.weight,'800');assert.equal(m.desc.size,height<=700?'12px':'13px');assert.equal(m.desc.weight,'700');cases.push(m);
 }
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root:dom}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:dom.nodeId,selector:'.mode-name'});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert(fonts.length&&fonts.every(f=>!f.isCustomFont));assert.deepEqual(errors,[]);
 // Make the autoplay-blocked prompt visible as a layout fixture. This tests
 // the reserved slot, not a claim that browser autoplay actually failed.
 for(const [width,height]of [[320,568],[360,740],[390,660],[390,844]])for(const [top,bottom]of [[0,0],[24,48]]){
  await page.setViewportSize({width,height});await new Promise(resolve=>setTimeout(resolve,100));
  await page.evaluate(({top,bottom})=>{document.documentElement.style.setProperty('--safe-area-inset-top',`${top}px`);document.documentElement.style.setProperty('--safe-area-inset-bottom',`${bottom}px`);document.querySelector('.title-music-prompt').classList.remove('hidden')},{top,bottom});await page.clock.runFor(400);
  const rects=await page.evaluate(()=>['.mode-list','#btn-title-settings','.title-music-prompt'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return{selector:s,left:r.left,right:r.right,top:r.top,bottom:r.bottom}}));
  for(const r of rects)assert(r.left>=-1&&r.right<=width+1&&r.top>=top-1&&r.bottom<=height-bottom+1,JSON.stringify({width,height,top,bottom,r}));
  musicCases.push({width,height,top,bottom,rects});
 }
 await page.setViewportSize({width:390,height:844});await new Promise(resolve=>setTimeout(resolve,100));
 for(const [envTop,envBottom,nativeTop,nativeBottom]of [[0,0,null,null],[24,48,null,null],[0,0,24,48],[24,48,24,48],[24,48,0,0],[24,48,10,20]]){
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:envTop,bottom:envBottom,left:0,right:0}});
  await page.evaluate(({nativeTop,nativeBottom})=>{for(const [edge,value]of [['top',nativeTop],['bottom',nativeBottom]]){const key=`--safe-area-inset-${edge}`;if(value===null)document.documentElement.style.removeProperty(key);else document.documentElement.style.setProperty(key,`${value}px`)}},{nativeTop,nativeBottom});await page.clock.runFor(200);
  const padding=await page.locator('.title-screen').evaluate(e=>{const s=getComputedStyle(e);return{top:parseFloat(s.paddingTop),bottom:parseFloat(s.paddingBottom)}});
  const expected={top:Math.max(844*.03,16)+(nativeTop??envTop),bottom:Math.max(844*.025,14)+(nativeBottom??envBottom)};
  assert(Math.abs(padding.top-expected.top)<.1&&Math.abs(padding.bottom-expected.bottom)<.1,JSON.stringify({padding,expected}));
  insetCases.push({envTop,envBottom,nativeTop,nativeBottom,padding,expected});
 }
 assert.deepEqual(errors,[]);
 const report={verifiedAt:new Date().toISOString(),artifact:release.artifact,sha256:createHash('sha256').update(fs.readFileSync(path.join(root,release.artifact))).digest('hex'),cases,musicCases,insetCases,fonts,errors,limitations:'Extracted AAB assets in macOS Chrome, not a physical Android device. Music prompt manually made visible; env() and native CSS insets simulated. OEM font/bold/density settings and Play update not tested.'};
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({artifact:release.artifact,viewportCases:cases.length,musicCases:musicCases.length,insetCases:insetCases.length,fonts,errors,reportPath},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
