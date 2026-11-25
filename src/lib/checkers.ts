/**
 * English draughts on an 8×8 board. Men move and capture forward; kings move
 * and capture both ways. Captures are forced, and a jump chain must be played
 * to its end. A man promotes only when the chain ends on the back rank.
 */

export type CheckerColor = 'w' | 'b';
export type CheckerResult = CheckerColor | 'draw';

export interface CheckerPiece {
  color: CheckerColor;
  king: boolean;
}

export type CheckersBoard = (CheckerPiece | null)[];

export interface CheckerMove {
  from: number;
  to: number;
  /** every square visited, ending on `to` */
  path: number[];
  /** every captured square */
  captures: number[];
}

export interface CheckersState {
  board: CheckersBoard;
  turn: CheckerColor;
  /** plies since the last capture or promotion, for the draw rule */
  idle: number;
}

export const CHECKERS_SIZE = 8;
const DRAW_AFTER = 80;

const MAN_DIRS: Record<CheckerColor, readonly (readonly [number, number])[]> = {
  w: [[-1, -1], [-1, 1]],
  b: [[1, -1], [1, 1]],
};

const KING_DIRS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function inside(row: number, col: number): boolean {
  return row >= 0 && row < CHECKERS_SIZE && col >= 0 && col < CHECKERS_SIZE;
}

function indexOf(row: number, col: number): number {
  return row * CHECKERS_SIZE + col;
}

export function otherColor(color: CheckerColor): CheckerColor {
  return color === 'w' ? 'b' : 'w';
}

export function startCheckers(): CheckersState {
  const board: CheckersBoard = Array.from({ length: 64 }, () => null);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < CHECKERS_SIZE; col++) {
      if ((row + col) % 2 === 1) board[indexOf(row, col)] = { color: 'b', king: false };
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < CHECKERS_SIZE; col++) {
      if ((row + col) % 2 === 1) board[indexOf(row, col)] = { color: 'w', king: false };
    }
  }
  return { board, turn: 'w', idle: 0 };
}

function directions(piece: CheckerPiece): readonly (readonly [number, number])[] {
  return piece.king ? KING_DIRS : MAN_DIRS[piece.color];
}

function promotes(piece: CheckerPiece, row: number): boolean {
  return !piece.king && ((piece.color === 'w' && row === 0) || (piece.color === 'b' && row === 7));
}

/** All complete jump chains that start at `from`. */
function jumpChains(
  board: CheckersBoard,
  from: number,
  piece: CheckerPiece,
  path: number[],
  captures: number[],
): CheckerMove[] {
  const row = Math.floor(from / CHECKERS_SIZE);
  const col = from % CHECKERS_SIZE;
  const found: CheckerMove[] = [];

  for (const [dr, dc] of directions(piece)) {
    const midRow = row + dr;
    const midCol = col + dc;
    const toRow = row + dr * 2;
    const toCol = col + dc * 2;
    if (!inside(midRow, midCol) || !inside(toRow, toCol)) continue;

    const mid = indexOf(midRow, midCol);
    const to = indexOf(toRow, toCol);
    const target = board[mid];
    if (!target || target.color === piece.color || board[to]) continue;

    const nextBoard = board.slice();
    nextBoard[from] = null;
    nextBoard[mid] = null;
    nextBoard[to] = piece;

    const nextPath = [...path, to];
    const nextCaptures = [...captures, mid];
    const crowned = promotes(piece, toRow);
    const continuations = crowned
      ? []
      : jumpChains(nextBoard, to, piece, nextPath, nextCaptures);

    if (continuations.length) found.push(...continuations);
    else found.push({ from: path[0], to, path: nextPath, captures: nextCaptures });
  }

  return found;
}

/** Legal moves for a side. If any jump exists, only jumps are returned. */
export function checkersMoves(state: CheckersState, color: CheckerColor = state.turn): CheckerMove[] {
  const jumps: CheckerMove[] = [];
  for (let i = 0; i < state.board.length; i++) {
    const piece = state.board[i];
    if (!piece || piece.color !== color) continue;
    jumps.push(...jumpChains(state.board, i, piece, [i], []));
  }
  if (jumps.length) return jumps;

  const moves: CheckerMove[] = [];
  for (let i = 0; i < state.board.length; i++) {
    const piece = state.board[i];
    if (!piece || piece.color !== color) continue;
    const row = Math.floor(i / CHECKERS_SIZE);
    const col = i % CHECKERS_SIZE;
    for (const [dr, dc] of directions(piece)) {
      const toRow = row + dr;
      const toCol = col + dc;
      if (!inside(toRow, toCol)) continue;
      const to = indexOf(toRow, toCol);
      if (state.board[to]) continue;
      moves.push({ from: i, to, path: [i, to], captures: [] });
    }
  }
  return moves;
}

