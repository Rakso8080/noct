import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIELD_PAGES,
  PAGE_TIER_LABEL,
  SIGHTINGS,
  addSighting,
  clearJournal,
  journalProgress,
  pageIsUnlocked,
  pageText,
  pagesFor,
  readSightings,
  unlockedPages,
} from '../src/lib/journal.ts';
import { PLACES } from '../src/lib/atlas.ts';
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

test('the field book holds three pages per place and six sightings', () => {
  assert.equal(FIELD_PAGES.length, PLACES.length * 3);
  assert.deepEqual(
    PLACES.map((place) => pagesFor(place.id).length),
    PLACES.map(() => 3),
  );
  assert.deepEqual(
    PLACES.map((place) => pagesFor(place.id).map((page) => page.tier).join(',')),
    PLACES.map(() => 'waymark,night,keepsake'),
  );
  assert.equal(new Set(FIELD_PAGES.map((page) => `${page.place}:${page.tier}`)).size, FIELD_PAGES.length);
  for (const page of FIELD_PAGES) {
    assert.ok(page.en.length > 40, `${page.place}/${page.tier} needs a real English page`);
    assert.ok(page.nb.length > 40, `${page.place}/${page.tier} needs a real Norwegian page`);
    assert.notEqual(page.en, page.nb);
  }
  assert.equal(SIGHTINGS.length, 6);
  assert.equal(new Set(SIGHTINGS.map((sighting) => sighting.id)).size, 6);
  assert.deepEqual(Object.keys(PAGE_TIER_LABEL), ['waymark', 'night', 'keepsake']);
});

test('a page unlocks from the mark it belongs to, tier by tier', () => {
  const base = sources();
  assert.deepEqual(unlockedPages(base), []);

  const visited = { ...base, games: readGames() };
  visited.games.mines.daily['10'] = { won: false, ms: 5000, at: 0 };
  assert.deepEqual(
    unlockedPages(visited).map((page) => `${page.place}:${page.tier}`),
    ['mines:waymark', 'mines:night'],
  );

  const kept = { ...base, games: readGames() };
  kept.games.snake.best = 12;
  assert.deepEqual(
    unlockedPages(kept).map((page) => `${page.place}:${page.tier}`),
    ['snake:waymark', 'snake:keepsake'],
  );
  const snake = pagesFor('snake');
  assert.equal(pageIsUnlocked(snake[0], kept), true);
  assert.equal(pageIsUnlocked(snake[1], kept), false);
  assert.equal(pageIsUnlocked(snake[2], kept), true);
});

test('page text follows the chosen language', () => {
  const page = FIELD_PAGES[0];
  assert.equal(pageText(page, 'en'), page.en);
  assert.equal(pageText(page, 'nb'), page.nb);
});

test('the two new tables unlock pages like the older ones', () => {
  const base = { ...sources(), games: readGames() };
  base.games.word.daily['10'] = { won: true, guesses: 3, answer: 'CRANE' };
  assert.deepEqual(
    unlockedPages(base)
      .filter((page) => page.place === 'wordwell')
      .map((page) => page.tier),
    ['waymark', 'night'],
  );
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
    assert.equal(progress.pages, 0);
    assert.equal(progress.found, 2);
    assert.equal(progress.total, FIELD_PAGES.length + SIGHTINGS.length);

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
