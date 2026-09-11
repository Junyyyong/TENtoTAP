import { describe, it, expect } from 'vitest';
import { learningConfig, lessonValues, lessonCount, lessonHint, bonusAfter, lessonGuided, tenCombinations, lessonIntro } from './learningStages';
import { TIME_ATTACK_CONFIG } from '../content/stages';
import { newGame, commitSelection, tick } from './game';
import { findHint, canEmpty } from './solver';
import { valueCounts } from './board';
import { mulberry32 } from './rng';

describe('LIMITLESS learning stages', () => {
  it('only introduces the five requested milestone stages', () => {
    expect(Array.from({length:60},(_,i)=>i+1).filter(s=>lessonIntro(s))).toEqual([1,6,14,23,30]);
    expect(lessonIntro(1)).toBe('USE 2 BLOCKS\nTO MAKE 10');
    expect(lessonIntro(30)).toBe('CLEAR ALL\nBLOCKS');
  });
  it('covers all combinations and the requested guidance and bonus schedule', () => {
    expect([3,4,5].map(n=>tenCombinations(n).length)).toEqual([8,9,7]);
    expect(Array.from({length:60},(_,i)=>i+1).filter(bonusAfter)).toEqual([5,13,22,30,40,50,60]);
    expect(Array.from({length:31},(_,i)=>i+1).filter(lessonGuided)).toEqual([1,2,6,7,14,15,23,24]);
  });
  it('rejects a shorter ten and clears the whole board at stage 30', () => {
    const game = newGame(learningConfig(TIME_ATTACK_CONFIG,6));
    // Deliberately insert a shorter ten to verify the count restriction.
    game.board.cells[0] = { value: 1, cleared: false };
    game.board.cells[1] = { value: 9, cleared: false };
    const one=game.board.cells.findIndex(c=>c.value===1), nine=game.board.cells.findIndex(c=>c.value===9);
    expect(commitSelection(game,[one,nine]).result.ok).toBe(false);
    let full = newGame(learningConfig(TIME_ATTACK_CONFIG,30));
    for(let i=0;i<3;i++) {
      full=commitSelection(full,findHint(full.board)!).state;
      expect(full.config.learningStage).toBe(i===2?31:30);
    }
    expect(full.boardsCleared).toBe(1);
  });
  it('shuffles every lesson without changing its numbers or answer', () => {
    for(let stage=1;stage<=29;stage++) {
      const layouts=new Set<string>();
      for(let seed=0;seed<30;seed++) {
        const game=newGame(learningConfig(TIME_ATTACK_CONFIG,stage),seed);
        const values=game.board.cells.map(c=>c.value);
        expect([...values].sort()).toEqual([...lessonValues(stage, mulberry32(seed))!].sort());
        expect(lessonHint(game.board, stage)).toHaveLength(lessonCount(stage)!);
        layouts.add(values.join(','));
      }
      expect(layouts.size).toBeGreaterThan(1);
    }
  });
  it('has exactly one index-based answer of the intended size in every lesson', () => {
    for (let stage=1;stage<=29;stage++) {
      for (let seed=0;seed<50;seed++) {
      const values=lessonValues(stage, mulberry32(seed))!;
      const answers:number[][]=[];
      for(let mask=1;mask<2**values.length;mask++) {
        const indices=values.flatMap((_,i)=>mask & (1<<i) ? [i] : []);
        if(indices.length === lessonCount(stage) && indices.reduce((sum,i)=>sum+values[i]!,0)===10) answers.push(indices);
      }
      expect(answers, 'stage '+stage).toHaveLength(1);
      expect(answers[0]).toHaveLength(lessonCount(stage)!);
      if (stage >= 6) expect(new Set(values.slice(lessonCount(stage)!)).size).toBeGreaterThan(1);
      }
    }
  });
  it('advances each lesson with one answer and scores only that answer', () => {
    let game=newGame(learningConfig(TIME_ATTACK_CONFIG,1),4);
    for(let stage=1;stage<=29;stage++) {
      expect(game.board.cells).toHaveLength(stage<=5 ? 4 : 9);
      game=tick(game,1000);
      const previousScore=game.score;
      const outcome=commitSelection(game,lessonHint(game.board, stage)!);
      game=outcome.state;
      expect(game.config.learningStage).toBe(stage+1);
      expect(game.score).toBe(previousScore+outcome.result.score);
      expect(game.boardsCleared).toBe(stage);
      expect(game.remainingMs).toBe(stage<5 ? 15_000 : 60_000);
      expect(game.transitionMs).toBe(500);
      game=tick(game,500);
    }
    expect(lessonValues(31)).toBeUndefined();
    expect(commitSelection(game,findHint(game.board)!).state.config.learningStage).toBe(30);
  });
  it('keeps full-board play clearable from stage 31 through 9×9 and beyond', () => {
    for(let stage=31;stage<=110;stage++) {
      const game=newGame(learningConfig(TIME_ATTACK_CONFIG,stage),stage);
      expect(canEmpty(valueCounts(game.board)), 'stage '+stage).toBe(true);
      expect(game.board.cells).toHaveLength(game.config.width**2);
    }
    expect(learningConfig(TIME_ATTACK_CONFIG,103).width).toBe(9);
    expect(learningConfig(TIME_ATTACK_CONFIG,1000).width).toBe(9);
  });
  it('rejects wrong answers, locks transition input and retries with the correct time', () => {
    for(let stage=1;stage<=29;stage++) {
      const game=newGame(learningConfig(TIME_ATTACK_CONFIG,stage));
      expect(commitSelection(game,[0]).state).toBe(game);
      expect(commitSelection({...game,transitionMs:500},lessonHint(game.board, stage)!).state.board).toEqual(game.board);
      expect(game.remainingMs).toBe(stage<=5 ? 15_000 : 60_000);
      expect(tick(game,game.remainingMs).status).toBe('timeUp');
    }
  });
  it('does not reset time or advance a stuck full board', () => {
    const game=newGame(learningConfig(TIME_ATTACK_CONFIG,31));
    const stuck={...game,remainingMs:12_000,board:{...game.board,cells:game.board.cells.map(c=>({...c,value:9}))}};
    const redealt=tick(stuck,100);
    expect(redealt.config.learningStage).toBe(31);
    expect(redealt.remainingMs).toBe(11_900);
  });
});
