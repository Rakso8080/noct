import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REV_CELLS,
  botMove,
  flipsFor,
  legalMoves,
  place,
  scores,
  startReversi,
  type Disc,
} from '../src/lib/reversi.ts';

test('the table opens with the four centre discs', () => {
  const board = startReversi();
  assert.equal(board.length, REV_CELLS);
  assert.deepEqual(scores(board), { white: 2, black: 2 });
  assert.deepEqual(legalMoves(board, 1), [20, 29, 34, 43]);
  assert.deepEqual(legalMoves(board, 2), [19, 26, 37, 44]);
});

test('a move must trap a line, and turns exactly that line', () => {
  const board = startReversi();
  assert.deepEqual(flipsFor(board, 20, 1), [28]);
  assert.equal(place(board, 0, 1), null, 'a corner is not legal on the first move');

  const next = place(board, 20, 1);
  assert.ok(next);
  assert.equal(next![20], 1);
  assert.equal(next![28], 1);
  assert.deepEqual(scores(next!), { white: 4, black: 1 });
  assert.equal(board[20], 0, 'the input board is not mutated');
});

test('a side with no legal move passes without changing the board', () => {
  const board = Array<Disc>(REV_CELLS).fill(0);
  board[0] = 1;
  board[63] = 2;
  /* The two discs are far apart, so white has no line to trap anywhere. */
  assert.deepEqual(legalMoves(board, 1), []);
  assert.equal(place(board, 10, 1), null);
  assert.equal(botMove(board, 1, () => 0.5), null);
});

test('the bot always answers with a legal move', () => {
  let board = startReversi();
  let player: Disc = 1;
  let passes = 0;
  let moves = 0;
  while (passes < 2 && moves < 200) {
    const pick = botMove(board, player, () => 0.7);
    if (pick === null) {
      passes++;
    } else {
      assert.ok(legalMoves(board, player).includes(pick));
      board = place(board, pick, player)!;
      passes = 0;
      moves++;
    }
    player = player === 1 ? 2 : 1;
  }
  const tally = scores(board);
  assert.ok(moves > 4);
  assert.ok(tally.white + tally.black <= REV_CELLS);
  assert.equal(tally.white + tally.black + board.filter((v) => v === 0).length, REV_CELLS);
});