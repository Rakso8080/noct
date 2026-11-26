import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareTableRun,
  parseTableChallenge,
  tableChallengeLink,
  tableChallengeQuery,
  type TableRun,
} from '../src/lib/challenge.ts';

const today = 500;

test('a shared Mancala run round-trips through a link', () => {
  const run = {
    game: 'mancala' as const,
    name: 'Ada Lovelace',
    day: 148,
    level: 2 as const,
    result: 'win' as const,
    stones: 24,
    moves: 22,
  };
  const link = tableChallengeLink(run, run.name, 'https://noct.example', '');
  assert.equal(
    link,
    'https://noct.example/mancala?by=Ada%20Lovelace&day=148&level=2&result=win&stones=24&moves=22',
  );
  assert.deepEqual(parseTableChallenge(new URL(link).search, 'mancala', today), run);
});

test('a shared Pegs run round-trips through a link', () => {
  const run = {
    game: 'pegs' as const,
    name: 'Mira',
    day: 148,
    pegs: 1,
    moves: 31,
  };
  const link = tableChallengeLink(run, run.name, 'https://noct.example', '');
  assert.equal(link, 'https://noct.example/pegs?by=Mira&day=148&pegs=1&moves=31');
  assert.deepEqual(parseTableChallenge(new URL(link).search, 'pegs', today), run);
  assert.equal(tableChallengeQuery(run, run.name), 'by=Mira&day=148&pegs=1&moves=31');
});

test('a table link respects a subpath deployment', () => {
  assert.equal(
    tableChallengeLink(
      { game: 'pegs', day: 148, pegs: 3, moves: 20 },
      'Mira',
      'https://example.com',
      '/noct',
    ),
    'https://example.com/noct/pegs?by=Mira&day=148&pegs=3&moves=20',
  );
});

test('a malformed or hostile table link falls back to the ordinary board', () => {
  for (const search of [
    '',
    '?',
    '?by=&day=148&level=2&result=win&stones=24&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=24',
    '?by=Mira&day=148&level=2&result=win&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=24&moves=',
    '?by=Mira&day=148&level=3&result=win&stones=24&moves=22',
    '?by=Mira&day=148&level=2&result=maybe&stones=24&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=49&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=-1&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=1.5&moves=22',
    '?by=Mira&day=148&level=2&result=win&stones=24&moves=1000',
    '?by=Mira&day=0&level=2&result=win&stones=24&moves=22',
    '?by=Mira&day=1.5&level=2&result=win&stones=24&moves=22',
    '?by=Mira&day=501&level=2&result=win&stones=24&moves=22',
    '?by=Mira&day=148&pegs=34&moves=22',
    '?by=Mira&day=148&pegs=1&moves=1000',
    '?by=<script>&day=148&level=2&result=win&stones=24&moves=22',
    '?by=ThisNameIsWayTooLong&day=148&level=2&result=win&stones=24&moves=22',
  ]) {
    assert.equal(parseTableChallenge(search, 'mancala', today), null, search);
  }
});

test('a wrong-game link does not become a table challenge', () => {
  assert.equal(parseTableChallenge('?by=Mira&day=148&pegs=1&moves=31', 'mancala', today), null);
  assert.equal(
    parseTableChallenge(
      '?by=Mira&day=148&level=2&result=win&stones=24&moves=22',
      'pegs',
      today,
    ),
    null,
  );
});

test('Mancala compares result, then stones, then fewer sowings', () => {
  const target: TableRun = {
    game: 'mancala',
    day: 148,
    level: 2,
    result: 'win',
    stones: 24,
    moves: 22,
  };
  assert.equal(compareTableRun(target, { ...target, stones: 25 }), 'beat');
  assert.equal(compareTableRun(target, { ...target, stones: 23 }), 'behind');
  assert.equal(compareTableRun(target, { ...target, moves: 21 }), 'beat');
  assert.equal(compareTableRun(target, { ...target, moves: 23 }), 'behind');
  assert.equal(compareTableRun(target, { ...target, result: 'draw', stones: 48 }), 'behind');
  assert.equal(compareTableRun(target, { ...target, result: 'loss', stones: 48 }), 'behind');
  assert.equal(compareTableRun(target, { ...target }), 'matched');
});

test('Pegs compares fewer pegs, then fewer jumps', () => {
  const target: TableRun = { game: 'pegs', day: 148, pegs: 1, moves: 31 };
  assert.equal(compareTableRun(target, { ...target, pegs: 0, moves: 40 }), 'beat');
  assert.equal(compareTableRun(target, { ...target, pegs: 2, moves: 10 }), 'behind');
  assert.equal(compareTableRun(target, { ...target, moves: 30 }), 'beat');
  assert.equal(compareTableRun(target, { ...target, moves: 32 }), 'behind');
  assert.equal(compareTableRun(target, { ...target }), 'matched');
});
