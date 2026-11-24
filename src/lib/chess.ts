/**
 * A small, complete chess engine: legal move generation (castling, en passant,
 * promotion), check / checkmate / stalemate / draws, SAN, and a search-based bot.
 *
 * Board index: 0 = a8, 7 = h8, 56 = a1, 63 = h1. White moves toward lower rows.
 */

export type Color = 'w' | 'b';
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface Piece {
  c: Color;
  k: Kind;
}

export interface ChessMove {
  from: number;
  to: number;
  k: Kind;
  c: Color;
  /** the captured piece, if any */
  capture?: Kind;
  promo?: Kind;
  castle?: 'k' | 'q';
  ep?: boolean;
}

export interface Castling {
  wk: boolean;
  wq: boolean;
  bk: boolean;
  bq: boolean;
}

export interface ChessState {
  board: (Piece | null)[];
  turn: Color;
  castling: Castling;
  ep: number | null;
  half: number;
  full: number;
}

export interface MoveRecord {
  move: ChessMove;
  san: string;
}

export type Outcome =
  | { kind: 'playing' }
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' }
  | { kind: 'draw'; reason: 'material' | 'fifty' | 'repetition' };

export const FILES = 'abcdefgh';
export const PIECE_LETTER: Record<Kind, string> = { p: 'p', n: 'n', b: 'b', r: 'r', q: 'q', k: 'k' };
export const PIECE_NAME: Record<Kind, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const KNIGHT_STEPS: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];
const KING_STEPS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];
const ROOK_DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const BISHOP_DIRS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export function squareName(i: number): string {
  return `${FILES[i % 8]}${8 - (i >> 3)}`;
}

export function squareIndex(name: string): number {
  const f = FILES.indexOf(name[0]);
  const r = 8 - Number(name[1]);
  return r * 8 + f;
}

export function isLightSquare(i: number): boolean {
  return ((i >> 3) + (i % 8)) % 2 === 0;
}

export function initialState(): ChessState {
  const board = Array<Piece | null>(64).fill(null);
  const back: Kind[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    board[f] = { c: 'b', k: back[f] };
    board[8 + f] = { c: 'b', k: 'p' };
    board[48 + f] = { c: 'w', k: 'p' };
    board[56 + f] = { c: 'w', k: back[f] };
  }
  return {
    board,
    turn: 'w',
    castling: { wk: true, wq: true, bk: true, bq: true },
    ep: null,
    half: 0,
    full: 1,
  };
}

export function kingSquare(board: (Piece | null)[], color: Color): number {
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (p && p.c === color && p.k === 'k') return i;
  }
  return -1;
}

/** Is `sq` attacked by any piece of `by`? */
export function attacked(board: (Piece | null)[], sq: number, by: Color): boolean {
  const r = sq >> 3;
  const f = sq & 7;

  /* Pawns: a white pawn attacks upward, so it sits one row below the target. */
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const df of [-1, 1]) {
    const pf = f + df;
    if (pr < 0 || pr > 7 || pf < 0 || pf > 7) continue;
    const p = board[pr * 8 + pf];
    if (p && p.c === by && p.k === 'p') return true;
  }

  for (const [dr, df] of KNIGHT_STEPS) {
    const rr = r + dr;
    const ff = f + df;
    if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
    const p = board[rr * 8 + ff];
    if (p && p.c === by && p.k === 'n') return true;
  }

  for (const [dr, df] of KING_STEPS) {
    const rr = r + dr;
    const ff = f + df;
    if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
    const p = board[rr * 8 + ff];
    if (p && p.c === by && p.k === 'k') return true;
  }

  for (const [dr, df] of ROOK_DIRS) {
    let rr = r + dr;
    let ff = f + df;
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
      const p = board[rr * 8 + ff];
      if (p) {
        if (p.c === by && (p.k === 'r' || p.k === 'q')) return true;
        break;
      }
      rr += dr;
      ff += df;
    }
  }

  for (const [dr, df] of BISHOP_DIRS) {
    let rr = r + dr;
    let ff = f + df;
    while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
      const p = board[rr * 8 + ff];
      if (p) {
        if (p.c === by && (p.k === 'b' || p.k === 'q')) return true;
        break;
      }
      rr += dr;
      ff += df;
    }
  }

  return false;
}

export function inCheck(s: ChessState, color: Color = s.turn): boolean {
  const k = kingSquare(s.board, color);
  return k >= 0 && attacked(s.board, k, color === 'w' ? 'b' : 'w');
}

