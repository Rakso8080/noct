import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARCADE_GAMES,
  ARCADE_LABELS,
  ARCADE_MAX_SCORE,
  bellPoints,
  isArcadeGame,
  wordWellPoints,
} from '../shared/arcade.ts';
import { SCHEMA, TABLES } from '../shared/schema.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('the two nightly side tables are registered with labels', () => {
  assert.deepEqual([...ARCADE_GAMES], ['wordwell', 'memorybell']);
  for (const game of ARCADE_GAMES) {
    assert.ok(isArcadeGame(game));
    assert.equal(typeof ARCADE_LABELS[game], 'string');
    assert.ok(ARCADE_LABELS[game].length > 2);
  }
  for (const wrong of ['snake', 'chess', '', null, 42, 'WORDWELL']) {
    assert.equal(isArcadeGame(wrong), false);
  }
});

test('the schema gives side-table scores a home with one row per player, game and day', () => {
  assert.ok(SCHEMA.includes('CREATE TABLE IF NOT EXISTS arcade_scores'));
  assert.deepEqual(TABLES.arcade_scores, ['player_id', 'game', 'day', 'score', 'plays', 'updated_at']);
  assert.match(SCHEMA, /PRIMARY KEY\(player_id, game, day\)/);
});

test('both runtimes expose the score and leaderboard routes with the same allowlist', () => {
  for (const path of ['../worker/index.ts', '../server/index.ts']) {
    const source = read(path);
    assert.ok(source.includes("'/api/arcade/score'"), `${path} is missing the score route`);
    assert.ok(source.includes("'/api/arcade/leaderboard'"), `${path} is missing the leaderboard route`);
    assert.ok(source.includes('isArcadeGame(game)'), `${path} does not validate the game id`);
    assert.ok(source.includes('arcade_scores'), `${path} never reads or writes arcade_scores`);
  }
});

test('the browser engine keeps side-table scores too', () => {
  const source = read('../src/lib/localApi.ts');
  assert.ok(source.includes('async arcadeScore'));
  assert.ok(source.includes('async arcadeLeaderboard'));
});

test('Word Well pays for the guesses you did not need, and nothing over the cap', () => {
  assert.equal(wordWellPoints(1, true), 720);
  assert.equal(wordWellPoints(6, true), 120);
  assert.equal(wordWellPoints(6, false), 60);
  assert.equal(wordWellPoints(99, true), 120);
  assert.equal(wordWellPoints(0, true), 720);
  for (const guesses of [1, 3, 6]) {
    const points = wordWellPoints(guesses, true);
    assert.ok(points > 0 && points <= ARCADE_MAX_SCORE);
  }
});

test('Memory Bell pays 100 per held round and stops at twelve', () => {
  assert.equal(bellPoints(0), 0);
  assert.equal(bellPoints(7), 700);
  assert.equal(bellPoints(12), 1200);
  assert.equal(bellPoints(40), 1200);
  assert.ok(bellPoints(12) <= ARCADE_MAX_SCORE);
});
