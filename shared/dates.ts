/** Board calendar — UTC scheduling, identical for every player. */

export const DAY_MS = 86_400_000;
/** Noct #1 — launch day, 2026-11-24, 00:00 UTC. */
export const EPOCH_UTC = Date.UTC(2026, 10, 24);

export function dayNumber(at: Date = new Date()): number {
  const utcMidnight = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  return Math.floor((utcMidnight - EPOCH_UTC) / DAY_MS) + 1;
}

export function dayToDate(day: number): Date {
  return new Date(EPOCH_UTC + (day - 1) * DAY_MS);
}

export function dayToISO(day: number): string {
  return dayToDate(day).toISOString().slice(0, 10);
}

export function nextResetAt(now: Date = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY_MS;
}
