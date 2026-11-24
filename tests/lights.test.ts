import assert from 'node:assert/strict';
import test from 'node:test';
import { LIGHTS_CELLS, applyPresses, solveLights } from '../src/lib/lights.ts';
import { mulberry32 } from '../src/lib/rng.ts';

const dark = (): boolean[] => Array<boolean>(LIGHTS_CELLS).fill(false);

test('a dark room needs no presses', () => {
  assert.deepEqual(solveLights(dark()), []);
  assert.equal(applyPresses(dark(), []).some(Boolean), false);
});

test('every generated puzzle is solved, and never with more presses than made it', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const rnd = mulberry32(seed);
    const made = Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => Math.floor(rnd() * LIGHTS_CELLS));
    const board = applyPresses(dark(), made);
    const solution = solveLights(board);
    assert.ok(solution, `seed ${seed} should be solvable`);
    const after = applyPresses(board, solution!);
    assert.equal(after.some(Boolean), false, `seed ${seed} leaves a lit window`);
    assert.ok(solution!.length <= new Set(made).size, `seed ${seed} was not shortest`);
  }
});

test('pressing the same window twice changes nothing', () => {
  const board = applyPresses(dark(), [7, 13]);
  assert.deepEqual(applyPresses(board, [7, 7]), board);
});