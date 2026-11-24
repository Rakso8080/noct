/** Local records for the side games: one key, merged over defaults on read. */
import type { ChessMove } from './chess';
import { dayNumber } from '../../shared/dates';

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

export interface GamesStore {
  snake: { best: number | null; wins: number };
  numbers: { bestScore: number | null; bestTile: number | null; wins: number };
  reversi: { bestMargin: number | null; wins: number; losses: number; draws: number };
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
    snake: { best: null, wins: 0 },
    numbers: { bestScore: null, bestTile: null, wins: 0 },
    reversi: { bestMargin: null, wins: 0, losses: 0, draws: 0 },
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
      snake: { ...base.snake, ...parsed.snake },
      numbers: { ...base.numbers, ...parsed.numbers },
      reversi: { ...base.reversi, ...parsed.reversi },
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

export function recordSnake(steps: number, won: boolean): void {
  const store = readGames();
  if (won) {
    store.snake.wins++;
    if (store.snake.best === null || steps < store.snake.best) store.snake.best = steps;
  }
  write(store);
}

export function recordNumbers(score: number, tile: number, won: boolean): void {
  const store = readGames();
  if (store.numbers.bestScore === null || score > store.numbers.bestScore) store.numbers.bestScore = score;
  if (store.numbers.bestTile === null || tile > store.numbers.bestTile) store.numbers.bestTile = tile;
  if (won) store.numbers.wins++;
  write(store);
}

export function recordReversi(result: 'win' | 'loss' | 'draw', margin: number): void {
  const store = readGames();
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

/** Per-game reset for the arcade records, so one game can start over alone. */
export function resetSnake(): void {
  const store = readGames();
  store.snake = { best: null, wins: 0 };
  write(store);
}

export function resetNumbers(): void {
  const store = readGames();
  store.numbers = { bestScore: null, bestTile: null, wins: 0 };
  write(store);
}

export function resetReversi(): void {
  const store = readGames();
  store.reversi = { bestMargin: null, wins: 0, losses: 0, draws: 0 };
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
