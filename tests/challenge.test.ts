import test from 'node:test';
import assert from 'node:assert/strict';
import { challengeLink, challengeQuery, parseChallenge } from '../src/lib/challenge.ts';
import { MAX_SCORE } from '../shared/score.ts';

test('a shared night parses name and score', () => {
  assert.deepEqual(parseChallenge('?by=Mira&score=1080'), { name: 'Mira', score: 1080 });
  assert.deepEqual(parseChallenge('by=Mira&score=1080'), { name: 'Mira', score: 1080 });
  assert.deepEqual(parseChallenge('?by=Ada%20Lovelace&score=900'), { name: 'Ada Lovelace', score: 900 });
  assert.deepEqual(parseChallenge('?by=Ada+Lovelace&score=900'), { name: 'Ada Lovelace', score: 900 });
  assert.deepEqual(parseChallenge('?by=Ola.Nordmann&score=1'), { name: 'Ola.Nordmann', score: 1 });
});

test('a broken or hostile link falls back to the ordinary board', () => {
  for (const search of [
    '',
    '?',
    '?by=&score=100',
    '?by=Mira',
    '?score=100',
    '?by=Mira&score=',
    '?by=Mira&score=abc',
    '?by=Mira&score=-5',
    '?by=Mira&score=0',
    '?by=Mira&score=1.5',
    '?by=Mira&score=9999999',
    `?by=Mira&score=${MAX_SCORE + 1}`,
    '?by=<script>&score=100',
    '?by=ThisNameIsWayTooLongToFit&score=100',
  ]) {
    assert.equal(parseChallenge(search), null, search);
  }
});

test('the score is capped at the daily maximum', () => {
  assert.deepEqual(parseChallenge(`?by=Mira&score=${MAX_SCORE}`), { name: 'Mira', score: MAX_SCORE });
});

test('a challenge round-trips through a link without touching storage', () => {
  const challenge = { name: 'Ada Lovelace', score: 1000 };
  const link = challengeLink(challenge, 'https://noct.example', '');
  assert.equal(link, 'https://noct.example/play?by=Ada%20Lovelace&score=1000');
  const parsed = parseChallenge(link.slice(link.indexOf('?')));
  assert.deepEqual(parsed, challenge);
  assert.equal(challengeQuery(challenge), 'by=Ada%20Lovelace&score=1000');
});

test('the link respects a subpath deployment', () => {
  assert.equal(
    challengeLink({ name: 'Mira', score: 1180 }, 'https://example.com', '/noct'),
    'https://example.com/noct/play?by=Mira&score=1180',
  );
});
