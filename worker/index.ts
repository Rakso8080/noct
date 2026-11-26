import { ARCADE_MAX_SCORE, isArcadeGame, type ArcadeGame } from '../shared/arcade';
import { dayNumber, dayToISO, nextResetAt } from '../shared/dates';
import { countSolutions, hintCell, isSolved, type Puzzle } from '../shared/puzzle';
import { HINT_COST, MAX_HINTS, MAX_SCORE, ROUND_SIZES, maxScore, ratingFor, scoreRound } from '../shared/score';
import type {
  ArchiveEntry,
  ArcadeLeaderboardResponse,
  ArcadeScoreResponse,
  ArcadeStat,
  GlobalToday,
  HintResponse,
  LeaderRow,
  LeaderboardResponse,
  MeResponse,
  Mode,
  RoundView,
  StartResponse,
  StatsResponse,
  Summary,
} from '../shared/types';
import { createDb, ensureSchema, type Db, type Env, type Row } from './db';
import { buildDailyRounds, buildPracticeRounds, mainDifficulty, secretOf } from './seed';

/**
 * The Noct API, on Workers + D1. This is a 1:1 port of `server/index.ts`:
 * same routes, same status codes, same JSON. The Node server stays for local
 * `npm run dev`; parity is proven by `scripts/smoke.ts` run against both.
 */

const COOKIE = 'noct_pid';
const SESSION_TTL = 12 * 60 * 60 * 1000;
const MIN_ROUND_MS = 700;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* ---------------------------------------------------------------- utilities */

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : typeof value === 'bigint' ? Number(value) : fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function json(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  });
}

function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function cookieFor(request: Request, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (text.length > 64 * 1024) throw new HttpError(413, 'body too large');
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid json');
  }
}

const buckets = new Map<string, { n: number; reset: number }>();
function rateLimit(ip: string): void {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.reset < now) {
    buckets.set(ip, { n: 1, reset: now + 10_000 });
    if (buckets.size > 5000) {
      for (const [key, value] of buckets) if (value.reset < now) buckets.delete(key);
    }
    return;
  }
  bucket.n++;
  if (bucket.n > 240) throw new HttpError(429, 'too many requests');
}

async function ensurePlayer(request: Request, db: Db): Promise<{ pid: string; cookie: string | null }> {
  const now = Date.now();
  const pid = getCookie(request, COOKIE);
  if (pid && /^[0-9a-f-]{36}$/.test(pid)) {
    const row = await db.one('select id from players where id = ?', pid);
    if (row) {
      await db.run('update players set last_seen = ? where id = ?', now, pid);
      return { pid, cookie: null };
    }
  }
  const id = crypto.randomUUID();
  await db.run(
    'insert into players (id, name, created_at, last_seen) values (?, ?, ?, ?)',
    id,
    null,
    now,
    now,
  );
  return { pid: id, cookie: cookieFor(request, id, 31_536_000) };
}

function displayName(id: string, name: string | null): string {
  if (name) return name;
  const n = (parseInt(id.replace(/[^0-9a-f]/g, '').slice(0, 6), 16) % 9000) + 1000;
  return `Player ${n}`;
}

/* ----------------------------------------------------------------- sessions */

interface SessionRow {
  id: string;
  player_id: string;
  mode: Mode;
  day: number | null;
  rounds_json: string;
  round_index: number;
  started_at: number;
  round_started_at: number;
  finished_at: number | null;
  hints_json: string;
  score_sum: number;
  status: string;
}

function toSession(row: Row): SessionRow {
  return {
    id: str(row.id),
    player_id: str(row.player_id),
    mode: str(row.mode) as Mode,
    day: row.day === null ? null : num(row.day),
    rounds_json: str(row.rounds_json),
    round_index: num(row.round_index),
    started_at: num(row.started_at),
    round_started_at: num(row.round_started_at),
    finished_at: row.finished_at === null ? null : num(row.finished_at),
    hints_json: str(row.hints_json, '[]'),
    score_sum: num(row.score_sum),
    status: str(row.status),
  };
}

