import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PEG_CENTRE,
  PEG_HOLES,
  PEG_SIZE,
  newPegs,
  pegApply,
  pegCount,
  pegFinished,
  pegHint,
  pegMoves,
} from '../src/lib/pegs.ts';

test('the cross has 33 holes, 32 pegs and four opening jumps', () => {
  const board = newPegs();
  assert.equal(PEG_HOLES.length, 33);
  assert.equal(pegCount(board), 32);
  assert.equal(board[PEG_CENTRE], 0);
  assert.equal(pegMoves(board).length, 4);
  assert.ok(pegMoves(board).every((move) => move.to === PEG_CENTRE));
});

test('a jump moves one peg, removes the jumped peg and opens two holes', () => {
  const board = newPegs();
  const move = pegMoves(board)[0];
  const next = pegApply(board, move);
  assert.equal(next[move.from], 0);
  assert.equal(next[move.over], 0);
  assert.equal(next[move.to], 1);
  assert.equal(pegCount(next), 31);
});

test('an illegal jump leaves the board untouched', () => {
  const board = newPegs();
  const next = pegApply(board, { from: PEG_CENTRE, over: 0, to: 1 });
  assert.deepEqual(next, board);
});

test('the board ends when there are no legal jumps left', () => {
  const board = newPegs();
  assert.equal(pegFinished(board), false);
  const empty = Array.from({ length: PEG_SIZE * PEG_SIZE }, () => -1);
  empty[PEG_CENTRE] = 1;
  assert.equal(pegFinished(empty), true);
  assert.equal(pegMoves(empty).length, 0);
});

test('the hint is always a legal jump', () => {
  const board = newPegs();
  const hint = pegHint(board);
  assert.ok(hint);
  assert.ok(pegMoves(board).some((move) => move.from === hint.from && move.to === hint.to));
});

test('the daily board is deterministic and can be restarted', () => {
  assert.deepEqual(newPegs(), newPegs());
  assert.deepEqual(newPegs(PEG_CENTRE), newPegs());
});
