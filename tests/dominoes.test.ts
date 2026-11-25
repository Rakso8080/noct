import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  drawDomino,
  dominoBot,
  legalDominoMoves,
  makeDoubleSixSet,
  passDomino,
  playDomino,
  scorePips,
  startDominoes,
  type Domino,
  type DominoState,
} from '../src/lib/dominoes.ts';
import { mulberry32 } from '../src/lib/rng.ts';

const tile = (a: number, b: number): Domino => ({ a, b, id: `${a}-${b}` });

test('double-six deals seven each and fourteen in the boneyard', () => {
  const set = makeDoubleSixSet();
  assert.equal(set.length, 28);
  const state = startDominoes(mulberry32(12));
  assert.equal(state.player.length, 7);
  assert.equal(state.bot.length, 7);
  assert.equal(state.boneyard.length, 14);
  const ids = [...state.player, ...state.bot, ...state.boneyard].map((d) => d.id).sort();
  assert.equal(new Set(ids).size, 28);
  assert.deepEqual(ids, set.map((d) => d.id).sort());
});

test('the highest double opens the table', () => {
  const state = startDominoes(mulberry32(3), undefined);
  const playerDouble = state.player.filter((d) => d.a === d.b).map((d) => d.a);
  const botDouble = state.bot.filter((d) => d.a === d.b).map((d) => d.a);
  const playerBest = playerDouble.length ? Math.max(...playerDouble) : -1;
  const botBest = botDouble.length ? Math.max(...botDouble) : -1;
  assert.equal(state.turn, botBest > playerBest ? 'bot' : 'player');
});

test('a tile can be played on either matching end, with the values turned', () => {
  const hand = [tile(3, 5)];
  assert.equal(legalDominoMoves(hand, 5, 1).length, 1);
  assert.equal(legalDominoMoves(hand, 1, 5).length, 1);
  assert.equal(legalDominoMoves(hand, 2, 4).length, 0);

  const state: DominoState = {
    chain: [tile(6, 6)],
    left: 6,
    right: 6,
    player: [tile(3, 6)],
    bot: [],
    boneyard: [],
    turn: 'player',
    passes: 0,
    result: null,
    margin: 0,
  };
  const next = playDomino(state, { tile: state.player[0], end: 'left', flipped: false });
  assert.equal(next.chain[0].a, 3);
  assert.equal(next.chain[0].b, 6);
  assert.equal(next.left, 3);
  assert.equal(next.player.length, 0);
  assert.equal(next.result, 'win');
  assert.equal(next.margin, 0);
});

test('drawing takes one tile and keeps the turn; an empty boneyard is a pass', () => {
  const state: DominoState = {
    chain: [tile(6, 6)],
    left: 6,
    right: 6,
    player: [tile(1, 2)],
    bot: [tile(3, 4)],
    boneyard: [tile(0, 0)],
    turn: 'player',
    passes: 0,
    result: null,
    margin: 0,
  };
  const drawn = drawDomino(state);
  assert.equal(drawn.player.length, 2);
  assert.equal(drawn.boneyard.length, 0);
  assert.equal(drawn.turn, 'player');
  assert.equal(drawDomino(drawn).player.length, 2);

  const passed = passDomino(drawn);
  assert.equal(passed.turn, 'bot');
  const blocked = passDomino(passed);
  assert.equal(blocked.result, 'win');
  assert.equal(blocked.margin, 4);
});

test('a blocked table is decided by pips, and equal pips draw', () => {
  const base: DominoState = {
    chain: [tile(6, 6)],
    left: 6,
    right: 6,
    player: [tile(1, 1)],
    bot: [tile(2, 2)],
    boneyard: [],
    turn: 'player',
    passes: 0,
    result: null,
    margin: 0,
  };
  const win = passDomino(passDomino(base));
  assert.equal(win.result, 'win');
  assert.equal(win.margin, 2);
  const draw = passDomino(passDomino({ ...base, bot: [tile(1, 1)] }));
  assert.equal(draw.result, 'draw');
  assert.equal(scorePips(draw.player), scorePips(draw.bot));
});

test('the bot plays when it can, draws when stuck, and passes on an empty boneyard', () => {
  const open: DominoState = {
    chain: [tile(6, 6)],
    left: 6,
    right: 6,
    player: [tile(1, 2)],
    bot: [tile(6, 3), tile(1, 2)],
    boneyard: [],
    turn: 'bot',
    passes: 0,
    result: null,
    margin: 0,
  };
  const action = dominoBot(open, 2, () => 0.5);
  assert.equal(action.kind, 'play');
  if (action.kind === 'play') assert.equal(action.move.tile.id, '6-3');
  const stuck = { ...open, bot: [tile(1, 2)] };
  assert.equal(dominoBot(stuck, 2, () => 0.5).kind, 'pass');
  assert.equal(dominoBot({ ...stuck, boneyard: [tile(0, 1)] }, 2, () => 0.5).kind, 'draw');
});
