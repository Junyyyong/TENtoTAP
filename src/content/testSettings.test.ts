import { expect, it } from 'vitest';
import { initialLearningStage } from './testSettings';
it('resumes the reached tutorial stage for release', () => {
  for (const stage of [1, 6, 10, 14, 29, 30, 31]) expect(initialLearningStage(stage)).toBe(stage);
});
it('normalizes invalid or legacy progress without inventing extra stages', () => {
  for (const stage of [0, -1, NaN, Infinity, 2.5]) expect(initialLearningStage(stage)).toBe(1);
  for (const stage of [32,103,1000]) expect(initialLearningStage(stage)).toBe(31);
});
