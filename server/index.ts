import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { all, num, one, run, str } from './db.ts';
import {
  buildDailyRounds,
  buildPracticeRounds,
  dayNumber,
  dayToDate,
  dayToISO,
  mainDifficulty,
  nextResetAt,
} from './daily.ts';
import { countSolutions, hintCell, isSolved, type Puzzle } from '../shared/puzzle.ts';
import { HINT_COST, MAX_HINTS, MAX_SCORE, ROUND_SIZES, maxScore, ratingFor, scoreRound } from '../shared/score.ts';
import type {
  ArchiveEntry,
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
} from '../shared/types.ts';

const PORT = Number.parseInt(process.env.PORT ?? '', 10) || 8788;
const DIST = join(process.cwd(), 'dist');
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

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(JSON.stringify(body));
}

function getCookie(req: IncomingMessage, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function setCookie(res: ServerResponse, name: string, value: string, maxAge: number): void {
  res.setHeader(
    'set-cookie',
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
  );
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64 * 1024) throw new HttpError(413, 'body too large');
    chunks.push(chunk as Buffer);
  }
  if (!size) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'invalid json');
  }
}

const buckets = new Map<string, { n: number; reset: number }>();
function rateLimit(ip: string): void {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.reset < now) {
    buckets.set(ip, { n: 1, reset: now + 10_000 });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return;
  }
  b.n++;
  if (b.n > 240) throw new HttpError(429, 'too many requests');
}

function ensurePlayer(req: IncomingMessage, res: ServerResponse): string {
  const now = Date.now();
  const pid = getCookie(req, COOKIE);
  if (pid && /^[0-9a-f-]{36}$/.test(pid)) {
    const row = one('select id from players where id = ?', pid);
    if (row) {
      run('update players set last_seen = ? where id = ?', now, pid);
      return pid;
    }
  }
  const id = randomUUID();
  run('insert into players (id, name, created_at, last_seen) values (?, ?, ?, ?)', id, null, now, now);
  setCookie(res, COOKIE, id, 31_536_000);
  return id;
}