function pushPawn(
  moves: ChessMove[],
  from: number,
  to: number,
  p: Piece,
  capture?: Kind,
): void {
  const promoRow = p.c === 'w' ? 0 : 7;
  if (to >> 3 === promoRow) {
    for (const promo of ['q', 'r', 'b', 'n'] as Kind[]) {
      moves.push({ from, to, k: 'p', c: p.c, capture, promo });
    }
  } else {
    moves.push({ from, to, k: 'p', c: p.c, capture });
  }
}

/** Moves that follow the movement rules, but may leave the king in check. */
export function pseudoMoves(s: ChessState, color: Color = s.turn): ChessMove[] {
  const moves: ChessMove[] = [];
  const { board } = s;

  for (let from = 0; from < 64; from++) {
    const p = board[from];
    if (!p || p.c !== color) continue;
    const r = from >> 3;
    const f = from & 7;

    if (p.k === 'p') {
      const dir = p.c === 'w' ? -1 : 1;
      const startRow = p.c === 'w' ? 6 : 1;
      const oneRow = r + dir;
      if (oneRow >= 0 && oneRow <= 7) {
        const one = oneRow * 8 + f;
        if (!board[one]) {
          pushPawn(moves, from, one, p);
          const two = (r + 2 * dir) * 8 + f;
          if (r === startRow && !board[two]) moves.push({ from, to: two, k: 'p', c: p.c });
        }
        for (const df of [-1, 1]) {
          const ff = f + df;
          if (ff < 0 || ff > 7) continue;
          const to = oneRow * 8 + ff;
          const q = board[to];
          if (q && q.c !== p.c) pushPawn(moves, from, to, p, q.k);
          else if (!q && s.ep === to) moves.push({ from, to, k: 'p', c: p.c, capture: 'p', ep: true });
        }
      }
      continue;
    }

    if (p.k === 'n' || p.k === 'k') {
      const steps = p.k === 'n' ? KNIGHT_STEPS : KING_STEPS;
      for (const [dr, df] of steps) {
        const rr = r + dr;
        const ff = f + df;
        if (rr < 0 || rr > 7 || ff < 0 || ff > 7) continue;
        const to = rr * 8 + ff;
        const q = board[to];
        if (q && q.c === p.c) continue;
        moves.push({ from, to, k: p.k, c: p.c, capture: q?.k });
      }
      if (p.k === 'k') {
        const home = p.c === 'w' ? 60 : 4;
        if (from === home && !attacked(board, home, p.c === 'w' ? 'b' : 'w')) {
          const kingRight = p.c === 'w' ? s.castling.wk : s.castling.bk;
          const queenRight = p.c === 'w' ? s.castling.wq : s.castling.bq;
          const enemy = p.c === 'w' ? 'b' : 'w';
          if (
            kingRight &&
            !board[home + 1] &&
            !board[home + 2] &&
            !attacked(board, home + 1, enemy) &&
            !attacked(board, home + 2, enemy)
          ) {
            moves.push({ from, to: home + 2, k: 'k', c: p.c, castle: 'k' });
          }
          if (
            queenRight &&
            !board[home - 1] &&
            !board[home - 2] &&
            !board[home - 3] &&
            !attacked(board, home - 1, enemy) &&
            !attacked(board, home - 2, enemy)
          ) {
            moves.push({ from, to: home - 2, k: 'k', c: p.c, castle: 'q' });
          }
        }
      }
      continue;
    }

    const dirs = p.k === 'r' ? ROOK_DIRS : p.k === 'b' ? BISHOP_DIRS : [...ROOK_DIRS, ...BISHOP_DIRS];
    for (const [dr, df] of dirs) {
      let rr = r + dr;
      let ff = f + df;
      while (rr >= 0 && rr < 8 && ff >= 0 && ff < 8) {
        const to = rr * 8 + ff;
        const q = board[to];
        if (!q) moves.push({ from, to, k: p.k, c: p.c });
        else {
          if (q.c !== p.c) moves.push({ from, to, k: p.k, c: p.c, capture: q.k });
          break;
        }
        rr += dr;
        ff += df;
      }
    }
  }

  return moves;
}

