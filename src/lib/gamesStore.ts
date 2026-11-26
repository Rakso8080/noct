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

export type TableResult = 'win' | 'loss' | 'draw';

export interface CheckersDay {
  result: TableResult;
  plies: number;
}

export interface Connect4Day {
  result: TableResult;
  moves: number;
}

export interface DominoesDay {
  result: TableResult;
  margin: number;
}

export interface WordDay {
  won: boolean;
  guesses: number;
  /** the answer, kept so a finished day can be read back without the word list */
  answer: string;
}

export interface BellDay {
  level: number;
  won: boolean;
}

export interface MancalaDay {
  result: TableResult;
  stones: number;
  moves: number;
}

export interface PegsDay {
  pegs: number;
  moves: number;
  cleared: boolean;
}

export interface CratesDay {
  moves: number;
  pushes: number;
}

export interface BoxesDay {
  result: TableResult;
  margin: number;
  boxes: number;
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
  checkers: {
    wins: number;
    losses: number;
    draws: number;
    bestWin: number | null;
    daily: Record<string, CheckersDay>;
  };
  connect4: {
    wins: number;
    losses: number;
    draws: number;
    bestWin: number | null;
    daily: Record<string, Connect4Day>;
  };
  dominoes: {
    wins: number;
    losses: number;
    draws: number;
    bestMargin: number | null;
    daily: Record<string, DominoesDay>;
  };
  word: {
    bestGuesses: number | null;
    wins: number;
    losses: number;
    daily: Record<string, WordDay>;
  };
  bell: {
    bestLevel: number | null;
    rounds: number;
    daily: Record<string, BellDay>;
  };
  mancala: {
    wins: number;
    losses: number;
    draws: number;
    bestStones: number | null;
    daily: Record<string, MancalaDay>;
  };
  pegs: {
    wins: number;
    bestPegs: number | null;
    bestMoves: number | null;
    daily: Record<string, PegsDay>;
  };
  crates: {
    bestMoves: number | null;
    bestFreeMoves: number | null;
    solved: number;
    daily: Record<string, CratesDay>;
  };
  boxes: {
    wins: number;
    losses: number;
    draws: number;
    bestMargin: number | null;
    daily: Record<string, BoxesDay>;
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
    checkers: { wins: 0, losses: 0, draws: 0, bestWin: null, daily: {} },
    connect4: { wins: 0, losses: 0, draws: 0, bestWin: null, daily: {} },
    dominoes: { wins: 0, losses: 0, draws: 0, bestMargin: null, daily: {} },
    word: { bestGuesses: null, wins: 0, losses: 0, daily: {} },
    bell: { bestLevel: null, rounds: 0, daily: {} },
    mancala: { wins: 0, losses: 0, draws: 0, bestStones: null, daily: {} },
    pegs: { wins: 0, bestPegs: null, bestMoves: null, daily: {} },
    crates: { bestMoves: null, bestFreeMoves: null, solved: 0, daily: {} },
    boxes: { wins: 0, losses: 0, draws: 0, bestMargin: null, daily: {} },
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
      checkers: { ...base.checkers, ...parsed.checkers, daily: { ...base.checkers.daily, ...parsed.checkers?.daily } },
      connect4: { ...base.connect4, ...parsed.connect4, daily: { ...base.connect4.daily, ...parsed.connect4?.daily } },
      dominoes: { ...base.dominoes, ...parsed.dominoes, daily: { ...base.dominoes.daily, ...parsed.dominoes?.daily } },
      word: { ...base.word, ...parsed.word, daily: { ...base.word.daily, ...parsed.word?.daily } },
      bell: { ...base.bell, ...parsed.bell, daily: { ...base.bell.daily, ...parsed.bell?.daily } },
      mancala: {
        ...base.mancala,
        ...parsed.mancala,
        daily: { ...base.mancala.daily, ...parsed.mancala?.daily },
      },
      pegs: { ...base.pegs, ...parsed.pegs, daily: { ...base.pegs.daily, ...parsed.pegs?.daily } },
      crates: {
        ...base.crates,
        ...parsed.crates,
        daily: { ...base.crates.daily, ...parsed.crates?.daily },
      },
      boxes: {
        ...base.boxes,
        ...parsed.boxes,
        daily: { ...base.boxes.daily, ...parsed.boxes?.daily },
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

function betterTableDay(prev: { result: TableResult } | undefined, result: TableResult): boolean {
  if (!prev) return true;
  const rank: Record<TableResult, number> = { win: 2, draw: 1, loss: 0 };
  return rank[result] > rank[prev.result];
}

export function recordCheckers(day: number, result: TableResult, plies: number): void {
  const store = readGames();
  const key = String(day);
  const prev = store.checkers.daily[key];
  if (
    betterTableDay(prev, result) ||
    (result === 'win' && prev?.result === 'win' && plies < prev.plies)
  ) {
    store.checkers.daily[key] = { result, plies };
  }
  if (result === 'win') {
    store.checkers.wins++;
    if (store.checkers.bestWin === null || plies < store.checkers.bestWin) store.checkers.bestWin = plies;
  } else if (result === 'loss') {
    store.checkers.losses++;
  } else {
    store.checkers.draws++;
  }
  write(store);
}

export function recordMancala(
  day: number,
  result: TableResult,
  stones: number,
  moves: number,
  mode: GameMode = 'daily',
): void {
  const store = readGames();
  const key = String(day);
  if (mode === 'daily') {
    const prev = store.mancala.daily[key];
    if (
      !prev ||
      betterTableDay(prev, result) ||
      (result === 'win' && prev.result === 'win' && stones > prev.stones)
    ) {
      store.mancala.daily[key] = { result, stones, moves };
    }
  }
  if (result === 'win') store.mancala.wins++;
  else if (result === 'loss') store.mancala.losses++;
  else store.mancala.draws++;
  if (store.mancala.bestStones === null || stones > store.mancala.bestStones) {
    store.mancala.bestStones = stones;
  }
  write(store);
}

export function recordPegs(
  day: number,
  pegs: number,
  moves: number,
  cleared: boolean,
  mode: GameMode = 'daily',
): void {
  const store = readGames();
  const key = String(day);
  if (mode === 'daily') {
    const prev = store.pegs.daily[key];
    if (!prev || pegs < prev.pegs || (pegs === prev.pegs && moves < prev.moves)) {
      store.pegs.daily[key] = { pegs, moves, cleared };
    } else if (cleared && !prev.cleared) {
      store.pegs.daily[key] = { ...prev, cleared: true };
    }
  }
  if (cleared) {
    store.pegs.wins++;
    if (store.pegs.bestMoves === null || moves < store.pegs.bestMoves) {
      store.pegs.bestMoves = moves;
    }
  }
  if (store.pegs.bestPegs === null || pegs < store.pegs.bestPegs) store.pegs.bestPegs = pegs;
  write(store);
}

export function recordCrates(
  day: number,
  moves: number,
  pushes: number,
  mode: GameMode = 'daily',
): void {
  const store = readGames();
  if (mode === 'daily') {
    const key = String(day);
    const prev = store.crates.daily[key];
    if (!prev || moves < prev.moves || (moves === prev.moves && pushes < prev.pushes)) {
      store.crates.daily[key] = { moves, pushes };
    }
    if (store.crates.bestMoves === null || moves < store.crates.bestMoves) {
      store.crates.bestMoves = moves;
    }
  } else if (store.crates.bestFreeMoves === null || moves < store.crates.bestFreeMoves) {
    store.crates.bestFreeMoves = moves;
  }
  store.crates.solved++;
  write(store);
}

export function recordBoxes(
  day: number,
  result: TableResult,
  margin: number,
  boxes: number,
  mode: GameMode = 'daily',
): void {
  const store = readGames();
  if (mode === 'daily') {
    const key = String(day);
    const prev = store.boxes.daily[key];
    const rank: Record<TableResult, number> = { win: 2, draw: 1, loss: 0 };
    if (!prev || rank[result] > rank[prev.result] || (rank[result] === rank[prev.result] && margin > prev.margin)) {
      store.boxes.daily[key] = { result, margin, boxes };
    }
  }
  if (result === 'win') {
    store.boxes.wins++;
    if (store.boxes.bestMargin === null || margin > store.boxes.bestMargin) {
      store.boxes.bestMargin = margin;
    }
  } else if (result === 'loss') {
    store.boxes.losses++;
  } else {
    store.boxes.draws++;
  }
  write(store);
}

export function recordConnect4(day: number, result: TableResult, moves: number): void {
  const store = readGames();
  const key = String(day);
  const prev = store.connect4.daily[key];
  if (
    betterTableDay(prev, result) ||
    (result === 'win' && prev?.result === 'win' && moves < prev.moves)
  ) {
    store.connect4.daily[key] = { result, moves };
  }
  if (result === 'win') {
    store.connect4.wins++;
    if (store.connect4.bestWin === null || moves < store.connect4.bestWin) store.connect4.bestWin = moves;
  } else if (result === 'loss') {
    store.connect4.losses++;
  } else {
    store.connect4.draws++;
  }
  write(store);
}


export function recordDominoes(day: number, result: TableResult, margin: number): void {
  const store = readGames();
  const key = String(day);
  const prev = store.dominoes.daily[key];
  const rank: Record<TableResult, number> = { win: 2, draw: 1, loss: 0 };
  if (!prev || rank[result] > rank[prev.result] || (result === prev.result && margin > prev.margin)) {
    store.dominoes.daily[key] = { result, margin };
  }
  if (result === 'win') {
    store.dominoes.wins++;
    if (store.dominoes.bestMargin === null || margin > store.dominoes.bestMargin) {
      store.dominoes.bestMargin = margin;
    }
  } else if (result === 'loss') {
    store.dominoes.losses++;
  } else {
    store.dominoes.draws++;
  }
  write(store);
}

/** The first finished run of the day is the one the day keeps. */
export function recordWord(day: number, won: boolean, guesses: number, answer: string): void {
  const store = readGames();
  const key = String(day);
  const prev = store.word.daily[key];
  if (!prev || (won && !prev.won) || (won === prev.won && guesses < prev.guesses)) {
    store.word.daily[key] = { won, guesses, answer };
  }
  if (won) {
    store.word.wins++;
    if (store.word.bestGuesses === null || guesses < store.word.bestGuesses) {
      store.word.bestGuesses = guesses;
    }
  } else {
    store.word.losses++;
  }
  write(store);
}

export function recordBell(day: number, level: number, won: boolean): void {
  const store = readGames();
  const key = String(day);
  const prev = store.bell.daily[key];
  if (!prev || level > prev.level) store.bell.daily[key] = { level, won };
  store.bell.rounds++;
  if (store.bell.bestLevel === null || level > store.bell.bestLevel) store.bell.bestLevel = level;
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

export function resetCheckers(): void {
  const store = readGames();
  store.checkers = { wins: 0, losses: 0, draws: 0, bestWin: null, daily: {} };
  write(store);
}

export function resetConnect4(): void {
  const store = readGames();
  store.connect4 = { wins: 0, losses: 0, draws: 0, bestWin: null, daily: {} };
  write(store);
}

export function resetDominoes(): void {
  const store = readGames();
  store.dominoes = { wins: 0, losses: 0, draws: 0, bestMargin: null, daily: {} };
  write(store);
}

export function resetWord(): void {
  const store = readGames();
  store.word = { bestGuesses: null, wins: 0, losses: 0, daily: {} };
  write(store);
}

export function resetBell(): void {
  const store = readGames();
  store.bell = { bestLevel: null, rounds: 0, daily: {} };
  write(store);
}

export function resetCrates(): void {
  const store = readGames();
  store.crates = { bestMoves: null, bestFreeMoves: null, solved: 0, daily: {} };
  write(store);
}

export function resetBoxes(): void {
  const store = readGames();
  store.boxes = { wins: 0, losses: 0, draws: 0, bestMargin: null, daily: {} };
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

export function checkersToday(day = dayNumber()): CheckersDay | null {
  return readGames().checkers.daily[String(day)] ?? null;
}

export function connect4Today(day = dayNumber()): Connect4Day | null {
  return readGames().connect4.daily[String(day)] ?? null;
}

export function dominoesToday(day = dayNumber()): DominoesDay | null {
  return readGames().dominoes.daily[String(day)] ?? null;
}

export function wordToday(day = dayNumber()): WordDay | null {
  return readGames().word.daily[String(day)] ?? null;
}

export function bellToday(day = dayNumber()): BellDay | null {
  return readGames().bell.daily[String(day)] ?? null;
}

export function cratesToday(day = dayNumber()): CratesDay | null {
  return readGames().crates.daily[String(day)] ?? null;
}

export function boxesToday(day = dayNumber()): BoxesDay | null {
  return readGames().boxes.daily[String(day)] ?? null;
}
