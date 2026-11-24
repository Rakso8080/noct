/**
 * Core puzzle engine — pure, deterministic, runs on server and Node scripts.
 *
 * A board is an n×n grid split into n "tones". The player places exactly one
 * spark in every row, every column and every tone, and no two sparks may touch
 * (orthogonally or diagonally). Some sparks are pre-lit and locked.
 *
 * Generation works backwards from a legal placement, so every puzzle is solvable
 * by construction. A solver then proves the solution is unique, adding the
 * fewest possible given sparks until exactly one solution remains.
 */

export interface Puzzle {
  size: number;
  /** tone index per cell, length size*size */
  region: number[];
  /** pre-lit, locked sparks (subset of solution) */
  givens: number[];
  /** the unique solution, as cell indices, length = size */
  solution: number[];
  /** 1 (gentle) .. 5 (barbed) */
  difficulty: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function neighbors4(i: number, n: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out: number[] = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export function touches(i: number, n: number, j: number): boolean {
  const dr = Math.abs(Math.floor(i / n) - Math.floor(j / n));
  const dc = Math.abs((i % n) - (j % n));
  return dr <= 1 && dc <= 1;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** One star per row and column, never on neighbouring columns of adjacent rows. */
function pickStars(rng: () => number, n: number): number[] | null {
  const cols = new Array<number>(n).fill(-1);
  const used = new Uint8Array(n);
  const go = (r: number): boolean => {
    if (r === n) return true;
    const order = shuffle(
      Array.from({ length: n }, (_, i) => i),
      rng,
    );
    for (const c of order) {
      if (used[c]) continue;
      if (r > 0 && Math.abs(c - cols[r - 1]) <= 1) continue;
      used[c] = 1;
      cols[r] = c;
      if (go(r + 1)) return true;
      used[c] = 0;
      cols[r] = -1;
    }
    return false;
  };
  return go(0) ? cols : null;
}

/** Grow n contiguous tones from the n star seeds, keeping sizes balanced. */
function growRegions(rng: () => number, n: number, starCols: number[]): number[] {
  const total = n * n;
  const region = new Array<number>(total).fill(-1);
  const sizes = new Array<number>(n).fill(0);
  for (let r = 0; r < n; r++) {
    region[r * n + starCols[r]] = r;
    sizes[r] = 1;
  }
  let assigned = n;
  while (assigned < total) {
    const cells: number[] = [];
    const owner: number[] = [];
    for (let i = 0; i < total; i++) {
      if (region[i] !== -1) continue;
      let best = -1;
      for (const j of neighbors4(i, n)) {
        const g = region[j];
        if (g >= 0 && (best === -1 || sizes[g] < sizes[best])) best = g;
      }
      if (best >= 0) {
        cells.push(i);
        owner.push(best);
      }
    }
    if (!cells.length) break;
    let minSize = Infinity;
    for (const g of owner) if (sizes[g] < minSize) minSize = sizes[g];
    const pool: number[] = [];
    for (let k = 0; k < cells.length; k++) if (sizes[owner[k]] === minSize) pool.push(k);
    const pick = pool[Math.floor(rng() * pool.length)];
    region[cells[pick]] = owner[pick];
    sizes[owner[pick]]++;
    assigned++;
  }
  return region;
}

interface SearchResult {
  sols: number[][];
  nodes: number;
}

/**
 * Backtracking search with a most-constrained-row heuristic. Counts candidate
 * trials so the same routine can both prove uniqueness and grade difficulty.
 */
function search(p: Puzzle, limit: number): SearchResult {
  const n = p.size;
  const placed = new Array<number>(n).fill(-1);
  const colUsed = new Uint8Array(n);
  const regUsed = new Uint8Array(n);
  const sols: number[][] = [];
  let nodes = 0;

  for (const g of p.givens) {
    const r = Math.floor(g / n);
    const c = g % n;
    if (placed[r] >= 0) return { sols, nodes };
    if (colUsed[c] || regUsed[p.region[g]]) return { sols, nodes };
    placed[r] = c;
    colUsed[c] = 1;
    regUsed[p.region[g]] = 1;
  }

  const candidates = (r: number): number[] => {
    const out: number[] = [];
    for (let c = 0; c < n; c++) {
      const cell = r * n + c;
      if (colUsed[c] || regUsed[p.region[cell]]) continue;
      let bad = false;
      for (let dr = -1; dr <= 1 && !bad; dr++) {
        const rr = r + dr;
        if (rr < 0 || rr >= n) continue;
        const pc = placed[rr];
        if (pc >= 0 && Math.abs(pc - c) <= 1) bad = true;
      }
      if (!bad) out.push(c);
    }
    return out;
  };

  const dfs = (): void => {
    if (sols.length >= limit) return;
    let row = -1;
    let picks: number[] | null = null;
    for (let r = 0; r < n; r++) {
      if (placed[r] >= 0) continue;
      const c = candidates(r);
      if (!c.length) return;
      if (!picks || c.length < picks.length) {
        row = r;
        picks = c;
        if (c.length === 1) break;
      }
    }
    if (row < 0) {
      sols.push(placed.map((c, r) => r * n + c));
      return;
    }
    for (const c of picks ?? []) {
      nodes++;
      placed[row] = c;
      colUsed[c] = 1;
      regUsed[p.region[row * n + c]] = 1;
      dfs();
      placed[row] = -1;
      colUsed[c] = 0;
      regUsed[p.region[row * n + c]] = 0;
      if (sols.length >= limit) return;
    }
  };

  dfs();
  return { sols, nodes };
}

export function countSolutions(p: Puzzle, limit = 2): number {
  return search(p, limit).sols.length;
}

/**
 * Human-style grading: solve using only forced placements (a cell that is the
 * sole option for its row, column or tone), then count how many passes it took.
 * Boards that need case analysis are graded by search effort instead.
 */
function rateDifficulty(p: Puzzle): number {
  const n = p.size;
  const regUsed = new Uint8Array(n);
  const colUsed = new Uint8Array(n);
  const rowCol = new Array<number>(n).fill(-1);
  for (const g of p.givens) {
    regUsed[p.region[g]] = 1;
    colUsed[g % n] = 1;
    rowCol[Math.floor(g / n)] = g % n;
  }

  const canPlace = (cell: number): boolean => {
    const r = Math.floor(cell / n);
    const c = cell % n;
    if (rowCol[r] >= 0) return false;
    if (colUsed[c] || regUsed[p.region[cell]]) return false;
    for (let dr = -1; dr <= 1; dr++) {
      const rr = r + dr;
      if (rr < 0 || rr >= n) continue;
      const pc = rowCol[rr];
      if (pc >= 0 && Math.abs(pc - c) <= 1) return false;
    }
    return true;
  };

  let placed = p.givens.length;
  let waves = 0;
  while (placed < n) {
    const forced: number[] = [];
    for (let r = 0; r < n; r++) {
      if (rowCol[r] >= 0) continue;
      let only = -1;
      let count = 0;
      for (let c = 0; c < n; c++) {
        if (canPlace(r * n + c)) {
          only = r * n + c;
          count++;
        }
      }
      if (count === 0) return 5;
      if (count === 1) forced.push(only);
    }
    for (let c = 0; c < n; c++) {
      if (colUsed[c]) continue;
      let only = -1;
      let count = 0;
      for (let r = 0; r < n; r++) {
        if (canPlace(r * n + c)) {
          only = r * n + c;
          count++;
        }
      }
      if (count === 1) forced.push(only);
    }
    for (let g = 0; g < n; g++) {
      if (regUsed[g]) continue;
      let only = -1;
      let count = 0;
      for (let i = 0; i < n * n; i++) {
        if (p.region[i] === g && canPlace(i)) {
          only = i;
          count++;
        }
      }
      if (count === 1) forced.push(only);
    }
    if (!forced.length) break;
    let added = 0;
    for (const cell of forced) {
      if (!canPlace(cell)) continue;
      const c = cell % n;
      rowCol[Math.floor(cell / n)] = c;
      colUsed[c] = 1;
      regUsed[p.region[cell]] = 1;
      placed++;
      added++;
    }
    if (!added) break;
    waves++;
  }

  if (placed === n) {
    if (waves <= 2) return 1;
    if (waves <= 4) return 2;
    return 3;
  }

  const openRows = Math.max(1, n - p.givens.length);
  const { nodes } = search(p, 1);
  if (nodes <= openRows * 4) return 3;
  if (nodes <= openRows * 10) return 4;
  return 5;
}

/** Strict rule check, independent of the stored solution, so it can gate scoring. */
export function isSolved(p: Puzzle, cells: unknown): boolean {
  const n = p.size;
  if (!Array.isArray(cells) || cells.length !== n) return false;
  const seen = new Set<number>();
  const rows = new Uint8Array(n);
  const cols = new Uint8Array(n);
  const regs = new Uint8Array(n);
  for (const cell of cells) {
    if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell >= n * n) return false;
    if (seen.has(cell)) return false;
    seen.add(cell);
    const r = Math.floor(cell / n);
    const c = cell % n;
    if (rows[r] || cols[c] || regs[p.region[cell]]) return false;
    rows[r] = 1;
    cols[c] = 1;
    regs[p.region[cell]] = 1;
  }
  for (const g of p.givens) if (!seen.has(g)) return false;
  const list = [...seen];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (touches(list[i], n, list[j])) return false;
    }
  }
  return true;
}

