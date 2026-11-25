/**
 * A single-opponent double-six domino table. Seven tiles each, fourteen in the
 * boneyard. The highest double opens; if nobody holds one the player opens.
 * A playable tile may be placed on either open end. If you cannot play, draw
 * until you can, then pass. An empty hand wins; a blocked table is decided by
 * the lower pip count.
 */

export interface Domino {
  a: number;
  b: number;
  id: string;
}

export type DominoEnd = 'left' | 'right';
export type DominoTurn = 'player' | 'bot';
export type DominoResult = 'win' | 'loss' | 'draw';

export interface DominoMove {
  tile: Domino;
  end: DominoEnd;
  /** true when the tile is displayed with its values swapped */
  flipped: boolean;
}

export interface DominoState {
  chain: Domino[];
  left: number | null;
  right: number | null;
  player: Domino[];
  bot: Domino[];
  boneyard: Domino[];
  turn: DominoTurn;
  passes: number;
  result: DominoResult | null;
  /** positive when the player wins by pips */
  margin: number;
}

export type DominoBotAction =
  | { kind: 'play'; move: DominoMove }
  | { kind: 'draw' }
  | { kind: 'pass' }
  | { kind: 'none' };

export function makeDoubleSixSet(): Domino[] {
  const set: Domino[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) set.push({ a, b, id: `${a}-${b}` });
  }
  return set;
}

export function shuffle<T>(items: readonly T[], rnd: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function highestDouble(hand: readonly Domino[]): number {
  return hand.reduce((best, tile) => (tile.a === tile.b ? Math.max(best, tile.a) : best), -1);
}

export function startDominoes(rnd: () => number = Math.random, first?: DominoTurn): DominoState {
  const deck = shuffle(makeDoubleSixSet(), rnd);
  const player = deck.slice(0, 7);
  const bot = deck.slice(7, 14);
  const boneyard = deck.slice(14);
  const playerDouble = highestDouble(player);
  const botDouble = highestDouble(bot);
  const opener = first ?? (botDouble > playerDouble ? 'bot' : 'player');
  return {
    chain: [],
    left: null,
    right: null,
    player,
    bot,
    boneyard,
    turn: opener,
    passes: 0,
    result: null,
    margin: 0,
  };
}

export function scorePips(hand: readonly Domino[]): number {
  return hand.reduce((sum, tile) => sum + tile.a + tile.b, 0);
}

export function legalDominoMoves(
  hand: readonly Domino[],
  left: number | null,
  right: number | null,
): DominoMove[] {
  if (left === null || right === null) {
    return hand.map((tile) => ({ tile, end: 'right' as const, flipped: false }));
  }

  const moves: DominoMove[] = [];
  const seen = new Set<string>();
  const add = (tile: Domino, end: DominoEnd, flipped: boolean) => {
    const key = `${tile.id}:${end}:${flipped ? 1 : 0}`;
    if (seen.has(key)) return;
    seen.add(key);
    moves.push({ tile, end, flipped });
  };

  for (const tile of hand) {
    if (tile.b === left) add(tile, 'left', false);
    if (tile.a === left) add(tile, 'left', true);
    if (tile.a === right) add(tile, 'right', false);
    if (tile.b === right) add(tile, 'right', true);
  }
  return moves;
}

function handFor(state: DominoState, who: DominoTurn): Domino[] {
  return who === 'player' ? state.player : state.bot;
}

function withHand(state: DominoState, who: DominoTurn, hand: Domino[]): Pick<DominoState, 'player' | 'bot'> {
  return who === 'player' ? { player: hand, bot: state.bot } : { player: state.player, bot: hand };
}

export function playDomino(state: DominoState, move: DominoMove): DominoState {
  if (state.result) return state;
  const hand = handFor(state, state.turn);
  const tileIndex = hand.findIndex((tile) => tile.id === move.tile.id);
  if (tileIndex < 0) return state;
  const tile = hand[tileIndex];

  let chain: Domino[];
  let left: number | null;
  let right: number | null;
  if (!state.chain.length) {
    chain = [{ ...tile }];
    left = tile.a;
    right = tile.b;
  } else if (move.end === 'left') {
    const shown = move.flipped ? { a: tile.b, b: tile.a, id: tile.id } : { ...tile };
    if (shown.b !== state.left) return state;
    chain = [shown, ...state.chain];
    left = shown.a;
    right = state.right;
  } else {
    const shown = move.flipped ? { a: tile.b, b: tile.a, id: tile.id } : { ...tile };
    if (shown.a !== state.right) return state;
    chain = [...state.chain, shown];
    left = state.left;
    right = shown.b;
  }

  const nextHand = hand.filter((_, i) => i !== tileIndex);
  const hands = withHand(state, state.turn, nextHand);
  const playerLeft = hands.player.length;
  const botLeft = hands.bot.length;
  let result: DominoResult | null = null;
  let margin = 0;
  if (playerLeft === 0) {
    result = 'win';
    margin = scorePips(hands.bot);
  } else if (botLeft === 0) {
    result = 'loss';
    margin = -scorePips(hands.player);
  }

  return {
    ...state,
    ...hands,
    chain,
    left,
    right,
    turn: state.turn === 'player' ? 'bot' : 'player',
    passes: 0,
    result,
    margin,
  };
}

/** Draw one tile for the side to move. The turn does not change. */
export function drawDomino(state: DominoState): DominoState {
  if (state.result || !state.boneyard.length) return state;
  const [tile, ...rest] = state.boneyard;
  const hand = handFor(state, state.turn);
  return {
    ...state,
    ...withHand(state, state.turn, [...hand, tile]),
    boneyard: rest,
    passes: 0,
  };
}

/** Pass when the boneyard is empty and no tile matches either end. */
export function passDomino(state: DominoState): DominoState {
  if (state.result) return state;
  const passes = state.passes + 1;
  if (passes >= 2 && !state.boneyard.length) {
    const playerPips = scorePips(state.player);
    const botPips = scorePips(state.bot);
    return {
      ...state,
      passes,
      result: playerPips < botPips ? 'win' : playerPips > botPips ? 'loss' : 'draw',
      margin: botPips - playerPips,
    };
  }
  return {
    ...state,
    passes,
    turn: state.turn === 'player' ? 'bot' : 'player',
  };
}

export function dominoMovesFor(state: DominoState, who: DominoTurn): DominoMove[] {
  return legalDominoMoves(handFor(state, who), state.left, state.right);
}

/**
 * Level 1 sheds the heaviest legal tile. Level 2 also looks at how many replies
 * the move leaves the opponent, so it will block an end when it can.
 */
export function dominoBot(
  state: DominoState,
  level: 1 | 2 = 2,
  rnd: () => number = Math.random,
): DominoBotAction {
  if (state.result) return { kind: 'none' };
  const moves = dominoMovesFor(state, 'bot');
  if (!moves.length) {
    return state.boneyard.length ? { kind: 'draw' } : { kind: 'pass' };
  }

  let best: DominoMove | null = null;
  let bestScore = -Infinity;
  for (const move of moves) {
    const next = playDomino(state, move);
    if (next === state) continue;
    const handPips = scorePips(next.bot);
    let score = -handPips;
    if (next.result === 'loss') score += 100000;
    if (next.result === 'draw') score += 50000;
    if (level === 2) {
      const replies = dominoMovesFor(next, 'player').length;
      score -= replies * 18;
      // Keeping both ends awkward is worth a little more than raw pips.
      if (next.left !== null && next.right !== null && next.left !== next.right) score += 3;
    }
    score += rnd() * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best ? { kind: 'play', move: best } : { kind: 'pass' };
}
