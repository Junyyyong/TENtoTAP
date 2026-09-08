import type { RunConfig } from './types';

/** First three boards teach pairs; later sizes each have twelve stages. */
export function learningConfig(base: RunConfig, requested: number): RunConfig {
  const learningStage = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const width = learningStage <= 3 ? 2 : Math.min(9, 3 + Math.floor((learningStage - 4) / 12));
  return { ...base, learningStage, width, rows: width, deck: undefined,
    timeLimitMs: learningStage <= 3 ? 15_000 : 60_000,
    digitWeights: undefined, timeAttackLevel: undefined, keepBoard: true,
    groupWeights: learningStage < 8 ? [0, 3, 1, 0] : [2, 3, 2, 1] };
}

export function lessonValues(stage: number): readonly number[] | undefined {
  return [
    [7, 3, 4, 6], [8, 2, 9, 1], [5, 5, 6, 4],
    [2, 4, 4, 2, 4, 4, 2, 4, 4],
    [3, 3, 4, 3, 3, 4, 3, 3, 4],
    [1, 2, 3, 4, 2, 2, 2, 2, 2],
    [7, 4, 3, 1, 2, 3, 2, 4, 4],
  ][stage - 1];
}
