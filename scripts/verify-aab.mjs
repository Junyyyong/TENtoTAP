// Local release verification only; never imported by the game.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const javaHome = process.env.JAVA_HOME || resolve(root, '.android-tools/jdk/Contents/Home');
const java = resolve(javaHome, 'bin/java');
const bundletool = resolve(root, '.android-tools/downloads/bundletool-all-1.18.3.jar');
const bundle = resolve(root, 'android/app/build/outputs/bundle/release/app-release.aab');
const reportDir = process.argv[2] && resolve(root, process.argv[2]);
assert(reportDir, 'Usage: node scripts/verify-aab.mjs <new-report-directory>');
assert(!existsSync(reportDir), 'Refusing to overwrite a release report. Choose a new directory.');

function run(command, args, env = process.env) {
  const r = spawnSync(command, args, { cwd: root, env, maxBuffer: 128 * 1024 * 1024 });
  assert.equal(r.status, 0, `${command} failed: ${r.stderr?.toString() ?? r.error?.message}`);
  return r.stdout;
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const properties = Object.fromEntries(readFileSync(resolve(root, 'android/keystore.properties'), 'utf8')
  .split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
assert(properties.storeFile && properties.storePassword && properties.keyAlias, 'Missing signing fields');
const keyStore = resolve(root, 'android', properties.storeFile);
const signingEnv = { ...process.env, TAPTOTEN_VERIFY_PASSWORD: properties.storePassword };
const validation = run(java, ['-jar', bundletool, 'validate', `--bundle=${bundle}`]).toString();
const signature = run(resolve(javaHome, 'bin/jarsigner'), [
  '-J-Duser.language=en', '-strict', '-verify', '-keystore', keyStore,
  '-storepass:env', 'TAPTOTEN_VERIFY_PASSWORD', bundle, properties.keyAlias,
], signingEnv).toString();
assert(signature.includes('jar verified'), 'Signature was not verified');
const certificate = run(resolve(javaHome, 'bin/keytool'), [
  '-exportcert', '-alias', properties.keyAlias, '-keystore', keyStore,
  '-storepass:env', 'TAPTOTEN_VERIFY_PASSWORD',
], signingEnv);
const manifest = run(java, ['-jar', bundletool, 'dump', 'manifest', `--bundle=${bundle}`, '--module=base']).toString();
const attribute = name => manifest.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
assert.equal(attribute('package'), 'io.github.junyyyong.makezero');
assert.equal(attribute('android:targetSdkVersion'), '36');
assert.notEqual(attribute('android:debuggable'), 'true', 'Release must not be debuggable');
const versionName = attribute('android:versionName');
const versionCode = attribute('android:versionCode');
assert(/^[\w.-]+$/.test(versionName) && /^\d+$/.test(versionCode), 'Invalid version metadata');
const entries = run('unzip', ['-Z1', bundle]).toString().trim().split('\n');
assert(entries.some(entry => /^META-INF\/.+\.(RSA|DSA|EC)$/.test(entry)), 'No signing certificate in bundle');
assert(!entries.some(entry => /(^|\/)(keystore\.properties|[^/]+\.(jks|keystore))$|(^|\/)(docs|scripts|\.android-tools)\//.test(entry)),
  'Private/build/research files must not be shipped');
const nativeLibraries = entries.filter(entry => entry.endsWith('.so'));
const dist = resolve(root, 'dist');
function listFiles(dir) {
  // Android deliberately excludes Finder metadata via ignoreAssetsPattern.
  return readdirSync(dir, { withFileTypes: true }).filter(item => item.name !== '.DS_Store').flatMap(item => {
    const path = resolve(dir, item.name);
    return item.isDirectory() ? listFiles(path) : [path];
  });
}
const assets = listFiles(dist).map(path => {
  const asset = relative(dist, path).split('\\').join('/');
  const archivePath = `base/assets/public/${asset}`;
  assert(entries.includes(archivePath), `Missing bundled asset: ${asset}`);
  const sourceHash = sha256(readFileSync(path));
  assert.equal(sha256(run('unzip', ['-p', bundle, archivePath])), sourceHash, `Outdated asset: ${asset}`);
  return { path: asset, sha256: sourceHash };
});
const capacitor = JSON.parse(run('unzip', ['-p', bundle, 'base/assets/capacitor.config.json']).toString());
assert(!capacitor.server?.url, 'Release should contain the game, not load an external server');
const plugins = JSON.parse(run('unzip', ['-p', bundle, 'base/assets/capacitor.plugins.json']).toString());
assert(plugins.some(plugin => plugin.classpath?.includes('PreferencesPlugin')), 'Native storage plugin missing');

const output = resolve(root, `releases/TAPtoTEN-${versionName}-code${versionCode}.aab`);
assert(!existsSync(output), 'Refusing to overwrite an existing release artifact');
mkdirSync(dirname(output), { recursive: true });
copyFileSync(bundle, output, constants.COPYFILE_EXCL);
const report = {
  verifiedAt: new Date().toISOString(),
  sourceCommit: run('git', ['rev-parse', 'HEAD']).toString().trim(),
  workingTreeStatus: run('git', ['status', '--short']).toString().trim(),
  artifact: relative(root, output), bytes: statSync(output).size, sha256: sha256(readFileSync(output)),
  applicationId: attribute('package'), versionName, versionCode: Number(versionCode),
  minSdk: Number(attribute('android:minSdkVersion')), targetSdk: Number(attribute('android:targetSdkVersion')),
  debuggable: attribute('android:debuggable') === 'true',
  uploadCertificateSha256: sha256(certificate),
  bundletoolValidation: validation.trim(), jarsignerStrictVerification: signature.trim(),
  nativeLibraries, bundledAssets: assets, preferencesPlugin: true, externalServerUrl: false,
  excludedPrivateAndResearchFiles: true, ignoredSourceMetadata: ['.DS_Store'],
  deviceInstallAndUpdateTest: 'NOT RUN: physical Android device/Play internal testing required',
  playUpload: 'NOT PERFORMED',
};
mkdirSync(reportDir, { recursive: true });
writeFileSync(resolve(reportDir, 'verification.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
writeFileSync(resolve(reportDir, 'manifest.xml'), manifest, { flag: 'wx' });
console.log(JSON.stringify({
  artifact: report.artifact, bytes: report.bytes, sha256: report.sha256,
  applicationId: report.applicationId, versionName, versionCode,
  bundletoolValid: true, jarsignerStrictVerified: true,
  signatureWarnings: signature.includes('Warning:'),
  bundledAssets: `${assets.length} files match dist/ byte-for-byte`,
  report: relative(root, reportDir), deviceInstallAndUpdateTest: report.deviceInstallAndUpdateTest,
}, null, 2));
