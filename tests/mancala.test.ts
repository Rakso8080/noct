import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANCALA_STORE,
  mancalaBot,
  mancalaFinished,
  mancalaLegal,
  mancalaSide,
  mancalaSow,
  mancalaWinner,
  newMancala,
} from '../src/lib/mancala.ts';
import { mulberry32 } from '../src/lib/rng.ts';

test('mancala opens with four stones in twelve cups and two empty stores', () => {
  const board = newMancala();
  assert.equal(board.length, 14);
  assert.deepEqual(mancalaLegal(board, 0), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(mancalaLegal(board, 1), [7, 8, 9, 10, 11, 12]);
  assert.equal(mancalaSide(board, 0), 24);
  assert.equal(mancalaSide(board, 1), 24);
  assert.equal(board[MANCALA_STORE[0]], 0);
  assert.equal(board[MANCALA_STORE[1]], 0);
});

test('a stone landing in your own store buys another turn', () => {
  const board = newMancala();
  const custom = [...board];
  custom[0] = 6;
  const result = mancalaSow(custom, 0, 0);
  assert.ok(result);
  assert.equal(result.extra, true);
  assert.equal(result.board[MANCALA_STORE[0]], 1);
  assert.equal(result.board[0], 0);
});

test('the last stone in an empty cup captures the opposite cup', () => {
  const board = Array.from({ length: 14 }, () => 0);
  board[0] = 1;
  board[11] = 5;
  board[MANCALA_STORE[0]] = 2;
  const result = mancalaSow(board, 0, 0);
  assert.ok(result);
  assert.equal(result.captured, 6);
  assert.equal(result.board[MANCALA_STORE[0]], 8);
  assert.equal(result.board[1], 0);
  assert.equal(result.board[11], 0);
});

test('when one side empties, the other side keeps its remaining stones', () => {
  const board = Array.from({ length: 14 }, () => 0);
  board[0] = 2;
  board[MANCALA_STORE[0]] = 5;
  const result = mancalaSow(board, 0, 0);
  assert.ok(result);
  assert.equal(result.finished, true);
  assert.equal(mancalaFinished(result.board), true);
  assert.equal(result.board[MANCALA_STORE[0]], 7);
  assert.equal(mancalaWinner(result.board), 0);
});

test('the bot always returns a legal cup at both strengths', () => {
  const board = newMancala();
  for (let seed = 1; seed <= 12; seed++) {
    for (const level of [1, 2] as const) {
      const move = mancalaBot(board, 0, level, mulberry32(seed));
      assert.ok(move !== null);
      assert.ok(mancalaLegal(board, 0).includes(move));
    }
  }
});

test('a daily tie-break is reproducible', () => {
  const board = newMancala();
  assert.equal(
    mancalaBot(board, 0, 2, mulberry32(7)),
    mancalaBot(board, 0, 2, mulberry32(7)),
  );
});

test('an illegal cup is refused rather than quietly played', () => {
  const board = newMancala();
  assert.equal(mancalaSow(board, 0, 7), null);
  assert.equal(mancalaSow(board, 0, 0)?.board.length, 14);
});
