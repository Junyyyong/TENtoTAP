import { describe, expect, it } from 'vitest';
import { breakLimitlessCombo, commitSelection, hasLimitlessCombo, newGame, penalizeMistake, tick } from './game';
import { learningConfig, lessonHint, scoreAttackConfig } from './learningStages';
import { ENDLESS_CONFIG, TIMELESS_CONFIG, TIME_ATTACK_CONFIG, stageConfig, timeAttackConfig } from '../content/stages';
import { findHint } from './solver';
import type { GameState } from './game';

const main = () => newGame(scoreAttackConfig(TIME_ATTACK_CONFIG), 42);
const withAnswer = (state: GameState, values = [4, 6]) => ({ ...state,
  board: { width: values.length, cells: [...values, 1, 9].map(value => ({ value, cleared: false })) } });
const answer = (state: GameState, values = [4, 6]) => commitSelection(withAnswer(state, values), values.map((_, i) => i));

describe('LIMITLESS five-answer combo bonus', () => {
  it('pays the base score for answers 1–4, then +20 on every answer from the fifth', () => {
    let state = main();
    for (let combo = 1; combo <= 12; combo++) {
      const before = state;
      const outcome = answer(state);
      state = outcome.state;
      expect(state.limitlessCombo).toBe(combo);
      expect(outcome.result.score).toBe(combo < 5 ? 10 : 30);
      expect(state.score - before.score).toBe(outcome.result.score);
      expect(state.remainingMs).toBe(before.remainingMs);
      expect(before.limitlessCombo).toBe(combo - 1);
    }
    expect(state.score).toBe(280);
  });

  it.each([[4, 6], [2, 3, 5], [1, 2, 3, 4], [2, 2, 2, 2, 2]])('adds the same 20 to every valid selection length (%j)', (...values) => {
    const outcome = answer({ ...main(), limitlessCombo: 4 }, values);
    const base = { 2: 10, 3: 20, 4: 40, 5: 80 }[values.length];
    expect(outcome.result.score).toBe(base! + 20);
  });

  it('cancellation resets only the streak; rebuilding must reach five again', () => {
    const before = { ...main(), limitlessCombo: 7, score: 130, remainingMs: 45_678 };
    const cancelled = breakLimitlessCombo(before);
    expect(cancelled).toEqual({ ...before, limitlessCombo: 0 });
    expect(cancelled.board).toBe(before.board);
    expect(breakLimitlessCombo(cancelled)).toBe(cancelled);
    let state = cancelled;
    for (let n = 1; n <= 5; n++) {
      const outcome = answer(state);
      expect(outcome.result.score).toBe(n < 5 ? 10 : 30);
      state = outcome.state;
    }
  });

  it('a wrong committed answer resets without awarding points; the existing penalty still costs one second', () => {
    const before = withAnswer({ ...main(), limitlessCombo: 8, score: 200 }, [8, 6]);
    const wrong = commitSelection(before, [0, 1]);
    expect(wrong.result.ok).toBe(false);
    expect(wrong.state.limitlessCombo).toBe(0);
    expect(wrong.state.score).toBe(200);
    expect(wrong.state.remainingMs).toBe(60_000);
    const penalized = penalizeMistake(before);
    expect(penalized.limitlessCombo).toBe(0);
    expect(penalized.remainingMs).toBe(59_000);
    expect(penalized.score).toBe(200);
  });

  it('retains the streak across ticking and automatic redeals without extending the clock', () => {
    const before = { ...main(), limitlessCombo: 4, remainingMs: 1234,
      board: { width: 2, cells: [4, 6].map(value => ({ value, cleared: false })) } };
    const cleared = commitSelection(before, [0, 1]).state;
    expect(cleared.boardsCleared).toBe(1);
    expect(cleared.limitlessCombo).toBe(5);
    expect(cleared.score).toBe(30);
    expect(cleared.remainingMs).toBe(1234);
    expect(tick(cleared, 234).limitlessCombo).toBe(5);
    expect(newGame(cleared.config, 42).limitlessCombo).toBe(0);
  });

  it.each(['won', 'lost', 'timeUp'] as const)('never awards or resets a finished round (%s)', status => {
    const state = withAnswer({ ...main(), status, limitlessCombo: 4 });
    expect(commitSelection(state, [0, 1]).state).toBe(state);
    expect(breakLimitlessCombo(state)).toBe(state);
  });

  it('does not add bonuses or cancellation penalties to tutorials or other modes', () => {
    const configs = [ENDLESS_CONFIG, TIMELESS_CONFIG, TIME_ATTACK_CONFIG, timeAttackConfig(1), stageConfig(1),
      ...Array.from({ length: 30 }, (_, i) => learningConfig(TIME_ATTACK_CONFIG, i + 1))];
    for (const config of configs) {
      const state = { ...newGame(config, 42), limitlessCombo: 8 };
      expect(hasLimitlessCombo(config)).toBe(false);
      expect(breakLimitlessCombo(state)).toBe(state);
      const hint = config.learningStage
        ? lessonHint(state.board, config.learningStage) : findHint(state.board, config.targets);
      if (hint) {
        const outcome = commitSelection(state, hint);
        const count = hint.length;
        const sum = hint.reduce((sum, i) => sum + state.board.cells[i]!.value, 0);
        expect(outcome.result.score).toBe(({ 2: 10, 3: 20, 4: 40, 5: 80 }[count] ?? 0) * Math.round(sum / 10));
      }
    }
  });
});
