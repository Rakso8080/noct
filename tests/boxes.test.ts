import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOXES_BOXES,
  BOXES_EDGE_COUNT,
  boxesAvailableEdges,
  boxesBot,
  boxesCompletedBy,
  boxesEdgesForBox,
  boxesForEdge,
  boxesFull,
  boxesHEdge,
  boxesRemaining,
  boxesScore,
  boxesVEdge,
  boxesWinner,
  claimEdge,
  startBoxes,
  type BoxesOwner,
  type BoxesState,
} from '../src/lib/boxes.ts';

function withEdges(edges: number[], turn: 1 | 2 = 1): BoxesState {
  const state = startBoxes();
  state.turn = turn;
  for (const edge of edges) state.edgeOwners[edge] = turn;
  return state;
}

function fillOwners(owners: BoxesOwner[], edges = true): BoxesState {
  const state = startBoxes();
  state.edgeOwners = state.edgeOwners.map(() => (edges ? 1 : 0));
  state.owners = owners.slice(0, BOXES_BOXES);
  return state;
}

test('the cloth is five dots, four boxes and forty edges', () => {
  assert.equal(BOXES_EDGE_COUNT, 40);
  assert.equal(BOXES_BOXES, 16);
  assert.equal(boxesEdgesForBox(0).length, 4);
  assert.equal(boxesForEdge(boxesHEdge(0, 0)).length, 1);
  assert.equal(boxesForEdge(boxesHEdge(1, 1)).length, 2);
  assert.equal(boxesForEdge(boxesVEdge(1, 1)).length, 2);
  const state = startBoxes();
  assert.equal(boxesAvailableEdges(state).length, 40);
  assert.equal(boxesRemaining(state), 40);
  assert.equal(boxesFull(state), false);
  assert.equal(boxesWinner(state), null);
});

test('drawing a line alternates the turn and cannot be repeated', () => {
  const start = startBoxes();
  const first = claimEdge(start, boxesHEdge(0, 0));
  assert.ok(first);
  assert.equal(first.extra, false);
  assert.deepEqual(first.boxes, []);
  assert.equal(first.state.turn, 2);
  assert.equal(first.state.edgeOwners[0], 1);
  assert.equal(claimEdge(first.state, boxesHEdge(0, 0)), null);
});

test('the fourth side closes a box and keeps the turn', () => {
  const three = withEdges([boxesHEdge(0, 0), boxesVEdge(0, 0), boxesHEdge(1, 0)], 1);
  const claim = claimEdge(three, boxesVEdge(0, 1));
  assert.ok(claim);
  assert.deepEqual(claim.boxes, [0]);
  assert.equal(claim.extra, true);
  assert.equal(claim.state.turn, 1);
  assert.equal(claim.state.owners[0], 1);
  assert.equal(boxesScore(claim.state, 1), 1);
  assert.equal(boxesScore(claim.state, 2), 0);
});

test('one edge can close two boxes at once', () => {
  const shared = boxesVEdge(0, 1);
  const three = withEdges(
    [
      boxesHEdge(0, 0),
      boxesVEdge(0, 0),
      boxesHEdge(1, 0),
      boxesHEdge(0, 1),
      boxesVEdge(0, 2),
      boxesHEdge(1, 1),
    ],
    2,
  );
  assert.deepEqual(boxesCompletedBy(three, shared), [0, 1]);
  const claim = claimEdge(three, shared);
  assert.ok(claim);
  assert.deepEqual(claim.boxes, [0, 1]);
  assert.equal(claim.state.owners[0], 2);
  assert.equal(claim.state.owners[1], 2);
  assert.equal(claim.state.turn, 2);
});

test('a full cloth has a winner or a draw', () => {
  const win = fillOwners(Array.from({ length: BOXES_BOXES }, (_, i) => (i < 9 ? 1 : 2)) as BoxesOwner[]);
  assert.equal(boxesFull(win), true);
  assert.equal(boxesWinner(win), 1);
  assert.equal(boxesScore(win, 1), 9);

  const draw = fillOwners(Array.from({ length: BOXES_BOXES }, (_, i) => (i < 8 ? 1 : 2)) as BoxesOwner[]);
  assert.equal(boxesWinner(draw), 'draw');

  const loss = fillOwners(Array.from({ length: BOXES_BOXES }, (_, i) => (i < 7 ? 1 : 2)) as BoxesOwner[]);
  assert.equal(boxesWinner(loss), 2);
});

test('the loom always takes a free box', () => {
  const three = withEdges([boxesHEdge(0, 0), boxesVEdge(0, 0), boxesHEdge(1, 0)], 2);
  assert.equal(boxesBot(three, 1, () => 0), boxesVEdge(0, 1));
  assert.equal(boxesBot(three, 2, () => 0), boxesVEdge(0, 1));
});

test('the sharp loom avoids leaving a box for the player', () => {
  const state = withEdges([boxesHEdge(0, 0), boxesVEdge(0, 0)], 2);
  const edge = boxesBot(state, 2, () => 0);
  assert.notEqual(edge, null);
  const claimed = claimEdge(state, edge as number);
  assert.ok(claimed);
  const gifts = boxesAvailableEdges(claimed.state).filter(
    (next) => boxesCompletedBy(claimed.state, next).length > 0,
  );
  assert.deepEqual(gifts, []);
});

test('the loom always picks a legal edge and is deterministic for a seed', () => {
  const state = startBoxes();
  const first = boxesBot(state, 2, () => 0.42);
  assert.ok(first !== null && first >= 0 && first < BOXES_EDGE_COUNT);
  assert.equal(first, boxesBot(state, 2, () => 0.42));
  const loomTurn = { ...state, turn: 2 as const };
  assert.equal(claimEdge(loomTurn, first)?.state.edgeOwners[first], 2);
});

test('a whole cloth can be filled without accepting an illegal edge', () => {
  let state = startBoxes();
  let guard = 0;
  while (!boxesFull(state) && guard < 100) {
    const edge = boxesAvailableEdges(state)[0];
    const claim = claimEdge(state, edge);
    assert.ok(claim, `edge ${edge} should be legal`);
    state = claim.state;
    guard++;
  }
  assert.equal(guard, 40);
  assert.equal(boxesRemaining(state), 0);
  assert.equal(boxesFull(state), true);
  assert.ok(boxesWinner(state));
  assert.equal(claimEdge(state, 0), null);
});
