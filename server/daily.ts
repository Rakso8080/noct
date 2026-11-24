import { ROUND_SIZES } from '../shared/score.ts';
import { generatePuzzle, type Puzzle } from '../shared/puzzle.ts';
import { daySeed } from './secret.ts';

import { DAY_MS, EPOCH_UTC, dayNumber, dayToDate, dayToISO, nextResetAt } from '../shared/dates.ts';

export { DAY_MS, EPOCH_UTC, dayNumber, dayToDate, dayToISO, nextResetAt };

/** Daily boards are a pure function of (secret, day, round). */
export function buildDailyRounds(day: number): Puzzle[] {
  return ROUND_SIZES.map((size, i) => generatePuzzle(daySeed('daily', day, i), size));
}

/** Practice boards use random keys so unlimited never repeats a locked future daily. */
export function buildPracticeRounds(level: number, key: string): Puzzle[] {
  const table: number[][] = [
    [5, 5, 5],
    [5, 6, 6],
    [6, 6, 7],
    [6, 7, 7],
    [7, 7, 7],
  ];
  const sizes = table[Math.max(1, Math.min(5, level)) - 1];
  return sizes.map((size, i) => generatePuzzle(daySeed('practice', key, i), size));
}

export function mainDifficulty(rounds: Puzzle[]): number {
  const avg = rounds.reduce((s, r) => s + r.difficulty, 0) / rounds.length;
  return Math.round(avg * 10) / 10;
}
