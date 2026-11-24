import assert from 'node:assert/strict';
import test from 'node:test';
import { canMove, maxTile, slide, spawn, startBoard } from '../src/lib/g2048.ts';

const board = (row: number[]): number[] => [...row, ...Array(12).fill(0)];

test('equal neighbours merge once and pay their sum', () => {
  const left = slide(board([2, 2, 2, 2]), 'left');
  assert.deepEqual(left.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(left.gained, 8);
  assert.equal(left.moved, true);

  const pair = slide(board([4, 4, 8, 8]), 'left');
  assert.deepEqual(pair.board.slice(0, 4), [8, 16, 0, 0]);
  assert.equal(pair.gained, 24);
});

test('a merged tile never merges again in the same slide', () => {
  const res = slide(board([2, 2, 4, 0]), 'left');
  assert.deepEqual(res.board.slice(0, 4), [4, 4, 0, 0]);
  assert.equal(res.gained, 4);
});

test('slides in every direction agree on the geometry', () => {
  const column = Array(16).fill(0);
  column[0] = 2;
  column[8] = 2;
  column[12] = 4;
  const up = slide(column, 'up').board;
  assert.deepEqual([up[0], up[4], up[8], up[12]], [4, 4, 0, 0]);
  const down = slide(column, 'down').board;
  assert.deepEqual([down[0], down[4], down[8], down[12]], [0, 0, 4, 4]);
  assert.deepEqual(slide(board([0, 0, 2, 2]), 'right').board.slice(0, 4), [0, 0, 0, 4]);
});

test('a slide that changes nothing reports moved: false', () => {
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  assert.equal(slide(full, 'left').moved, false);
  assert.equal(canMove(full), false);
  assert.equal(canMove([...full.slice(0, 15), 0]), true);
  assert.equal(canMove(board([2, 2, 0, 0])), true);
});

test('spawn adds exactly one tile without touching the input', () => {
  const before = startBoard(() => 0.5);
  assert.equal(before.filter(Boolean).length, 2);
  const empty = Array(16).fill(0);
  const after = spawn(empty, () => 0.25);
  assert.equal(after.filter(Boolean).length, 1);
  assert.ok(after.includes(2) || after.includes(4));
  assert.equal(empty.filter(Boolean).length, 0);
  assert.equal(maxTile(before), Math.max(...before));
});