export function applyMove(s: ChessState, m: ChessMove): ChessState {
  const board = s.board.slice();
  const p = board[m.from] ?? { c: m.c, k: m.k };
  board[m.from] = null;
  board[m.to] = m.promo ? { c: p.c, k: m.promo } : p;

  if (m.ep) board[m.to + (p.c === 'w' ? 8 : -8)] = null;

  if (m.castle) {
    const home = m.from;
    if (m.castle === 'k') {
      board[home + 1] = board[home + 3];
      board[home + 3] = null;
    } else {
      board[home - 1] = board[home - 4];
      board[home - 4] = null;
    }
  }

  const castling = { ...s.castling };
  if (p.k === 'k') {
    if (p.c === 'w') {
      castling.wk = false;
      castling.wq = false;
    } else {
      castling.bk = false;
      castling.bq = false;
    }
  }
  if (m.from === 63 || m.to === 63) castling.wk = false;
  if (m.from === 56 || m.to === 56) castling.wq = false;
  if (m.from === 7 || m.to === 7) castling.bk = false;
  if (m.from === 0 || m.to === 0) castling.bq = false;

  const ep = p.k === 'p' && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : null;

  return {
    board,
    turn: p.c === 'w' ? 'b' : 'w',
    castling,
    ep,
    half: m.capture || p.k === 'p' ? 0 : s.half + 1,
    full: s.full + (p.c === 'b' ? 1 : 0),
  };
}

export function legalMoves(s: ChessState, color: Color = s.turn): ChessMove[] {
  const out: ChessMove[] = [];
  const enemy = color === 'w' ? 'b' : 'w';
  for (const m of pseudoMoves(s, color)) {
    const next = applyMove(s, m);
    const k = kingSquare(next.board, color);
    if (k >= 0 && !attacked(next.board, k, enemy)) out.push(m);
  }
  return out;
}

export function insufficientMaterial(board: (Piece | null)[]): boolean {
  const pieces: Piece[] = [];
  for (const p of board) if (p) pieces.push(p);
  if (pieces.length > 4) return false;
  const minors = pieces.filter((p) => p.k === 'n' || p.k === 'b');
  if (pieces.every((p) => p.k === 'k') ) return true;
  if (pieces.length === 3 && minors.length === 1) return true;
  if (pieces.length === 4 && minors.length === 2) {
    return minors.every((p) => p.k === 'b' && p.c !== minors[0].c);
  }
  return false;
}

export function outcome(s: ChessState, repeats = 1): Outcome {
  const moves = legalMoves(s);
  if (!moves.length) {
    if (inCheck(s)) return { kind: 'checkmate', winner: s.turn === 'w' ? 'b' : 'w' };
    return { kind: 'stalemate' };
  }
  if (s.half >= 100) return { kind: 'draw', reason: 'fifty' };
  if (insufficientMaterial(s.board)) return { kind: 'draw', reason: 'material' };
  if (repeats >= 3) return { kind: 'draw', reason: 'repetition' };
  return { kind: 'playing' };
}

export function positionKey(s: ChessState): string {
  let key = '';
  for (const p of s.board) key += p ? (p.c === 'w' ? p.k.toUpperCase() : p.k) : '.';
  const { wk, wq, bk, bq } = s.castling;
  return `${key}|${s.turn}|${wk ? 'K' : ''}${wq ? 'Q' : ''}${bk ? 'k' : ''}${bq ? 'q' : ''}|${s.ep ?? '-'}`;
}

/** Standard algebraic notation, including disambiguation and check/mate marks. */
export function sanFor(s: ChessState, m: ChessMove, legal?: ChessMove[]): string {
  const next = applyMove(s, m);
  const moves = legal ?? legalMoves(s, m.c);
  let san: string;

  if (m.castle === 'k') san = 'O-O';
  else if (m.castle === 'q') san = 'O-O-O';
  else if (m.k === 'p') {
    san = m.capture ? `${FILES[m.from % 8]}x${squareName(m.to)}` : squareName(m.to);
    if (m.promo) san += `=${PIECE_LETTER[m.promo].toUpperCase()}`;
  } else {
    const rivals = moves.filter(
      (o) =>
        o !== m &&
        o.k === m.k &&
        o.to === m.to &&
        o.from !== m.from &&
        applyMove(s, o).board[m.to]?.k === m.k,
    );
    let disamb = '';
    if (rivals.length) {
      const sameFile = rivals.some((o) => o.from % 8 === m.from % 8);
      const sameRank = rivals.some((o) => o.from >> 3 === m.from >> 3);
      if (!sameFile) disamb = FILES[m.from % 8];
      else if (!sameRank) disamb = String(8 - (m.from >> 3));
      else disamb = squareName(m.from);
    }
    san = `${PIECE_LETTER[m.k].toUpperCase()}${disamb}${m.capture ? 'x' : ''}${squareName(m.to)}`;
  }

  const enemy = next.turn;
  if (inCheck(next, enemy)) san += legalMoves(next).length ? '+' : '#';
  return san;
}

