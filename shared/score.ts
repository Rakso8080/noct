/** Scoring — shared by the server (authoritative) and the client (preview only). */

export const ROUND_SIZES = [5, 6, 6, 7];
export const ROUND_BASE = [100, 125, 150, 175];
export const CLEAN_BONUS = 25;
export const HINT_COST = 80;
export const MAX_HINTS = 3;
export const MAX_TIME_BONUS = 120;

export function parMs(size: number): number {
  return size * 9 * 1000;
}

export function scoreRound(
  roundIndex: number,
  size: number,
  timeMs: number,
  hintUsed: boolean,
): { base: number; timeBonus: number; clean: number; total: number } {
  const base = ROUND_BASE[roundIndex] ?? ROUND_BASE[ROUND_BASE.length - 1];
  const par = parMs(size);
  const f = Math.max(0, Math.min(1, (par - timeMs) / par));
  const timeBonus = Math.round(MAX_TIME_BONUS * f);
  const clean = hintUsed ? 0 : CLEAN_BONUS;
  return { base, timeBonus, clean, total: base + timeBonus + clean };
}

export function maxScore(roundCount = ROUND_SIZES.length): number {
  return ROUND_BASE.slice(0, roundCount).reduce(
    (sum, base) => sum + base + MAX_TIME_BONUS + CLEAN_BONUS,
    0,
  );
}

export const MAX_SCORE = maxScore();

export type Rating = 'Legendary' | 'Excellent' | 'Great' | 'Good' | 'Warming up';

export function ratingFor(score: number, max = MAX_SCORE): Rating {
  const pct = score / max;
  if (pct >= 0.87) return 'Legendary';
  if (pct >= 0.72) return 'Excellent';
  if (pct >= 0.57) return 'Great';
  if (pct >= 0.38) return 'Good';
  return 'Warming up';
}

/** How fast a round was, relative to par — used for the share grid. */
export function speedTier(timeMs: number, size: number): 0 | 1 | 2 {
  const par = parMs(size);
  if (timeMs <= par * 0.55) return 0; // quick
  if (timeMs <= par) return 1; // on par
  return 2; // slow
}
