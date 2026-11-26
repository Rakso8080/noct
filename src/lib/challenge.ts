import { MAX_SCORE } from '../../shared/score.ts';
import type { TableResult } from './gamesStore';

/**
 * A shared night: `?by=Mira&score=1180` opens today's board with a line above
 * it. Nothing here is stored — the challenge is a sign, not a player record.
 */

export interface Challenge {
  name: string;
  score: number;
}

export type TableGame = 'mancala' | 'pegs';

interface TableRunBase {
  day: number;
  moves: number;
}

export interface MancalaRun extends TableRunBase {
  game: 'mancala';
  level: 1 | 2;
  result: TableResult;
  stones: number;
}

export interface PegsRun extends TableRunBase {
  game: 'pegs';
  pegs: number;
}

export type TableRun = MancalaRun | PegsRun;

export type TableChallenge = TableRun & { name: string };

export type TableVerdict = 'beat' | 'matched' | 'behind';

const NAME = /^[\p{L}\p{N} ._-]{1,16}$/u;

function parseName(raw: string | null): string | null {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ');
  return name && NAME.test(name) ? name : null;
}

function parseCount(raw: string | null, max: number): number | null {
  if (raw === null || !/^\d{1,3}$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

export function parseChallenge(search: string): Challenge | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return null;
  }
  const name = parseName(params.get('by'));
  const rawScore = params.get('score');
  if (!name || rawScore === null) return null;
  if (!/^\d{1,6}$/.test(rawScore)) return null;
  const score = Number(rawScore);
  if (!Number.isInteger(score) || score <= 0 || score > MAX_SCORE) return null;
  return { name, score };
}

export function challengeQuery(challenge: Challenge): string {
  return `by=${encodeURIComponent(challenge.name)}&score=${challenge.score}`;
}

/** Absolute link to today's board, carrying the challenge line. */
export function challengeLink(challenge: Challenge, origin: string, base = ''): string {
  return `${origin}${base}/play?${challengeQuery(challenge)}`;
}

/**
 * A side-table challenge is also a sign: the day and the sender's result live
 * in the URL. `maxDay` keeps a crafted future board out of the daily table.
 */
export function parseTableChallenge(
  search: string,
  game: TableGame,
  maxDay: number,
): TableChallenge | null {
  if (!Number.isInteger(maxDay) || maxDay < 1) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return null;
  }

  const name = parseName(params.get('by'));
  const rawDay = params.get('day');
  if (!name || rawDay === null || !/^\d{1,5}$/.test(rawDay)) return null;
  const day = Number(rawDay);
  if (!Number.isInteger(day) || day < 1 || day > maxDay) return null;

  const moves = parseCount(params.get('moves'), 999);
  if (moves === null) return null;

  if (game === 'mancala') {
    const rawLevel = params.get('level');
    const result = params.get('result');
    if (rawLevel !== '1' && rawLevel !== '2') return null;
    if (result !== 'win' && result !== 'loss' && result !== 'draw') return null;
    const stones = parseCount(params.get('stones'), 48);
    if (stones === null) return null;
    return {
      game,
      name,
      day,
      level: Number(rawLevel) as 1 | 2,
      result,
      stones,
      moves,
    };
  }

  const pegs = parseCount(params.get('pegs'), 33);
  if (pegs === null) return null;
  return { game, name, day, pegs, moves };
}

export function tableChallengeQuery(run: TableRun, name: string): string {
  const fields = [`by=${encodeURIComponent(name)}`, `day=${run.day}`];
  if (run.game === 'mancala') {
    fields.push(
      `level=${run.level}`,
      `result=${run.result}`,
      `stones=${run.stones}`,
      `moves=${run.moves}`,
    );
  } else {
    fields.push(`pegs=${run.pegs}`, `moves=${run.moves}`);
  }
  return fields.join('&');
}

export function tableChallengeLink(
  run: TableRun,
  name: string,
  origin: string,
  base = '',
): string {
  return `${origin}${base}/${run.game}?${tableChallengeQuery(run, name)}`;
}

const RESULT_RANK: Record<TableResult, number> = { win: 2, draw: 1, loss: 0 };

/** Compare a finished run against the sender's mark. Ties are exact ties. */
export function compareTableRun(target: TableRun, run: TableRun): TableVerdict {
  if (target.game === 'mancala' && run.game === 'mancala') {
    const result = RESULT_RANK[run.result] - RESULT_RANK[target.result];
    if (result !== 0) return result > 0 ? 'beat' : 'behind';
    if (run.stones !== target.stones) return run.stones > target.stones ? 'beat' : 'behind';
    if (run.moves !== target.moves) return run.moves < target.moves ? 'beat' : 'behind';
    return 'matched';
  }

  if (target.game === 'pegs' && run.game === 'pegs') {
    if (run.pegs !== target.pegs) return run.pegs < target.pegs ? 'beat' : 'behind';
    if (run.moves !== target.moves) return run.moves < target.moves ? 'beat' : 'behind';
    return 'matched';
  }

  return 'matched';
}
