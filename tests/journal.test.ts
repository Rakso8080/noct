import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD_NOTES,
  SIGHTINGS,
  addSighting,
  clearJournal,
  journalProgress,
  readSightings,
  unlockedNoteIds,
} from '../src/lib/journal.ts';
import { readGames } from '../src/lib/gamesStore.ts';
import type { AtlasSources } from '../src/lib/atlas.ts';

function emptySurvey() {
  return { today: null, best: 0, playedDays: 0, classic: false, endlessBest: 0 };
}

function sources(day = 10): AtlasSources {
  return {
    day,
    games: readGames(),
    common: emptySurvey(),
    rare: emptySurvey(),
    noct: { playedToday: false, activeToday: false, bestScore: null, completedDays: 0 },
  };
}

function mockStorage(): void {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
}

test('the field book holds one note per place and six sightings', () => {
  assert.equal(FIELD_NOTES.length, 13);
  assert.equal(new Set(FIELD_NOTES.map((note) => note.place)).size, 13);
  assert.equal(SIGHTINGS.length, 6);
  assert.equal(new Set(SIGHTINGS.map((sighting) => sighting.id)).size, 6);
});

test('a note unlocks from any existing mark', () => {
  const base = sources();
  assert.deepEqual(unlockedNoteIds(base), []);

  const visited = { ...base, games: readGames() };
  visited.games.mines.daily['10'] = { won: true, ms: 9000, at: 0 };
  assert.deepEqual(unlockedNoteIds(visited), ['mines']);

  const withBest = { ...base, games: readGames() };
  withBest.games.snake.best = 12;
  assert.deepEqual(unlockedNoteIds(withBest), ['snake']);
});

test('sightings are idempotent and survive a reload', () => {
  mockStorage();
  try {
    assert.deepEqual(readSightings(), []);
    assert.equal(addSighting('cat'), true);
    assert.equal(addSighting('cat'), false);
    assert.equal(addSighting('deer'), true);
    assert.deepEqual(readSightings(), ['cat', 'deer']);

    const progress = journalProgress(sources(), readSightings());
    assert.equal(progress.sightings, 2);
    assert.equal(progress.found, 2);
    assert.equal(progress.total, 19);

    clearJournal();
    assert.deepEqual(readSightings(), []);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});

test('unknown or corrupt sighting ids are ignored', () => {
  const storage = new Map<string, string>();
  storage.set('noct.journal.v1', JSON.stringify({ sightings: ['cat', 'dragon', 7] }));
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });

  try {
    assert.deepEqual(readSightings(), ['cat']);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
