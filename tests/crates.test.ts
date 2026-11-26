import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CRATE_LEVELS,
  CRATE_SIZE,
  crateDailyIndex,
  crateFreeIndex,
  crateKey,
  crateMove,
  crateSolved,
  crateTargetsLeft,
  dailyCrate,
  freeCrate,
  loadCrateLevel,
  nextFreeCrate,
  type CrateState,
} from '../src/lib/crates.ts';

const DIRS: readonly [number, number][] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function solve(start: CrateState): CrateState | null {
  const queue = [start];
  const seen = new Set([crateKey(start)]);
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    if (crateSolved(state)) return state;
    for (const [dx, dy] of DIRS) {
      const result = crateMove(state, dx, dy);
      if (!result.moved) continue;
      const key = crateKey(result.state);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push(result.state);
    }
  }
  return null;
}

test('the curated yards are rectangular 7×7 maps with one player and paired crates', () => {
  assert.ok(CRATE_LEVELS.length >= 10);
  for (const level of CRATE_LEVELS) {
    assert.equal(level.rows.length, CRATE_SIZE, `${level.id} is not seven rows`);
    for (const row of level.rows) assert.equal(row.length, CRATE_SIZE, `${level.id} is not seven columns`);
    const state = loadCrateLevel(level);
    assert.equal(state.width, CRATE_SIZE);
    assert.equal(state.height, CRATE_SIZE);
    assert.equal(state.crates.length, state.targets.filter(Boolean).length);
    assert.ok(state.crates.length > 0);
    assert.ok(state.player >= 0);
    assert.equal(crateSolved(state), false);
  }
});

test('every daily yard has a real solution', () => {
  for (const level of CRATE_LEVELS) {
    const solution = solve(loadCrateLevel(level));
    assert.ok(solution, `${level.id} has no solution`);
    assert.equal(crateSolved(solution), true);
    assert.ok(solution.moves > 0);
  }
});

test('a push moves the crate and the keeper, and records both counts', () => {
  const start = loadCrateLevel(CRATE_LEVELS[0]);
  const result = crateMove(start, 1, 0);
  assert.equal(result.moved, true);
  assert.equal(result.pushed, true);
  assert.equal(result.state.moves, 1);
  assert.equal(result.state.pushes, 1);
  assert.equal(result.state.player, start.player + 1);
  assert.deepEqual(result.state.crates, [start.crates[0] + 1]);
  assert.equal(crateSolved(result.state), true);
  assert.equal(crateTargetsLeft(result.state), 0);
});

test('walking costs a move but not a push, and walls stop both', () => {
  const start = loadCrateLevel(CRATE_LEVELS[0]);
  const walked = crateMove(start, -1, 0);
  assert.equal(walked.moved, true);
  assert.equal(walked.pushed, false);
  assert.equal(walked.state.moves, 1);
  assert.equal(walked.state.pushes, 0);

  const atWall = crateMove(walked.state, -1, 0);
  assert.equal(atWall.moved, false);
  assert.equal(atWall.state, walked.state);
});

test('a crate cannot be pushed into another crate, a wall or the edge', () => {
  const level = {
    id: 'test',
    name: 'test',
    rows: [
      '#######',
      '#.@$X.#',
      '#..$..#',
      '#..X..#',
      '#.....#',
      '#.....#',
      '#######',
    ],
  };
  const start = loadCrateLevel(level);
  // The first crate has a clear mark beyond it; the second crate is not in its path.
  const first = crateMove(start, 1, 0);
  assert.equal(first.pushed, true);
  assert.equal(crateSolved(first.state), false);

  const blocked = { ...start, crates: [start.player + 1, start.player + 2] };
  const againstCrate = crateMove(blocked, 1, 0);
  assert.equal(againstCrate.moved, false);
  assert.equal(againstCrate.state, blocked);

  const atEdge = { ...start, player: 1, crates: [0] };
  assert.equal(crateMove(atEdge, -1, 0).moved, false);
});

test('daily and free yards are deterministic and keep their own rotation', () => {
  assert.equal(dailyCrate(10).id, dailyCrate(10).id);
  assert.equal(crateDailyIndex(1), 0);
  assert.equal(crateDailyIndex(CRATE_LEVELS.length + 1), 0);
  assert.equal(freeCrate(10, 0).id, freeCrate(10, 0).id);
  assert.equal(crateFreeIndex(10, 0), crateFreeIndex(10, 0));
  assert.notEqual(crateFreeIndex(10, 0), crateFreeIndex(10, 1));
  assert.equal(crateSolved(loadCrateLevel(dailyCrate(10))), false);
});

test('the next free yard skips the daily yard', () => {
  for (let day = 1; day <= CRATE_LEVELS.length * 2; day++) {
    const daily = dailyCrate(day);
    const choice = nextFreeCrate(day, 1, daily.id);
    assert.notEqual(choice.level.id, daily.id);
    assert.equal(choice.level.id, freeCrate(day, choice.round).id);
  }
});

test('a malformed yard is rejected instead of drawing a broken board', () => {
  assert.throws(() =>
    loadCrateLevel({
      id: 'bad',
      name: 'bad',
      rows: ['#####', '#@$X#', '####'],
    }),
  );
  assert.throws(() =>
    loadCrateLevel({
      id: 'bad',
      name: 'bad',
      rows: ['#####', '#.$X#', '#...#', '#####'],
    }),
  );
});
