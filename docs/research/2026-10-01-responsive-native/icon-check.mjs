// Mechanical asset verification/launcher-mask preview, not AI artwork editing.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {default:sharp}=await import(process.env.SHARP_MODULE||'sharp');
const out=process.env.CAPTURE_OUT;assert(out&&!fs.existsSync(out),'New output only');fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const source=fs.readFileSync('store/icon-source.png'),metadata=await sharp(source).metadata();
assert.equal(hash(source),'a2ffb3c0936d89cc020fd3014c6321e61c7c0bc0b7af1407aad8c8bfaf6201e0');
const report={sourceSha256:hash(source),sourceSize:[metadata.width,metadata.height],background:'#ea5836',files:[],previews:[],note:'The supplied 2134×2135 export is contained, never stretched/cropped; launcher masks are OS previews.'};
for(const[d,s]of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]])for(const[file,size]of [['ic_launcher.png',48*s],['ic_launcher_round.png',48*s],['ic_launcher_foreground.png',108*s]]){
 const p=`android/app/src/main/res/mipmap-${d}/${file}`,b=fs.readFileSync(p),m=await sharp(b).metadata();assert.equal(m.width,size);assert.equal(m.height,size);report.files.push({file:p,size,sha256:hash(b)});
}
const play=fs.readFileSync('store/play-icon-512.png'),p=await sharp(play).metadata();assert.equal(p.width,512);assert.equal(p.height,512);
assert(fs.readFileSync('android/app/src/main/res/values/ic_launcher_background.xml','utf8').includes('#EA5836'));
fs.writeFileSync(path.join(out,'before-icon.png'),execFileSync('git',['show','02cd27c:store/play-icon-512.png']));
fs.copyFileSync('store/play-icon-512.png',path.join(out,'after-icon.png'));
// Android's 72dp viewport within the adaptive 108dp layer, with the original
// 60dp content safe square unchanged. Show common masks at 288px.
const layer=await sharp('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png').flatten({background:'#ea5836'}).extract({left:72,top:72,width:288,height:288}).png().toBuffer();
for(const[name,shape]of [['circle','<circle cx="144" cy="144" r="144" fill="white"/>'],['rounded-square','<rect width="288" height="288" rx="56" fill="white"/>']]){
 const mask=Buffer.from(`<svg width="288" height="288">${shape}</svg>`);const b=await sharp(layer).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer(),file=`launcher-${name}.png`;fs.writeFileSync(path.join(out,file),b);report.previews.push({file,sha256:hash(b)});
}
report.pass=true;fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
