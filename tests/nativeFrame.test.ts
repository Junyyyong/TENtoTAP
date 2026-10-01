import { describe, expect, it } from 'vitest';
import { fitNativeFrame, NATIVE_FRAME } from '../src/ui/nativeFrame';

const zero = { top: 0, right: 0, bottom: 0, left: 0 };
describe('Android uniform reference frame (geometry, not device rendering)', () => {
  it('uses the recorded 390×844 composition unchanged', () => {
    expect(NATIVE_FRAME).toEqual({ width: 390, height: 844 });
    expect(fitNativeFrame(390, 844, zero)).toEqual({ scale: 1, x: 0, y: 0 });
  });
  for (const density of [2, 2.4, 3, 3.6, 4]) {
    it(`keeps physical geometry at display density ${density}`, () => {
      const fit = fitNativeFrame(1080 / density, 2340 / density, {
        top: 72 / density, bottom: 144 / density, left: 0, right: 0,
      });
      expect(fit.scale * density).toBeCloseTo(2124 / 844, 10);
      expect(fit.y * density).toBeCloseTo(72, 10);
      expect(fit.x * density).toBeCloseTo((1080 - 390 * 2124 / 844) / 2, 10);
    });
  }
  for (const [width, height] of [[320,568], [360,740], [412,915], [540,1170], [800,600]]) {
    it(`fits without cropping or distortion at ${width}×${height}`, () => {
      const inset = { top: 24, bottom: 48, left: 16, right: 8 };
      const fit = fitNativeFrame(width!, height!, inset);
      expect(fit.x).toBeGreaterThanOrEqual(inset.left);
      expect(fit.y).toBeGreaterThanOrEqual(inset.top);
      expect(fit.x + 390 * fit.scale).toBeLessThanOrEqual(width! - inset.right + 1e-9);
      expect(fit.y + 844 * fit.scale).toBeLessThanOrEqual(height! - inset.bottom + 1e-9);
    });
  }
  it('uses zero overlap when native padding already excludes the bars', () => {
    const edge = fitNativeFrame(360, 780, { ...zero, top: 24, bottom: 48 });
    const padded = fitNativeFrame(360, 708, zero);
    expect(padded.scale).toBe(edge.scale);
    expect(padded.x).toBe(edge.x);
    expect(padded.y + 24).toBe(edge.y);
  });
  it('clamps invalid inputs and collapsed views without NaN', () => {
    expect(fitNativeFrame(NaN, Infinity, { top: -1, right: NaN, bottom: Infinity, left: -2 }))
      .toEqual({ scale: 0, x: 0, y: 0 });
    expect(fitNativeFrame(20, 20, { top: 30, right: 40, bottom: 30, left: 40 }))
      .toEqual({ scale: 0, x: 40, y: 30 });
  });
});
