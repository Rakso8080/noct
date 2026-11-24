/**
 * The turning table: Reversi on an 8×8 board. You play white, the bot plays
 * black; a move must trap at least one enemy line, and the round ends when
 * neither side can move. Most discs wins.
 */

export const REV_SIZE = 8;
export const REV_CELLS = REV_SIZE * REV_SIZE;

/** 0 empty, 1 white (you), 2 black (bot). */
export type Disc = 0 | 1 | 2;

const DIRS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export function startReversi(): Disc[] {
  const board = Array<Disc>(REV_CELLS).fill(0);
  const at = (r: number, c: number) => r * REV_SIZE + c;
  board[at(3, 3)] = 1;
  board[at(4, 4)] = 1;
  board[at(3, 4)] = 2;
  board[at(4, 3)] = 2;
  return board;
}

export function flipsFor(board: readonly Disc[], index: number, player: Disc): number[] {
  if (board[index] !== 0 || player === 0) return [];
  const row = Math.floor(index / REV_SIZE);
  const col = index % REV_SIZE;
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < REV_SIZE && c >= 0 && c < REV_SIZE) {
      const cell = r * REV_SIZE + c;
      if (board[cell] === 0) break;
      if (board[cell] === player) {
        out.push(...line);
        break;
      }
      line.push(cell);
      r += dr;
      c += dc;
    }
  }
  return out;
}

export function legalMoves(board: readonly Disc[], player: Disc): number[] {
  const out: number[] = [];
  for (let i = 0; i < REV_CELLS; i++) {
    if (board[i] === 0 && flipsFor(board, i, player).length) out.push(i);
  }
  return out;
}

export function place(board: readonly Disc[], index: number, player: Disc): Disc[] | null {
  const flips = flipsFor(board, index, player);
  if (!flips.length) return null;
  const next = board.slice();
  next[index] = player;
  for (const i of flips) next[i] = player;
  return next;
}

export function scores(board: readonly Disc[]): { white: number; black: number } {
  let white = 0;
  let black = 0;
  for (const d of board) {
    if (d === 1) white++;
    else if (d === 2) black++;
  }
  return { white, black };
}

/** Corners are worth keeping; edges are cheap; interior moves hand the bot options. */
function weight(index: number): number {
  const row = Math.floor(index / REV_SIZE);
  const col = index % REV_SIZE;
  const edgeRow = row === 0 || row === REV_SIZE - 1;
  const edgeCol = col === 0 || col === REV_SIZE - 1;
  if (edgeRow && edgeCol) return 6;
  if (edgeRow || edgeCol) return 2;
  return 0;
}

export function botMove(board: readonly Disc[], player: Disc, rnd: () => number): number | null {
  const legal = legalMoves(board, player);
  if (!legal.length) return null;
  let best = -Infinity;
  let pick = legal[0];
  for (const move of legal) {
    const flips = flipsFor(board, move, player);
    const score = weight(move) + flips.length * 0.4 + rnd() * 0.3;
    if (score > best) {
      best = score;
      pick = move;
    }
  }
  return pick;
}
