/**
 * The side tables that keep a score on the server. Only the two nightly word
 * and bell games report; the rest of the arcade stays local on purpose.
 */
export const ARCADE_GAMES = ['wordwell', 'memorybell'] as const;

export type ArcadeGame = (typeof ARCADE_GAMES)[number];

export const ARCADE_LABELS: Record<ArcadeGame, string> = {
  wordwell: 'Word Well',
  memorybell: 'Memory Bell',
};

/** Enough headroom for any honest run, small enough to reject nonsense. */
export const ARCADE_MAX_SCORE = 5000;

export function isArcadeGame(value: unknown): value is ArcadeGame {
  return typeof value === 'string' && (ARCADE_GAMES as readonly string[]).includes(value);
}

/**
 * Word Well: every guess you did not need is worth 120; a lost night still
 * leaves the 60 for turning up. Six guesses, one word.
 */
export function wordWellPoints(guesses: number, won: boolean): number {
  if (!won) return 60;
  const guessed = Math.trunc(guesses);
  const used = Math.min(6, Math.max(1, Number.isFinite(guessed) ? guessed : 6));
  return (7 - used) * 120;
}

/** Memory Bell: 100 for every round held, up to the twelfth. */
export function bellPoints(roundsHeld: number): number {
  return Math.max(0, Math.min(12, Math.trunc(roundsHeld) || 0)) * 100;
}
