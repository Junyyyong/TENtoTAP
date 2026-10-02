// Resource generation only. Fill the launcher mask with the supplied artwork;
// crop the square's corners instead of adding a colored inset around the image.
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
assert(Math.abs(metadata.width - metadata.height) <= 1, 'Original icon must be square (one-pixel export rounding allowed)');
const outputs = [];
async function save(path, bytes) {
  path = resolve(root, path);
  writeFileSync(path, bytes);
  outputs.push({ path: path.slice(root.length + 1), sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function artwork(size) {
  // The supplied 2134×2135 export loses only the one-pixel square-rounding edge.
  return sharp(input).resize(size, size, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .toColourspace('srgb').png().toBuffer();
}
for (const [density, scale] of [['mdpi',1],['hdpi',1.5],['xhdpi',2],['xxhdpi',3],['xxxhdpi',4]]) {
  const folder = `android/app/src/main/res/mipmap-${density}`;
  mkdirSync(resolve(root, folder), { recursive:true });
  // Android's 72dp mask viewport gets the full square, without a colored rim.
  // The extra 18dp on each side of the 108dp animation layer copies image-edge
  // pixels only; it is not an approximated background color or a second image.
  const square = await artwork(72 * scale);
  const bleed = 18 * scale;
  await save(`${folder}/ic_launcher_foreground.png`, await sharp(square)
    .extend({ top: bleed, right: bleed, bottom: bleed, left: bleed, extendWith: 'copy' })
    .png().toBuffer());
  // Legacy and round use the identical edge-to-edge square composition.
  const size = 48*scale;
  const legacy = await artwork(size);
  await save(`${folder}/ic_launcher.png`, legacy);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`);
  await save(`${folder}/ic_launcher_round.png`, await sharp(legacy).composite([{input:mask,blend:'dest-in'}]).png().toBuffer());
}
await save('store/play-icon-512.png', await artwork(512));
console.log(JSON.stringify({ source:'store/icon-source.png', sourceSize:[metadata.width,metadata.height],
  sourceSha256:createHash('sha256').update(input).digest('hex'), fit:'cover', background:null,
  adaptiveContentDp:72, adaptiveLayerDp:108, bleed:'copy original image edges', outputs },null,2));
