/** Local records for the side games: one key, merged over defaults on read. */
import type { ChessMove } from './chess';
import { dayNumber } from '../../shared/dates.ts';

export type ChessLevel = 1 | 2 | 3;
export type ChessResult = 'win' | 'loss' | 'draw';

export interface SavedChess {
  day: number;
  mode: 'daily' | 'free';
  level: ChessLevel;
  side: 'w' | 'b';
  moves: ChessMove[];
  /** set when the game started from a shared position */
  fen?: string;
  /** true once the game is over, so a reopened game is not counted twice */
  finished?: boolean;
}

export interface MinesDay {
  won: boolean;
  ms: number;
  at: number;
}

export interface PairsDay {
  moves: number;
  ms: number;
}

export interface LightsDay {
  moves: number;
}

export interface SnakeDay {
  steps: number;
  apples: number;
  won: boolean;
}

export interface NumbersDay {
  score: number;
  tile: number;
  won: boolean;
}

export interface ReversiDay {
  margin: number;
  discs: number;
  moves: number;
}

export interface SavedSnakeRound {
  day: number;
  snake: number[];
  food: number;
  steps: number;
  apples: number;
  dir: 'up' | 'down' | 'left' | 'right';
}

export interface SavedNumbersRound {
  day: number;
  board: number[];
  score: number;
  moves: number;
}

export interface SavedReversiRound {
  day: number;
  board: number[];
  turn: 1 | 2;
  moves: number;
}

export interface GamesStore {
  snake: {
    best: number | null;
    wins: number;
    daily: Record<string, SnakeDay>;
    saved: SavedSnakeRound | null;
  };
  numbers: {
    bestScore: number | null;
    bestTile: number | null;
    wins: number;
    daily: Record<string, NumbersDay>;
    saved: SavedNumbersRound | null;
  };
  reversi: {
    bestMargin: number | null;
    wins: number;
    losses: number;
    draws: number;
    daily: Record<string, ReversiDay>;
    saved: SavedReversiRound | null;
  };
  mines: { best: Record<string, number>; bestFree: number | null; daily: Record<string, MinesDay> };
  pairs: {
    bestMoves: number | null;
    bestMs: number | null;
    bestFreeMoves: number | null;
    bestFreeMs: number | null;
    daily: Record<string, PairsDay>;
  };
  lights: { bestMoves: number | null; bestFree: number | null; daily: Record<string, LightsDay> };
  chess: {
    level: ChessLevel;
    side: 'w' | 'b';
    wins: number;
    losses: number;
    draws: number;
    daily: Record<string, { result: ChessResult; level: ChessLevel; plies: number }>;
    saved: SavedChess | null;
  };
}

const KEY = 'noct.games.v1';

function empty(): GamesStore {
  return {
    snake: { best: null, wins: 0, daily: {}, saved: null },
    numbers: { bestScore: null, bestTile: null, wins: 0, daily: {}, saved: null },
    reversi: { bestMargin: null, wins: 0, losses: 0, draws: 0, daily: {}, saved: null },
    mines: { best: {}, bestFree: null, daily: {} },
    pairs: { bestMoves: null, bestMs: null, bestFreeMoves: null, bestFreeMs: null, daily: {} },
    lights: { bestMoves: null, bestFree: null, daily: {} },
    chess: { level: 2, side: 'w', wins: 0, losses: 0, draws: 0, daily: {}, saved: null },
  };
}

export function readGames(): GamesStore {
  const base = empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<GamesStore>;
    if (!parsed || typeof parsed !== 'object') return base;
    return {
      snake: { ...base.snake, ...parsed.snake, daily: { ...base.snake.daily, ...parsed.snake?.daily } },
      numbers: {
        ...base.numbers,
        ...parsed.numbers,
        daily: { ...base.numbers.daily, ...parsed.numbers?.daily },
      },
      reversi: {
        ...base.reversi,
        ...parsed.reversi,
        daily: { ...base.reversi.daily, ...parsed.reversi?.daily },
      },
      mines: { ...base.mines, ...parsed.mines, best: { ...base.mines.best, ...parsed.mines?.best } },
      pairs: { ...base.pairs, ...parsed.pairs },
      lights: { ...base.lights, ...parsed.lights },
      chess: { ...base.chess, ...parsed.chess },
    };
  } catch {
    return base;
  }
}