/* ------------------------------------------------------------------ evaluation */

const VALUE: Record<Kind, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

/* Piece-square tables, from White's side. Index 0 is a8. */
const PST: Record<Kind, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    60, 60, 60, 60, 60, 60, 60, 60,
    12, 16, 22, 30, 30, 22, 16, 12,
    6, 10, 14, 24, 24, 14, 10, 6,
    2, 6, 10, 16, 16, 10, 6, 2,
    2, 2, 6, 10, 10, 6, 2, 2,
    2, 2, 2, -8, -8, 2, 2, 2,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -30, -20, -20, -20, -20, -30, -50,
    -30, -12, 2, 4, 4, 2, -12, -30,
    -20, 6, 14, 18, 18, 14, 6, -20,
    -20, 4, 18, 24, 24, 18, 4, -20,
    -20, 2, 16, 22, 22, 16, 2, -20,
    -20, 6, 14, 16, 16, 14, 6, -20,
    -30, -12, 2, 6, 6, 2, -12, -30,
    -50, -30, -20, -20, -20, -20, -30, -50,
  ],
  b: [
    -18, -8, -8, -8, -8, -8, -8, -18,
    -8, 4, 2, 2, 2, 2, 4, -8,
    -8, 8, 8, 10, 10, 8, 8, -8,
    -8, 2, 12, 14, 14, 12, 2, -8,
    -8, 4, 10, 14, 14, 10, 4, -8,
    -8, 8, 10, 10, 10, 10, 8, -8,
    -8, 10, 4, 8, 8, 4, 10, -8,
    -18, -8, -8, -8, -8, -8, -8, -18,
  ],
  r: [
    2, 4, 6, 8, 8, 6, 4, 2,
    10, 14, 14, 14, 14, 14, 14, 10,
    -4, 2, 2, 2, 2, 2, 2, -4,
    -4, 2, 2, 2, 2, 2, 2, -4,
    -4, 2, 2, 2, 2, 2, 2, -4,
    -4, 2, 2, 2, 2, 2, 2, -4,
    -4, 2, 2, 2, 2, 2, 2, -4,
    0, 4, 6, 8, 8, 6, 4, 0,
  ],
  q: [
    -18, -8, -8, -4, -4, -8, -8, -18,
    -8, 0, 2, 0, 0, 0, 0, -8,
    -8, 2, 6, 6, 6, 6, 2, -8,
    -4, 0, 6, 8, 8, 6, 0, -4,
    -4, 0, 6, 8, 8, 6, 0, -4,
    -8, 2, 6, 6, 6, 6, 2, -8,
    -8, 0, 2, 0, 0, 0, 0, -8,
    -18, -8, -8, -4, -4, -8, -8, -18,
  ],
  k: [
    -60, -70, -70, -80, -80, -70, -70, -60,
    -60, -70, -70, -80, -80, -70, -70, -60,
    -60, -70, -70, -80, -80, -70, -70, -60,
    -60, -70, -70, -80, -80, -70, -70, -60,
    -40, -50, -50, -60, -60, -50, -50, -40,
    -20, -30, -30, -40, -40, -30, -30, -20,
    20, 20, -10, -10, -10, -10, 20, 20,
    20, 40, 10, 0, 0, 10, 40, 20,
  ],
};

function evaluateForWhite(board: (Piece | null)[]): number {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = board[i];
    if (!p) continue;
    const table = PST[p.k];
    const sq = p.c === 'w' ? i : (7 - (i >> 3)) * 8 + (i & 7);
    const v = VALUE[p.k] + table[sq];
    score += p.c === 'w' ? v : -v;
  }
  return score;
}

export function evaluate(s: ChessState): number {
  return s.turn === 'w' ? evaluateForWhite(s.board) : -evaluateForWhite(s.board);
}

const MATE = 100_000;