async function loadSession(db: Db, id: string): Promise<SessionRow | null> {
  const row = await db.one('select * from sessions where id = ?', id);
  return row ? toSession(row) : null;
}

function roundsOf(session: SessionRow): Puzzle[] {
  return JSON.parse(session.rounds_json) as Puzzle[];
}

function hintsOf(session: SessionRow): { round: number; cell: number }[] {
  try {
    const parsed = JSON.parse(session.hints_json) as unknown;
    return Array.isArray(parsed) ? (parsed as { round: number; cell: number }[]) : [];
  } catch {
    return [];
  }
}

function runningScore(session: SessionRow): number {
  return Math.max(0, session.score_sum - hintsOf(session).length * HINT_COST);
}

function roundViews(rounds: Puzzle[]): RoundView[] {
  return rounds.map((p, index) => ({ index, size: p.size, region: p.region, givens: p.givens }));
}

async function ensureDaily(db: Db, secret: string, day: number): Promise<Puzzle[]> {
  const row = await db.one('select rounds_json from daily_challenges where day = ?', day);
  if (row) return JSON.parse(str(row.rounds_json)) as Puzzle[];
  const rounds = await buildDailyRounds(secret, day);
  // Self-check: never publish a board we cannot prove.
  for (const p of rounds) {
    if (countSolutions(p, 2) !== 1) throw new Error(`unverified daily board ${day}/${p.size}`);
  }
  await db.run(
    'insert or ignore into daily_challenges (day, date, rounds_json, difficulty, published, created_at) values (?, ?, ?, ?, 1, ?)',
    day,
    dayToISO(day),
    JSON.stringify(rounds),
    mainDifficulty(rounds),
    Date.now(),
  );
  return rounds;
}

async function createSession(
  db: Db,
  pid: string,
  mode: Mode,
  day: number | null,
  rounds: Puzzle[],
  level: number | null,
): Promise<SessionRow> {
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.run(
    `insert into sessions (id, player_id, mode, day, level, rounds_json, round_index, started_at, round_started_at, hints_json, score_sum, status)
     values (?, ?, ?, ?, ?, ?, 0, ?, ?, '[]', 0, 'active')`,
    id,
    pid,
    mode,
    day,
    level,
    JSON.stringify(rounds),
    now,
    now,
  );
  return (await loadSession(db, id)) as SessionRow;
}

function startPayload(session: SessionRow, resumed: boolean): StartResponse {
  const rounds = roundsOf(session);
  return {
    sessionId: session.id,
    mode: session.mode,
    day: session.day,
    roundIndex: session.round_index,
    rounds: roundViews(rounds),
    score: runningScore(session),
    hintsLeft: Math.max(0, MAX_HINTS - hintsOf(session).length),
    resumed,
  };
}

/* -------------------------------------------------------------------- stats */

async function globalToday(db: Db, day: number): Promise<GlobalToday> {
  const completed = num((await db.one('select count(*) as c from daily_results where day = ?', day))?.c);
  const started = num(
    (await db.one('select count(distinct player_id) as c from sessions where mode = ? and day = ?', 'daily', day))
      ?.c,
  );
  const avg = num((await db.one('select avg(score) as a from daily_results where day = ?', day))?.a);
  return { started, completed, avgScore: Math.round(avg) };
}

async function arcadeStats(db: Db, pid: string): Promise<ArcadeStat[]> {
  const rows = await db.all(
    `select game, sum(plays) as plays, max(score) as best, sum(score) as total, max(day) as last_day
     from arcade_scores where player_id = ? group by game order by last_day desc`,
    pid,
  );
  return rows
    .filter((r) => isArcadeGame(r.game))
    .map((r) => ({
      game: r.game as ArcadeGame,
      plays: num(r.plays),
      best: num(r.best),
      total: num(r.total),
      lastDay: num(r.last_day),
    }));
}

