/**
 * Mancala (Kalah) on a fourteen-cup board.
 *
 * Cups 0–5 belong to you with the store at 6; cups 7–12 belong to the bot with
 * the store at 13. Sowing runs counter-clockwise, so the indices simply rise.
 * Pure functions only: the screen owns the clock and the animation.
 */

export type MancalaPlayer = 0 | 1;
export type MancalaBoard = readonly number[];
export type MancalaWinner = MancalaPlayer | 'draw' | null;

export const MANCALA_PITS = 6;
export const MANCALA_SIZE = 14;
export const MANCALA_STORE = [6, 13] as const;

export interface MancalaSow {
  board: number[];
  /** the last stone landed in the player's own store */
  extra: boolean;
  /** number of stones captured, counting the capturing stone */
  captured: number;
  finished: boolean;
  winner: MancalaWinner;
}

export function newMancala(): number[] {
  return [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0];
}

export function mancalaPits(player: MancalaPlayer): number[] {
  const start = player === 0 ? 0 : 7;
  return Array.from({ length: MANCALA_PITS }, (_, i) => start + i);
}

export function mancalaSide(board: MancalaBoard, player: MancalaPlayer): number {
  return mancalaPits(player).reduce((sum, pit) => sum + board[pit], 0);
}

export function mancalaLegal(board: MancalaBoard, player: MancalaPlayer): number[] {
  return mancalaPits(player).filter((pit) => board[pit] > 0);
}

export function mancalaFinished(board: MancalaBoard): boolean {
  return mancalaSide(board, 0) === 0 || mancalaSide(board, 1) === 0;
}

export function mancalaWinner(board: MancalaBoard): MancalaWinner {
  if (!mancalaFinished(board)) return null;
  if (board[MANCALA_STORE[0]] > board[MANCALA_STORE[1]]) return 0;
  if (board[MANCALA_STORE[1]] > board[MANCALA_STORE[0]]) return 1;
  return 'draw';
}

/** Sow one cup. Returns null for an empty cup or a cup that is not the player's. */
export function mancalaSow(
  board: MancalaBoard,
  player: MancalaPlayer,
  pit: number,
): MancalaSow | null {
  if (!mancalaPits(player).includes(pit) || board[pit] <= 0) return null;

  const next = [...board];
  let stones = next[pit];
  next[pit] = 0;
  let last = pit;
  const opponentStore = MANCALA_STORE[player === 0 ? 1 : 0];

  while (stones > 0) {
    last = (last + 1) % MANCALA_SIZE;
    if (last === opponentStore) continue;
    next[last] += 1;
    stones -= 1;
  }

  let captured = 0;
  const ownStart = player === 0 ? 0 : 7;
  const inOwnPits = last >= ownStart && last < ownStart + MANCALA_PITS;
  const isStore = last === MANCALA_STORE[player];
  const extra = isStore;

  if (!isStore && inOwnPits && next[last] === 1) {
    const opposite = 12 - last;
    if (next[opposite] > 0) {
      captured = next[opposite] + 1;
      next[MANCALA_STORE[player]] += captured;
      next[last] = 0;
      next[opposite] = 0;
    }
  }

  if (mancalaFinished(next)) {
    for (const side of [0, 1] as const) {
      const remaining = mancalaSide(next, side);
      if (remaining > 0) {
        next[MANCALA_STORE[side]] += remaining;
        for (const own of mancalaPits(side)) next[own] = 0;
      }
    }
  }

  return {
    board: next,
    extra: extra && !mancalaFinished(next),
    captured,
    finished: mancalaFinished(next),
    winner: mancalaWinner(next),
  };
}

function value(board: MancalaBoard, player: MancalaPlayer): number {
  const opponent: MancalaPlayer = player === 0 ? 1 : 0;
  return (board[MANCALA_STORE[player]] - board[MANCALA_STORE[opponent]]) * 10 +
    (mancalaSide(board, player) - mancalaSide(board, opponent)) * 0.25;
}

function search(
  board: MancalaBoard,
  turn: MancalaPlayer,
  depth: number,
  alpha: number,
  beta: number,
  bot: MancalaPlayer,
): number {
  if (depth <= 0 || mancalaFinished(board)) return value(board, bot);

  const moves = mancalaLegal(board, turn);
  if (moves.length === 0) return value(board, bot);

  if (turn === bot) {
    let best = -Infinity;
    for (const move of moves) {
      const result = mancalaSow(board, turn, move);
      if (!result) continue;
      const nextTurn: MancalaPlayer =
        result.finished ? turn : result.extra ? turn : turn === 0 ? 1 : 0;
      const score = result.finished
        ? value(result.board, bot)
        : search(result.board, nextTurn, depth - 1, alpha, beta, bot);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    const result = mancalaSow(board, turn, move);
    if (!result) continue;
    const nextTurn: MancalaPlayer =
      result.finished ? turn : result.extra ? turn : turn === 0 ? 1 : 0;
    const score = result.finished
      ? value(result.board, bot)
      : search(result.board, nextTurn, depth - 1, alpha, beta, bot);
    if (score < best) best = score;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Pick a cup. Both levels play legally; the sharp one looks four sowing turns
 * ahead. Ties are broken by the supplied seeded generator so a daily board is
 * reproducible.
 */
export function mancalaBot(
  board: MancalaBoard,
  player: MancalaPlayer,
  level: 1 | 2 = 2,
  rnd: () => number = Math.random,
): number | null {
  const moves = mancalaLegal(board, player);
  if (moves.length === 0) return null;

  const depth = level === 1 ? 2 : 4;
  let best = -Infinity;
  let choices: number[] = [];

  for (const move of moves) {
    const result = mancalaSow(board, player, move);
    if (!result) continue;
    const score = result.finished
      ? value(result.board, player)
      : search(result.board, result.extra ? player : player === 0 ? 1 : 0, depth - 1, -Infinity, Infinity, player);
    if (score > best + 1e-9) {
      best = score;
      choices = [move];
    } else if (Math.abs(score - best) <= 1e-9) {
      choices.push(move);
    }
  }

  return choices.length ? choices[Math.floor(rnd() * choices.length)] : moves[0];
}
