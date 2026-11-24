import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  clear(): void {
    this.data.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const {
  clearGames,
  clearSnakeRound,
  dayStreak,
  readGames,
  recordNumbers,
  recordReversi,
  recordSnake,
  resetNumbers,
  resetReversi,
  resetSnake,
  saveSnakeRound,
} = await import('../src/lib/gamesStore.ts');

const KEY = 'noct.games.v1';

beforeEach(() => storage.clear());

test('an older payload merges over the current defaults', () => {
  storage.setItem(KEY, JSON.stringify({ mines: { best: { '12': 4200 }, daily: {} } }));
  const store = readGames();
  assert.equal(store.mines.best['12'], 4200);
  assert.deepEqual(store.snake, { best: null, wins: 0, daily: {}, saved: null });
  assert.deepEqual(store.reversi, {
    bestMargin: null,
    wins: 0,
    losses: 0,
    draws: 0,
    daily: {},
    saved: null,
  });
  assert.equal(store.chess.level, 2);
});

test('records from the previous payload survive and gain the new per-day shape', () => {
  storage.setItem(
    KEY,
    JSON.stringify({
      snake: { best: 117, wins: 2 },
      numbers: { bestScore: 6528, bestTile: 512, wins: 1 },
      reversi: { bestMargin: 30, wins: 2, losses: 1, draws: 0 },
    }),
  );
  const store = readGames();
  assert.equal(store.snake.best, 117);
  assert.equal(store.snake.wins, 2);
  assert.deepEqual(store.snake.daily, {});
  assert.equal(store.snake.saved, null);
  assert.equal(store.numbers.bestScore, 6528);
  assert.equal(store.numbers.bestTile, 512);
  assert.equal(store.reversi.bestMargin, 30);
  assert.equal(store.reversi.losses, 1);
  assert.deepEqual(store.reversi.daily, {});
});

test('broken JSON falls back to an empty store instead of throwing', () => {
  storage.setItem(KEY, '{not json');
  assert.equal(readGames().numbers.bestScore, null);
});

test('snake keeps an all-time best and a per-day record', () => {
  recordSnake(5, 80, 12, true);
  recordSnake(5, 60, 12, true);
  recordSnake(5, 12, 2, false);
  recordSnake(6, 90, 7, false);
  const store = readGames().snake;
  assert.equal(store.best, 60);
  assert.equal(store.wins, 2);
  assert.deepEqual(store.daily['5'], { steps: 60, apples: 12, won: true });
  assert.deepEqual(store.daily['6'], { steps: 90, apples: 7, won: false });
  resetSnake();
  assert.deepEqual(readGames().snake, { best: null, wins: 0, daily: {}, saved: null });
});

test('2048 keeps the best score and tile per day and overall', () => {
  recordNumbers(4, 1200, 128, false);
  recordNumbers(4, 800, 256, true);
  recordNumbers(5, 200, 32, false);
  const store = readGames().numbers;
  assert.equal(store.bestScore, 1200);
  assert.equal(store.bestTile, 256);
  assert.equal(store.wins, 1);
  assert.deepEqual(store.daily['4'], { score: 1200, tile: 128, won: true });
  assert.deepEqual(store.daily['5'], { score: 200, tile: 32, won: false });
  resetNumbers();
  assert.deepEqual(readGames().numbers, {
    bestScore: null,
    bestTile: null,
    wins: 0,
    daily: {},
    saved: null,
  });

  recordSnake(5, 33, 12, true);
  resetNumbers();
  assert.equal(readGames().snake.best, 33, 'resetting 2048 must not touch snake');
});

test('reversi records wins, losses, draws and the best margin per day', () => {
  recordReversi(5, 'win', 12, 40, 58);
  recordReversi(5, 'win', 30, 47, 60);
  recordReversi(6, 'loss', -8, 28, 60);
  recordReversi(7, 'draw', 0, 32, 60);
  const store = readGames().reversi;
  assert.equal(store.bestMargin, 30);
  assert.equal(store.wins, 2);
  assert.equal(store.losses, 1);
  assert.equal(store.draws, 1);
  assert.deepEqual(store.daily['5'], { margin: 30, discs: 47, moves: 60 });
  resetReversi();
  assert.deepEqual(readGames().reversi, {
    bestMargin: null,
    wins: 0,
    losses: 0,
    draws: 0,
    daily: {},
    saved: null,
  });
});

test('an unfinished round is stored, read and cleared again', () => {
  saveSnakeRound({ day: 5, snake: [10, 9], food: 20, steps: 1, apples: 0, dir: 'right' });
  assert.equal(readGames().snake.saved?.steps, 1);
  resetSnake();
  assert.equal(readGames().snake.saved, null);

  saveSnakeRound({ day: 5, snake: [10], food: 20, steps: 2, apples: 1, dir: 'up' });
  clearSnakeRound();
  assert.equal(readGames().snake.saved, null);
});

test('the streak walks back from today, or from yesterday when today is unplayed', () => {
  assert.equal(dayStreak([], 10), 0);
  assert.equal(dayStreak([10, 9, 8, 6], 10), 3);
  assert.equal(dayStreak([9, 8, 7], 10), 3);
  assert.equal(dayStreak([10, 8, 7], 10), 1);
});

test('clearGames removes every arcade record', () => {
  recordSnake(5, 50, 12, true);
  recordNumbers(5, 10, 4, false);
  clearGames();
  assert.equal(storage.getItem(KEY), null);
  assert.deepEqual(readGames().snake, { best: null, wins: 0, daily: {}, saved: null });
});