import assert from 'node:assert/strict';
import test from 'node:test';
import { SNAKE_TARGET, SNAKE_W, startSnake, stepSnake, type SnakeState } from '../src/lib/snake.ts';

const still = () => 0;

test('the orchard starts with a three-cell snake and one apple', () => {
  const state = startSnake(still);
  assert.equal(state.snake.length, 3);
  assert.equal(state.apples, 0);
  assert.equal(state.alive, true);
  assert.equal(state.won, false);
  assert.ok(!state.snake.includes(state.food));
});

test('walking into a wall ends the run and still counts the step', () => {
  let state = startSnake(still);
  for (let i = 0; i < 5; i++) state = stepSnake(state, 'down', still);
  assert.equal(Math.floor(state.snake[0] / SNAKE_W), 10);
  assert.equal(state.alive, true);
  assert.equal(state.steps, 5);

  state = stepSnake(state, 'down', still);
  assert.equal(state.alive, false);
  assert.equal(state.steps, 6);
});

test('the tail moves away, so following it is allowed', () => {
  const state: SnakeState = {
    snake: [38, 39, 54, 53, 37],
    food: 0,
    steps: 0,
    apples: 0,
    alive: true,
    won: false,
    dir: 'right',
  };
  const next = stepSnake(state, 'left', still);
  assert.equal(next.alive, true);
  assert.equal(next.snake[0], 37);
});

test('a U-turn into the body is a loss', () => {
  const state: SnakeState = {
    snake: [37, 38, 39, 24, 23],
    food: 0,
    steps: 0,
    apples: 0,
    alive: true,
    won: false,
    dir: 'right',
  };
  const next = stepSnake(state, 'right', still);
  assert.equal(next.alive, false);
});

test('eating grows the snake, moves the apple and wins at the target', () => {
  const state = startSnake(still);
  const head = state.snake[0];
  const eating: SnakeState = { ...state, food: head + 1 };
  const next = stepSnake(eating, 'right', still);
  assert.equal(next.apples, 1);
  assert.equal(next.snake.length, 4);
  assert.notEqual(next.food, next.snake[0]);
  assert.ok(!next.snake.includes(next.food));

  const almost: SnakeState = { ...state, apples: SNAKE_TARGET - 1, food: head + 1 };
  const won = stepSnake(almost, 'right', still);
  assert.equal(won.won, true);
  assert.equal(won.apples, SNAKE_TARGET);
  assert.equal(stepSnake(won, 'down', still), won, 'a won run ignores further keys');
});