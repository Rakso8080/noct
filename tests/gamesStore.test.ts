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
  readGames,
  recordNumbers,
  recordReversi,
  recordSnake,
  resetNumbers,
  resetReversi,
  resetSnake,
} = await import('../src/lib/gamesStore.ts');

const KEY = 'noct.games.v1';

beforeEach(() => storage.clear());

test('an older payload merges over the current defaults', () => {
  storage.setItem(KEY, JSON.stringify({ mines: { best: { '12': 4200 }, daily: {} } }));
  const store = readGames();
  assert.equal(store.mines.best['12'], 4200);
  assert.deepEqual(store.snake, { best: null, wins: 0 });
  assert.deepEqual(store.reversi, { bestMargin: null, wins: 0, losses: 0, draws: 0 });
  assert.equal(store.chess.level, 2);
});

test('broken JSON falls back to an empty store instead of throwing', () => {
  storage.setItem(KEY, '{not json');
  assert.equal(readGames().numbers.bestScore, null);
});

test('snake keeps its best winning run and counts only wins', () => {
  recordSnake(80, true);
  recordSnake(60, true);
  recordSnake(12, false);
  assert.deepEqual(readGames().snake, { best: 60, wins: 2 });
  resetSnake();
  assert.deepEqual(readGames().snake, { best: null, wins: 0 });
});

test('2048 keeps the best score and tile, and each reset clears only its game', () => {
  recordNumbers(1200, 128, false);
  recordNumbers(800, 256, true);
  assert.deepEqual(readGames().numbers, { bestScore: 1200, bestTile: 256, wins: 1 });
  resetNumbers();
  assert.deepEqual(readGames().numbers, { bestScore: null, bestTile: null, wins: 0 });

  recordSnake(33, true);
  resetNumbers();
  assert.equal(readGames().snake.best, 33, 'resetting 2048 must not touch snake');
});

test('reversi records wins, losses, draws and the best margin', () => {
  recordReversi('win', 12);
  recordReversi('win', 30);
  recordReversi('loss', -8);
  recordReversi('draw', 0);
  assert.deepEqual(readGames().reversi, { bestMargin: 30, wins: 2, losses: 1, draws: 1 });
  resetReversi();
  assert.deepEqual(readGames().reversi, { bestMargin: null, wins: 0, losses: 0, draws: 0 });
});

test('clearGames removes every arcade record', () => {
  recordSnake(50, true);
  recordNumbers(10, 4, false);
  clearGames();
  assert.equal(storage.getItem(KEY), null);
  assert.deepEqual(readGames().snake, { best: null, wins: 0 });
});