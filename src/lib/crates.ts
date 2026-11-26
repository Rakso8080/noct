/**
 * Crates: a small Sokoban yard. Pure state only; the screen owns the clock and
 * the local record. Every daily yard is a curated 7×7 map, and every map is
 * checked by the test suite for a real solution.
 */

export const CRATE_SIZE = 7;

export interface CrateLevel {
  id: string;
  name: string;
  rows: readonly string[];
}

export interface CrateState {
  width: number;
  height: number;
  walls: boolean[];
  targets: boolean[];
  crates: number[];
  player: number;
  moves: number;
  pushes: number;
}

export interface CrateMove {
  state: CrateState;
  moved: boolean;
  pushed: boolean;
}

const LEVEL_ROWS: [string, readonly string[]][] = [
  [
    'First push',
    [
      '#######',
      '#.....#',
      '#.@$X.#',
      '#.....#',
      '#.....#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'The low shelf',
    [
      '#######',
      '#..X..#',
      '#.....#',
      '#..$..#',
      '#..@..#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'Two steps up',
    [
      '#######',
      '#.....#',
      '#..X..#',
      '#.....#',
      '#..$..#',
      '#..@..#',
      '#######',
    ],
  ],
  [
    'A pair of crates',
    [
      '#######',
      '#.....#',
      '#.X.X.#',
      '#.$.$.#',
      '#..@..#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'Two marks',
    [
      '#######',
      '#.X.X.#',
      '#.$.$.#',
      '#.....#',
      '#..@..#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'Corner work',
    [
      '#######',
      '#.....#',
      '#.X.X.#',
      '#.$...#',
      '#...$.#',
      '#..@..#',
      '#######',
    ],
  ],
  [
    'The long way round',
    [
      '#######',
      '#.....#',
      '#X....#',
      '#.$#..#',
      '#..@..#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'Two corners',
    [
      '#######',
      '#.....#',
      '#X...X#',
      '#.$...#',
      '#...$.#',
      '#..@..#',
      '#######',
    ],
  ],
  [
    'Westward',
    [
      '#######',
      '#.....#',
      '#X$@..#',
      '#.....#',
      '#.....#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'Down the yard',
    [
      '#######',
      '#..@..#',
      '#..$..#',
      '#..X..#',
      '#.....#',
      '#.....#',
      '#######',
    ],
  ],
  [
    'The far mark',
    [
      '#######',
      '#.....#',
      '#..@..#',
      '#..$..#',
      '#.....#',
      '#..X..#',
      '#######',
    ],
  ],
  [
    'One last turn',
    [
      '#######',
      '#.....#',
      '#.X.X.#',
      '#.$...#',
      '#..$..#',
      '#..@..#',
      '#######',
    ],
  ],
];

export const CRATE_LEVELS: readonly CrateLevel[] = LEVEL_ROWS.map(([name, rows], index) => ({
  id: `yard-${String(index + 1).padStart(2, '0')}`,
  name,
  rows,
}));

function indexOf(width: number, row: number, col: number): number {
  return row * width + col;
}

/** Parse a rectangular ASCII yard. Throws on a malformed curated map. */
export function loadCrateLevel(level: CrateLevel): CrateState {
  const height = level.rows.length;
  const width = level.rows[0]?.length ?? 0;
  if (width === 0 || height === 0) throw new Error('A crate yard needs at least one row');
  if (level.rows.some((row) => row.length !== width)) {
    throw new Error(`${level.id} is not rectangular`);
  }

  const walls = Array<boolean>(width * height).fill(false);
  const targets = Array<boolean>(width * height).fill(false);
  const crates: number[] = [];
  let player = -1;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = level.rows[row][col];
      const i = indexOf(width, row, col);
      if (cell === '#') walls[i] = true;
      if (cell === 'X' || cell === '*' || cell === '+') targets[i] = true;
      if (cell === '$' || cell === '*') crates.push(i);
      if (cell === '@' || cell === '+') {
        if (player >= 0) throw new Error(`${level.id} has more than one player`);
        player = i;
      }
    }
  }

  if (player < 0) throw new Error(`${level.id} has no player`);
  if (crates.length === 0) throw new Error(`${level.id} has no crates`);
  if (crates.length !== targets.filter(Boolean).length) {
    throw new Error(`${level.id} needs the same number of crates and marks`);
  }

  return {
    width,
    height,
    walls,
    targets,
    crates,
    player,
    moves: 0,
    pushes: 0,
  };
}

export function crateDailyIndex(day: number): number {
  return ((Math.trunc(day) - 1) % CRATE_LEVELS.length + CRATE_LEVELS.length) % CRATE_LEVELS.length;
}

export function crateFreeIndex(day: number, round: number, seed = 0): number {
  const value = Math.abs(Math.trunc(day) * 7919 + Math.trunc(round) * 104729 + seed * 1543);
  return value % CRATE_LEVELS.length;
}

export function dailyCrate(day: number): CrateLevel {
  return CRATE_LEVELS[crateDailyIndex(day)];
}

export function freeCrate(day: number, round: number): CrateLevel {
  return CRATE_LEVELS[crateFreeIndex(day, round)];
}

/** The next free yard, skipping a level the caller wants to avoid (the daily one). */
export function nextFreeCrate(
  day: number,
  round: number,
  avoidId?: string,
): { level: CrateLevel; round: number } {
  let nextRound = Math.trunc(round);
  let level = freeCrate(day, nextRound);
  for (let guard = 0; avoidId && level.id === avoidId && guard < CRATE_LEVELS.length; guard++) {
    nextRound += 1;
    level = freeCrate(day, nextRound);
  }
  return { level, round: nextRound };
}

export function crateAt(state: CrateState, index: number): boolean {
  return state.crates.includes(index);
}

export function crateTargetsLeft(state: CrateState): number {
  return state.targets.reduce(
    (left, target, index) => left + (target && !crateAt(state, index) ? 1 : 0),
    0,
  );
}

export function crateSolved(state: CrateState): boolean {
  return crateTargetsLeft(state) === 0;
}

/** Move one cell. Walking is free; a push needs empty floor beyond the crate. */
export function crateMove(state: CrateState, dx: number, dy: number): CrateMove {
  if (crateSolved(state)) return { state, moved: false, pushed: false };
  const row = Math.floor(state.player / state.width);
  const col = state.player % state.width;
  const nextRow = row + dy;
  const nextCol = col + dx;
  if (nextRow < 0 || nextRow >= state.height || nextCol < 0 || nextCol >= state.width) {
    return { state, moved: false, pushed: false };
  }

  const next = indexOf(state.width, nextRow, nextCol);
  if (state.walls[next]) return { state, moved: false, pushed: false };

  if (!crateAt(state, next)) {
    return {
      state: { ...state, player: next, moves: state.moves + 1 },
      moved: true,
      pushed: false,
    };
  }

  const beyondRow = nextRow + dy;
  const beyondCol = nextCol + dx;
  if (beyondRow < 0 || beyondRow >= state.height || beyondCol < 0 || beyondCol >= state.width) {
    return { state, moved: false, pushed: false };
  }
  const beyond = indexOf(state.width, beyondRow, beyondCol);
  if (state.walls[beyond] || crateAt(state, beyond)) {
    return { state, moved: false, pushed: false };
  }

  const crates = state.crates.map((crate) => (crate === next ? beyond : crate));
  return {
    state: {
      ...state,
      crates,
      player: next,
      moves: state.moves + 1,
      pushes: state.pushes + 1,
    },
    moved: true,
    pushed: true,
  };
}

/** Stable key for tests and the solver; the counters do not belong to the position. */
export function crateKey(state: CrateState): string {
  return `${state.player}:${state.crates.slice().sort((a, b) => a - b).join(',')}`;
}
