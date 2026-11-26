/**
 * Local engine for the static build (GitHub Pages).
 *
 * There is no server there, so this module does what the API does: it builds
 * today's boards from a day-stamped seed, keeps the one-attempt rule, grades
 * rounds against the proven solution, scores them, and stores results in
 * localStorage. The clock is the visitor's own tab clock, which is why this
 * build is honest about scores being local rather than authoritative.
 */

import type { NoctApi } from './contract';
import { ApiError } from './errors';
import {
  MAX_HINTS,
  HINT_COST,
  MAX_SCORE,
  ROUND_SIZES,
  maxScore,
  ratingFor,
  scoreRound,
} from '../../shared/score';
import { dayNumber, dayToISO, nextResetAt } from '../../shared/dates';
import { countSolutions, generatePuzzle, hintCell, isSolved, type Puzzle } from '../../shared/puzzle';
import type { ArcadeGame } from '../../shared/arcade';
import type {
  ArchiveEntry,
  ArcadeLeaderboardResponse,
  ArcadeScoreResponse,
  ArcadeStat,
  GlobalToday,
  LeaderRow,
  LeaderboardResponse,
  MeResponse,
  Mode,
  RoundRecord,
  StatsResponse,
  Summary,
  StartResponse,
  TodayResponse,
} from '../../shared/types';

const KEY = 'noct.local.v1';
const MIN_ROUND_MS = 700;
const SESSION_TTL = 12 * 60 * 60 * 1000;
const KEEP_FINISHED = 8;

/** No server means no shared pool of players: every global number is zero. */
const NO_GLOBAL: GlobalToday = { started: 0, completed: 0, avgScore: 0 };

const PRACTICE_SIZES: number[][] = [
  [5, 5, 5],
  [5, 6, 6],
  [6, 6, 7],
  [6, 7, 7],
  [7, 7, 7],
];

interface LocalPlay {
  index: number;
  points: number;
  timeMs: number;
  hintUsed: boolean;
}

interface LocalSession {
  id: string;
  mode: Mode;
  day: number | null;
  rounds: Puzzle[];
  roundIndex: number;
  startedAt: number;
  roundStartedAt: number;
  hints: { round: number; cell: number }[];
  plays: LocalPlay[];
  status: 'active' | 'finished' | 'expired';
}

interface DailyResult {
  score: number;
  rating: string;
  timeMs: number;
  hints: number;
  summary?: Summary;
}

interface LocalState {
  version: 1;
  id: string;
  name: string | null;
  created: number;
  daily: Record<string, DailyResult>;
  archive: Record<string, { score: number; timeMs: number }>;
  sessions: Record<string, LocalSession>;
  playedSessions: number;
  practiceRounds: number;
  /** side-table scores kept on this device; the static build has no table */
  arcade?: Partial<Record<ArcadeGame, { plays: number; best: number; total: number; lastDay: number }>>;
}

/* ------------------------------------------------------------------ storage */

