import type { Board } from '../core/types';

/** Presentation-only randomness; never consumes the puzzle generator's seed. */
export class BlockColors {
  private colors: number[] = [];
  constructor(private readonly random = () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296) {}
  reset(board: Board): void {
    this.colors = board.cells.map(() => 0);
    this.fill(board);
  }
  sync(before: Board, after: Board): void {
    this.colors = after.cells.map((cell, i) => {
      const old = before.cells[i];
      return old && old.value === cell.value && !(old.cleared && !cell.cleared)
        ? this.colors[i] ?? 0 : 0;
    });
    this.fill(after);
  }
  at(index: number): number { return this.colors[index] ?? 1; }
  private fill(board: Board): void {
    const counts = Array<number>(10).fill(0);
    this.colors.forEach((color, i) => {
      if (color && !board.cells[i]!.cleared) counts[color]!++;
    });
    this.colors.forEach((color, i) => {
      if (color || board.cells[i]!.cleared) return;
      const neighbors = [i - board.width, i + board.width];
      if (i % board.width > 0) neighbors.push(i - 1);
      if (i % board.width < board.width - 1) neighbors.push(i + 1);
      const adjacent = new Set(neighbors.filter(j => board.cells[j] && !board.cells[j]!.cleared).map(j => this.colors[j]));
      const available = [1,2,3,4,5,6,7,8,9].filter(c => !adjacent.has(c));
      const least = Math.min(...available.map(c => counts[c]!));
      const choices = available.filter(c => counts[c] === least);
      const chosen = choices[Math.floor(this.random() * choices.length)]!;
      this.colors[i] = chosen;
      counts[chosen]!++;
    });
  }
}