export function applyCheckersMove(state: CheckersState, move: CheckerMove): CheckersState {
  const piece = state.board[move.from];
  if (!piece) return state;
  const board = state.board.slice();
  board[move.from] = null;
  for (const square of move.captures) board[square] = null;
  const row = Math.floor(move.to / CHECKERS_SIZE);
  board[move.to] = { color: piece.color, king: piece.king || promotes(piece, row) };
  const crowned = !piece.king && promotes(piece, row);
  return {
    board,
    turn: otherColor(state.turn),
    idle: move.captures.length || crowned ? 0 : state.idle + 1,
  };
}

/** null while play continues; otherwise the winner or a draw. */
export function checkersStatus(state: CheckersState): CheckerResult | null {
  const hasPiece = state.board.some((piece) => piece?.color === state.turn);
  if (!hasPiece) return otherColor(state.turn);
  if (!checkersMoves(state).length) return otherColor(state.turn);
  if (state.idle >= DRAW_AFTER) return 'draw';
  return null;
}

export function checkersCounts(board: CheckersBoard): { white: number; black: number; whiteKings: number; blackKings: number } {
  let white = 0;
  let black = 0;
  let whiteKings = 0;
  let blackKings = 0;
  for (const piece of board) {
    if (!piece) continue;
    if (piece.color === 'w') {
      white++;
      if (piece.king) whiteKings++;
    } else {
      black++;
      if (piece.king) blackKings++;
    }
  }
  return { white, black, whiteKings, blackKings };
}

function evaluate(board: CheckersBoard, root: CheckerColor): number {
  let score = 0;
  for (let i = 0; i < board.length; i++) {
    const piece = board[i];
    if (!piece) continue;
    const row = Math.floor(i / CHECKERS_SIZE);
    const col = i % CHECKERS_SIZE;
    const center = 3.5 - Math.abs(3.5 - col);
    const advance = piece.color === 'w' ? 7 - row : row;
    let value = 100 + advance * 3 + center * 2;
    if (piece.king) value += 55;
    // A back-rank man is doing useful defensive work.
    if (!piece.king && ((piece.color === 'w' && row === 7) || (piece.color === 'b' && row === 0))) {
      value += 6;
    }
    score += piece.color === root ? value : -value;
  }
  return score;
}

function search(
  state: CheckersState,
  depth: number,
  alpha: number,
  beta: number,
  root: CheckerColor,
): number {
  const status = checkersStatus(state);
  if (status !== null) {
    if (status === 'draw') return 0;
    return status === root ? 100000 - depth : -100000 + depth;
  }
  if (depth === 0) return evaluate(state.board, root);

  const moves = checkersMoves(state);
  const maximizing = state.turn === root;
  let best = maximizing ? -Infinity : Infinity;

  // Captures first makes alpha-beta cut earlier.
  const ordered = moves.slice().sort((a, b) => b.captures.length - a.captures.length);
  for (const move of ordered) {
    const value = search(applyCheckersMove(state, move), depth - 1, alpha, beta, root);
    if (maximizing) {
      if (value > best) best = value;
      if (best > alpha) alpha = best;
    } else {
      if (value < best) best = value;
      if (best < beta) beta = best;
    }
    if (beta <= alpha) break;
  }
  return best;
}

export type CheckersLevel = 1 | 2;

/**
 * Level 1 looks two plies ahead; level 2 searches four. Both take a capture
 * when it is sound, and both value keeping material over a flashy advance.
 */
export function checkersBot(
  state: CheckersState,
  level: CheckersLevel = 2,
  rnd: () => number = Math.random,
): CheckerMove | null {
  const moves = checkersMoves(state);
  if (!moves.length) return null;
  const depth = level === 1 ? 2 : 4;
  let best: CheckerMove | null = null;
  let bestScore = -Infinity;
  const ordered = moves.slice().sort((a, b) => b.captures.length - a.captures.length);
  for (const move of ordered) {
    const score = search(applyCheckersMove(state, move), depth - 1, -Infinity, Infinity, state.turn);
    // A stable tie-break keeps games replayable while avoiding the same line.
    const jitter = rnd() * 0.001;
    if (score + jitter > bestScore) {
      bestScore = score + jitter;
      best = move;
    }
  }
  return best;
}