function orderMoves(moves: ChessMove[]): ChessMove[] {
  return moves
    .map((m) => ({
      m,
      score:
        (m.capture ? 10 * VALUE[m.capture] - VALUE[m.k] : 0) +
        (m.promo ? VALUE[m.promo] : 0) +
        (m.castle ? 40 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.m);
}

function negamax(s: ChessState, depth: number, alpha: number, beta: number, ply: number): number {
  const moves = legalMoves(s);
  if (!moves.length) return inCheck(s) ? -MATE + ply : 0;
  if (depth <= 0) return evaluate(s);

  let best = -Infinity;
  for (const m of orderMoves(moves)) {
    const v = -negamax(applyMove(s, m), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (v > alpha) alpha = v;
    if (alpha >= beta) break;
  }
  return best;
}

export type BotLevel = 1 | 2 | 3;

/**
 * Picks a move. `rnd` returns [0, 1); passing a seeded generator makes the
 * bot's choices reproducible, which is what the daily game needs.
 */
export function chooseMove(s: ChessState, level: BotLevel, rnd: () => number): ChessMove | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];

  if (level === 1) {
    if (rnd() < 0.22) return moves[Math.floor(rnd() * moves.length)];
    const scored = moves.map((m) => ({
      m,
      v: -evaluate(applyMove(s, m)) + (m.capture ? VALUE[m.capture] * 0.5 : 0),
    }));
    scored.sort((a, b) => b.v - a.v);
    const pool = scored.slice(0, 3);
    return pool[Math.floor(rnd() * pool.length)].m;
  }

  const depth = level === 2 ? 2 : 3;
  const scored: { m: ChessMove; v: number }[] = [];
  let alpha = -Infinity;
  for (const m of orderMoves(moves)) {
    const v = -negamax(applyMove(s, m), depth - 1, -Infinity, -alpha, 1);
    scored.push({ m, v });
    if (v > alpha) alpha = v;
  }
  scored.sort((a, b) => b.v - a.v);
  const best = scored[0].v;
  const window = level === 2 ? 40 : 12;
  const pool = scored.filter((x) => x.v >= best - window);
  return pool[Math.floor(rnd() * pool.length)].m;
}

/** A hint for the player: the engine's best move at a shallow depth. */
export function bestMove(s: ChessState): ChessMove | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  let best: ChessMove | null = null;
  let bestV = -Infinity;
  for (const m of orderMoves(moves)) {
    const v = -negamax(applyMove(s, m), 1, -Infinity, Infinity, 1);
    if (v > bestV) {
      bestV = v;
      best = m;
    }
  }
  return best;
}

/** Reads a FEN position. Returns null for anything that is not a legal 8×8 board. */
export function parseFen(fen: string): ChessState | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const [placement, turn, castlingPart, epPart, halfPart, fullPart] = parts;
  if (turn !== 'w' && turn !== 'b') return null;

  const rows = placement.split('/');
  if (rows.length !== 8) return null;

  const board = Array<Piece | null>(64).fill(null);
  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of rows[r]) {
      if (ch >= '1' && ch <= '8') {
        f += Number(ch);
        continue;
      }
      const kind = ch.toLowerCase();
      if (!'pnbrqk'.includes(kind) || f > 7) return null;
      board[r * 8 + f] = { c: ch === kind ? 'b' : 'w', k: kind as Kind };
      f += 1;
    }
    if (f !== 8) return null;
  }

  if (kingSquare(board, 'w') < 0 || kingSquare(board, 'b') < 0) return null;

  const ep = epPart && epPart !== '-' ? squareIndex(epPart) : null;
  if (ep !== null && (Number.isNaN(ep) || ep < 0 || ep > 63)) return null;

  return {
    board,
    turn,
    castling: {
      wk: castlingPart.includes('K'),
      wq: castlingPart.includes('Q'),
      bk: castlingPart.includes('k'),
      bq: castlingPart.includes('q'),
    },
    ep,
    half: Math.max(0, Number(halfPart ?? 0) || 0),
    full: Math.max(1, Number(fullPart ?? 1) || 1),
  };
}

/** Replays a list of moves from a position; used to restore a game. */
export function replay(moves: ChessMove[], start: ChessState = initialState()): ChessState {
  let s = start;
  for (const m of moves) {
    const legal = legalMoves(s);
    const found = legal.find(
      (o) =>
        o.from === m.from &&
        o.to === m.to &&
        o.promo === m.promo &&
        o.castle === m.castle &&
        o.ep === m.ep,
    );
    if (!found) break;
    s = applyMove(s, found);
  }
  return s;
}
