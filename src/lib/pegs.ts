/**
 * Peg solitaire on the old seven-by-seven cross.
 *
 * 33 holes, 32 pegs, the centre empty. A move jumps one peg over an adjacent
 * peg into an empty hole and removes the jumped peg. The board is a flat array
 * of 49 cells: -1 is stone, 0 is an empty hole, 1 is a peg.
 */

export type PegBoard = readonly number[];

export const PEG_SIZE = 7;
export const PEG_CENTRE = 3 * PEG_SIZE + 3;

export interface PegMove {
  from: number;
  over: number;
  to: number;
}

const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export function pegInside(row: number, col: number): boolean {
  if (row < 0 || row >= PEG_SIZE || col < 0 || col >= PEG_SIZE) return false;
  return (row >= 2 && row <= 4) || (col >= 2 && col <= 4);
}

export function pegHoles(): number[] {
  const holes: number[] = [];
  for (let row = 0; row < PEG_SIZE; row++) {
    for (let col = 0; col < PEG_SIZE; col++) {
      if (pegInside(row, col)) holes.push(row * PEG_SIZE + col);
    }
  }
  return holes;
}

export const PEG_HOLES = pegHoles();

/** The daily cross always opens with the centre hole, the classic game. */
export function newPegs(empty: number = PEG_CENTRE): number[] {
  const board = Array.from({ length: PEG_SIZE * PEG_SIZE }, () => -1);
  for (const hole of PEG_HOLES) board[hole] = 1;
  if (PEG_HOLES.includes(empty)) board[empty] = 0;
  return board;
}

export function pegCount(board: PegBoard): number {
  return board.reduce((count, cell) => count + (cell === 1 ? 1 : 0), 0);
}

export function pegMoves(board: PegBoard): PegMove[] {
  const moves: PegMove[] = [];
  for (const from of PEG_HOLES) {
    if (board[from] !== 1) continue;
    const row = Math.floor(from / PEG_SIZE);
    const col = from % PEG_SIZE;
    for (const [dr, dc] of DIRECTIONS) {
      const overRow = row + dr;
      const overCol = col + dc;
      const toRow = row + dr * 2;
      const toCol = col + dc * 2;
      if (!pegInside(overRow, overCol) || !pegInside(toRow, toCol)) continue;
      const over = overRow * PEG_SIZE + overCol;
      const to = toRow * PEG_SIZE + toCol;
      if (board[over] === 1 && board[to] === 0) moves.push({ from, over, to });
    }
  }
  return moves;
}

export function pegApply(board: PegBoard, move: PegMove): number[] {
  if (board[move.from] !== 1 || board[move.over] !== 1 || board[move.to] !== 0) {
    return [...board];
  }
  const next = [...board];
  next[move.from] = 0;
  next[move.over] = 0;
  next[move.to] = 1;
  return next;
}

export function pegFinished(board: PegBoard): boolean {
  return pegCount(board) <= 1 || pegMoves(board).length === 0;
}

/** One-press help: the first legal jump, preferring jumps toward the centre. */
export function pegHint(board: PegBoard): PegMove | null {
  const moves = pegMoves(board);
  if (moves.length === 0) return null;
  const centreRow = Math.floor(PEG_CENTRE / PEG_SIZE);
  const centreCol = PEG_CENTRE % PEG_SIZE;
  const distance = (cell: number) =>
    Math.abs(Math.floor(cell / PEG_SIZE) - centreRow) +
    Math.abs((cell % PEG_SIZE) - centreCol);
  return [...moves].sort((a, b) => distance(a.to) - distance(b.to))[0] ?? null;
}