export function hintCell(p: Puzzle, placed: number[]): number | null {
  for (const cell of p.solution) if (!placed.includes(cell)) return cell;
  return null;
}

const MAX_ATTEMPTS = 70;
const MAX_GIVENS = 3;

export function generatePuzzle(seed: string, size: number): Puzzle {
  const base = hashSeed(seed);
  let best: Puzzle | null = null;
  let bestKey = Infinity;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = mulberry32((base ^ Math.imul(attempt + 1, 0x9e3779b9)) >>> 0);
    const starCols = pickStars(rng, size);
    if (!starCols) continue;
    const solution = starCols.map((c, r) => r * size + c);
    const region = growRegions(rng, size, starCols);

    let puzzle: Puzzle = { size, region, givens: [], solution, difficulty: 1 };
    let sols = search(puzzle, 16).sols;

    while (sols.length > 1 && puzzle.givens.length < MAX_GIVENS) {
      let pick = -1;
      let bestKill = 0;
      for (const cell of solution) {
        if (puzzle.givens.includes(cell)) continue;
        const kill = sols.reduce((n, s) => n + (s.includes(cell) ? 0 : 1), 0);
        if (kill > bestKill) {
          bestKill = kill;
          pick = cell;
        }
      }
      if (pick < 0) break;
      puzzle = { ...puzzle, givens: [...puzzle.givens, pick] };
      sols = search(puzzle, 16).sols;
    }

    if (sols.length !== 1) continue;

    puzzle.difficulty = rateDifficulty(puzzle);
    const key = puzzle.givens.length * 10 + (puzzle.difficulty >= 2 ? 0 : 5);
    if (key < bestKey) {
      best = puzzle;
      bestKey = key;
    }
    if (puzzle.givens.length <= 2) return puzzle;
  }

  if (best) return best;
  throw new Error('puzzle generation failed');
}
