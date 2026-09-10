import { expect, it } from 'vitest';
import { initialLearningStage } from './testSettings';
it('starts test sessions at stage one regardless of saved progress', () => {
  for (const stage of [1, 6, 14, 30, 103, 1000]) expect(initialLearningStage(stage)).toBe(1);
});
