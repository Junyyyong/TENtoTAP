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
/** Counts index-distinct answers, stopping as soon as uniqueness is disproved. */
function answerCount(values: readonly number[], count: number): number {
  let found = 0;
  const visit = (start: number, left: number, sum: number): void => {
    if (found > 1 || sum > 10) return;
    if (!left) { if (sum === 10) found++; return; }
    for (let i = start; i <= values.length - left; i++) visit(i + 1, left - 1, sum + values[i]!);
  };
  visit(0, count, 0);
  return found;
}
export function lessonValues(stage: number, random: () => number = () => 0): readonly number[] | undefined {
  if (stage >= 1 && stage <= 5) return [
    [1,9,5,3], [2,8,3,4], [3,7,4,5], [4,6,2,7], [5,5,7,9],
  ][stage - 1];
  const answer = COMBINATIONS[stage - 6];
  if (answer) {
    const values = [...answer];
    while (values.length < 9) {
      const safe = [1,2,3,4,5,6,7,8,9].filter(n => answerCount([...values, n], answer.length) === 1);
      // Prefer variety among safe distractors. 9 is always a safe fallback:
      // with at least two positive numbers it cannot form a requested answer.
      const uses = (n: number) => values.filter(v => v === n).length;
      const least = Math.min(...safe.map(uses));
      const choices = safe.filter(n => uses(n) === least);
      values.push(choices[Math.floor(random() * choices.length)]!);
    }
    return values;
  }
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