async function streaksFor(db: Db, pid: string, today: number): Promise<{ current: number; best: number }> {
  const days = (await db.all('select day from daily_results where player_id = ? order by day desc', pid)).map(
    (r) => num(r.day),
  );
  if (!days.length) return { current: 0, best: 0 };
  let best = 1;
  let runLen = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === days[i - 1] - 1) runLen++;
    else runLen = 1;
    if (runLen > best) best = runLen;
  }
  let current = 0;
  if (days[0] === today || days[0] === today - 1) {
    current = 1;
    for (let i = 1; i < days.length; i++) {
      if (days[i] === days[i - 1] - 1) current++;
      else break;
    }
  }
  return { current, best };
}

async function rankFor(db: Db, day: number, score: number, timeMs: number): Promise<number> {
  const row = await db.one(
    'select count(*) as c from daily_results where day = ? and (score > ? or (score = ? and time_ms < ?))',
    day,
    score,
    score,
    timeMs,
  );
  return num(row?.c) + 1;
}

async function buildSummary(db: Db, session: SessionRow): Promise<Summary> {
  const rounds = roundsOf(session);
  const plays = await db.all('select * from round_plays where session_id = ? order by round_index', session.id);
  const hints = hintsOf(session);
  const gross = plays.reduce((s, r) => s + num(r.points), 0);
  const score = Math.max(0, gross - hints.length * HINT_COST);
  const timeMs = plays.reduce((s, r) => s + num(r.time_ms), 0);
  const today = dayNumber();
  const day = session.day ?? today;
  const isDaily = session.mode === 'daily';

  let rank: number | null = null;
  let percentile: number | null = null;
  let personalBest = false;
  const global = isDaily ? await globalToday(db, day) : { started: 0, completed: 0, avgScore: 0 };
  if (isDaily && session.finished_at) {
    rank = await rankFor(db, day, score, timeMs);
    percentile = Math.max(1, Math.round((rank / Math.max(1, global.completed)) * 100));
    const best = num(
      (await db.one('select max(score) as m from daily_results where player_id = ? and day <> ?', session.player_id, day))
        ?.m,
    );
    personalBest = score > best;
  }

  const streak = await streaksFor(db, session.player_id, today);

  return {
    sessionId: session.id,
    mode: session.mode,
    day: session.day,
    score,
    maxScore: maxScore(rounds.length),
    rating: ratingFor(score, maxScore(rounds.length)),
    rounds: rounds.map((p, index) => {
      const play = plays.find((r) => num(r.round_index) === index);
      return {
        index,
        size: p.size,
        region: p.region,
        points: play ? num(play.points) : 0,
        timeMs: play ? num(play.time_ms) : 0,
        hintUsed: hints.some((h) => h.round === index),
        solution: p.solution,
      };
    }),
    timeMs,
    hints: hints.length,
    streak: streak.current,
    bestStreak: streak.best,
    rank,
    percentile,
    global,
    personalBest,
  };
}

async function finalizeSession(db: Db, session: SessionRow): Promise<void> {
  const now = Date.now();
  await db.run("update sessions set status = 'finished', finished_at = ? where id = ?", now, session.id);
  const fresh = await loadSession(db, session.id);
  if (!fresh) return;
  const summary = await buildSummary(db, fresh);

  if (fresh.mode === 'daily' && fresh.day !== null) {
    await db.run(
      `insert into daily_results (player_id, day, score, rating, time_ms, hints, completed_at)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(player_id, day) do update set
         score = excluded.score, rating = excluded.rating, time_ms = excluded.time_ms,
         hints = excluded.hints, completed_at = excluded.completed_at`,
      fresh.player_id,
      fresh.day,
      summary.score,
      summary.rating,
      summary.timeMs,
      summary.hints,
      now,
    );
    const challenge = await db.one('select completes from daily_challenges where day = ?', fresh.day);
    if (challenge) await db.run('update daily_challenges set completes = completes + 1 where day = ?', fresh.day);
  }

  if (fresh.mode === 'archive' && fresh.day !== null) {
    const existing = await db.one(
      'select best_score, best_time_ms from archive_results where player_id = ? and day = ?',
      fresh.player_id,
      fresh.day,
    );
    if (!existing) {
      await db.run(
        'insert into archive_results (player_id, day, best_score, best_time_ms, attempts, updated_at) values (?, ?, ?, ?, 1, ?)',
        fresh.player_id,
        fresh.day,
        summary.score,
        summary.timeMs,
        now,
      );
    } else {
      const better =
        summary.score > num(existing.best_score) ||
        (summary.score === num(existing.best_score) && summary.timeMs < num(existing.best_time_ms));
      await db.run(
        'update archive_results set best_score = ?, best_time_ms = ?, attempts = attempts + 1, updated_at = ? where player_id = ? and day = ?',
        better ? summary.score : num(existing.best_score),
        better ? summary.timeMs : num(existing.best_time_ms),
        now,
        fresh.player_id,
        fresh.day,
      );
    }
  }
}

