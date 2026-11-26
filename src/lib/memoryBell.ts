/**
 * The Memory Bell — four bells, one order, one night.
 *
 * The sequence is derived from the day and the round, so tonight's tower rings
 * the same for everyone and a reopened tab cannot reroll an easier order.
 */
import { hashSeed, mulberry32 } from './rng.ts';

export const PADS = 4;
export const START_LENGTH = 3;
export const MAX_LEVEL = 12;

export interface Pad {
  id: number;
  /** i18n key for the pad's note name */
  name: string;
  hz: number;
}

export const BELL_PADS: readonly Pad[] = [
  { id: 0, name: 'the low bell', hz: 261.63 },
  { id: 1, name: 'the reed bell', hz: 329.63 },
  { id: 2, name: 'the glass bell', hz: 392.0 },
  { id: 3, name: 'the high bell', hz: 523.25 },
];

export function sequenceLength(level: number): number {
  return START_LENGTH + Math.max(1, level) - 1;
}

/** The whole order for one round, already deterministic. */
export function bellSequence(day: number, level: number): number[] {
  const rnd = mulberry32(hashSeed('memory-bell', Math.max(1, day), level));
  const length = sequenceLength(level);
  return Array.from({ length }, () => Math.floor(rnd() * PADS));
}

/** Round lengths grow by one until the tower runs out of patience. */
export function nextBellLevel(level: number): number {
  return Math.min(MAX_LEVEL, level + 1);
}

export function bellStepMs(level: number): number {
  return Math.max(260, 620 - level * 26);
}
