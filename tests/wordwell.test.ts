import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYBOARD_ROWS,
  MAX_GUESSES,
  WORD_ANSWERS,
  WORD_EXTRA_GUESSES,
  WORD_LENGTH,
  dailyWord,
  evaluateGuess,
  freeWord,
  isAllowedWord,
  keyboardState,
  shareGrid,
} from '../src/lib/wordwell.ts';

test('the answer list is clean, five letters and free of duplicates', () => {
  assert.ok(WORD_ANSWERS.length > 300, 'a deep enough well');
  assert.equal(new Set(WORD_ANSWERS).size, WORD_ANSWERS.length);
  for (const word of WORD_ANSWERS) {
    assert.match(word, /^[a-z]{5}$/, `${word} must be five lowercase letters`);
    assert.equal(word.length, WORD_LENGTH);
  }
  for (const word of WORD_EXTRA_GUESSES) {
    assert.match(word, /^[a-z]{5}$/, `${word} must be five lowercase letters`);
  }
});

test('tonight’s word is deterministic and always a real answer', () => {
  for (const day of [1, 2, 90, 365, 9999]) {
    const word = dailyWord(day);
    assert.equal(word, dailyWord(day));
    assert.ok(WORD_ANSWERS.includes(word.toLowerCase()), `${word} is not in the answer list`);
  }
  assert.notEqual(dailyWord(1), dailyWord(2));
  assert.equal(freeWord(7), freeWord(7));
  assert.match(freeWord(7), /^[A-Z]{5}$/);
});

test('grading marks hits first, then spends the remaining letters', () => {
  assert.deepEqual(evaluateGuess('CRANE', 'CRANE'), ['hit', 'hit', 'hit', 'hit', 'hit']);
  assert.deepEqual(evaluateGuess('SLATE', 'STALE'), ['hit', 'near', 'hit', 'near', 'hit']);
  /* Two Ls in the guess, one in the answer: the second L may not be "near". */
  assert.deepEqual(evaluateGuess('LLAMA', 'LEMON'), ['hit', 'miss', 'miss', 'near', 'miss']);
  assert.deepEqual(evaluateGuess('MOMMY', 'MOTOR'), ['hit', 'hit', 'miss', 'miss', 'miss']);
  assert.deepEqual(evaluateGuess('ALLEY', 'LEGAL'), ['near', 'near', 'near', 'near', 'miss']);
  assert.deepEqual(evaluateGuess('ABBEY', 'BABES'), ['near', 'near', 'hit', 'hit', 'miss']);
});

test('the keyboard keeps the best state each letter ever reached', () => {
  const answer = 'STALE';
  const keys = keyboardState(['SLATE', 'ALLEY'], answer);
  assert.equal(keys.S, 'hit');
  assert.equal(keys.T, 'near');
  assert.equal(keys.L, 'near');
  assert.equal(keys.Y, 'miss');
});

test('only real five-letter words are accepted', () => {
  assert.equal(isAllowedWord('apple'), true);
  assert.equal(isAllowedWord('APPLE'), true);
  assert.equal(isAllowedWord('zzzzz'), false);
  assert.equal(isAllowedWord('four'), false);
  for (const word of WORD_ANSWERS) assert.equal(isAllowedWord(word), true);
});

test('the share grid keeps the answer out and the shape in', () => {
  const grid = shareGrid(['CRANE', 'SLATE'], 'STALE');
  const rows = grid.split('\n');
  assert.equal(rows.length, 2);
  assert.equal([...rows[0]].length, 5);
  assert.ok(!grid.includes('S'));
  assert.equal(MAX_GUESSES, 6);
  assert.deepEqual(KEYBOARD_ROWS.map((row) => row.length), [10, 9, 7]);
});
