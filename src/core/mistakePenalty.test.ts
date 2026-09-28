import { describe, expect, it } from 'vitest';
import { commitSelection, newGame, penalizeMistake, tick } from './game';
import { learningConfig, scoreAttackConfig } from './learningStages';
import { ENDLESS_CONFIG, TIMELESS_CONFIG, TIME_ATTACK_CONFIG, stageConfig, timeAttackConfig } from '../content/stages';
import { findHint } from './solver';

const mainGame = () => newGame(scoreAttackConfig(TIME_ATTACK_CONFIG), 42);

describe('LIMITLESS main-round mistake penalty', () => {
  it('deducts exactly one second, leaving the board, points and elapsed time untouched', () => {
    const before = { ...mainGame(), remainingMs: 45_678, elapsedMs: 14_322, score: 120 };
    const after = penalizeMistake(before);
    expect(after).toEqual({ ...before, remainingMs: 44_678 });
    expect(after.board).toBe(before.board);
    expect(before.remainingMs).toBe(45_678);
  });

  it('charges each confirmed mistake and continues ticking with no input delay', () => {
    const start = mainGame();
    const twice = penalizeMistake(penalizeMistake(start));
    expect(twice.remainingMs).toBe(58_000);
    expect(twice.transitionMs).toBeUndefined();
    expect(tick(twice, 500).remainingMs).toBe(57_500);
    const answer = findHint(twice.board)!;
    const result = commitSelection(twice, answer);
    expect(result.result.ok).toBe(true);
    expect(result.state.score).toBeGreaterThan(0);
    expect(result.state.remainingMs).toBe(58_000);
  });

  it.each([1000, 999, 1])('ends the round at zero without going negative (%i ms left)', remainingMs => {
    const after = penalizeMistake({ ...mainGame(), remainingMs });
    expect(after.remainingMs).toBe(0);
    expect(after.status).toBe('timeUp');
    expect(penalizeMistake(after)).toBe(after);
  });

  it.each(['won', 'lost', 'timeUp'] as const)('does not charge a finished round (%s)', status => {
    const state = { ...mainGame(), status };
    expect(penalizeMistake(state)).toBe(state);
  });

  it('does not charge tutorial stages 1 through 30', () => {
    for (let stage = 1; stage <= 30; stage++) {
      const state = newGame(learningConfig(TIME_ATTACK_CONFIG, stage), 42);
      expect(penalizeMistake(state)).toBe(state);
    }
  });

  it.each([ENDLESS_CONFIG, TIMELESS_CONFIG, TIME_ATTACK_CONFIG, timeAttackConfig(1), stageConfig(1)])(
    'does not change other modes or legacy time-attack runs ($mode)', config => {
      const state = newGame(config, 42);
      expect(penalizeMistake(state)).toBe(state);
    },
  );

  it('does not charge a board transition', () => {
    const state = { ...mainGame(), transitionMs: 500 };
    expect(penalizeMistake(state)).toBe(state);
  });
});
