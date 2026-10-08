// Release audit only; not imported or shipped by the game.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../..');
const release = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'verification.json')));
const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/releases/2026-10-02-logo-settings-aab/verification.json')));
const bundle = path.join(root, release.artifact);
const previousBundle = path.join(root, baseline.artifact);
const run = (command, args) => execFileSync(command, args, { cwd: root, maxBuffer: 128 * 1024 * 1024 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(fs.readFileSync(bundle)), release.sha256);
assert.equal(hash(fs.readFileSync(previousBundle)), baseline.sha256);
assert.equal(release.versionName, '1.0.8');
assert.equal(release.versionCode, 10);
assert.equal(release.applicationId, baseline.applicationId);
assert.equal(release.uploadCertificateSha256, baseline.uploadCertificateSha256);
assert.equal(release.minSdk, 24);
assert.equal(release.targetSdk, 36);

const java = path.join(root, '.android-tools/jdk/Contents/Home/bin/java');
const tool = path.join(root, '.android-tools/downloads/bundletool-all-1.18.3.jar');
const labels = {};
for (const name of ['app_name', 'title_activity_main']) {
  const dump = run(java, ['-jar', tool, 'dump', 'resources', `--bundle=${bundle}`, `--resource=string/${name}`, '--values']).toString();
  assert(dump.includes('[STR] "TAPtoTEN"') && !dump.includes('TAP to TEN'));
  labels[name] = dump.trim();
}
const entries = run('unzip', ['-Z1', bundle]).toString().trim().split('\n');
const icons = entries.filter(entry => /^base\/res\/mipmap-.+\/ic_launcher(?:_foreground|_round)?\.png$/.test(entry));
assert.equal(icons.length, 15);
for (const entry of icons) {
  assert.equal(hash(run('unzip', ['-p', bundle, entry])), hash(run('unzip', ['-p', previousBundle, entry])), entry);
}
const preserved = ['src/ui/storage.ts', 'src/ui/persistentStore.ts', 'src/core/rules.ts',
  'android/app/src/main/java/io/github/junyyyong/makezero/MainActivity.java'];
for (const file of preserved) {
  assert.equal(hash(run('git', ['show', `f68c7a8:${file}`])), hash(fs.readFileSync(path.join(root, file))), file);
}
const css = release.bundledAssets.find(asset => /^assets\/index-.+\.css$/.test(asset.path));
assert(css);
assert(baseline.bundledAssets.some(asset => asset.path === css.path && asset.sha256 === css.sha256));
const js = release.bundledAssets.find(asset => /^assets\/index-.+\.js$/.test(asset.path));
assert(js);
assert(run('unzip', ['-p', bundle, `base/assets/public/${js.path}`]).toString().includes('limitlessCombo'));
const browser = JSON.parse(fs.readFileSync(path.join(root, 'docs/research/2026-10-08-limitless-combo/run-2/verification.json')));
assert.equal(browser.pass, true);
const output = path.join(import.meta.dirname, 'update-verification.json');
fs.writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), pass: true,
  artifact: release.artifact, baselineArtifact: baseline.artifact, applicationIdAndCertificateUnchanged: true,
  labels, unchangedLauncherIcons: icons, unchangedSources: preserved, unchangedCss: css,
  comboCodeBundled: true, priorBrowserVerification: 'docs/research/2026-10-08-limitless-combo/run-2/verification.json',
  physicalDeviceAndPlayUpdate: 'NOT RUN' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ pass: true, samePackageAndKey: true, unchangedIcons: icons.length,
  unchangedStorageAndNativeActivity: true, unchangedCss: true, comboCodeBundled: true, output }, null, 2));
