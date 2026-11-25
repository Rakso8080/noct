import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  C4_ROWS,
  c4Bot,
  c4Drop,
  c4DropRow,
  c4Full,
  c4Index,
  c4LegalColumns,
  c4Status,
  c4Winner,
  c4WinningLine,
  startConnect4,
  type C4Board,
  type C4Cell,
} from '../src/lib/connect4.ts';

function boardWith(cells: [number, number, C4Cell][]): C4Board {
  const board = startConnect4();
  for (const [row, col, value] of cells) board[c4Index(row, col)] = value;
  return board;
}

test('a dropped disc falls to the lowest empty row', () => {
  const board = startConnect4();
  assert.equal(c4DropRow(board, 3), C4_ROWS - 1);
  const once = c4Drop(board, 3, 1);
  assert.ok(once);
  assert.equal(once[c4Index(C4_ROWS - 1, 3)], 1);
  assert.equal(c4DropRow(once, 3), C4_ROWS - 2);
  let full: C4Board = once;
  for (let i = 1; i < C4_ROWS; i++) {
    const next = c4Drop(full, 3, 2);
    if (next) full = next;
  }
  assert.equal(c4Drop(full, 3, 1), null);
});

test('four in a row is found horizontally, vertically and diagonally', () => {
  assert.ok(c4WinningLine(boardWith([[5, 0, 1], [5, 1, 1], [5, 2, 1], [5, 3, 1]])));
  assert.ok(c4WinningLine(boardWith([[2, 2, 2], [3, 2, 2], [4, 2, 2], [5, 2, 2]])));
  assert.ok(c4WinningLine(boardWith([[2, 0, 1], [3, 1, 1], [4, 2, 1], [5, 3, 1]])));
  assert.ok(c4WinningLine(boardWith([[2, 4, 2], [3, 3, 2], [4, 2, 2], [5, 1, 2]])));
  assert.equal(c4Winner(boardWith([[5, 0, 1], [5, 1, 1], [5, 2, 1]])), null);
});

test('a full checkerboard is a draw and legal columns shrink as they fill', () => {
  const rows: C4Cell[][] = [
    [1, 1, 1, 2, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1],
    [1, 1, 2, 1, 2, 1, 1],
    [2, 2, 2, 1, 2, 2, 2],
    [1, 1, 1, 2, 1, 1, 1],
    [1, 1, 1, 2, 1, 1, 1],
  ];
  const board: C4Board = rows.flat();
  assert.equal(c4Full(board), true);
  assert.equal(c4Winner(board), null);
  assert.equal(c4Status(board), 'draw');
  assert.deepEqual(c4LegalColumns(board), []);

  const oneColumn = startConnect4();
  oneColumn[c4Index(0, 0)] = 1;
  assert.deepEqual(c4LegalColumns(oneColumn).filter((col) => col === 0), []);
});

test('the bot takes an immediate win before anything else', () => {
  const board = boardWith([[5, 0, 1], [5, 1, 1], [5, 2, 1]]);
  for (const level of [1, 2] as const) {
    assert.equal(c4Bot(board, 1, level, () => 0.1), 3);
  }
});

test('the bot blocks the opponent immediate win', () => {
  const board = boardWith([[5, 1, 2], [5, 2, 2], [5, 3, 2]]);
  for (const level of [1, 2] as const) {
    const col = c4Bot(board, 1, level, () => 0.2);
    assert.ok(col === 0 || col === 4);
  }
});

test('the bot always returns a legal column', () => {
  for (const level of [1, 2] as const) {
    const col = c4Bot(startConnect4(), 1, level, () => 0.5);
    assert.ok(col !== null && c4LegalColumns(startConnect4()).includes(col));
  }
});
