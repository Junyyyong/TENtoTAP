import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(new URL(`../src/ui/styles/${file}.css`, import.meta.url), 'utf8');
describe('neutral surfaces with original semantic accents', () => {
  it('keeps white screen and light gray basic boxes separate from accents', () => {
    const tokens = source('tokens');
    for (const value of ['--paper: #ffffff;', '--panel-lit: #f5f6f8;', '--paper-edge: #cdd2da;',
      '--hot: #ff5000;', '--hot-deep: #d43600;', '--cool: #2c7fe0;', '--warm: #ffb500;', '--go: #22a03f;']) {
      expect(tokens).toContain(value);
    }
    expect(source('title')).toMatch(/\.mode-btn\s*\{[^}]*background: var\(--panel-lit\);[^}]*box-shadow: none;/);
    expect(source('title')).toMatch(/\.mode-name\s*\{[^}]*color: var\(--cool\);/);
    expect(source('title')).toMatch(/\.text-btn\s*\{[^}]*color: var\(--hot-deep\);/);
    expect(source('title')).toMatch(/\.brand-mark\s*\{[^}]*filter: none;/);
  });
  it('restores original action gradients, gauges and enabled switches', () => {
    expect(source('overlay')).toContain('color-mix(in srgb, var(--btn-face) 78%, white)');
    expect(source('picker')).toMatch(/\.intro-mark-art\s*\{[^}]*\}/);
    expect(source('picker')).not.toContain('filter: grayscale(1)');
    expect(source('picker')).toContain('background: linear-gradient(180deg, var(--go), var(--go-deep));');
    expect(source('game')).toContain('background: linear-gradient(90deg, var(--cool-deep), var(--cool));');
    expect(source('game')).toContain('background: linear-gradient(90deg, #ffb53d, #e83f66);');
  });
  it('keeps gameplay colours and highlights independent of UI surfaces', () => {
    const game = source('game'), tokens = source('tokens');
    expect(tokens).toContain('--block-selected: #fff2c4;');
    expect(tokens).toContain('--block-ring-ok: #16a34a;');
    expect(tokens).toContain('--block-ring-bad: #dc2626;');
    expect(game).toContain('color: var(--block-ink);');
    expect(game).toContain('0 2px 0 var(--block-shadow);');
    expect(source('tutorial')).toContain('outline: 2px solid var(--block-guidance);');
  });
  it('uses neutral circular navigation without neutralizing reaction text', () => {
    expect(source('game')).toMatch(/\.icon-btn\s*\{[^}]*color: var\(--ink\);[^}]*background: var\(--panel-lit\);[^}]*border-radius: 50%;[^}]*box-shadow: none;/);
    expect(source('overlay')).toMatch(/\.cheer-word\s*\{[^}]*color: var\(--warm\);[^}]*0 3px 0 var\(--hot-deep\)/);
  });
});