function displayName(id: string, name: string | null): string {
  if (name) return name;
  const n = parseInt(id.replace(/[^0-9a-f]/g, '').slice(0, 6), 16) % 9000 + 1000;
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

function loadSession(id: string): SessionRow | null {
  const row = one('select * from sessions where id = ?', id);
  if (!row) return null;
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

function ensureDaily(day: number): Puzzle[] {
  const row = one('select rounds_json from daily_challenges where day = ?', day);
  if (row) return JSON.parse(str(row.rounds_json)) as Puzzle[];
  const rounds = buildDailyRounds(day);
  // Self-check: never publish a board we cannot prove.
  for (const p of rounds) {
    if (countSolutions(p, 2) !== 1) throw new Error(`unverified daily board ${day}/${p.size}`);
  }
  run(
    'insert or ignore into daily_challenges (day, date, rounds_json, difficulty, published, created_at) values (?, ?, ?, ?, 1, ?)',
    day,
    dayToISO(day),
    JSON.stringify(rounds),
    mainDifficulty(rounds),
    Date.now(),
  );
  return rounds;
}

function createSession(pid: string, mode: Mode, day: number | null, rounds: Puzzle[], level: number | null): SessionRow {
  const now = Date.now();
  const id = randomUUID();
  run(
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
  return loadSession(id) as SessionRow;
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

function globalToday(day: number): GlobalToday {
  const completed = num(one('select count(*) as c from daily_results where day = ?', day)?.c);
  const started = num(
    one('select count(distinct player_id) as c from sessions where mode = ? and day = ?', 'daily', day)?.c,
  );
  const avg = num(one('select avg(score) as a from daily_results where day = ?', day)?.a);
  return { started, completed, avgScore: Math.round(avg) };
}

function streaksFor(pid: string, today: number): { current: number; best: number } {
  const days = all('select day from daily_results where player_id = ? order by day desc', pid).map((r) => num(r.day));
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

function rankFor(day: number, score: number, timeMs: number): number {
  return (
    num(
      one(
        'select count(*) as c from daily_results where day = ? and (score > ? or (score = ? and time_ms < ?))',
        day,
        score,
        score,
        timeMs,
      )?.c,
    ) + 1
  );
}

function buildSummary(session: SessionRow): Summary {
  const rounds = roundsOf(session);
  const plays = all('select * from round_plays where session_id = ? order by round_index', session.id);
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
  const global = isDaily ? globalToday(day) : { started: 0, completed: 0, avgScore: 0 };
  if (isDaily && session.finished_at) {
    rank = rankFor(day, score, timeMs);
    percentile = Math.max(1, Math.round((rank / Math.max(1, global.completed)) * 100));
    const best = num(one('select max(score) as m from daily_results where player_id = ? and day <> ?', session.player_id, day)?.m);
    personalBest = score > best;
  }

  const st = streaksFor(session.player_id, today);

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
    streak: st.current,
    bestStreak: st.best,
    rank,
    percentile,
    global,
    personalBest,
  };
}

function finalizeSession(session: SessionRow): void {
  const now = Date.now();
  run("update sessions set status = 'finished', finished_at = ? where id = ?", now, session.id);
  const fresh = loadSession(session.id);
  if (!fresh) return;
  const summary = buildSummary(fresh);

  if (fresh.mode === 'daily' && fresh.day !== null) {
    run(
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
    const challenge = one('select completes from daily_challenges where day = ?', fresh.day);
    if (challenge) run('update daily_challenges set completes = completes + 1 where day = ?', fresh.day);
  }

  if (fresh.mode === 'archive' && fresh.day !== null) {
    const existing = one(
      'select best_score, best_time_ms from archive_results where player_id = ? and day = ?',
      fresh.player_id,
      fresh.day,
    );
    if (!existing) {
      run(
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
      run(
        `update archive_results set best_score = ?, best_time_ms = ?, attempts = attempts + 1, updated_at = ? where player_id = ? and day = ?`,
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

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL): Promise<void> {
  const ip = req.socket.remoteAddress ?? 'local';
  rateLimit(ip);
  const pid = ensurePlayer(req, res);
  const path = url.pathname.replace(/\/+$/, '') || '/api';
  const method = req.method ?? 'GET';
  const today = dayNumber();

  if (path === '/api/health') return json(res, 200, { ok: true, day: today });

  if (path === '/api/today' && method === 'GET') {
    const played = one('select score, rating from daily_results where player_id = ? and day = ?', pid, today);
    const active = one(
      "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'active' and started_at > ?",
      pid,
      today,
      Date.now() - SESSION_TTL,
    );
    const st = streaksFor(pid, today);
    return json(res, 200, {
      day: today,
      date: dayToISO(today),
      nextResetAt: nextResetAt(),
      now: Date.now(),
      roundCount: ROUND_SIZES.length,
      sizes: ROUND_SIZES,
      played: Boolean(played),
      score: played ? num(played.score) : null,
      rating: played ? str(played.rating) : null,
      streak: st.current,
      bestStreak: st.best,
      active: Boolean(active),
      global: globalToday(today),
    });
  }

  if (path === '/api/daily/start' && method === 'POST') {
    const done = loadSession(
      str(
        one(
          "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'finished' order by finished_at desc limit 1",
          pid,
          today,
        )?.id ?? '',
      ),
    );
    if (done) return json(res, 409, { error: 'already_played', summary: buildSummary(done) });

    const existing = loadSession(
      str(
        one(
          "select id from sessions where player_id = ? and mode = 'daily' and day = ? and status = 'active' order by started_at desc limit 1",
          pid,
          today,
        )?.id ?? '',
      ),
    );
    if (existing) {
      if (Date.now() - existing.started_at > SESSION_TTL) {
        run("update sessions set status = 'expired' where id = ?", existing.id);
      } else {
        return json(res, 200, startPayload(existing, true));
      }
    }
    const rounds = ensureDaily(today);
    const session = createSession(pid, 'daily', today, rounds, null);
    return json(res, 200, startPayload(session, false));
  }

  if (path === '/api/practice/start' && method === 'POST') {
    const body = await readJson(req);
    const level = Math.max(1, Math.min(5, Number(body.level ?? 2) || 2));
    const rounds = buildPracticeRounds(level, randomUUID());
    const session = createSession(pid, 'practice', null, rounds, level);
    return json(res, 200, startPayload(session, false));
  }

  const archiveStart = path.match(/^\/api\/archive\/(\d+)\/start$/);
  if (archiveStart && method === 'POST') {
    const day = Number(archiveStart[1]);
    if (!Number.isInteger(day) || day >= today || day < Math.max(1, today - 365)) {
      throw new HttpError(400, 'that board is not in the archive');
    }
    const rounds = ensureDaily(day);
    const session = createSession(pid, 'archive', day, rounds, null);
    return json(res, 200, startPayload(session, false));
  }

  const hint = path.match(/^\/api\/session\/([0-9a-f-]{36})\/hint$/);
  if (hint && method === 'POST') {
    const session = loadSession(hint[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    if (session.status !== 'active') throw new HttpError(409, 'session is closed');
    const body = await readJson(req);
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
    run('update sessions set hints_json = ? where id = ?', JSON.stringify(hints), session.id);
    const payload: HintResponse = { cell, hintsLeft: Math.max(0, MAX_HINTS - hints.length) };
    return json(res, 200, payload);
  }

  const round = path.match(/^\/api\/session\/([0-9a-f-]{36})\/round$/);
  if (round && method === 'POST') {
    const session = loadSession(round[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    if (session.status !== 'active') throw new HttpError(409, 'session is closed');
    const body = await readJson(req);
    const rounds = roundsOf(session);
    const index = session.round_index;
    if (Number(body.index) !== index) throw new HttpError(409, 'round out of order');
    const puzzle = rounds[index];
    if (!puzzle) throw new HttpError(409, 'round is over');

    // Server clock is the only clock that counts.
    const elapsed = Date.now() - session.round_started_at;
    if (elapsed < MIN_ROUND_MS) return json(res, 429, { ok: false, reason: 'too_fast' });

    const cells = body.cells;
    if (!isSolved(puzzle, cells)) {
      return json(res, 200, { ok: false, reason: 'invalid', score: runningScore(session) });
    }

    const hintUsed = hintsOf(session).some((h) => h.round === index);
    const scored = scoreRound(index, puzzle.size, elapsed, hintUsed);
    run(
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
    run(
      'update sessions set round_index = ?, round_started_at = ?, score_sum = score_sum + ? where id = ?',
      next,
      Date.now(),
      scored.total,
      session.id,
    );

    if (next >= rounds.length) {
      finalizeSession(session);
      const fresh = loadSession(session.id) as SessionRow;
      return json(res, 200, {
        ok: true,
        points: scored.total,
        solution: puzzle.solution,
        finished: true,
        nextIndex: null,
        score: runningScore(fresh),
        hintsLeft: Math.max(0, MAX_HINTS - hintsOf(fresh).length),
        summary: buildSummary(fresh),
      });
    }

    const fresh = loadSession(session.id) as SessionRow;
    return json(res, 200, {
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
    const session = loadSession(sessionGet[1]);
    if (!session || session.player_id !== pid) throw new HttpError(404, 'session not found');
    const rounds = roundsOf(session);
    return json(res, 200, {
      sessionId: session.id,
      mode: session.mode,
      day: session.day,
      roundIndex: session.round_index,
      status: session.status,
      score: runningScore(session),
      rounds: session.status === 'finished' ? [] : roundViews(rounds),
      roundCount: rounds.length,
      summary: session.status === 'finished' ? buildSummary(session) : null,
    });
  }

  if (path === '/api/archive' && method === 'GET') {
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('limit') ?? 42)));
    const entries: ArchiveEntry[] = [];
    for (let i = 1; i <= days; i++) {
      const day = today - i;
      if (day < 1) break;
      const daily = one('select score from daily_results where player_id = ? and day = ?', pid, day);
      const archived = one('select best_score from archive_results where player_id = ? and day = ?', pid, day);
      const challenge = one('select difficulty from daily_challenges where day = ?', day);
      const score = daily ? num(daily.score) : archived ? num(archived.best_score) : null;
      entries.push({
        day,
        date: dayToISO(day),
        score,
        difficulty: challenge ? num(challenge.difficulty) : null,
        playable: day >= Math.max(1, today - 365),
      });
    }
    return json(res, 200, { entries });
  }

  if (path === '/api/leaderboard' && method === 'GET') {
    const scopeRaw = url.searchParams.get('scope');
    const scope: 'today' | 'week' | 'all' = scopeRaw === 'week' || scopeRaw === 'all' ? scopeRaw : 'today';
    const limit = 25;
    let rows: LeaderRow[] = [];
    let me: LeaderRow | null = null;
    let totalPlayers = 0;

    if (scope === 'today') {
      const data = all(
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
      totalPlayers = num(one('select count(*) as c from daily_results where day = ?', today)?.c);
      const mine = one('select score, time_ms from daily_results where player_id = ? and day = ?', pid, today);
      if (mine) {
        const rank = rankFor(today, num(mine.score), num(mine.time_ms));
        me = {
          rank,
          name: 'You',
          score: num(mine.score),
          streak: streaksFor(pid, today).current,
          me: true,
        };
      }
    } else {
      const from = scope === 'week' ? today - 6 : 0;
      const data = all(
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
        one('select count(distinct player_id) as c from daily_results where day >= ?', from)?.c,
      );
      const mine = one(
        'select sum(score) as total from daily_results where player_id = ? and day >= ?',
        pid,
        from,
      );
      if (mine && mine.total !== null) {
        const better = num(
          one(
            `select count(*) as c from (
               select player_id, sum(score) as total from daily_results where day >= ? group by player_id
             ) x where x.total > ?`,
            from,
            num(mine.total),
          )?.c,
        );
        me = {
          rank: better + 1,
          name: 'You',
          score: num(mine.total),
          streak: streaksFor(pid, today).current,
          me: true,
        };
      }
    }
    const payload: LeaderboardResponse = { scope, rows, me, totalPlayers };
    return json(res, 200, payload);
  }

  if (path === '/api/stats' && method === 'GET') {
    const dailies = all(
      'select day, score, rating, time_ms, hints from daily_results where player_id = ? order by day desc',
      pid,
    );
    const st = streaksFor(pid, today);
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
      played: num(one('select count(*) as c from sessions where player_id = ?', pid)?.c),
      dailyCompleted: dailies.length,
      currentStreak: st.current,
      bestStreak: st.best,
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
        one("select count(*) as c from round_plays rp join sessions s on s.id = rp.session_id where s.player_id = ? and s.mode = 'practice'", pid)?.c,
      ),
      archivePlayed: num(one('select count(*) as c from archive_results where player_id = ?', pid)?.c),
    };
    return json(res, 200, payload);
  }

  if (path === '/api/me' && method === 'GET') {
    const row = one('select id, name, created_at from players where id = ?', pid);
    const payload: MeResponse = {
      id: pid,
      name: row && row.name !== null ? str(row.name) : null,
      joined: new Date(num(row?.created_at, Date.now())).toISOString(),
    };
    return json(res, 200, payload);
  }

  if (path === '/api/me' && method === 'POST') {
    const body = await readJson(req);
    const raw = String(body.name ?? '').trim();
    if (raw.length === 0) {
      run('update players set name = null where id = ?', pid);
      return json(res, 200, { ok: true, name: null });
    }
    if (!/^[\p{L}\p{N} ._-]{2,16}$/u.test(raw)) {
      throw new HttpError(400, 'names are 2–16 letters, numbers, spaces, dots or dashes');
    }
    run('update players set name = ? where id = ?', raw, pid);
    return json(res, 200, { ok: true, name: raw });
  }

  if (path === '/api/me' && method === 'DELETE') {
    run('delete from players where id = ?', pid);
    setCookie(res, COOKIE, '', 0);
    return json(res, 200, { ok: true });
  }

  throw new HttpError(404, 'not found');
}

/* ------------------------------------------------------------ static assets */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function serveStatic(res: ServerResponse, pathname: string): Promise<void> {
  if (!existsSync(DIST)) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Client not built. Run: npm run build');
    return;
  }
  const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(DIST, clean);
  let info = existsSync(filePath) ? await stat(filePath) : null;
  if (!info || info.isDirectory()) {
    filePath = join(DIST, 'index.html');
    info = existsSync(filePath) ? await stat(filePath) : null;
  }
  if (!info) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const body = await readFile(filePath);
  const ext = extname(filePath);
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': cache,
    'content-length': body.length,
  });
  res.end(body);
}

/* ------------------------------------------------------------------- server */

const server = createServer((req, res) => {
  void (async () => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url);
        return;
      }
      await serveStatic(res, url.pathname);
    } catch (err) {
      if (err instanceof HttpError) {
        json(res, err.status, { error: err.message });
      } else {
        console.error('[api]', err);
        if (!res.headersSent) json(res, 500, { error: 'server error' });
      }
    }
  })();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Noct API on http://127.0.0.1:${PORT} · day ${dayNumber()} · ${dayToDate(dayNumber()).toISOString().slice(0, 10)}`);
});
