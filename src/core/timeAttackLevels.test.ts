import { describe, expect, it } from "vitest";
import { timeAttackConfig } from "../content/stages";
import { commitSelection, newGame, tick } from "./game";
import { findHint, canEmpty } from "./solver";
import { valueCounts } from "./board";

describe("time attack levels", () => {
  it.each([[1, 2, 4], [2, 5, 6], [3, 7, 8], [4, 9, 9]])(
    "level %i grows from %i to %i and repeats its final size", (level, start, end) => {
      let state = newGame(timeAttackConfig(level), 12);
      expect(state.board.width).toBe(start);
      expect(canEmpty(valueCounts(state.board))).toBe(true);
      let moves = 0;
      while ((state.boardsCleared ?? 0) < end - start + 2 && moves++ < 500) {
        const answer = findHint(state.board);
        expect(answer).not.toBeNull();
        state = commitSelection(state, answer!).state;
      }
      expect(state.boardsCleared).toBe(end - start + 2);
      expect(state.board.width).toBe(end);
      expect(state.board.cells).toHaveLength(end * end);
      expect(state.remainingMs).toBe(60_000);
      state = tick(state, 350);
      expect(state.remainingMs).toBe(60_000);
      expect(tick(state, 60_000).status).toBe("timeUp");
    },
  );
  it("replaces a stuck board at the same size without counting a clear", () => {
    const initial = newGame(timeAttackConfig(1), 2);
    const state = { ...initial, board: { width: 2, cells: [4, 6, 9, 9].map(value => ({ value, cleared: false })) } };
    const next = commitSelection(state, [0, 1]).state;
    expect(next.board.width).toBe(2);
    expect(next.boardsCleared).toBe(0);
    expect(findHint(next.board)).not.toBeNull();
  });
});
