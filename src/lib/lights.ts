/**
 * Lights Out is linear algebra over GF(2): pressing a square toggles it and its
 * four neighbours, presses commute, and pressing twice undoes itself. So the
 * board is solved by Gaussian elimination over 25 equations.
 *
 * The 5×5 lattice has a small nullspace, so after finding one solution we can
 * enumerate the nullspace to return the *shortest* set of presses — that number
 * is what the HUD shows, and it has to be the truth.
 */

export const LIGHTS_SIZE = 5;
export const LIGHTS_CELLS = LIGHTS_SIZE * LIGHTS_SIZE;

function toggles(i: number): number[] {
  const r = Math.floor(i / LIGHTS_SIZE);
  const c = i % LIGHTS_SIZE;
  const out = [i];
  if (r > 0) out.push(i - LIGHTS_SIZE);
  if (r < LIGHTS_SIZE - 1) out.push(i + LIGHTS_SIZE);
  if (c > 0) out.push(i - 1);
  if (c < LIGHTS_SIZE - 1) out.push(i + 1);
  return out;
}

/** A press at `press` changes the lit state of every square in this set. */
export const PRESS_EFFECT: number[][] = Array.from({ length: LIGHTS_CELLS }, (_, i) => toggles(i));

/**
 * The presses that turn every lit square off, shortest first, or null when the
 * board cannot be solved from here (only reachable from an unreachable state).
 */
export function solveLights(cells: readonly boolean[]): number[] | null {
  const n = LIGHTS_CELLS;
  /* rows[i] is a bitmask of presses that affect square i, plus the RHS in bit n. */
  const rows = Array.from({ length: n }, (_, i) => {
    let mask = 0;
    for (let press = 0; press < n; press++) {
      if (PRESS_EFFECT[press].includes(i)) mask |= 1 << press;
    }
    if (cells[i]) mask |= 1 << n;
    return mask;
  });

  const pivotOf: number[] = Array(n).fill(-1);
  let row = 0;
  for (let col = 0; col < n && row < n; col++) {
    let pick = row;
    while (pick < n && ((rows[pick] >> col) & 1) === 0) pick++;
    if (pick === n) continue;
    [rows[row], rows[pick]] = [rows[pick], rows[row]];
    for (let other = 0; other < n; other++) {
      if (other !== row && ((rows[other] >> col) & 1) === 1) rows[other] ^= rows[row];
    }
    pivotOf[col] = row;
    row++;
  }

  for (const r of rows) {
    if ((r & ((1 << n) - 1)) === 0 && ((r >> n) & 1) === 1) return null;
  }

  const free: number[] = [];
  for (let col = 0; col < n; col++) if (pivotOf[col] === -1) free.push(col);

  /* One particular solution: free variables zero, pivots read off the RHS. */
  let base = 0;
  for (let col = 0; col < n; col++) {
    const r = pivotOf[col];
    if (r !== -1 && ((rows[r] >> n) & 1) === 1) base |= 1 << col;
  }

  /* Every nullspace vector, so all solutions can be compared. */
  const nullVectors: number[] = [];
  for (const col of free) {
    let vector = 1 << col;
    for (let pivot = 0; pivot < n; pivot++) {
      const r = pivotOf[pivot];
      if (r !== -1 && ((rows[r] >> col) & 1) === 1) vector |= 1 << pivot;
    }
    nullVectors.push(vector);
  }

  const weight = (mask: number): number => {
    let count = 0;
    let m = mask;
    while (m) {
      m &= m - 1;
      count++;
    }
    return count;
  };

  let best = base;
  let bestWeight = weight(base);
  const span = 1 << nullVectors.length;
  if (nullVectors.length <= 12) {
    for (let combo = 1; combo < span; combo++) {
      let candidate = base;
      for (let bit = 0; bit < nullVectors.length; bit++) {
        if (combo & (1 << bit)) candidate ^= nullVectors[bit];
      }
      const w = weight(candidate);
      if (w < bestWeight) {
        best = candidate;
        bestWeight = w;
      }
    }
  }

  const presses: number[] = [];
  for (let i = 0; i < n; i++) if ((best >> i) & 1) presses.push(i);
  return presses;
}

/** Apply a list of presses to a board, for tests and for the hint preview. */
export function applyPresses(cells: readonly boolean[], presses: readonly number[]): boolean[] {
  const next = cells.slice();
  for (const press of presses) {
    for (const j of PRESS_EFFECT[press]) next[j] = !next[j];
  }
  return next;
}
