import { describe, it, expect } from 'vitest';
import { learningConfig } from './learningStages';
import { TIME_ATTACK_CONFIG } from '../content/stages';
import { newGame, commitSelection, tick, payoutFor } from './game';
import { findHint, canEmpty } from './solver';
import { valueCounts } from './board';

describe('integrated learning stages', () => {
  it('teaches three different pair boards before reaching 3×3', () => {
    let game = newGame(learningConfig(TIME_ATTACK_CONFIG, 1), 4);
    const boards = [];
    for (let stage=1; stage<=3; stage++) {
      expect(game.config.learningStage).toBe(stage);
      expect(game.board.width).toBe(2);
      boards.push(game.board.cells.map(c=>c.value).join(','));
      for (let pair=0; pair<2; pair++) {
        const answer = findHint(game.board)!;
        expect(answer).toHaveLength(2);
        game = commitSelection(game, answer).state;
      }
      expect(game.remainingMs).toBe(stage < 3 ? 15_000 : 60_000);
      expect(game.transitionMs).toBe(500);
      game = tick(game, 500);
    }
    expect(new Set(boards).size).toBe(3);
    expect(game.config.learningStage).toBe(4);
    expect(game.board.cells).toHaveLength(9);
    expect(findHint(game.board)).toHaveLength(3);
  });
  it('deals clearable boards through 9×9 and continues beyond it', () => {
    for(let stage=1;stage<=100;stage++) {
      const config=learningConfig(TIME_ATTACK_CONFIG,stage);
      const game=newGame(config,stage);
      expect(canEmpty(valueCounts(game.board)), `stage ${stage}`).toBe(true);
      expect(game.board.cells.length).toBe(config.width ** 2);
    }
    expect(learningConfig(TIME_ATTACK_CONFIG,76).width).toBe(9);
    expect(learningConfig(TIME_ATTACK_CONFIG,1000).width).toBe(9);
  });
  it('rejects 7+4, freezes transition input and uses stage-specific clocks', () => {
    const game=newGame(learningConfig(TIME_ATTACK_CONFIG,1));
    expect(commitSelection(game,[0,2]).state).toBe(game);
    expect(commitSelection({...game,transitionMs:500},[0,1]).state.board).toEqual(game.board);
    expect(game.remainingMs).toBe(15_000);
    expect(tick(game,15_000).status).toBe('timeUp');
    expect(payoutFor({...game,score:600},490)).toBe('none');
    const continued=newGame(learningConfig(TIME_ATTACK_CONFIG,17));
    expect(continued.config.learningStage).toBe(17);
    expect(continued.remainingMs).toBe(60_000);
  });
  it('resets the clock on clear, but not on a same-stage redeal', () => {
    let game = tick(newGame(learningConfig(TIME_ATTACK_CONFIG, 4)), 10_000);
    for (let i = 0; i < 3; i++) game = commitSelection(game, findHint(game.board)!).state;
    expect(game.config.learningStage).toBe(5);
    expect(game.remainingMs).toBe(60_000);
    const stuck = { ...game, transitionMs: 0, remainingMs: 12_000,
      board: { ...game.board, cells: game.board.cells.map(c => ({ ...c, value: 9 })) } };
    const redealt = tick(stuck, 100);
    expect(redealt.config.learningStage).toBe(5);
    expect(redealt.remainingMs).toBe(11_900);
  });
});
