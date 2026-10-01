// Resource generation only. Resizes the supplied artwork; never crops or redraws it.
// SHARP_MODULE may point to a locally installed sharp module (not a runtime dependency).
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const { default: sharp } = await import(process.env.SHARP_MODULE || 'sharp');
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'store/icon-source.png');
const input = readFileSync(source);
const metadata = await sharp(input).metadata();
assert.equal(metadata.width, metadata.height, 'Original icon must be square');
const outputs = [];
async function save(path, bytes) {
  path = resolve(root, path);
  writeFileSync(path, bytes);
  outputs.push({ path: path.slice(root.length + 1), sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function artwork(canvasSize, contentSize, transparent) {
  const content = await sharp(input).resize(contentSize, contentSize, { fit: 'contain', kernel: 'lanczos3' }).toColourspace('srgb').png().toBuffer();
  const inset = Math.round((canvasSize - contentSize) / 2);
  return sharp({ create: { width: canvasSize, height: canvasSize, channels: 4,
    background: transparent ? {r:255,g:255,b:255,alpha:0} : '#ffffff' } })
    .composite([{ input: content, left: inset, top: inset }]).png().toBuffer();
}
for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
  const folder = `android/app/src/main/res/mipmap-${density}`;
  mkdirSync(resolve(root, folder), { recursive:true });
  // Adaptive: 108dp layer; 60dp unmodified square artwork, centred on white.
  await save(`${folder}/ic_launcher_foreground.png`, await artwork(108*scale,60*scale,true));
  // Legacy 48dp preview mirrors the 72dp adaptive viewport.
  const size = 48*scale;
  const legacy = await artwork(size,40*scale,false);
  await save(`${folder}/ic_launcher.png`, legacy);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
  await save(`${folder}/ic_launcher_round.png`, await sharp(legacy).composite([{input:mask,blend:'dest-in'}]).png().toBuffer());
}
await save('store/play-icon-512.png',await sharp(input).resize(512,512).flatten({background:'#ffffff'}).toColourspace('srgb').png().toBuffer());
console.log(JSON.stringify({ source:'store/icon-source.png', sourceSize:[metadata.width,metadata.height],
  sourceSha256:createHash('sha256').update(input).digest('hex'), adaptiveContentDp:60,adaptiveLayerDp:108,outputs },null,2));
