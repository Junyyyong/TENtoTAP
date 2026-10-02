import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('settings without vibration', () => {
  const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  it('keeps music, sound and legal links, without the haptics row/note', () => {
    const html = read('index.html');
    for (const id of ['switch-music', 'switch-sound', 'btn-privacy', 'btn-licenses']) expect(html).toContain(`id="${id}"`);
    expect(html).not.toContain('switch-haptics');
    expect(html).not.toContain('settings-note');
    expect(read('src/ui/screens/settingsScreen.ts')).not.toContain('haptics');
  });
  it('ignores legacy saved haptics flags without altering save contracts', () => {
    expect(read('src/ui/app.ts')).toContain('feedback.setHaptics(false)');
    expect(read('src/ui/app.ts')).not.toContain('feedback.setHaptics(this.settings.hapticsOn)');
    expect(read('src/ui/storage.ts')).toContain('hapticsOn: boolean;');
  });
});
