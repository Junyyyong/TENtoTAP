// Validate the delivery galleries, not the game runtime.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=process.env.QA_OUT;assert(out&&!fs.existsSync(out));
const game=JSON.parse(fs.readFileSync('docs/research/2026-10-01-responsive-native/final-2/verification.json','utf8'));assert.equal(game.pass,true);
const server=await createServer({root:process.cwd(),server:{host:'127.0.0.1',port:0},logLevel:'error'});await server.listen();
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),p=await browser.newPage({viewport:{width:1280,height:900}});
const report={pass:false,comparison:{},store:{}};
try{
 await p.goto(`${server.resolvedUrls.local[0]}docs/research/2026-10-01-responsive-native/index.html`);await p.locator('#screens .card').last().waitFor();
 assert.equal(await p.locator('#screens .card').count(),31);report.comparison.images=await p.locator('#screens img').evaluateAll(async es=>Promise.all(es.map(async e=>{await e.decode();return{src:new URL(e.src).pathname,width:e.naturalWidth,height:e.naturalHeight};})));
 assert.equal(report.comparison.images.length,62);for(const i of report.comparison.images){assert.equal(i.width,780);assert.equal(i.height,1688);}
 await p.locator('#after').click();assert(await p.locator('#screens').evaluate(e=>e.classList.contains('after-only')));await p.locator('#key').click();assert.equal(await p.locator('#screens .card:not(.hidden)').count(),12);await p.locator('#both').click();await p.locator('#all').click();assert.equal(await p.locator('#screens .card:not(.hidden)').count(),31);report.comparison.controls=true;
 await p.goto(`${server.resolvedUrls.local[0]}store/2026-10-01-responsive/index.html`);report.store.images=await p.locator('.grid img').evaluateAll(async es=>Promise.all(es.map(async e=>{await e.decode();return{src:new URL(e.src).pathname,width:e.naturalWidth,height:e.naturalHeight};})));
 assert.equal(report.store.images.length,7);for(const i of report.store.images){assert.equal(i.width,1080);assert.equal(i.height,1920);}
 const download=await p.locator('a[download]').all();assert.equal(download.length,9);report.store.downloads=[];for(const a of download){const href=await a.evaluate(e=>e.href);const response=await p.request.get(href);assert(response.ok(),href);report.store.downloads.push(new URL(href).pathname);}
 report.pass=true;
}catch(e){report.failure=String(e);throw e;}
finally{fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});await browser.close();await server.close();console.log(JSON.stringify({pass:report.pass,comparisonImages:report.comparison.images?.length,storeImages:report.store.images?.length,failure:report.failure}));}
