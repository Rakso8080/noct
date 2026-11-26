import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BELL_PADS,
  MAX_LEVEL,
  PADS,
  START_LENGTH,
  bellSequence,
  bellStepMs,
  nextBellLevel,
  sequenceLength,
} from '../src/lib/memoryBell.ts';

test('four bells, each with its own note and a name', () => {
  assert.equal(PADS, 4);
  assert.equal(BELL_PADS.length, 4);
  assert.equal(new Set(BELL_PADS.map((pad) => pad.hz)).size, 4);
  assert.equal(new Set(BELL_PADS.map((pad) => pad.name)).size, 4);
  for (const pad of BELL_PADS) assert.ok(pad.hz > 200 && pad.hz < 900);
});

test('the nightly order is deterministic and only uses real pads', () => {
  for (const day of [1, 2, 45, 90, 400]) {
    for (const level of [1, 2, 5, MAX_LEVEL]) {
      const a = bellSequence(day, level);
      const b = bellSequence(day, level);
      assert.deepEqual(a, b);
      assert.equal(a.length, sequenceLength(level));
      for (const pad of a) assert.ok(Number.isInteger(pad) && pad >= 0 && pad < PADS);
    }
  }
  assert.notDeepEqual(bellSequence(1, 4), bellSequence(2, 4));
});

test('rounds grow by one note and stop at the last level', () => {
  assert.equal(sequenceLength(1), START_LENGTH);
  assert.equal(sequenceLength(2), START_LENGTH + 1);
  assert.equal(sequenceLength(MAX_LEVEL), START_LENGTH + MAX_LEVEL - 1);
  assert.equal(nextBellLevel(1), 2);
  assert.equal(nextBellLevel(MAX_LEVEL - 1), MAX_LEVEL);
  assert.equal(nextBellLevel(MAX_LEVEL), MAX_LEVEL);
});

test('the tower speeds up, but never beyond a playable pace', () => {
  const step = bellStepMs(1);
  assert.ok(step > bellStepMs(6));
  assert.ok(bellStepMs(MAX_LEVEL) >= 260);
  assert.ok(step <= 620);
});