function write(store: GamesStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode: the result still shows in this tab */
  }
}

export type GameMode = 'daily' | 'free';

export function recordMines(day: number, won: boolean, ms: number, mode: GameMode = 'daily'): void {
  const store = readGames();
  const key = String(day);
  if (mode === 'daily') {
    const prev = store.mines.daily[key];
    if (!prev || (won && !prev.won) || (won === prev.won && ms < prev.ms)) {
      store.mines.daily[key] = { won, ms, at: Date.now() };
    }
  }
  if (won) {
    if (mode === 'daily') {
      const best = store.mines.best[key];
      if (best === undefined || ms < best) store.mines.best[key] = ms;
    } else if (store.mines.bestFree === null || ms < store.mines.bestFree) {
      store.mines.bestFree = ms;
    }
  }
  write(store);
}

export function recordPairs(day: number, moves: number, ms: number, mode: GameMode = 'daily'): void {
  const store = readGames();
  const key = String(day);
  if (mode === 'daily') {
    const prev = store.pairs.daily[key];
    if (!prev || moves < prev.moves || (moves === prev.moves && ms < prev.ms)) {
      store.pairs.daily[key] = { moves, ms };
    }
    if (store.pairs.bestMoves === null || moves < store.pairs.bestMoves) store.pairs.bestMoves = moves;
    if (store.pairs.bestMs === null || ms < store.pairs.bestMs) store.pairs.bestMs = ms;
  } else {
    if (store.pairs.bestFreeMoves === null || moves < store.pairs.bestFreeMoves) {
      store.pairs.bestFreeMoves = moves;
    }
    if (store.pairs.bestFreeMs === null || ms < store.pairs.bestFreeMs) store.pairs.bestFreeMs = ms;
  }
  write(store);
}

export function recordLights(day: number, moves: number, mode: GameMode = 'daily'): void {
  const store = readGames();
  const key = String(day);
  if (mode === 'daily') {
    const prev = store.lights.daily[key];
    if (!prev || moves < prev.moves) store.lights.daily[key] = { moves };
    if (store.lights.bestMoves === null || moves < store.lights.bestMoves) {
      store.lights.bestMoves = moves;
    }
  } else if (store.lights.bestFree === null || moves < store.lights.bestFree) {
    store.lights.bestFree = moves;
  }
  write(store);
}

export function recordChess(day: number, result: ChessResult, level: ChessLevel, plies: number): void {
  const store = readGames();
  store.chess.daily[String(day)] = { result, level, plies };
  if (result === 'win') store.chess.wins++;
  else if (result === 'loss') store.chess.losses++;
  else store.chess.draws++;
  write(store);
}

export function saveChessGame(saved: SavedChess): void {
  const store = readGames();
  store.chess.saved = saved;
  store.chess.level = saved.level;
  store.chess.side = saved.side;
  write(store);
}

export function clearChessGame(): void {
  const store = readGames();
  store.chess.saved = null;
  write(store);
}

export function recordSnake(day: number, steps: number, apples: number, won: boolean): void {
  const store = readGames();
  const key = String(day);
  const prev = store.snake.daily[key];
  const better = !prev || (won && !prev.won) || (won === prev.won && steps < prev.steps);
  if (better) store.snake.daily[key] = { steps, apples, won };
  if (won) {
    store.snake.wins++;
    if (store.snake.best === null || steps < store.snake.best) store.snake.best = steps;
  }
  write(store);
}

