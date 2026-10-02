// Release audit only; not imported or shipped by the game.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '../../..');
const reportDir = import.meta.dirname;
const release = JSON.parse(fs.readFileSync(path.join(reportDir, 'verification.json')));
const bundle = path.join(root, release.artifact);
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const java = path.join(root, '.android-tools/jdk/Contents/Home/bin/java');
const tool = path.join(root, '.android-tools/downloads/bundletool-all-1.18.3.jar');
assert.equal(release.versionName, '1.0.7');
assert.equal(release.versionCode, 9);
const labels = {};
for (const name of ['app_name', 'title_activity_main']) {
  const dump = run(java, ['-jar', tool, 'dump', 'resources', `--bundle=${bundle}`, `--resource=string/${name}`, '--values']);
  assert(dump.includes('[STR] "TAPtoTEN"') && !dump.includes('TAP to TEN'));
  assert(fs.readFileSync(path.join(reportDir, 'manifest.xml'), 'utf8').includes(`android:label="@string/${name}"`));
  labels[name] = dump.trim();
}
const config = JSON.parse(run('unzip', ['-p', bundle, 'base/assets/capacitor.config.json']));
assert.equal(config.appName, 'TAPtoTEN');
const html = run('unzip', ['-p', bundle, 'base/assets/public/index.html']);
assert(html.includes('<title>TAPtoTEN</title>'));
assert(!html.includes('switch-haptics') && !html.includes('settings-note'));
for (const name of ['music', 'sound']) assert(html.includes(`id="switch-${name}"`));
const jsPath = release.bundledAssets.find(a => /^assets\/index-.+\.js$/.test(a.path)).path;
assert(run('unzip', ['-p', bundle, `base/assets/public/${jsPath}`]).includes('setHaptics(!1)'));
const hash = b => createHash('sha256').update(b).digest('hex');
const preserved = ['src/ui/storage.ts', 'src/ui/persistentStore.ts', 'src/core/game.ts', 'src/core/rules.ts'];
for (const file of preserved) {
  assert.equal(hash(execFileSync('git', ['show', `97b9b0c:${file}`], { cwd: root })), hash(fs.readFileSync(path.join(root, file))));
}
const output = path.join(reportDir, 'update-verification.json');
fs.writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), artifact: release.artifact,
  labels, capacitorAppName: config.appName, vibrationControlAbsent: true, runtimeHapticsDisabled: true,
  musicAndSoundRetained: true, unchangedGameAndSaveSources: preserved,
  physicalDeviceAndPlayUpdate: 'NOT RUN', pass: true }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ pass: true, labels: 'TAPtoTEN', vibrationRemoved: true, gameAndSavesUnchanged: true, output }, null, 2));
