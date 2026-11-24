/**
 * The glass orchard: a turn-based snake. One step per key press, which makes it
 * playable with arrows/WASD, with the on-screen pad, and honest to test — every
 * move is a deliberate step rather than a race against a timer.
 */

export const SNAKE_W = 15;
export const SNAKE_H = 11;
export const SNAKE_TARGET = 12;

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  /** Head first. */
  snake: number[];
  food: number;
  steps: number;
  apples: number;
  alive: boolean;
  won: boolean;
  /** Last direction, so a restart knows where the head points. */
  dir: Dir;
}

const DELTA: Record<Dir, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

function freeCell(taken: number[], rnd: () => number): number {
  const open: number[] = [];
  for (let i = 0; i < SNAKE_W * SNAKE_H; i++) if (!taken.includes(i)) open.push(i);
  return open[Math.floor(rnd() * open.length)];
}

export function startSnake(rnd: () => number): SnakeState {
  const mid = Math.floor(SNAKE_H / 2) * SNAKE_W + Math.floor(SNAKE_W / 2);
  const snake = [mid, mid - 1, mid - 2];
  return { snake, food: freeCell(snake, rnd), steps: 0, apples: 0, alive: true, won: false, dir: 'right' };
}

export function stepSnake(state: SnakeState, dir: Dir, rnd: () => number): SnakeState {
  if (!state.alive || state.won) return state;
  const head = state.snake[0];
  const row = Math.floor(head / SNAKE_W);
  const col = head % SNAKE_W;
  const nextRow = row + DELTA[dir].dr;
  const nextCol = col + DELTA[dir].dc;
  const steps = state.steps + 1;

  if (nextRow < 0 || nextRow >= SNAKE_H || nextCol < 0 || nextCol >= SNAKE_W) {
    return { ...state, steps, alive: false, dir };
  }
  const next = nextRow * SNAKE_W + nextCol;
  /* The tail moves away on a normal step, so stepping onto it is allowed. */
  const body = state.snake.slice(0, state.snake.length - 1);
  if (body.includes(next)) {
    return { ...state, steps, alive: false, dir };
  }

  const ate = next === state.food;
  const snake = ate ? [next, ...state.snake] : [next, ...body];
  const apples = state.apples + (ate ? 1 : 0);
  if (apples >= SNAKE_TARGET) {
    return { ...state, snake, apples, steps, dir, won: true, alive: true };
  }
  return {
    ...state,
    snake,
    apples,
    steps,
    dir,
    food: ate ? freeCell(snake, rnd) : state.food,
  };
}
