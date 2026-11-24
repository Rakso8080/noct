import { createHmac } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = process.env.DATA_DIR ?? '.data';
mkdirSync(DATA_DIR, { recursive: true });

const secretFile = join(DATA_DIR, 'puzzle.secret');

function loadSecret(): string {
  if (process.env.PUZZLE_SECRET) return process.env.PUZZLE_SECRET;
  if (existsSync(secretFile)) {
    const v = readFileSync(secretFile, 'utf8').trim();
    if (v.length >= 32) return v;
  }
  const fresh = createHmac('sha256', 'init').update(String(Math.random())).digest('hex');
  writeFileSync(secretFile, fresh, { mode: 0o600 });
  return fresh;
}

/**
 * Daily seeds are keyed with a server-only secret, so knowing the puzzle number
 * is not enough to precompute tomorrow's board.
 */
export const SECRET = loadSecret();

export function daySeed(kind: string, key: string | number, round: number): string {
  return createHmac('sha256', SECRET)
    .update(`${kind}:${key}:${round}`)
    .digest('hex')
    .slice(0, 24);
}

export { DATA_DIR };
