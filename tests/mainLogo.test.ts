import { describe, expect, it } from 'vitest';
import { MAIN_LOGO_SIZE, mainLogoPaintScale, talkVisibleLogoWidth } from '../src/ui/mainLogo';
import { fitNativeFrame } from '../src/ui/nativeFrame';

describe('main logo matching uses visible TALK artwork, not the 330px CSS cap', () => {
  it('reduces the previous painted size to 80%, even when height-capped', () => {
    expect(MAIN_LOGO_SIZE).toBe(.8);
    for (const roomHeight of [390, 255]) {
      const prior = mainLogoPaintScale(309, 250, 293.375, 346, roomHeight);
      expect(MAIN_LOGO_SIZE * prior).toBeCloseTo(prior * .8, 10);
    }
  });
  it('matches TALK at the reference phone size', () => {
    expect(talkVisibleLogoWidth(390, 844)).toBeCloseTo((250 * 726 / 618 - 24) * 3603 / 3146, 10);
    expect(talkVisibleLogoWidth(390, 844)).toBeGreaterThan(308);
    expect(talkVisibleLogoWidth(390, 844)).toBeLessThan(310);
  });
  it('uses the same short-window band and width caps as TALK', () => {
    expect(talkVisibleLogoWidth(390, 640)).toBeCloseTo((215 * 726 / 618 - 24) * 3603 / 3146, 10);
    expect(talkVisibleLogoWidth(390, 560)).toBeCloseTo((165 * 726 / 618 - 24) * 3603 / 3146, 10);
  });
  it('normalizes identical physical density changes to the same logical width', () => {
    const zero = { top: 0, right: 0, bottom: 0, left: 0 };
    const sizes = [2, 2.4, 3, 3.6, 4].map(density => {
      const frame = fitNativeFrame(1080 / density, 2340 / density, zero);
      return talkVisibleLogoWidth(frame.width, frame.height);
    });
    for (const width of sizes) expect(width).toBeCloseTo(sizes[0]!, 10);
  });
  it('caps both paint axes uniformly, without changing the original image ratio', () => {
    expect(mainLogoPaintScale(309, 250, 293.375, 346, 390)).toBeCloseTo(309 / 250, 10);
    expect(mainLogoPaintScale(262, 148, 173.675, 346, 255)).toBeCloseTo(255 / 173.675, 10);
    expect(mainLogoPaintScale(309, 250, 293.375, 200, 390)).toBe(.8);
  });
  it('guards hidden and invalid measurements', () => {
    expect(talkVisibleLogoWidth(0, 844)).toBe(0);
    expect(talkVisibleLogoWidth(390, Infinity)).toBe(0);
    expect(mainLogoPaintScale(309, 0, 0, 390, 844)).toBe(1);
    expect(mainLogoPaintScale(309, 250, 293.375, 346, 0)).toBe(0);
  });
});
