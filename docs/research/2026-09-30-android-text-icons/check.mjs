// Replays the previous commit separately. Standard browser captures do not
// reproduce Android's fontScale; the native policy is tested separately.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd(), out=process.env.CAPTURE_OUT || import.meta.dirname;
assert(!fs.existsSync(path.join(out,'verification.json')),'Choose a new output directory; preserve original evidence.');
fs.mkdirSync(out,{recursive:true});
const revision='cae2e49b5af230a95b2f1890daf01b47b321b621';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-text-icons-before-'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=['android/app/src/main/java/io/github/junyyyong/makezero/MainActivity.java','android/app/src/main/AndroidManifest.xml',
  'android/app/build.gradle','src/ui/styles/tokens.css','store/icon-source.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png','store/play-icon-512.png'];
const sourceHashes=Object.fromEntries(paths.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]));
const captures=[],errors=[],metrics={};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
async function shot(page,name){
  await page.evaluate(async()=>{await document.fonts.ready;for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});
  const file=path.join(out,`${name}.png`);assert(!fs.existsSync(file));await page.screenshot({path:file});
  const bytes=fs.readFileSync(file);assert.equal(bytes.readUInt32BE(16),780);assert.equal(bytes.readUInt32BE(20),1688);
  captures.push({file:path.basename(file),sha256:sha(bytes)});
}
const image=path=>'data:image/png;base64,'+fs.readFileSync(path).toString('base64');
try{
  execFileSync('tar',['-xf','-','-C',temp],{input:execFileSync('git',['archive',revision],{maxBuffer:512*1024*1024})});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(temp,'node_modules'),'dir');
  for(const side of ['before','after']){
    const sideRoot=side==='before'?temp:root;
    const server=await createServer({root:sideRoot,configFile:false,cacheDir:path.join(temp,`cache-${side}`),server:{host:'127.0.0.1',port:0},logLevel:'error'});
    await server.listen();
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'en-US',timezoneId:'Asia/Seoul'});
    try{
      await context.addInitScript(()=>{
        if(window!==window.top || location.hostname!=='127.0.0.1')return;
        localStorage.setItem('makezero.settings.v1',JSON.stringify({musicOn:false,soundOn:false,hapticsOn:false}));
        localStorage.setItem('makezero.progress.v1',JSON.stringify({learningStage:10,bestEndless:123,bestTimeless:456}));
        let seed=20260930;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      });
      const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(String(error)));
      await page.clock.install({time:new Date('2026-09-30T00:00:00Z')});await page.clock.pauseAt(new Date('2026-09-30T00:00:01Z'));
      await page.goto(server.resolvedUrls.local[0],{waitUntil:'networkidle'});await page.clock.runFor(8000);
      await page.locator('#screen-title').waitFor({state:'visible'});await shot(page,`${side}-title`);
      metrics[side]={title:await page.locator('.mode-name').first().evaluate(e=>({font:getComputedStyle(e).fontSize,width:e.getBoundingClientRect().width})),
        textSizeAdjust:await page.locator('html').evaluate(e=>getComputedStyle(e).getPropertyValue('text-size-adjust'))};
      await page.locator('#mode-timeAttack').click();await page.clock.runFor(300);
      await page.locator('#btn-intro-start').click();await page.clock.runFor(500);
      assert.equal(await page.locator('#board .tile').count(),9);
      const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('makezero.progress.v1')));
      assert.equal(progress.learningStage,10);assert.equal(progress.bestEndless,123);assert.equal(progress.bestTimeless,456);
      await shot(page,`${side}-stage10`);
      // Component fixture: explicitly selects the highest grade, not a claimed
      // completed run or a reconstruction of the user's enlarged-font phone.
      await page.evaluate(async()=>{
        const {Cheer}=await import('/src/ui/screens/cheer.ts');
        window.researchCheer=new Cheer();window.researchCheer.setSound(false);
        window.researchCheer.play('FIXTURE',0,()=>{},0,true,0);
      });
      await page.clock.runFor(1000);await shot(page,`${side}-cheer-fixture`);
      metrics[side].cheer=await page.locator('#cheer-word').evaluate(e=>{
        const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();
        return {text:e.textContent,font:getComputedStyle(e).fontSize,left:r.left,right:r.right,viewport:innerWidth};
      });
      assert(metrics[side].cheer.left>=-1 && metrics[side].cheer.right<=391,'Default text fits');
      // Honest preview of packaged icon layers. Not a launcher/device screenshot.
      const fg=image(path.join(sideRoot,'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png'));
      const legacy=image(path.join(sideRoot,'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png'));
      await page.goto('about:blank');
      await page.setContent(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
        *{box-sizing:border-box}body{margin:0;background:#f7f5f0;font:16px system-ui;color:#292524;padding:32px 26px}
        h1{font-size:24px;margin:0 0 12px}p{line-height:1.55;margin:0 0 26px}.row{display:flex;gap:38px;margin:16px 0 30px}
        .mask{width:128px;height:128px;position:relative;overflow:hidden;background:${side==='before'?'#7A4F24':'#FFFFFF'}}
        .mask img{position:absolute;width:192px;height:192px;left:-32px;top:-32px}.circle{border-radius:50%}.round{border-radius:28%}
        small{display:block;margin-top:12px;font-size:13px}img.legacy{width:96px;height:96px}footer{margin-top:32px;font-size:13px;line-height:1.6;color:#57534e}
      </style></head><body><h1>TAPtoTEN · ${side.toUpperCase()}</h1><p>Android icon resource preview<br>Not an actual device screenshot</p>
      <div class="row"><div><div class="mask circle"><img src="${fg}"></div><small>Adaptive · circle</small></div>
      <div><div class="mask round"><img src="${fg}"></div><small>Adaptive · rounded</small></div></div>
      <img class="legacy" src="${legacy}"><small>Legacy · 48dp artwork</small>
      <footer>Same 390 × 844 CSS viewport / DPR 2.<br>Adaptive layer: 108dp, visible preview: 72dp.<br>Artwork ${side==='after'?'60dp, centred without source cropping.':'from the previous commit.'}<br><br>Phone launchers may apply different masks or themes.<br>Test the installed app on a real phone.</footer></body></html>`);
      await page.locator('img').first().evaluate(img=>img.decode());await shot(page,`${side}-icon-preview`);
    }finally{await context.close();await server.close();}
  }
  assert.deepEqual(metrics.before.title,metrics.after.title,'Default type dimensions must stay the same');
  assert.equal(metrics.after.textSizeAdjust,'100%');assert.deepEqual(errors,[]);
  const nativeTest=execFileSync('node',['tests/native/text-zoom-contract.mjs'],{cwd:root,encoding:'utf8'}).trim();
  const report={capturedAt:new Date().toISOString(),previousCommit:revision,previousCommitDate:execFileSync('git',['show','-s','--format=%cI',revision],{encoding:'utf8'}).trim(),
    currentBaseline:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,
    viewport:{width:390,height:844,dpr:2,png:[780,1688]},browser:browser.version(),locale:'en-US',timezone:'Asia/Seoul',clock:'2026-09-30T00:00:01Z',seed:20260930,
    profile:'fresh isolated context per side; same stage 10 and best-score fixture',metrics,captures,errors,nativeLifecycleUnitTest:nativeTest,
    notes:['Historical commit extracted with git archive, current sources never replaced. Current installed dependencies reused.',
      'Browser screenshots use normal text scaling; they do not prove Android fontScale/Easy Mode behavior.',
      'Cheer captures are a highest-grade (band 0) component fixture, not a real completed run. Icon previews are NOT Android launcher captures.',
      'Real Android installation, OEM Easy Mode and update preservation test NOT RUN. OS magnification/density is not blocked.']};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({captures:captures.length,metrics,nativeTest,errors},null,2));
}finally{await browser.close();}