function uid(): string {
  const c = globalThis.crypto;
  if (c && 'randomUUID' in c) return c.randomUUID();
  return `local-${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function emptyState(): LocalState {
  return {
    version: 1,
    id: uid(),
    name: null,
    created: Date.now(),
    daily: {},
    archive: {},
    sessions: {},
    playedSessions: 0,
    practiceRounds: 0,
  };
}

let cached: LocalState | null = null;

function load(): LocalState {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LocalState;
      if (parsed?.version === 1 && parsed.daily && parsed.sessions && parsed.archive) {
        cached = parsed;
        return parsed;
      }
    }
  } catch {
    /* storage unavailable or corrupt: start clean */
  }
  cached = emptyState();
  return cached;
}

function save(state: LocalState): void {
  cached = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep it in memory for this tab */
  }
}

/** Drop old finished sessions so the stored board list cannot grow forever. */
function prune(state: LocalState): void {
  const finished = Object.values(state.sessions)
    .filter((s) => s.status !== 'active')
    .sort((a, b) => a.startedAt - b.startedAt);
  for (const s of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) {
    delete state.sessions[s.id];
  }
}

/* ------------------------------------------------------------------ helpers */

function streaks(state: LocalState, today: number): { current: number; best: number } {
  const days = Object.keys(state.daily)
    .map(Number)
    .sort((a, b) => b - a);
  if (!days.length) return { current: 0, best: 0 };
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] - 1 ? run + 1 : 1;
    if (run > best) best = run;
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

function sessionScore(session: LocalSession): number {
  const gross = session.plays.reduce((sum, p) => sum + p.points, 0);
  return Math.max(0, gross - session.hints.length * HINT_COST);
}

function sessionTime(session: LocalSession): number {
  return session.plays.reduce((sum, p) => sum + p.timeMs, 0);
}

/**
 * Build boards and refuse to serve any that the solver cannot prove unique —
 * the same self-check the server runs before publishing a day.
 */
function buildRounds(kind: string, key: string | number, sizes: number[]): Puzzle[] {
  return sizes.map((size, i) => {
    const puzzle = generatePuzzle(`noct-v1-${kind}-${key}-${i}`, size);
    if (countSolutions(puzzle, 2) !== 1) throw new ApiError(500, 'unverified board', null);
    return puzzle;
  });
}

function activeDaily(state: LocalState, today: number): LocalSession | null {
  for (const session of Object.values(state.sessions)) {
    if (session.mode === 'daily' && session.day === today && session.status === 'active') {
      if (Date.now() - session.startedAt <= SESSION_TTL) return session;
      session.status = 'expired';
      save(state);
      return null;
    }
  }
  return null;
}

function startPayload(session: LocalSession, resumed: boolean): StartResponse {
  return {
    sessionId: session.id,
    mode: session.mode,
    day: session.day,
    roundIndex: session.roundIndex,
    rounds: session.rounds.map((p, index) => ({
      index,
      size: p.size,
      region: p.region,
      givens: p.givens,
    })),
    score: sessionScore(session),
    hintsLeft: Math.max(0, MAX_HINTS - session.hints.length),
    resumed,
  };
}

function createSession(
  state: LocalState,
  mode: Mode,
  day: number | null,
  rounds: Puzzle[],
): LocalSession {
  const now = Date.now();
  const session: LocalSession = {
    id: uid(),
    mode,
    day,
    rounds,
    roundIndex: 0,
    startedAt: now,
    roundStartedAt: now,
    hints: [],
    plays: [],
    status: 'active',
  };
  state.sessions[session.id] = session;
  state.playedSessions += 1;
  prune(state);
  save(state);
  return session;
}

function buildSummary(state: LocalState, session: LocalSession): Summary {
  const day = session.day ?? dayNumber();
  const isDaily = session.mode === 'daily';
  const score = sessionScore(session);
  const st = streaks(state, dayNumber());
  const max = maxScore(session.rounds.length);
  const rounds: RoundRecord[] = session.rounds.map((p, index) => {
    const play = session.plays.find((x) => x.index === index);
    return {
      index,
      size: p.size,
      region: p.region,
      points: play ? play.points : 0,
      timeMs: play ? play.timeMs : 0,
      hintUsed: session.hints.some((h) => h.round === index),
      solution: p.solution,
    };
  });
  const previousBest = Math.max(
    0,
    ...Object.entries(state.daily)
      .filter(([entryDay]) => Number(entryDay) !== day)
      .map(([, result]) => result.score),
  );

  return {
    sessionId: session.id,
    mode: session.mode,
    day: session.day,
    score,
    maxScore: max,
    rating: ratingFor(score, max),
    rounds,
    timeMs: sessionTime(session),
    hints: session.hints.length,
    streak: st.current,
    bestStreak: st.best,
    rank: null,
    percentile: null,
    global: NO_GLOBAL,
    personalBest: isDaily && session.plays.length === session.rounds.length && score > previousBest,
  };
}

function finishSession(state: LocalState, session: LocalSession): Summary {
  session.status = 'finished';
  const day = session.day;

  if (session.mode === 'daily' && day !== null) {
    const score = sessionScore(session);
    // Store the raw result first so the streak below already counts today.
    const entry: DailyResult = {
      score,
      rating: ratingFor(score, maxScore(session.rounds.length)),
      timeMs: sessionTime(session),
      hints: session.hints.length,
    };
    state.daily[String(day)] = entry;
    const summary = buildSummary(state, session);
    entry.summary = summary;
    prune(state);
    save(state);
    return summary;
  }

  if (session.mode === 'archive' && day !== null) {
    const score = sessionScore(session);
    const timeMs = sessionTime(session);
    const existing = state.archive[String(day)];
    const better = !existing || score > existing.score || (score === existing.score && timeMs < existing.timeMs);
    state.archive[String(day)] = {
      score: better ? score : existing.score,
      timeMs: better ? timeMs : existing.timeMs,
    };
  }

  if (session.mode === 'practice') {
    state.practiceRounds += session.rounds.length;
  }

  const summary = buildSummary(state, session);
  prune(state);
  save(state);
  return summary;
}

function findSession(state: LocalState, sessionId: string): LocalSession {
  const session = state.sessions[sessionId];
  if (!session) throw new ApiError(404, 'session not found', null);
  return session;
}

function assertOpen(session: LocalSession): void {
  if (session.status !== 'active') throw new ApiError(409, 'session is closed', null);
}

/* ---------------------------------------------------------------------- api */

export const localApi: NoctApi = {
  async today(): Promise<TodayResponse> {
    const state = load();
    const day = dayNumber();
    const done = state.daily[String(day)];
    const st = streaks(state, day);
    const active = activeDaily(state, day) !== null;
    return {
      day,
      date: dayToISO(day),
      nextResetAt: nextResetAt(),
      now: Date.now(),
      roundCount: ROUND_SIZES.length,
      sizes: ROUND_SIZES,
      played: Boolean(done),
      score: done ? done.score : null,
      rating: done ? done.rating : null,
      streak: st.current,
      bestStreak: st.best,
      active,
      global: NO_GLOBAL,
    };
  },

  async dailyStart(): Promise<StartResponse> {
    const state = load();
    const day = dayNumber();

    const done = state.daily[String(day)];
    if (done) {
      let summary = done.summary;
      if (!summary) {
        const finished = Object.values(state.sessions).find(
          (s) => s.mode === 'daily' && s.day === day && s.status === 'finished',
        );
        if (finished) summary = buildSummary(state, finished);
      }
      if (summary) throw new ApiError(409, 'already_played', { summary });
    }

    const existing = activeDaily(state, day);
    if (existing) return startPayload(existing, true);

    const rounds = buildRounds('daily', day, ROUND_SIZES);
    return startPayload(createSession(state, 'daily', day, rounds), false);
  },

  async practiceStart(level: number): Promise<StartResponse> {
    const state = load();
    const clamped = Math.max(1, Math.min(5, Math.trunc(level) || 2));
    const sizes = PRACTICE_SIZES[clamped - 1];
    const rounds = buildRounds('practice', uid(), sizes);
    return startPayload(createSession(state, 'practice', null, rounds), false);
  },

  async archiveStart(day: number): Promise<StartResponse> {
    const state = load();
    const today = dayNumber();
    if (!Number.isInteger(day) || day >= today || day < Math.max(1, today - 365)) {
      throw new ApiError(400, 'that board is not in the archive', null);
    }
    const rounds = buildRounds('daily', day, ROUND_SIZES);
    return startPayload(createSession(state, 'archive', day, rounds), false);
  },

  async submitRound(sessionId: string, index: number, cells: number[]) {
    const state = load();
    const session = findSession(state, sessionId);
    assertOpen(session);
    if (index !== session.roundIndex) throw new ApiError(409, 'round out of order', null);

    const puzzle = session.rounds[index];
    if (!puzzle) throw new ApiError(409, 'round is over', null);

    const elapsed = Date.now() - session.roundStartedAt;
    if (elapsed < MIN_ROUND_MS) throw new ApiError(429, 'too_fast', null);

    if (!isSolved(puzzle, cells)) {
      return { ok: false, reason: 'invalid', score: sessionScore(session) };
    }

    const hintUsed = session.hints.some((h) => h.round === index);
    const scored = scoreRound(index, puzzle.size, elapsed, hintUsed);
    session.plays.push({ index, points: scored.total, timeMs: elapsed, hintUsed });
    session.roundIndex = index + 1;
    session.roundStartedAt = Date.now();

    if (session.roundIndex >= session.rounds.length) {
      const summary = finishSession(state, session);
      return {
        ok: true,
        points: scored.total,
        solution: puzzle.solution,
        finished: true,
        score: summary.score,
        hintsLeft: Math.max(0, MAX_HINTS - session.hints.length),
        summary,
      };
    }

    save(state);
    return {
      ok: true,
      points: scored.total,
      solution: puzzle.solution,
      finished: false,
      nextIndex: session.roundIndex,
      score: sessionScore(session),
      hintsLeft: Math.max(0, MAX_HINTS - session.hints.length),
    };
  },

  async hint(sessionId: string, placed: number[]) {
    const state = load();
    const session = findSession(state, sessionId);
    assertOpen(session);
    if (session.hints.length >= MAX_HINTS) throw new ApiError(409, 'no hints left today', null);
    if (session.hints.some((h) => h.round === session.roundIndex)) {
      throw new ApiError(409, 'this round already has a hint', null);
    }
    const puzzle = session.rounds[session.roundIndex];
    if (!puzzle) throw new ApiError(409, 'round is over', null);
    const cell = hintCell(puzzle, [...placed, ...puzzle.givens]);
    if (cell === null) throw new ApiError(409, 'nothing left to reveal', null);
    session.hints.push({ round: session.roundIndex, cell });
    save(state);
    return { cell, hintsLeft: Math.max(0, MAX_HINTS - session.hints.length) };
  },

  async archive(limit = 42) {
    const state = load();
    const today = dayNumber();
    const count = Math.min(60, Math.max(1, Math.trunc(limit) || 42));
    const entries: ArchiveEntry[] = [];
    for (let i = 1; i <= count; i++) {
      const day = today - i;
      if (day < 1) break;
      const daily = state.daily[String(day)];
      const replay = state.archive[String(day)];
      entries.push({
        day,
        date: dayToISO(day),
        score: daily ? daily.score : replay ? replay.score : null,
        difficulty: null,
        playable: day >= Math.max(1, today - 365),
      });
    }
    return { entries };
  },

  async leaderboard(scope): Promise<LeaderboardResponse> {
    const state = load();
    const today = dayNumber();
    const from = scope === 'today' ? today : scope === 'week' ? today - 6 : 0;
    const days = Object.entries(state.daily)
      .map(([day, result]) => ({ day: Number(day), score: result.score }))
      .filter((entry) => entry.day >= from && entry.day <= today);

    let me: LeaderRow | null = null;
    if (days.length) {
      const score = days.reduce((sum, entry) => sum + entry.score, 0);
      me = {
        rank: 1,
        name: state.name ?? 'You',
        score,
        streak: streaks(state, today).current,
        me: true,
      };
    }
    return { scope, rows: me ? [me] : [], me, totalPlayers: me ? 1 : 0 };
  },

  async stats(): Promise<StatsResponse> {
    const state = load();
    const today = dayNumber();
    const days = Object.entries(state.daily)
      .map(([day, result]) => ({ day: Number(day), ...result }))
      .sort((a, b) => b.day - a.day);
    const st = streaks(state, today);
    const total = days.reduce((sum, d) => sum + d.score, 0);
    const bucketSize = 200;
    const distribution = Array.from({ length: Math.ceil(MAX_SCORE / bucketSize) }, (_, i) => ({
      from: i * bucketSize,
      to: (i + 1) * bucketSize,
      count: 0,
    }));
    for (const d of days) {
      const idx = Math.min(distribution.length - 1, Math.floor(d.score / bucketSize));
      distribution[idx].count += 1;
    }
    const calendar: StatsResponse['calendar'] = [];
    for (let i = 69; i >= 0; i--) {
      const day = today - i;
      const row = days.find((d) => d.day === day);
      calendar.push({ day, date: dayToISO(day), score: row ? row.score : null });
    }

    return {
      played: state.playedSessions,
      dailyCompleted: days.length,
      currentStreak: st.current,
      bestStreak: st.best,
      avgScore: days.length ? Math.round(total / days.length) : 0,
      bestScore: days.reduce((best, d) => Math.max(best, d.score), 0),
      perfectDays: days.filter((d) => d.score >= MAX_SCORE * 0.87).length,
      totalScore: total,
      hintsUsed: days.reduce((sum, d) => sum + d.hints, 0),
      distribution,
      recent: days.slice(0, 20).map((d) => ({
        day: d.day,
        date: dayToISO(d.day),
        score: d.score,
        rating: d.rating,
      })),
      calendar,
      practiceRounds: state.practiceRounds,
      archivePlayed: Object.keys(state.archive).length,
      arcade: Object.entries(state.arcade ?? {}).map(([game, row]) => ({
        game: game as ArcadeGame,
        plays: row?.plays ?? 0,
        best: row?.best ?? 0,
        total: row?.total ?? 0,
        lastDay: row?.lastDay ?? 0,
      })) as ArcadeStat[],
    };
  },

  async me(): Promise<MeResponse> {
    const state = load();
    return { id: state.id, name: state.name, joined: new Date(state.created).toISOString() };
  },

  async setName(name: string) {
    const state = load();
    const raw = name.trim();
    if (raw.length === 0) {
      state.name = null;
      save(state);
      return { ok: true, name: null };
    }
    if (!/^[\p{L}\p{N} ._-]{2,16}$/u.test(raw)) {
      throw new ApiError(400, 'names are 2–16 letters, numbers, spaces, dots or dashes', null);
    }
    state.name = raw;
    save(state);
    return { ok: true, name: raw };
  },

  async deleteMe() {
    cached = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return { ok: true };
  },

  async arcadeScore(game: ArcadeGame, score: number): Promise<ArcadeScoreResponse> {
    const state = load();
    const today = dayNumber();
    const table = state.arcade ?? (state.arcade = {});
    const row = table[game] ?? { plays: 0, best: 0, total: 0, lastDay: today };
    row.plays += 1;
    row.best = Math.max(row.best, score);
    row.total += score;
    row.lastDay = today;
    table[game] = row;
    save(state);
    return { ok: true, game, day: today, best: row.best, plays: row.plays, rank: 1 };
  },

  async arcadeLeaderboard(
    game: ArcadeGame,
    scope: 'today' | 'week' | 'all',
  ): Promise<ArcadeLeaderboardResponse> {
    const state = load();
    const today = dayNumber();
    const row = state.arcade?.[game];
    const inScope =
      row && (scope === 'all' || (scope === 'today' ? row.lastDay === today : row.lastDay >= today - 6));
    const me: LeaderRow | null = inScope
      ? { rank: 1, name: state.name ?? 'You', score: row.best, streak: 0, me: true }
      : null;
    return { game, scope, rows: me ? [me] : [], me, totalPlayers: me ? 1 : 0 };
  },
};
