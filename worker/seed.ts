import { ROUND_SIZES } from '../shared/score';
import { generatePuzzle, type Puzzle } from '../shared/puzzle';

/**
 * Daily boards are a pure function of (secret, day, round) — the same rule as
 * the Node server, expressed with WebCrypto so a Worker isolate can derive them
 * synchronously enough to stay deterministic across restarts.
 */

const enc = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

/** Local development fallback only; production must set PUZZLE_SECRET. */
export const DEV_SECRET = 'noct-development-secret-32-characters-min';

export function secretOf(env: { PUZZLE_SECRET?: string }): string {
  const secret = env.PUZZLE_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : DEV_SECRET;
}

function keyFor(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;
  const pending = crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  keyCache.set(secret, pending);
  return pending;
}

export async function daySeed(
  secret: string,
  kind: string,
  key: string | number,
  round: number,
): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await keyFor(secret), enc.encode(`${kind}:${key}:${round}`));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24);
}

export async function buildDailyRounds(secret: string, day: number): Promise<Puzzle[]> {
  const seeds = await Promise.all(ROUND_SIZES.map((_, i) => daySeed(secret, 'daily', day, i)));
  return ROUND_SIZES.map((size, i) => generatePuzzle(seeds[i], size));
}

const PRACTICE_SIZES: number[][] = [
  [5, 5, 5],
  [5, 6, 6],
  [6, 6, 7],
  [6, 7, 7],
  [7, 7, 7],
];

export async function buildPracticeRounds(secret: string, level: number, key: string): Promise<Puzzle[]> {
  const sizes = PRACTICE_SIZES[Math.max(1, Math.min(5, level)) - 1];
  const seeds = await Promise.all(sizes.map((_, i) => daySeed(secret, 'practice', key, i)));
  return sizes.map((size, i) => generatePuzzle(seeds[i], size));
}

export function mainDifficulty(rounds: Puzzle[]): number {
  const avg = rounds.reduce((s, r) => s + r.difficulty, 0) / rounds.length;
  return Math.round(avg * 10) / 10;
}
