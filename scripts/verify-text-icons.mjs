// Verifies the actual signed bundle, not just source files. No signing secrets needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {default:sharp}=await import(process.env.SHARP_MODULE || 'sharp');
const root=path.resolve(import.meta.dirname,'..');
const reportDir=path.resolve(root,process.argv[2] || 'docs/releases/2026-09-30-text-icons-aab');
const output=path.join(reportDir,'text-icons-verification.json');assert(!fs.existsSync(output),'Preserve existing verification');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/releases/2026-09-29-contact-aab/verification.json')));
const release=JSON.parse(fs.readFileSync(path.join(reportDir,'verification.json')));
assert.equal(release.applicationId,baseline.applicationId);assert.equal(release.uploadCertificateSha256,baseline.uploadCertificateSha256);
assert.equal(release.minSdk,24);assert.equal(release.targetSdk,36);assert(release.versionCode>baseline.versionCode);
const bundle=path.resolve(root,release.artifact),sha=b=>createHash('sha256').update(b).digest('hex');
const entries=execFileSync('unzip',['-Z1',bundle],{encoding:'utf8'}).trim().split('\n');
const icons=[];
for(const entry of entries.filter(e=>/base\/res\/mipmap-.+\/ic_launcher(?:_foreground|_round)?\.png$/.test(e))){
  const source=entry.replace(/^base\/res\//,'android/app/src/main/res/').replace(/-v4\//,'/');
  const actual=execFileSync('unzip',['-p',bundle,entry]);const expected=fs.readFileSync(path.join(root,source));
  const pixels=async bytes=>sharp(bytes).flatten({background:'#fff'}).toColourspace('srgb').raw().toBuffer();
  assert.equal(sha(await pixels(actual)),sha(await pixels(expected)),`Packaged icon differs: ${entry}`);
  icons.push({entry,source,packagedSha256:sha(actual),sourceSha256:sha(expected),visiblePixelsMatch:true});
}
assert.equal(icons.length,15);
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-dex-audit-'));
const dex=path.join(temp,'classes.dex');fs.writeFileSync(dex,execFileSync('unzip',['-p',bundle,'base/dex/classes.dex'],{maxBuffer:32*1024*1024}));
const dump=execFileSync(path.join(root,'.android-tools/sdk/build-tools/35.0.0/dexdump'),['-d',dex],{encoding:'utf8',maxBuffer:128*1024*1024});
const main=dump.split(/\nClass #\d+\s+-/).find(section=>/Class descriptor\s+: 'Lio\/github\/junyyyong\/makezero\/MainActivity;'/.test(section));
assert(main,'MainActivity missing from dex');
for(const method of ['applyTextZoom','onCreate','onResume','onConfigurationChanged'])assert(main.includes(method),`${method} missing from dex`);
assert(main.includes('setTextZoom'));assert(/#int 100|#100|0x0064/.test(main),'100 percent constant missing');
const manifest=fs.readFileSync(path.join(reportDir,'manifest.xml'),'utf8');
const config=manifest.match(/android:configChanges="([^"]+)"/)?.[1];
assert(config && (/fontScale/.test(config) || (Number(config)&0x40000000)!==0),'fontScale config flag absent');
const preservedFiles=['src/ui/storage.ts','src/ui/persistentStore.ts','src/core/game.ts','src/core/rules.ts'];
for(const file of preservedFiles){const old=execFileSync('git',['show',`cae2e49:${file}`],{cwd:root});assert.equal(sha(old),sha(fs.readFileSync(path.join(root,file))),`${file} changed`);}
const report={verifiedAt:new Date().toISOString(),artifact:release.artifact,sha256:sha(fs.readFileSync(bundle)),
  sameApplicationIdAndCertificate:true,minSdk:24,targetSdk:36,versionCodeIncreased:true,
  icons,dexContainsLifecycleTextZoom100:true,fontScaleConfigChanges:config,unchangedGameAndSaveSources:preservedFiles,
  realDeviceTest:'NOT RUN; dex inspection and JVM lifecycle doubles are not a phone/WebView test'};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({iconsMatched:icons.length,compiledTextZoom100:true,sameSigningCertificate:true,output},null,2));
