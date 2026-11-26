/**
 * Dots & Boxes: 5×5 dots, 4×4 boxes and forty edges. Pure board rules and a
 * small bot; the screen owns the clock, sound and local record.
 */

export const BOXES_DOTS = 5;
export const BOXES_ROWS = 4;
export const BOXES_COLS = 4;
export const BOXES_BOXES = BOXES_ROWS * BOXES_COLS;
export const BOXES_H_OFFSET = 0;
export const BOXES_V_OFFSET = 20;
export const BOXES_EDGE_COUNT = 40;

export type BoxesOwner = 0 | 1 | 2;
export type BoxesPlayer = 1 | 2;
export type BoxesResult = BoxesPlayer | 'draw';
export type BoxesLevel = 1 | 2;

export interface BoxesState {
  /** 0 is undrawn; 1 belongs to the player, 2 to the loom. */
  edgeOwners: BoxesOwner[];
  /** 0 is unclaimed, otherwise the player who closed the box. */
  owners: BoxesOwner[];
  turn: BoxesPlayer;
}

export interface BoxesClaim {
  state: BoxesState;
  /** boxes closed by this edge, in reading order */
  boxes: number[];
  /** a closed box keeps the turn */
  extra: boolean;
}

export function boxesBoxIndex(row: number, col: number): number {
  return row * BOXES_COLS + col;
}

export function boxesHEdge(row: number, col: number): number {
  return BOXES_H_OFFSET + row * BOXES_COLS + col;
}

export function boxesVEdge(row: number, col: number): number {
  return BOXES_V_OFFSET + row * BOXES_DOTS + col;
}

export function boxesEdgeKind(edge: number): 'h' | 'v' {
  return edge < BOXES_V_OFFSET ? 'h' : 'v';
}

export function boxesEdgeRow(edge: number): number {
  return edge < BOXES_V_OFFSET
    ? Math.floor(edge / BOXES_COLS)
    : Math.floor((edge - BOXES_V_OFFSET) / BOXES_DOTS);
}

export function boxesEdgeCol(edge: number): number {
  return edge < BOXES_V_OFFSET
    ? edge % BOXES_COLS
    : (edge - BOXES_V_OFFSET) % BOXES_DOTS;
}

/** The four edges around a box: top, right, bottom, left. */
export function boxesEdgesForBox(box: number): number[] {
  const row = Math.floor(box / BOXES_COLS);
  const col = box % BOXES_COLS;
  return [
    boxesHEdge(row, col),
    boxesVEdge(row, col + 1),
    boxesHEdge(row + 1, col),
    boxesVEdge(row, col),
  ];
}

/** An edge can border one or two boxes. */
export function boxesForEdge(edge: number): number[] {
  const row = boxesEdgeRow(edge);
  const col = boxesEdgeCol(edge);
  if (boxesEdgeKind(edge) === 'h') {
    const boxes: number[] = [];
    if (row > 0) boxes.push(boxesBoxIndex(row - 1, col));
    if (row < BOXES_ROWS) boxes.push(boxesBoxIndex(row, col));
    return boxes;
  }
  const boxes: number[] = [];
  if (col > 0) boxes.push(boxesBoxIndex(row, col - 1));
  if (col < BOXES_COLS) boxes.push(boxesBoxIndex(row, col));
  return boxes;
}

export function startBoxes(): BoxesState {
  return {
    edgeOwners: Array<BoxesOwner>(BOXES_EDGE_COUNT).fill(0),
    owners: Array<BoxesOwner>(BOXES_BOXES).fill(0),
    turn: 1,
  };
}

function legalEdge(edge: number): boolean {
  return Number.isInteger(edge) && edge >= 0 && edge < BOXES_EDGE_COUNT;
}

export function boxesAvailableEdges(state: BoxesState): number[] {
  return state.edgeOwners.flatMap((owner, edge) => (owner === 0 ? [edge] : []));
}

export function boxesBoxIsClosed(state: BoxesState, box: number): boolean {
  return boxesEdgesForBox(box).every((edge) => state.edgeOwners[edge] !== 0);
}

/** The boxes this edge would close right now. */
export function boxesCompletedBy(state: BoxesState, edge: number): number[] {
  if (!legalEdge(edge) || state.edgeOwners[edge] !== 0) return [];
  return boxesForEdge(edge).filter((box) => {
    if (state.owners[box] !== 0) return false;
    return boxesEdgesForBox(box).every((side) => side === edge || state.edgeOwners[side] !== 0);
  });
}

/**
 * Draw an edge. The claim is null when the edge is out of range, already
 * drawn, or the board is full.
 */
export function claimEdge(state: BoxesState, edge: number): BoxesClaim | null {
  if (!legalEdge(edge) || state.edgeOwners[edge] !== 0) return null;
  if (boxesFull(state)) return null;

  const player = state.turn;
  const boxes = boxesCompletedBy(state, edge);
  const edgeOwners = state.edgeOwners.slice();
  edgeOwners[edge] = player;

  const next = { ...state, edgeOwners };
  if (!boxes.length) {
    return { state: { ...next, turn: player === 1 ? 2 : 1 }, boxes, extra: false };
  }

  const owners = state.owners.slice();
  for (const box of boxes) owners[box] = player;
  return {
    state: { ...next, owners, turn: player },
    boxes,
    extra: true,
  };
}

export function boxesScore(state: BoxesState, player: BoxesPlayer): number {
  return state.owners.filter((owner) => owner === player).length;
}

export function boxesRemaining(state: BoxesState): number {
  return state.edgeOwners.filter((owner) => owner === 0).length;
}

export function boxesFull(state: BoxesState): boolean {
  return boxesRemaining(state) === 0;
}

/** null until the board is full, then a player or a draw. */
export function boxesWinner(state: BoxesState): BoxesResult | null {
  if (!boxesFull(state)) return null;
  const you = boxesScore(state, 1);
  const loom = boxesScore(state, 2);
  return you === loom ? 'draw' : you > loom ? 1 : 2;
}

function boxesImmediate(state: BoxesState): number[] {
  return boxesAvailableEdges(state).filter((edge) => boxesCompletedBy(state, edge).length > 0);
}

function boxesGifts(state: BoxesState): number {
  return boxesAvailableEdges(state).reduce((count, edge) => {
    const completed = boxesCompletedBy(state, edge);
    return count + completed.length;
  }, 0);
}

/**
 * The loom's next edge. Steady takes a box when one is free and otherwise
 * chooses at random; Sharp also avoids leaving a box for the player.
 */
export function boxesBot(state: BoxesState, level: BoxesLevel, rnd: () => number): number | null {
  const available = boxesAvailableEdges(state);
  if (!available.length) return null;

  const free = boxesImmediate(state);
  if (free.length) {
    let best = free[0];
    let bestCount = -1;
    for (const edge of free) {
      const count = boxesCompletedBy(state, edge).length;
      if (count > bestCount) {
        best = edge;
        bestCount = count;
      }
    }
    return best;
  }

  if (level === 1) {
    return available[Math.floor(rnd() * available.length)] ?? available[0];
  }

  let best = available[0];
  let bestGift = Number.POSITIVE_INFINITY;
  let bestRemaining = Number.POSITIVE_INFINITY;
  for (const edge of available) {
    const claimed = claimEdge(state, edge);
    if (!claimed) continue;
    const gift = boxesGifts(claimed.state);
    const remaining = boxesRemaining(claimed.state);
    if (gift < bestGift || (gift === bestGift && remaining < bestRemaining)) {
      best = edge;
      bestGift = gift;
      bestRemaining = remaining;
    }
  }
  return best;
}
