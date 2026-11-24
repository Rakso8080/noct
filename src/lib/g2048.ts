/**
 * The doubling room. A 4×4 board of lantern counts: a swipe slides every tile,
 * equal neighbours merge once, and a new 2 or 4 appears. The round is won when a
 * tile reaches the goal, and lost when nothing can move.
 */

export const NUM_SIZE = 4;
export const NUM_GOAL = 512;

export type NumDir = 'up' | 'down' | 'left' | 'right';

export interface NumMove {
  board: number[];
  gained: number;
  moved: boolean;
}

const LINES: Record<NumDir, number[][]> = {
  left: [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
    [12, 13, 14, 15],
  ],
  right: [
    [3, 2, 1, 0],
    [7, 6, 5, 4],
    [11, 10, 9, 8],
    [15, 14, 13, 12],
  ],
  up: [
    [0, 4, 8, 12],
    [1, 5, 9, 13],
    [2, 6, 10, 14],
    [3, 7, 11, 15],
  ],
  down: [
    [12, 8, 4, 0],
    [13, 9, 5, 1],
    [14, 10, 6, 2],
    [15, 11, 7, 3],
  ],
};

function collapse(values: number[]): { values: number[]; gained: number } {
  const kept = values.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < kept.length; i++) {
    if (i + 1 < kept.length && kept[i] === kept[i + 1]) {
      const merged = kept[i] * 2;
      out.push(merged);
      gained += merged;
      i++;
    } else {
      out.push(kept[i]);
    }
  }
  while (out.length < values.length) out.push(0);
  return { values: out, gained };
}

export function slide(board: readonly number[], dir: NumDir): NumMove {
  const next = board.slice();
  let gained = 0;
  let moved = false;
  for (const line of LINES[dir]) {
    const before = line.map((i) => next[i]);
    const after = collapse(before);
    gained += after.gained;
    line.forEach((cell, k) => {
      if (next[cell] !== after.values[k]) moved = true;
      next[cell] = after.values[k];
    });
  }
  return { board: next, gained, moved };
}

export function canMove(board: readonly number[]): boolean {
  if (board.some((v) => v === 0)) return true;
  for (let r = 0; r < NUM_SIZE; r++) {
    for (let c = 0; c < NUM_SIZE; c++) {
      const i = r * NUM_SIZE + c;
      if (c + 1 < NUM_SIZE && board[i] === board[i + 1]) return true;
      if (r + 1 < NUM_SIZE && board[i] === board[i + NUM_SIZE]) return true;
    }
  }
  return false;
}

export function maxTile(board: readonly number[]): number {
  return board.reduce((m, v) => Math.max(m, v), 0);
}

export function spawn(board: readonly number[], rnd: () => number): number[] {
  const empty: number[] = [];
  board.forEach((v, i) => {
    if (v === 0) empty.push(i);
  });
  if (!empty.length) return board.slice();
  const at = empty[Math.floor(rnd() * empty.length)];
  const next = board.slice();
  next[at] = rnd() < 0.9 ? 2 : 4;
  return next;
}

export function startBoard(rnd: () => number): number[] {
  let board = Array<number>(NUM_SIZE * NUM_SIZE).fill(0);
  board = spawn(board, rnd);
  board = spawn(board, rnd);
  return board;
}
