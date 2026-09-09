import type { Board, RunConfig } from './types';

/** Unordered positive digit partitions: each mathematical combination once. */
export function tenCombinations(count: number): number[][] {
  const answers: number[][] = [];
  const visit = (prefix: number[], minimum: number, remaining: number): void => {
    if (prefix.length === count) { if (remaining === 0) answers.push(prefix); return; }
    for (let n = minimum; n <= 9 && n <= remaining; n++) visit([...prefix, n], n, remaining - n);
  };
  visit([], 1, 10);
  return answers;
}
const COMBINATIONS = [...tenCombinations(3), ...tenCombinations(4), ...tenCombinations(5)];
export function lessonCount(stage = 0): number | undefined {
  return stage >= 1 && stage <= 5 ? 2 : stage <= 13 && stage >= 6 ? 3
    : stage <= 22 && stage >= 14 ? 4 : stage <= 29 && stage >= 23 ? 5 : undefined;
}
export function lessonGuided(stage = 0): boolean {
  return [1,2,6,7,14,15,23,24].includes(stage);
}
export function bonusAfter(stage: number): boolean {
  return [5,13,22,30].includes(stage) || (stage > 30 && stage % 10 === 0);
}
export function lessonNotice(stage: number): string {
  const count = lessonCount(stage);
  return stage === 30 ? 'Clear all blocks.' : count ? `Use ${count} blocks to make 10.` : '';
}
export function learningConfig(base: RunConfig, requested: number): RunConfig {
  const learningStage = Number.isSafeInteger(requested) && requested > 0 ? requested : 1;
  const width = learningStage <= 5 ? 2 : Math.min(9, 3 + Math.floor((Math.max(31, learningStage) - 31) / 12));
  return { ...base, learningStage, width, rows: width, deck: undefined,
    timeLimitMs: learningStage <= 5 ? 15_000 : 60_000,
    digitWeights: undefined, timeAttackLevel: undefined, keepBoard: true,
    groupWeights: [2, 3, 2, 1] };
}
export function lessonValues(stage: number): readonly number[] | undefined {
  if (stage >= 1 && stage <= 5) return [
    [1,9,5,3], [2,8,3,4], [3,7,4,5], [4,6,2,7], [5,5,7,9],
  ][stage - 1];
  const answer = COMBINATIONS[stage - 6];
  // A 9 plus at least two positive digits exceeds 10: no competing answer
  // of the requested size, even when shorter sums of 10 exist.
  if (answer) return [...answer, ...Array<number>(9 - answer.length).fill(9)];
  if (stage === 30) return [1,1,8,2,2,6,3,3,4];
  return undefined;
}
export function lessonHint(board: Board, stage: number): number[] | undefined {
  const count = lessonCount(stage);
  if (!count) return undefined;
  const visit = (chosen: number[], start: number, sum: number): number[] | undefined => {
    if (chosen.length === count) return sum === 10 ? chosen : undefined;
    for (let i = start; i < board.cells.length; i++) {
      const cell = board.cells[i]!;
      if (cell.cleared || sum + cell.value > 10) continue;
      const answer = visit([...chosen, i], i + 1, sum + cell.value);
      if (answer) return answer;
    }
    return undefined;
  };
  return visit([], 0, 0);
}