/* --------------------------------------------------------------- api routes */

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const db = createDb(env);
  const secret = secretOf(env);
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  rateLimit(ip);
  const { pid, cookie } = await ensurePlayer(request, db);
  const send = (status: number, body: unknown, overrideCookie?: string): Response => {
    const value = overrideCookie ?? cookie;
    return json(status, body, value ? { 'set-cookie': value } : undefined);
  };
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const method = request.method;
  const today = dayNumber();

  if (path === '/api/health') return send(200, { ok: true, day: today });

  if (path === '/api/today' && method === 'GET') {
    const played = await db.one('select score, rating from daily_results where player_id = ? and day = ?', pid, today);
    const active = await db.one(
      "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'active' and started_at > ?",
      pid,
      today,
      Date.now() - SESSION_TTL,
    );
    const streak = await streaksFor(db, pid, today);
    return send(200, {
      day: today,
      date: dayToISO(today),
      nextResetAt: nextResetAt(),
      now: Date.now(),
      roundCount: ROUND_SIZES.length,
      sizes: ROUND_SIZES,
      played: Boolean(played),
      score: played ? num(played.score) : null,
      rating: played ? str(played.rating) : null,
      streak: streak.current,
      bestStreak: streak.best,
      active: Boolean(active),
      global: await globalToday(db, today),
    });
  }

  if (path === '/api/daily/start' && method === 'POST') {
    const doneId = str(
      (
        await db.one(
          "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'finished' order by finished_at desc limit 1",
          pid,
          today,
        )
      )?.id ?? '',
    );
    const done = doneId ? await loadSession(db, doneId) : null;
    if (done) return send(409, { error: 'already_played', summary: await buildSummary(db, done) });

    const existingId = str(
      (
        await db.one(
          "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'active' order by started_at desc limit 1",
          pid,
          today,
        )
      )?.id ?? '',
    );
    const existing = existingId ? await loadSession(db, existingId) : null;
    if (existing) {
      if (Date.now() - existing.started_at > SESSION_TTL) {
        await db.run("update sessions set status = 'expired' where id = ?", existing.id);
      } else {
        return send(200, startPayload(existing, true));
      }
    }
    const rounds = await ensureDaily(db, secret, today);
    const session = await createSession(db, pid, 'daily', today, rounds, null);
    return send(200, startPayload(session, false));
  }

  if (path === '/api/practice/start' && method === 'POST') {
    const body = await readJson(request);
    const level = Math.max(1, Math.min(5, Number(body.level ?? 2) || 2));
    const rounds = await buildPracticeRounds(secret, level, crypto.randomUUID());
    const session = await createSession(db, pid, 'practice', null, rounds, level);
    return send(200, startPayload(session, false));
  }

  const archiveStart = path.match(/^\/api\/archive\/(\d+)\/start$/);
  if (archiveStart && method === 'POST') {
    const day = Number(archiveStart[1]);
    if (!Number.isInteger(day) || day >= today || day < Math.max(1, today - 365)) {
      throw new HttpError(400, 'that board is not in the archive');
    }
    const rounds = await ensureDaily(db, secret, day);
    const session = await createSession(db, pid, 'archive', day, rounds, null);
    return send(200, startPayload(session, false));
  }

  const hint = path.match(/^\/api\/session\/([0-9a-f-]{36})\/hint$/);
  if (hint && method === 'POST') {
    const session = await loadSession(db, hint[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    if (session.status !== 'active') throw new HttpError(409, 'session is closed');
    const body = await readJson(request);
    const rounds = roundsOf(session);
    const index = session.round_index;
    const hints = hintsOf(session);
    if (hints.length >= MAX_HINTS) throw new HttpError(409, 'no hints left today');
    if (hints.some((h) => h.round === index)) throw new HttpError(409, 'this round already has a hint');
    const puzzle = rounds[index];
    if (!puzzle) throw new HttpError(409, 'round is over');
    const placed = Array.isArray(body.placed) ? (body.placed as number[]) : [];
    const cell = hintCell(puzzle, [...placed, ...puzzle.givens]);
    if (cell === null) throw new HttpError(409, 'nothing left to reveal');
    hints.push({ round: index, cell });
    await db.run('update sessions set hints_json = ? where id = ?', JSON.stringify(hints), session.id);
    const payload: HintResponse = { cell, hintsLeft: Math.max(0, MAX_HINTS - hints.length) };
    return send(200, payload);
  }

  const round = path.match(/^\/api\/session\/([0-9a-f-]{36})\/round$/);
  if (round && method === 'POST') {
    const session = await loadSession(db, round[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    if (session.status !== 'active') throw new HttpError(409, 'session is closed');
    const body = await readJson(request);
    const rounds = roundsOf(session);
    const index = session.round_index;
    if (Number(body.index) !== index) throw new HttpError(409, 'round out of order');
    const puzzle = rounds[index];
    if (!puzzle) throw new HttpError(409, 'round is over');

    // Server clock is the only clock that counts.
    const elapsed = Date.now() - session.round_started_at;
    if (elapsed < MIN_ROUND_MS) return send(429, { ok: false, reason: 'too_fast' });

    const cells = body.cells;
    if (!isSolved(puzzle, cells)) {
      return send(200, { ok: false, reason: 'invalid', score: runningScore(session) });
    }

    const hintUsed = hintsOf(session).some((h) => h.round === index);
    const scored = scoreRound(index, puzzle.size, elapsed, hintUsed);
    await db.run(
      `insert into round_plays (session_id, round_index, cells_json, ok, points, time_ms, hint_used, created_at)
       values (?, ?, ?, 1, ?, ?, ?, ?)
       on conflict(session_id, round_index) do nothing`,
      session.id,
      index,
      JSON.stringify(cells),
      scored.total,
      elapsed,
      hintUsed ? 1 : 0,
      Date.now(),
    );
    const next = index + 1;
    await db.run(
      'update sessions set round_index = ?, round_started_at = ?, score_sum = score_sum + ? where id = ?',
      next,
      Date.now(),
      scored.total,
      session.id,
    );

    if (next >= rounds.length) {
      await finalizeSession(db, session);
      const fresh = (await loadSession(db, session.id)) as SessionRow;
      return send(200, {
        ok: true,
        points: scored.total,
        solution: puzzle.solution,
        finished: true,
        nextIndex: null,
        score: runningScore(fresh),
        hintsLeft: Math.max(0, MAX_HINTS - hintsOf(fresh).length),
        summary: await buildSummary(db, fresh),
      });
    }

    const fresh = (await loadSession(db, session.id)) as SessionRow;
    return send(200, {
      ok: true,
      points: scored.total,
      solution: puzzle.solution,
      finished: false,
      nextIndex: next,
      score: runningScore(fresh),
      hintsLeft: Math.max(0, MAX_HINTS - hintsOf(fresh).length),
    });
  }

  const sessionGet = path.match(/^\/api\/session\/([0-9a-f-]{36})$/);
  if (sessionGet && method === 'GET') {
    const session = await loadSession(db, sessionGet[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    const rounds = roundsOf(session);
    return send(200, {
      sessionId: session.id,
      mode: session.mode,
      day: session.day,
      roundIndex: session.round_index,
      status: session.status,
      score: runningScore(session),
      rounds: session.status === 'finished' ? [] : roundViews(rounds),
      roundCount: rounds.length,
      summary: session.status === 'finished' ? await buildSummary(db, session) : null,
    });
  }

  if (path === '/api/archive' && method === 'GET') {
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') ?? 42)));
    const entries: ArchiveEntry[] = [];
    for (let i = 1; i <= days; i++) {
      const day = today - i;
      if (day < 1) break;
      const daily = await db.one('select score from daily_results where player_id = ? and day = ?', pid, day);
      const archived = await db.one('select best_score from archive_results where player_id = ? and day = ?', pid, day);
      const challenge = await db.one('select difficulty from daily_challenges where day = ?', day);
      const score = daily ? num(daily.score) : archived ? num(archived.best_score) : null;
      entries.push({
        day,
        date: dayToISO(day),
        score,
        difficulty: challenge ? num(challenge.difficulty) : null,
        playable: day >= Math.max(1, today - 365),
      });
    }
    return send(200, { entries });
  }

  if (path === '/api/leaderboard' && method === 'GET') {
    const scopeRaw = url.searchParams.get('scope');
    const scope: 'today' | 'week' | 'all' = scopeRaw === 'week' || scopeRaw === 'all' ? scopeRaw : 'today';
    const limit = 25;
    let rows: LeaderRow[] = [];
    let me: LeaderRow | null = null;
    let totalPlayers = 0;

    if (scope === 'today') {
      const data = await db.all(
        `select r.player_id as pid, p.name as name, r.score as score
         from daily_results r join players p on p.id = r.player_id
         where r.day = ? order by r.score desc, r.time_ms asc limit ?`,
        today,
        limit,
      );
      rows = data.map((r, i) => ({
        rank: i + 1,
        name: displayName(str(r.pid), r.name === null ? null : str(r.name)),
        score: num(r.score),
        streak: 0,
        me: str(r.pid) === pid,
      }));
      totalPlayers = num((await db.one('select count(*) as c from daily_results where day = ?', today))?.c);
      const mine = await db.one('select score, time_ms from daily_results where player_id = ? and day = ?', pid, today);
      if (mine) {
        const streak = await streaksFor(db, pid, today);
        me = {
          rank: await rankFor(db, today, num(mine.score), num(mine.time_ms)),
          name: 'You',
          score: num(mine.score),
          streak: streak.current,
          me: true,
        };
      }
    } else {
      const from = scope === 'week' ? today - 6 : 0;
      const data = await db.all(
        `select r.player_id as pid, p.name as name, sum(r.score) as total
         from daily_results r join players p on p.id = r.player_id
         where r.day >= ? group by r.player_id order by total desc limit ?`,
        from,
        limit,
      );
      rows = data.map((r, i) => ({
        rank: i + 1,
        name: displayName(str(r.pid), r.name === null ? null : str(r.name)),
        score: num(r.total),
        streak: 0,
        me: str(r.pid) === pid,
      }));
      totalPlayers = num(
        (await db.one('select count(distinct player_id) as c from daily_results where day >= ?', from))?.c,
      );
      const mine = await db.one(
        'select sum(score) as total from daily_results where player_id = ? and day >= ?',
        pid,
        from,
      );
      if (mine && mine.total !== null) {
        const better = num(
          (
            await db.one(
              `select count(*) as c from (
                 select player_id, sum(score) as total from daily_results where day >= ? group by player_id
               ) x where x.total > ?`,
              from,
              num(mine.total),
            )
          )?.c,
        );
        const streak = await streaksFor(db, pid, today);
        me = {
          rank: better + 1,
          name: 'You',
          score: num(mine.total),
          streak: streak.current,
          me: true,
        };
      }
    }
    const payload: LeaderboardResponse = { scope, rows, me, totalPlayers };
    return send(200, payload);
  }

  if (path === '/api/stats' && method === 'GET') {
    const dailies = await db.all(
      'select day, score, rating, time_ms, hints from daily_results where player_id = ? order by day desc',
      pid,
    );
    const streak = await streaksFor(db, pid, today);
    const total = dailies.reduce((s, r) => s + num(r.score), 0);
    const best = dailies.reduce((m, r) => Math.max(m, num(r.score)), 0);
    const bucketSize = 200;
    const bucketsCount = Math.ceil(MAX_SCORE / bucketSize);
    const distribution = Array.from({ length: bucketsCount }, (_, i) => ({
      from: i * bucketSize,
      to: (i + 1) * bucketSize,
      count: 0,
    }));
    for (const r of dailies) {
      const idx = Math.min(distribution.length - 1, Math.floor(num(r.score) / bucketSize));
      distribution[idx].count++;
    }
    const calendar: StatsResponse['calendar'] = [];
    for (let i = 69; i >= 0; i--) {
      const day = today - i;
      const row = dailies.find((r) => num(r.day) === day);
      calendar.push({ day, date: dayToISO(day), score: row ? num(row.score) : null });
    }
    const payload: StatsResponse = {
      played: num((await db.one('select count(*) as c from sessions where player_id = ?', pid))?.c),
      dailyCompleted: dailies.length,
      currentStreak: streak.current,
      bestStreak: streak.best,
      avgScore: dailies.length ? Math.round(total / dailies.length) : 0,
      bestScore: best,
      perfectDays: dailies.filter((r) => num(r.score) >= MAX_SCORE * 0.87).length,
      totalScore: total,
      hintsUsed: dailies.reduce((s, r) => s + num(r.hints), 0),
      distribution,
      recent: dailies.slice(0, 20).map((r) => ({
        day: num(r.day),
        date: dayToISO(num(r.day)),
        score: num(r.score),
        rating: str(r.rating),
      })),
      calendar,
      practiceRounds: num(
        (
          await db.one(
            "select count(*) as c from round_plays rp join sessions s on s.id = rp.session_id where s.player_id = ? and s.mode = 'practice'",
            pid,
          )
        )?.c,
      ),
      archivePlayed: num((await db.one('select count(*) as c from archive_results where player_id = ?', pid))?.c),
      arcade: await arcadeStats(db, pid),
    };
    return send(200, payload);
  }

  if (path === '/api/arcade/score' && method === 'POST') {
    const body = await readJson(request);
    const game = body.game;
    if (!isArcadeGame(game)) throw new HttpError(400, 'unknown game');
    const score = Number(body.score);
    if (!Number.isInteger(score) || score < 0 || score > ARCADE_MAX_SCORE) {
      throw new HttpError(400, 'score out of range');
    }
    // A shared board means a shared day: never let a client name its own date.
    if (body.day !== undefined && Number(body.day) !== today) throw new HttpError(400, 'only today counts');
    const previous = await db.one(
      'select score, plays from arcade_scores where player_id = ? and game = ? and day = ?',
      pid,
      game,
      today,
    );
    await db.run(
      `insert into arcade_scores (player_id, game, day, score, plays, updated_at)
       values (?, ?, ?, ?, 1, ?)
       on conflict(player_id, game, day) do update set
         score = case when excluded.score > arcade_scores.score then excluded.score else arcade_scores.score end,
         plays = arcade_scores.plays + 1,
         updated_at = excluded.updated_at`,
      pid,
      game,
      today,
      score,
      Date.now(),
    );
    const best = Math.max(score, previous ? num(previous.score) : 0);
    const rank = num(
      (
        await db.one(
          'select count(*) as c from arcade_scores where game = ? and day = ? and score > ?',
          game,
          today,
          best,
        )
      )?.c,
    ) + 1;
    const payload: ArcadeScoreResponse = {
      ok: true,
      game,
      day: today,
      best,
      plays: (previous ? num(previous.plays) : 0) + 1,
      rank,
    };
    return send(200, payload);
  }

  if (path === '/api/arcade/leaderboard' && method === 'GET') {
    const game = url.searchParams.get('game');
    if (!isArcadeGame(game)) throw new HttpError(400, 'unknown game');
    const scopeRaw = url.searchParams.get('scope');
    const scope: 'today' | 'week' | 'all' = scopeRaw === 'week' || scopeRaw === 'all' ? scopeRaw : 'today';
    const from = scope === 'today' ? today : scope === 'week' ? today - 6 : 0;
    const aggregate = scope === 'today' ? 'max(score)' : 'sum(score)';
    const data = await db.all(
      `select a.player_id as pid, p.name as name, ${aggregate} as total
       from arcade_scores a join players p on p.id = a.player_id
       where a.game = ? and a.day >= ? group by a.player_id order by total desc limit 25`,
      game,
      from,
    );
    const rows: LeaderRow[] = data.map((r, i) => ({
      rank: i + 1,
      name: displayName(str(r.pid), r.name === null ? null : str(r.name)),
      score: num(r.total),
      streak: 0,
      me: str(r.pid) === pid,
    }));
    const totalPlayers = num(
      (
        await db.one(
          'select count(distinct player_id) as c from arcade_scores where game = ? and day >= ?',
          game,
          from,
        )
      )?.c,
    );
    const mine = await db.one(
      `select ${aggregate} as total from arcade_scores where player_id = ? and game = ? and day >= ?`,
      pid,
      game,
      from,
    );
    let me: LeaderRow | null = null;
    if (mine && mine.total !== null) {
      const better = num(
        (
          await db.one(
            `select count(*) as c from (
               select player_id, ${aggregate} as total from arcade_scores
               where game = ? and day >= ? group by player_id
             ) x where x.total > ?`,
            game,
            from,
            num(mine.total),
          )
        )?.c,
      );
      me = { rank: better + 1, name: 'You', score: num(mine.total), streak: 0, me: true };
    }
    const payload: ArcadeLeaderboardResponse = { game, scope, rows, me, totalPlayers };
    return send(200, payload);
  }

  if (path === '/api/me' && method === 'GET') {
    const row = await db.one('select id, name, created_at from players where id = ?', pid);
    const payload: MeResponse = {
      id: pid,
      name: row && row.name !== null ? str(row.name) : null,
      joined: new Date(num(row?.created_at, Date.now())).toISOString(),
    };
    return send(200, payload);
  }

  if (path === '/api/me' && method === 'POST') {
    const body = await readJson(request);
    const raw = String(body.name ?? '').trim();
    if (raw.length === 0) {
      await db.run('update players set name = null where id = ?', pid);
      return send(200, { ok: true, name: null });
    }
    if (!/^[\p{L}\p{N} ._-]{2,16}$/u.test(raw)) {
      throw new HttpError(400, 'names are 2–16 letters, numbers, spaces, dots or dashes');
    }
    await db.run('update players set name = ? where id = ?', raw, pid);
    return send(200, { ok: true, name: raw });
  }

  if (path === '/api/me' && method === 'DELETE') {
    await db.run('delete from players where id = ?', pid);
    return send(200, { ok: true }, cookieFor(request, '', 0));
  }

  throw new HttpError(404, 'not found');
}

/* ------------------------------------------------------------ static assets */

async function serveAsset(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  if (response.status !== 404) return response;
  if (request.method !== 'GET' && request.method !== 'HEAD') return response;
  /* A navigation without an extension is a client route, not a missing file. */
  const last = new URL(request.url).pathname.split('/').pop() ?? '';
  const acceptsHtml = (request.headers.get('accept') ?? '').includes('text/html');
  if (last.includes('.') && !acceptsHtml) return response;
  /* `/index.html` may redirect to `/`, so ask for the root document. */
  const index = await env.ASSETS.fetch(new Request(new URL('/', request.url), request));
  if (!index.ok) return response;
  const headers = new Headers(index.headers);
  headers.set('cache-control', 'no-cache');
  return new Response(index.body, { status: 200, headers });
}

/* ------------------------------------------------------------------- worker */

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      await ensureSchema(env);
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
      return await serveAsset(request, env);
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message });
      console.error('[api]', err);
      return json(500, { error: 'server error' });
    }
  },
};
