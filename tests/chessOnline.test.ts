import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findOnlineMove,
  makeRoomCode,
  normalizeRoomCode,
  onlineMove,
  replayOnlineMoves,
  roomFromLocation,
  roomLink,
  seatFromValue,
} from '../src/lib/chessOnline.ts';
import { applyMove, initialState, legalMoves } from '../src/lib/chess.ts';

test('room codes are six unguessable-looking characters without O/0/I/1', () => {
  const code = makeRoomCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  assert.equal(makeRoomCode(() => 0), 'AAAAAA');
  assert.equal(makeRoomCode(() => 0.999999), '999999');
});

test('room codes are normalised, and ambiguous input is rejected', () => {
  assert.equal(normalizeRoomCode(' ab-c2 34 '), 'ABC234');
  assert.equal(normalizeRoomCode('ABC23'), null);
  assert.equal(normalizeRoomCode('ABC10O'), null);
  assert.equal(normalizeRoomCode('ABC2347'), null);
});

test('a seat defaults to white and a room can be read from the address', () => {
  assert.equal(seatFromValue('b'), 'b');
  assert.equal(seatFromValue('w'), 'w');
  assert.equal(seatFromValue(null), 'w');
  assert.deepEqual(roomFromLocation('https://example.com/noct/chess?room=abc234&seat=b'), {
    room: 'ABC234',
    seat: 'b',
  });
  assert.equal(roomFromLocation('https://example.com/noct/chess?room=nope'), null);
});

test('the invite link replaces stale room parameters and invites black', () => {
  const link = roomLink('ABC234', 'b', 'https://example.com/noct/chess?room=OLD234&seat=w&x=1#y');
  assert.equal(link, 'https://example.com/noct/chess?room=ABC234&seat=b');
});

test('a peer move is found only when it is legal in the current position', () => {
  const start = initialState();
  const first = legalMoves(start)[0];
  assert.ok(first);
  const found = findOnlineMove(start, onlineMove(first));
  assert.deepEqual(found && [found.from, found.to], [first.from, first.to]);
  assert.equal(findOnlineMove(start, { ...onlineMove(first), to: first.from }), null);
  assert.equal(findOnlineMove(start, { ...onlineMove(first), promo: 'q' }), null);
});

test('a late joiner can replay a valid move list, and a tampered list is rejected', () => {
  const start = initialState();
  const first = legalMoves(start)[0];
  const afterFirst = applyMove(start, first);
  const second = legalMoves(afterFirst)[0];
  const records = replayOnlineMoves([onlineMove(first), onlineMove(second)]);
  assert.equal(records?.length, 2);
  assert.equal(records?.[1].move.from, second.from);

  const tampered = replayOnlineMoves([onlineMove(first), { ...onlineMove(second), to: 0 }]);
  assert.equal(tampered, null);
});