export function recordNumbers(day: number, score: number, tile: number, won: boolean): void {
  const store = readGames();
  const key = String(day);
  const prev = store.numbers.daily[key];
  if (!prev || score > prev.score || (score === prev.score && tile > prev.tile)) {
    store.numbers.daily[key] = { score, tile, won };
  } else if (won && !prev.won) {
    store.numbers.daily[key] = { ...prev, won };
  }
  if (store.numbers.bestScore === null || score > store.numbers.bestScore) store.numbers.bestScore = score;
  if (store.numbers.bestTile === null || tile > store.numbers.bestTile) store.numbers.bestTile = tile;
  if (won) store.numbers.wins++;
  write(store);
}

export function recordReversi(
  day: number,
  result: 'win' | 'loss' | 'draw',
  margin: number,
  discs = 0,
  moves = 0,
): void {
  const store = readGames();
  const key = String(day);
  const prev = store.reversi.daily[key];
  if (!prev || (result === 'win' && margin > prev.margin)) {
    store.reversi.daily[key] = { margin, discs, moves };
  }
  if (result === 'win') {
    store.reversi.wins++;
    if (store.reversi.bestMargin === null || margin > store.reversi.bestMargin) {
      store.reversi.bestMargin = margin;
    }
  } else if (result === 'loss') {
    store.reversi.losses++;
  } else {
    store.reversi.draws++;
  }
  write(store);
}

/* ------------------------------------------------------- unfinished rounds */

export function saveSnakeRound(round: SavedSnakeRound): void {
  const store = readGames();
  store.snake.saved = round;
  write(store);
}

export function clearSnakeRound(): void {
  const store = readGames();
  store.snake.saved = null;
  write(store);
}

export function saveNumbersRound(round: SavedNumbersRound): void {
  const store = readGames();
  store.numbers.saved = round;
  write(store);
}

export function clearNumbersRound(): void {
  const store = readGames();
  store.numbers.saved = null;
  write(store);
}

export function saveReversiRound(round: SavedReversiRound): void {
  const store = readGames();
  store.reversi.saved = round;
  write(store);
}

export function clearReversiRound(): void {
  const store = readGames();
  store.reversi.saved = null;
  write(store);
}

/** Consecutive days that end today or yesterday, for the hub's streak chip. */
export function dayStreak(days: readonly number[], today = dayNumber()): number {
  if (!days.length) return 0;
  const unique = [...new Set(days)].sort((a, b) => b - a);
  if (unique[0] !== today && unique[0] !== today - 1) return 0;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] === unique[i - 1] - 1) run++;
    else break;
  }
  return run;
}

/** Per-game reset for the arcade records, so one game can start over alone. */
export function resetSnake(): void {
  const store = readGames();
  store.snake = { best: null, wins: 0, daily: {}, saved: null };
  write(store);
}

export function resetNumbers(): void {
  const store = readGames();
  store.numbers = { bestScore: null, bestTile: null, wins: 0, daily: {}, saved: null };
  write(store);
}

export function resetReversi(): void {
  const store = readGames();
  store.reversi = { bestMargin: null, wins: 0, losses: 0, draws: 0, daily: {}, saved: null };
  write(store);
}

/** Part of "delete my data": the side games live only in this browser. */
export function clearGames(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

/** The status line under a menu tile: played today or not. */
export function minesToday(day = dayNumber()): MinesDay | null {
  return readGames().mines.daily[String(day)] ?? null;
}

export function pairsToday(day = dayNumber()): PairsDay | null {
  return readGames().pairs.daily[String(day)] ?? null;
}

export function lightsToday(day = dayNumber()): LightsDay | null {
  return readGames().lights.daily[String(day)] ?? null;
}

export function chessToday(day = dayNumber()): { result: ChessResult; level: ChessLevel; plies: number } | null {
  return readGames().chess.daily[String(day)] ?? null;
}
