import type { Board } from '../core/types';

/** Presentation-only randomness; never consumes the puzzle generator's seed. */
export class BlockColors {
  private colors: number[] = [];
  constructor(private readonly random = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296) {}
  reset(board: Board): void {
    this.colors = board.cells.map(() => this.pick());
  }
  sync(before: Board, after: Board): void {
    this.colors = after.cells.map((cell, i) => {
      const old = before.cells[i];
      return old && old.value === cell.value && !(old.cleared && !cell.cleared)
        ? this.colors[i] ?? this.pick() : this.pick();
    });
  }
  at(index: number): number { return this.colors[index] ?? 1; }
  private pick(): number { return Math.floor(this.random() * 9) + 1; }
}
