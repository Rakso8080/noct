import {
  applyMove,
  initialState,
  legalMoves,
  sanFor,
  type ChessMove,
  type ChessState,
  type Kind,
  type MoveRecord,
} from './chess.ts';

/** The wire format is intentionally small and contains no colour: the mover is known from the turn. */
export interface OnlineMove {
  from: number;
  to: number;
  promo: Kind | null;
  castle: 'k' | 'q' | null;
  ep: boolean;
}

export interface OnlineSync {
  moves: OnlineMove[];
}

export interface OnlineResign {
  side: 'w' | 'b';
}

export type OnlineSeat = 'w' | 'b';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

function secureRandom(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 0x1_0000_0000;
  }
  return Math.random();
}

/** Six characters without O/0/I/1, so a code can be read aloud without guessing. */
export function makeRoomCode(random: () => number = secureRandom): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)] ?? 'A';
  }
  return code;
}

export function normalizeRoomCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  if ([...code].some((char) => !CODE_ALPHABET.includes(char))) return null;
  return code;
}

export function seatFromValue(value: string | null | undefined): OnlineSeat {
  return value === 'b' ? 'b' : 'w';
}

export function onlineMove(move: ChessMove): OnlineMove {
  return {
    from: move.from,
    to: move.to,
    promo: move.promo ?? null,
    castle: move.castle ?? null,
    ep: Boolean(move.ep),
  };
}

/** Find the legal move a peer described. Illegal or stale messages are ignored. */
export function findOnlineMove(state: ChessState, wire: OnlineMove): ChessMove | null {
  if (!Number.isInteger(wire.from) || !Number.isInteger(wire.to)) return null;
  return (
    legalMoves(state).find(
      (move) =>
        move.from === wire.from &&
        move.to === wire.to &&
        (move.promo ?? null) === wire.promo &&
        (move.castle ?? null) === wire.castle &&
        Boolean(move.ep) === Boolean(wire.ep),
    ) ?? null
  );
}

/**
 * Replay a peer's move list, rejecting the whole list if any move is illegal.
 * Used when a player joins late or comes back after a lost connection.
 */
export function replayOnlineMoves(wires: OnlineMove[], start: ChessState = initialState()): MoveRecord[] | null {
  let state = start;
  const out: MoveRecord[] = [];
  for (const wire of wires) {
    const legal = legalMoves(state);
    const move = legal.find(
      (candidate) =>
        candidate.from === wire.from &&
        candidate.to === wire.to &&
        (candidate.promo ?? null) === wire.promo &&
        (candidate.castle ?? null) === wire.castle &&
        Boolean(candidate.ep) === Boolean(wire.ep),
    );
    if (!move) return null;
    out.push({ move, san: sanFor(state, move, legal) });
    state = applyMove(state, move);
  }
  return out;
}

/**
 * A room link carries both the code and the invited seat. The creator is white;
 * the friend opens seat=b and therefore sees the board from Black's side.
 */
export function roomLink(room: string, seat: OnlineSeat, href: string): string {
  const url = new URL(href);
  url.search = '';
  url.searchParams.set('room', room);
  url.searchParams.set('seat', seat);
  url.hash = '';
  return url.toString();
}

export function roomFromLocation(href: string): { room: string; seat: OnlineSeat } | null {
  const url = new URL(href);
  const room = normalizeRoomCode(url.searchParams.get('room'));
  if (!room) return null;
  return { room, seat: seatFromValue(url.searchParams.get('seat')) };
}
