import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyCheckersMove,
  checkersBot,
  checkersCounts,
  checkersMoves,
  checkersStatus,
  startCheckers,
  type CheckerPiece,
  type CheckersBoard,
  type CheckersState,
} from '../src/lib/checkers.ts';

function emptyBoard(): CheckersBoard {
  return Array.from({ length: 64 }, () => null);
}

function at(board: CheckersBoard, row: number, col: number, color: 'w' | 'b', king = false): void {
  board[row * 8 + col] = { color, king } as CheckerPiece;
}

test('checkers starts with twelve men each and legal opening moves for white', () => {
  const state = startCheckers();
  assert.deepEqual(checkersCounts(state.board), {
    white: 12,
    black: 12,
    whiteKings: 0,
    blackKings: 0,
  });
  const moves = checkersMoves(state);
  assert.ok(moves.length > 0);
  assert.ok(moves.every((move) => move.captures.length === 0));
});

test('a capture is forced and removes the jumped piece', () => {
  const board = emptyBoard();
  at(board, 4, 3, 'w');
  at(board, 3, 4, 'b');
  at(board, 7, 0, 'w');
  const state: CheckersState = { board, turn: 'w', idle: 0 };
  const moves = checkersMoves(state);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].to, 2 * 8 + 5);
  assert.deepEqual(moves[0].captures, [3 * 8 + 4]);
  const next = applyCheckersMove(state, moves[0]);
  assert.equal(next.board[3 * 8 + 4], null);
  assert.equal(next.board[2 * 8 + 5]?.color, 'w');
  assert.equal(next.turn, 'b');
});

test('a multi-jump chain must be played to the end', () => {
  const board = emptyBoard();
  at(board, 5, 2, 'w');
  at(board, 4, 3, 'b');
  at(board, 2, 5, 'b');
  const state: CheckersState = { board, turn: 'w', idle: 0 };
  const moves = checkersMoves(state);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].to, 1 * 8 + 6);
  assert.deepEqual(moves[0].captures, [4 * 8 + 3, 2 * 8 + 5]);
  const next = applyCheckersMove(state, moves[0]);
  assert.equal(next.board[1 * 8 + 6]?.color, 'w');
  assert.equal(next.board[4 * 8 + 3], null);
  assert.equal(next.board[2 * 8 + 5], null);
});

test('a man promotes on the back rank, and a king can move backwards', () => {
  const board = emptyBoard();
  at(board, 1, 0, 'w');
  const promoted = applyCheckersMove(
    { board, turn: 'w', idle: 0 },
    { from: 8, to: 1, path: [8, 1], captures: [] },
  );
  assert.equal(promoted.board[1]?.king, true);
  const kingBoard = emptyBoard();
  at(kingBoard, 4, 3, 'w', true);
  const kingMoves = checkersMoves({ board: kingBoard, turn: 'w', idle: 0 });
  assert.equal(kingMoves.length, 4);
});

test('a side with no pieces or no move loses, and the bot takes a capture', () => {
  const board = emptyBoard();
  at(board, 4, 3, 'w');
  at(board, 3, 4, 'b');
  const state: CheckersState = { board, turn: 'w', idle: 0 };
  assert.equal(
    checkersStatus({ ...state, turn: 'b', board: board.map((p) => (p?.color === 'b' ? null : p)) }),
    'w',
  );
  assert.equal(checkersStatus({ board: emptyBoard(), turn: 'w', idle: 0 }), 'b');
  const bot = checkersBot(state, 1, () => 0.5);
  assert.ok(bot);
  assert.equal(bot?.captures.length, 1);
});

test('the bot returns a legal move for every level', () => {
  for (const level of [1, 2] as const) {
    const pick = checkersBot(startCheckers(), level, () => 0.25);
    assert.ok(pick);
    assert.ok(checkersMoves(startCheckers()).some((move) => move.from === pick?.from && move.to === pick?.to));
  }
});
