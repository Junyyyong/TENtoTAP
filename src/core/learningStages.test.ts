import { describe, it, expect } from 'vitest';
import { learningConfig, lessonValues } from './learningStages';
import { TIME_ATTACK_CONFIG } from '../content/stages';
import { newGame, commitSelection, tick } from './game';
import { findHint, canEmpty } from './solver';
import { valueCounts } from './board';

describe('MAKE10 learning stages', () => {
  it('has exactly one index-based answer of the intended size in every lesson', () => {
    for (let stage=1;stage<=8;stage++) {
      const values=lessonValues(stage)!;
      const answers:number[][]=[];
      for(let mask=1;mask<2**values.length;mask++) {
        const indices=values.flatMap((_,i)=>mask & (1<<i) ? [i] : []);
        if(indices.reduce((sum,i)=>sum+values[i]!,0)===10) answers.push(indices);
      }
      expect(answers, 'stage '+stage).toHaveLength(1);
      expect(answers[0]).toHaveLength(stage<=5 ? 2 : stage-3);
    }
  });
  it('advances each lesson with one answer and scores only that answer', () => {
    let game=newGame(learningConfig(TIME_ATTACK_CONFIG,1),4);
    for(let stage=1;stage<=8;stage++) {
      expect(game.board.cells).toHaveLength(stage<=5 ? 4 : 9);
      game=tick(game,1000);
      const previousScore=game.score;
      const outcome=commitSelection(game,findHint(game.board)!);
      game=outcome.state;
      expect(game.config.learningStage).toBe(stage+1);
      expect(game.score).toBe(previousScore+outcome.result.score);
      expect(game.boardsCleared).toBe(stage);
      expect(game.remainingMs).toBe(stage<5 ? 15_000 : 60_000);
      expect(game.transitionMs).toBe(500);
      game=tick(game,500);
    }
    expect(lessonValues(9)).toBeUndefined();
    expect(commitSelection(game,findHint(game.board)!).state.config.learningStage).toBe(9);
  });
  it('keeps full-board play clearable from stage 9 through 9×9 and beyond', () => {
    for(let stage=9;stage<=110;stage++) {
      const game=newGame(learningConfig(TIME_ATTACK_CONFIG,stage),stage);
      expect(canEmpty(valueCounts(game.board)), 'stage '+stage).toBe(true);
      expect(game.board.cells).toHaveLength(game.config.width**2);
    }
    expect(learningConfig(TIME_ATTACK_CONFIG,81).width).toBe(9);
    expect(learningConfig(TIME_ATTACK_CONFIG,1000).width).toBe(9);
  });
  it('rejects wrong answers, locks transition input and retries with the correct time', () => {
    for(let stage=1;stage<=8;stage++) {
      const game=newGame(learningConfig(TIME_ATTACK_CONFIG,stage));
      expect(commitSelection(game,[0]).state).toBe(game);
      expect(commitSelection({...game,transitionMs:500},findHint(game.board)!).state.board).toEqual(game.board);
      expect(game.remainingMs).toBe(stage<=5 ? 15_000 : 60_000);
      expect(tick(game,game.remainingMs).status).toBe('timeUp');
    }
  });
  it('does not reset time or advance a stuck full board', () => {
    const game=newGame(learningConfig(TIME_ATTACK_CONFIG,9));
    const stuck={...game,remainingMs:12_000,board:{...game.board,cells:game.board.cells.map(c=>({...c,value:9}))}};
    const redealt=tick(stuck,100);
    expect(redealt.config.learningStage).toBe(9);
    expect(redealt.remainingMs).toBe(11_900);
  });
});
