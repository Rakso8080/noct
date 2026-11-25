/** Connect Four: 7 columns, 6 rows, gravity, four-in-a-row in any direction. */

export const C4_COLS = 7;
export const C4_ROWS = 6;

export type C4Cell = 0 | 1 | 2;
export type C4Board = C4Cell[];
export type C4Player = 1 | 2;

export function startConnect4(): C4Board {
  return Array.from({ length: C4_ROWS * C4_COLS }, () => 0 as C4Cell);
}

export function c4Index(row: number, col: number): number {
  return row * C4_COLS + col;
}

export function c4DropRow(board: C4Board, col: number): number | null {
  if (col < 0 || col >= C4_COLS) return null;
  for (let row = C4_ROWS - 1; row >= 0; row--) {
    if (board[c4Index(row, col)] === 0) return row;
  }
  return null;
}

export function c4Drop(board: C4Board, col: number, player: C4Player): C4Board | null {
  const row = c4DropRow(board, col);
  if (row === null) return null;
  const next = board.slice();
  next[c4Index(row, col)] = player;
  return next;
}

export function c4LegalColumns(board: C4Board): number[] {
  const columns: number[] = [];
  for (let col = 0; col < C4_COLS; col++) {
    if (board[c4Index(0, col)] === 0) columns.push(col);
  }
  return columns;
}

const LINES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** The four cells of a winning line, or null. */
export function c4WinningLine(board: C4Board): number[] | null {
  for (let row = 0; row < C4_ROWS; row++) {
    for (let col = 0; col < C4_COLS; col++) {
      const player = board[c4Index(row, col)];
      if (player === 0) continue;
      for (const [dr, dc] of LINES) {
        const line: number[] = [];
        for (let step = 0; step < 4; step++) {
          const r = row + dr * step;
          const c = col + dc * step;
          if (r < 0 || r >= C4_ROWS || c < 0 || c >= C4_COLS) break;
          if (board[c4Index(r, c)] !== player) break;
          line.push(c4Index(r, c));
        }
        if (line.length === 4) return line;
      }
    }
  }
  return null;
}

export function c4Winner(board: C4Board): C4Player | null {
  const line = c4WinningLine(board);
  return line ? (board[line[0]] as C4Player) : null;
}

export function c4Full(board: C4Board): boolean {
  return board.every((cell) => cell !== 0);
}

export function c4Status(board: C4Board): C4Player | 'draw' | null {
  const winner = c4Winner(board);
  if (winner) return winner;
  return c4Full(board) ? 'draw' : null;
}

function scoreWindow(window: C4Cell[], player: C4Player): number {
  const mine = window.filter((cell) => cell === player).length;
  const theirs = window.filter((cell) => cell !== 0 && cell !== player).length;
  if (mine && theirs) return 0;
  if (mine === 4) return 10000;
  if (mine === 3) return 90;
  if (mine === 3 - 1 && theirs === 0) return 12;
  if (mine === 2) return 6;
  return 0;
}

function evaluate(board: C4Board, player: C4Player): number {
  let score = 0;
  // The centre column is part of more possible fours.
  for (let row = 0; row < C4_ROWS; row++) {
    const centre = board[c4Index(row, 3)];
    if (centre === player) score += 4;
    else if (centre !== 0) score -= 4;
  }

  for (let row = 0; row < C4_ROWS; row++) {
    for (let col = 0; col < C4_COLS; col++) {
      for (const [dr, dc] of LINES) {
        const endRow = row + dr * 3;
        const endCol = col + dc * 3;
        if (endRow < 0 || endRow >= C4_ROWS || endCol < 0 || endCol >= C4_COLS) continue;
        const window: C4Cell[] = [];
        for (let step = 0; step < 4; step++) {
          window.push(board[c4Index(row + dr * step, col + dc * step)]);
        }
        score += scoreWindow(window, player);
        const other: C4Player = player === 1 ? 2 : 1;
        score -= scoreWindow(window, other) * 1.05;
      }
    }
  }
  return score;
}

function search(
  board: C4Board,
  depth: number,
  alpha: number,
  beta: number,
  player: C4Player,
  turn: C4Player,
): number {
  const status = c4Status(board);
  if (status !== null) {
    if (status === 'draw') return 0;
    return status === player ? 100000 - depth : -100000 + depth;
  }
  if (depth === 0) return evaluate(board, player);

  const columns = c4LegalColumns(board).sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  const maximizing = turn === player;
  let best = maximizing ? -Infinity : Infinity;
  for (const col of columns) {
    const next = c4Drop(board, col, turn);
    if (!next) continue;
    const value = search(next, depth - 1, alpha, beta, player, turn === 1 ? 2 : 1);
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

export type C4Level = 1 | 2;

/**
 * Both levels take an immediate win and block an immediate loss. Level 2 then
 * searches four plies; level 1 uses the same board heuristic without looking
 * past its own turn.
 */
export function c4Bot(
  board: C4Board,
  player: C4Player,
  level: C4Level = 2,
  rnd: () => number = Math.random,
): number | null {
  const columns = c4LegalColumns(board);
  if (!columns.length) return null;
  const other: C4Player = player === 1 ? 2 : 1;

  for (const col of columns) {
    const next = c4Drop(board, col, player);
    if (next && c4Winner(next) === player) return col;
  }
  for (const col of columns) {
    const next = c4Drop(board, col, other);
    if (next && c4Winner(next) === other) return col;
  }

  const depth = level === 1 ? 2 : 4;
  let best: number | null = null;
  let bestScore = -Infinity;
  const ordered = columns.slice().sort((a, b) => Math.abs(3 - a) - Math.abs(3 - b));
  for (const col of ordered) {
    const next = c4Drop(board, col, player);
    if (!next) continue;
    const score =
      level === 1
        ? evaluate(next, player)
        : search(next, depth - 1, -Infinity, Infinity, player, other);
    const jitter = rnd() * 0.001;
    if (score + jitter > bestScore) {
      bestScore = score + jitter;
      best = col;
    }
  }
  return best ?? columns[0] ?? null;
}
