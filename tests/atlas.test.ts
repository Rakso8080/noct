import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTERS,
  PLACES,
  addRouteStamp,
  clearAtlas,
  WEATHERS,
  marksFor,
  nightRoute,
  routeWeather,
  placeView,
  readRouteStamps,
  recordRouteStamp,
  routeComplete,
  routeLitCount,
  surveySnapshot,
  type AtlasSources,
  type SurveySnapshot,
} from '../src/lib/atlas.ts';
import { readGames } from '../src/lib/gamesStore.ts';
import type { SurveyRun } from '../src/lib/surveyStore.ts';

function emptySurvey(): SurveySnapshot {
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

function run(mode: 'common' | 'rare'): SurveyRun {
  return {
    mode,
    runMode: 'daily',
    day: 10,
    score: 420,
    max: 700,
    height: 8400,
    answers: [],
    finishedAt: 0,
    seed: 1,
  };
}

test('the atlas holds all nineteen places in three chapters', () => {
  assert.equal(PLACES.length, 19);
  assert.equal(new Set(PLACES.map((place) => place.id)).size, 19);
  assert.deepEqual(
    CHAPTERS.map((chapter) => PLACES.filter((place) => place.chapter === chapter.id).length),
    [3, 5, 11],
  );
});

test('the nightly route is deterministic, unique and one stop per chapter', () => {
  const route = nightRoute(10);
  assert.equal(route.length, 3);
  assert.equal(new Set(route.map((place) => place.id)).size, 3);
  assert.deepEqual(
    route.map((place) => place.chapter),
    ['choir', 'keep', 'tables'],
  );
  assert.deepEqual(
    route.map((place) => place.id),
    nightRoute(10).map((place) => place.id),
  );
  assert.deepEqual(
    surveySnapshot('common', 10),
    surveySnapshot('common', 10),
  );
});

test('the weather is deterministic, stable and one of the ten skies', () => {
  const ids = new Set(WEATHERS.map((weather) => weather.id));
  assert.equal(ids.size, 10);
  assert.ok(ids.has('fireflies'));
  assert.ok(ids.has('storm'));
  for (const day of [1, 2, 10, 365, 9001]) {
    const weather = routeWeather(day);
    assert.ok(ids.has(weather.id));
    assert.equal(routeWeather(day).id, weather.id);
    assert.equal(routeWeather(day).name, weather.name);
  }
  assert.deepEqual(
    routeWeather(10),
    routeWeather(10),
  );
});

test('common and rare marks follow the run they already keep', () => {
  const base = sources();
  assert.deepEqual(marksFor('common', base), {
    waymark: false,
    night: false,
    keepsake: false,
  });

  const withRun = {
    ...base,
    common: { ...base.common, today: run('common'), best: 420, playedDays: 1 },
  };
  assert.deepEqual(marksFor('common', withRun), {
    waymark: true,
    night: true,
    keepsake: true,
  });
  assert.deepEqual(placeView('common', withRun).record, {
    key: 'Best {n} points',
    vars: { n: 420 },
  });
});

test('noct marks come from the daily result and all-time stats', () => {
  const base = sources();
  const withNoct = {
    ...base,
    noct: { playedToday: true, activeToday: false, bestScore: 480, completedDays: 2 },
  };
  assert.deepEqual(marksFor('noct', withNoct), {
    waymark: true,
    night: true,
    keepsake: true,
  });
  assert.equal(placeView('noct', withNoct).record?.key, 'Best {n} / {max}');
});

test('the crate yard and the thread loom have their own marks and records', () => {
  const games = readGames();
  games.crates.daily['10'] = { moves: 18, pushes: 5 };
  games.crates.bestMoves = 18;
  games.boxes.daily['10'] = { result: 'win', margin: 3, boxes: 9 };
  games.boxes.wins = 1;
  games.boxes.bestMargin = 3;
  const base = { ...sources(), games };

  assert.deepEqual(marksFor('crates', base), {
    waymark: true,
    night: true,
    keepsake: true,
  });
  assert.deepEqual(placeView('crates', base).record, {
    key: 'Best {n} moves',
    vars: { n: 18 },
  });
  assert.deepEqual(marksFor('boxes', base), {
    waymark: true,
    night: true,
    keepsake: true,
  });
  assert.deepEqual(placeView('boxes', base).record, {
    key: '{wins}W · {losses}L · {draws}D',
    vars: { wins: 1, losses: 0, draws: 0 },
  });
});

test('a side table is lit today and keeps a record from the existing store', () => {
  const games = readGames();
  games.mines.daily['10'] = { won: true, ms: 12_000, at: 0 };
  const base = { ...sources(), games };
  assert.deepEqual(marksFor('mines', base), {
    waymark: true,
    night: true,
    keepsake: false,
  });
  assert.equal(placeView('mines', base).record, null);

  games.mines.best['10'] = 12_000;
  assert.equal(marksFor('mines', base).keepsake, true);
  assert.equal(placeView('mines', base).record?.key, 'Best {n}s');
});

test('a route is complete only when all three stops are lit tonight', () => {
  const views = nightRoute(10).map((place) => ({
    ...place,
    marks: { waymark: true, night: true, keepsake: false },
  }));
  assert.equal(routeComplete(views), true);
  assert.equal(routeLitCount(views), 3);

  const notYet = views.map((view, index) => ({
    ...view,
    marks: { ...view.marks, night: index !== 1 },
  }));
  assert.equal(routeComplete(notYet), false);
  assert.equal(routeLitCount(notYet), 2);
});

test('route seals are idempotent and capped to the latest nights', () => {
  assert.deepEqual(addRouteStamp([3, 4], 4), [3, 4]);
  assert.deepEqual(addRouteStamp([3, 4], 5), [3, 4, 5]);

  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });

  try {
    assert.equal(recordRouteStamp(10), true);
    assert.equal(recordRouteStamp(10), false);
    assert.deepEqual(readRouteStamps(), [10]);
    clearAtlas();
    assert.deepEqual(readRouteStamps(), []);
  } finally {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
