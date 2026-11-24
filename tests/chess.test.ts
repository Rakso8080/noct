import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyMove,
  initialState,
  legalMoves,
  outcome,
  squareIndex,
  type ChessState,
  type Piece,
} from '../src/lib/chess.ts';

const piece = (c: Piece['c'], k: Piece['k']): Piece => ({ c, k });

function empty(): ChessState {
  return {
    board: Array<Piece | null>(64).fill(null),
    turn: 'w',
    castling: { wk: false, wq: false, bk: false, bq: false },
    ep: null,
    half: 0,
    full: 1,
  };
}

test('the opening position offers twenty legal moves for each side', () => {
  const start = initialState();
  assert.equal(legalMoves(start).length, 20);
  assert.equal(legalMoves(start, 'b').length, 20);
  assert.deepEqual(outcome(start), { kind: 'playing' });
});

test('castling moves the rook too, and is lost after the king moves', () => {
  const state = empty();
  state.board[squareIndex('e1')] = piece('w', 'k');
  state.board[squareIndex('h1')] = piece('w', 'r');
  state.board[squareIndex('e8')] = piece('b', 'k');
  state.castling.wk = true;

  const castle = legalMoves(state).find((m) => m.castle === 'k');
  assert.ok(castle);
  assert.equal(castle!.to, squareIndex('g1'));

  const after = applyMove(state, castle!);
  assert.equal(after.board[squareIndex('g1')]?.k, 'k');
  assert.equal(after.board[squareIndex('f1')]?.k, 'r');
  assert.equal(after.castling.wk, false);
});

test('en passant removes the pawn beside the capture', () => {
  const state = empty();
  state.board[squareIndex('e5')] = piece('w', 'p');
  state.board[squareIndex('d5')] = piece('b', 'p');
  state.board[squareIndex('h1')] = piece('w', 'k');
  state.board[squareIndex('a8')] = piece('b', 'k');
  state.ep = squareIndex('d6');

  const capture = legalMoves(state).find((m) => m.ep);
  assert.ok(capture);
  const after = applyMove(state, capture!);
  assert.equal(after.board[squareIndex('d6')]?.c, 'w');
  assert.equal(after.board[squareIndex('d5')], null);
});

test('a pawn reaching the last rank promotes to the chosen piece', () => {
  const state = empty();
  state.board[squareIndex('a7')] = piece('w', 'p');
  state.board[squareIndex('h1')] = piece('w', 'k');
  state.board[squareIndex('h8')] = piece('b', 'k');

  const promos = legalMoves(state).filter((m) => m.promo);
  assert.deepEqual(promos.map((m) => m.promo).sort(), ['b', 'n', 'q', 'r']);
  const queen = promos.find((m) => m.promo === 'q')!;
  assert.equal(applyMove(state, queen).board[squareIndex('a8')]?.k, 'q');
});

test('mate and stalemate are distinguished', () => {
  const mate = empty();
  mate.board[squareIndex('a8')] = piece('b', 'k');
  mate.board[squareIndex('b7')] = piece('w', 'q');
  mate.board[squareIndex('c6')] = piece('w', 'k');
  mate.turn = 'b';
  assert.deepEqual(outcome(mate), { kind: 'checkmate', winner: 'w' });

  const stale = empty();
  stale.board[squareIndex('a8')] = piece('b', 'k');
  stale.board[squareIndex('c7')] = piece('w', 'q');
  stale.board[squareIndex('c6')] = piece('w', 'k');
  stale.turn = 'b';
  assert.deepEqual(outcome(stale), { kind: 'stalemate' });
});