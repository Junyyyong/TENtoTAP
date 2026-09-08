import type { RunConfig } from './types';

/** Five pair lessons, then three/four/five-number lessons before full boards. */
export function learningConfig(base: RunConfig, requested: number): RunConfig {
  const learningStage = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const width = learningStage <= 5 ? 2 : Math.min(9, 3 + Math.floor((Math.max(9, learningStage) - 9) / 12));
  return { ...base, learningStage, width, rows: width, deck: undefined,
    timeLimitMs: learningStage <= 5 ? 15_000 : 60_000,
    digitWeights: undefined, timeAttackLevel: undefined, keepBoard: true,
    groupWeights: learningStage < 8 ? [0, 3, 1, 0] : [2, 3, 2, 1] };
}

export function lessonValues(stage: number): readonly number[] | undefined {
  return [
    [1, 9, 5, 3], [2, 8, 3, 4], [3, 7, 4, 5],
    [4, 6, 2, 7], [5, 5, 7, 9],
    [3, 8, 5, 8, 1, 8, 8, 8, 6],
    [2, 7, 9, 2, 4, 7, 9, 7, 2],
    [2, 7, 2, 9, 2, 7, 2, 9, 2],
  ][stage - 1];
}
