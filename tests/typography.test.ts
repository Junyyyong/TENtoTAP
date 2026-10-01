import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
describe('recorded web design in the Android shell', () => {
  it('keeps the chosen system font stack and explicit Noto usage', () => {
    const tokens = source('src/ui/styles/tokens.css');
    expect(tokens).toContain('font-family: "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif;');
    expect(tokens).toContain('font-family: "TAP Sans KR";');
    expect(source('src/ui/styles/picker.css')).toContain('font-family: "TAP Sans KR", sans-serif;');
    expect(source('index.html')).not.toMatch(/rel="preload"[^>]+NotoSansKR/);
  });
  it('preserves original sizes and weights, including compact rules', () => {
    const title = source('src/ui/styles/title.css');
    expect(title).toMatch(/\.mode-name\s*\{[^}]*font-size: 21px;[^}]*font-weight: 800/);
    expect(title).toMatch(/\.mode-desc\s*\{[^}]*font-size: 13px;[^}]*font-weight: 700/);
    expect(title).toContain('.mode-name { font-size: 19px; }');
    expect(title).toContain('.mode-desc { font-size: 12px; }');
    expect(source('src/ui/styles/index.css')).not.toContain('typography.css');
    expect(source('src/ui/styles/safeArea.css')).not.toMatch(/font-(size|weight|family)\s*:/);
  });
  it('accepts native insets without adding them to browser insets', () => {
    const css = source('src/ui/styles/safeArea.css');
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(css).toContain(`var(--safe-area-inset-${edge}, env(safe-area-inset-${edge}, 0px))`);
    }
    expect(css).toContain('.cheer, .lesson-intro, .overlay');
    expect(css).toContain('.legal-dialog');
  });
  it('retains native textZoom and refits grades independently of animation', () => {
    expect(source('android/app/src/main/java/io/github/junyyyong/makezero/MainActivity.java')).toContain('setTextZoom(100)');
    const cheer=source('src/ui/screens/cheer.ts');
    expect(cheer).toContain('window.addEventListener("resize", refit)');
    expect(cheer).toContain('document.fonts?.addEventListener("loadingdone", refit)');
    expect(cheer).toContain('new ResizeObserver(refit).observe(this.root)');
    expect(cheer).toContain('setProperty("transform", "none", "important")');
  });
});
