import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

describe('canonical app display name', () => {
  it('uses TAPtoTEN for both Android labels and Capacitor, keeping the app ID', () => {
    expect(config.appName).toBe('TAPtoTEN');
    expect(config.appId).toBe('io.github.junyyyong.makezero');
    const strings = read('android/app/src/main/res/values/strings.xml');
    for (const name of ['app_name', 'title_activity_main']) {
      expect(strings).toContain(`<string name="${name}">TAPtoTEN</string>`);
      expect(read('android/app/src/main/AndroidManifest.xml')).toContain(`android:label="@string/${name}"`);
    }
  });

  it('uses the same name in web titles and accessible image labels', () => {
    const html = read('index.html');
    expect(html).toContain('<title>TAPtoTEN</title>');
    expect(html).toContain('alt="TAPtoTEN"');
    expect(html).not.toContain('TAP to TEN');
    expect(read('scripts/build-single-file.mjs')).toContain('<title>TAPtoTEN</title>');
  });
});
