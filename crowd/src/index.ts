/**
 * The crowd API: anonymous, aggregate, and deliberately forgetful.
 *
 * It accepts a free-text answer, maps it onto the prompt bank's answer keys
 * server-side, and stores counts only. No raw text, no accounts, no IPs.
 *
 * Endpoints
 *   POST /v1/answer            { day, game, promptId, answerKey | text } -> counts for that prompt
 *   POST /v1/run               { runId, day, game, mode, score, height }
 *   GET  /v1/prompts/:day?ids  -> counts for up to 20 prompts
 *   GET  /v1/today             -> climbs and average height today
 */

import { dayNumber } from '../../shared/dates';
import { SURVEY_PROMPTS, matchAnswer, normaliseAnswer } from '../../shared/survey';

/* --- the sliver of D1 we use, so this file needs no extra type packages --- */

interface D1Result<T> {
  results: T[];
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

interface D1Like {
  prepare(query: string): D1Statement;
}

export interface Env {
  DB: D1Like;
  /** Comma-separated origins allowed to post. Local dev origins are always allowed. */
  ALLOWED_ORIGINS?: string;
}

const LOCAL_ORIGINS = [
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];

const PROMPTS = new Map(SURVEY_PROMPTS.map((prompt) => [prompt.id, prompt]));
const GAMES = new Set(['common', 'rare']);
const RUN_MODES = new Set(['daily', 'classic', 'endless']);

const MAX_TEXT = 40;
const MAX_IDS = 20;
const ANSWERS_PER_DEVICE_DAY = 400;
const RUNS_PER_DEVICE_DAY = 80;

/* Burst caps per minute: tight per device, looser per address so one bad
   browser cannot lock out the flat, and one flat cannot flood the endpoint. */
const ANSWERS_PER_DEVICE_MIN = 40;
const ANSWERS_PER_IP_MIN = 120;
const RUNS_PER_DEVICE_MIN = 10;
const RUNS_PER_IP_MIN = 30;

/* --- schema -------------------------------------------------------------- */

/* A fresh D1 starts empty, so the Worker creates its own tables on first use.
   Counts only: no free text, no accounts, no addresses. */
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS answers (
     day INTEGER NOT NULL,
     game TEXT NOT NULL,
     prompt_id TEXT NOT NULL,
     answer_key TEXT NOT NULL,
     count INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (day, game, prompt_id, answer_key))`,
  `CREATE INDEX IF NOT EXISTS answers_by_prompt ON answers (day, prompt_id)`,
  `CREATE TABLE IF NOT EXISTS runs (
     id TEXT PRIMARY KEY,
     day INTEGER NOT NULL,
     game TEXT NOT NULL,
     mode TEXT NOT NULL,
     score INTEGER NOT NULL,
     height INTEGER NOT NULL,
     created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS runs_by_day ON runs (day, game)`,
  `CREATE TABLE IF NOT EXISTS usage (
     day INTEGER NOT NULL,
     device TEXT NOT NULL,
     kind TEXT NOT NULL,
     n INTEGER NOT NULL DEFAULT 0,
     PRIMARY KEY (day, device, kind))`,
];

/* Older rows counted the browser's device id as it came in. Only hashes may
   live here, so anything that still looks like a raw id is dropped once. */
const PURGE_RAW_DEVICES = `DELETE FROM usage WHERE device GLOB '*-*-*-*-*'`;

let schemaReady: Promise<void> | null = null;

function ensureSchema(env: Env): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const sql of SCHEMA) await env.DB.prepare(sql).run();
      await env.DB.prepare(PURGE_RAW_DEVICES).run();
    })().catch((error: unknown) => {
      schemaReady = null; /* try again on the next request */
      throw error;
    });
  }
  return schemaReady;
}

/* --- cross-origin -------------------------------------------------------- */

function origins(env: Env): string[] {
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return [...LOCAL_ORIGINS, ...extra];
}

function corsHeaders(request: Request, env: Env, write: boolean): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!write) return { 'access-control-allow-origin': '*' };
  if (!origin) return {}; /* curl and same-origin server calls */
  if (origins(env).includes(origin)) {
    return {
      'access-control-allow-origin': origin,
      vary: 'origin',
    };
  }
  return {};
}

function allowedToWrite(request: Request, env: Env): boolean {
  const origin = request.headers.get('origin');
  return !origin || origins(env).includes(origin);
}

function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
  write = false,
  cache = 'no-store',
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cache,
      'x-content-type-options': 'nosniff',
      ...corsHeaders(request, env, write),
    },
  });
}

/* --- abuse limits -------------------------------------------------------- */

/** Cheap per-isolate limiter: a burst guard in front of the D1 daily caps. */
const bursts = new Map<string, { count: number; reset: number }>();

function burstLimited(key: string, max: number): boolean {
  const now = Date.now();
  const found = bursts.get(key);
  if (!found || found.reset <= now) {
    bursts.set(key, { count: 1, reset: now + 60_000 });
    return false;
  }
  found.count += 1;
  return found.count > max;
}

function clientIp(request: Request): string {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) return direct;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'local';
}

/**
 * The only form of a device id that is ever stored: a one-way hash, so the
 * daily caps still work but a row cannot be traced back to a browser.
 */
async function deviceKey(device: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`noct:${device}`));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function underDailyCap(
  env: Env,
  day: number,
  device: string,
  kind: string,
  cap: number,
): Promise<boolean> {
  const row = await env.DB.prepare(
    `INSERT INTO usage (day, device, kind, n) VALUES (?, ?, ?, 1)
     ON CONFLICT(day, device, kind) DO UPDATE SET n = n + 1
     RETURNING n`,
  )
    .bind(day, await deviceKey(device), kind)
    .first<{ n: number }>();
  return (row?.n ?? 1) <= cap;
}

/* --- input sanity -------------------------------------------------------- */

function asDay(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (Math.abs(value - dayNumber()) > 1) return null;
  return value;
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > MAX_TEXT) return null;
  return text;
}

function asDevice(request: Request): string | null {
  const raw = request.headers.get('x-noct-device');
  if (!raw || raw.length < 6 || raw.length > 80) return null;
  return raw.replace(/[^a-zA-Z0-9._:-]/g, '').slice(0, 80) || null;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text || text.length > 4096) return null;
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function countsFor(rows: { answer_key: string; n: number }[]): {
  counts: Record<string, number>;
  total: number;
} {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const n = Number(row.n) || 0;
    counts[row.answer_key] = n;
    total += n;
  }
  return { counts, total };
}

/* --- handlers ------------------------------------------------------------ */

async function answer(request: Request, env: Env): Promise<Response> {
  if (!allowedToWrite(request, env)) return json(request, env, { error: 'origin not allowed' }, 403, true);
  await ensureSchema(env);
  const device = asDevice(request);
  if (!device) return json(request, env, { error: 'missing device' }, 400, true);

  const ip = clientIp(request);
  if (burstLimited(`answer:ip:${ip}`, ANSWERS_PER_IP_MIN)) {
    return json(request, env, { error: 'slow down' }, 429, true);
  }
  if (burstLimited(`answer:device:${device}`, ANSWERS_PER_DEVICE_MIN)) {
    return json(request, env, { error: 'slow down' }, 429, true);
  }

  const body = await readJson(request);
  if (!body) return json(request, env, { error: 'bad body' }, 400, true);

  const day = asDay(body.day);
  const game = typeof body.game === 'string' ? body.game : '';
  const promptId = typeof body.promptId === 'string' ? body.promptId : '';
  const prompt = PROMPTS.get(promptId);

  /* The app sends the normalised key; `text` stays supported for old clients
     and is normalised here. Neither is ever logged or stored. */
  const answerKey = asText(body.answerKey);
  const text = asText(body.text);
  const candidate = answerKey ?? text;

  if (day === null || !GAMES.has(game) || !prompt || !candidate) {
    return json(request, env, { error: 'bad answer' }, 400, true);
  }

  if (!(await underDailyCap(env, day, device, 'answer', ANSWERS_PER_DEVICE_DAY))) {
    return json(request, env, { error: 'daily limit' }, 429, true);
  }

  /* Key in, bank key out — only a known answer key or `other` is ever stored. */
  const index = matchAnswer(prompt, candidate);
  const key = index === null ? 'other' : normaliseAnswer(prompt.answers[index].text);

  await env.DB.prepare(
    `INSERT INTO answers (day, game, prompt_id, answer_key, count) VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(day, game, prompt_id, answer_key) DO UPDATE SET count = count + 1`,
  )
    .bind(day, game, promptId, key)
    .run();

  const rows = await env.DB.prepare(
    `SELECT answer_key, SUM(count) AS n FROM answers
     WHERE day = ? AND prompt_id = ?
     GROUP BY answer_key`,
  )
    .bind(day, promptId)
    .all<{ answer_key: string; n: number }>();

  const { counts, total } = countsFor(rows.results);
  return json(request, env, { key, total, counts }, 200, true);
}

async function shares(request: Request, env: Env, dayRaw: string): Promise<Response> {
  const day = asDay(Number(dayRaw));
  if (day === null) return json(request, env, { error: 'bad day' }, 400);
  await ensureSchema(env);

  const ids = (new URL(request.url).searchParams.get('ids') ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => PROMPTS.has(id))
    .slice(0, MAX_IDS);

  if (!ids.length) return json(request, env, { day, prompts: {} }, 200, false, 'public, max-age=5');

  const holes = ids.map(() => '?').join(',');
  const rows = await env.DB.prepare(
    `SELECT prompt_id, answer_key, SUM(count) AS n FROM answers
     WHERE day = ? AND prompt_id IN (${holes})
     GROUP BY prompt_id, answer_key`,
  )
    .bind(day, ...ids)
    .all<{ prompt_id: string; answer_key: string; n: number }>();

  const grouped = new Map<string, { answer_key: string; n: number }[]>();
  for (const row of rows.results) {
    const list = grouped.get(row.prompt_id) ?? [];
    list.push({ answer_key: row.answer_key, n: row.n });
    grouped.set(row.prompt_id, list);
  }

  const prompts: Record<string, { counts: Record<string, number>; total: number }> = {};
  for (const id of ids) {
    prompts[id] = countsFor(grouped.get(id) ?? []);
  }

  return json(request, env, { day, prompts }, 200, false, 'public, max-age=5');
}

async function run(request: Request, env: Env): Promise<Response> {
  if (!allowedToWrite(request, env)) return json(request, env, { error: 'origin not allowed' }, 403, true);
  await ensureSchema(env);
  const device = asDevice(request);
  if (!device) return json(request, env, { error: 'missing device' }, 400, true);

  const ip = clientIp(request);
  if (burstLimited(`run:ip:${ip}`, RUNS_PER_IP_MIN)) {
    return json(request, env, { error: 'slow down' }, 429, true);
  }
  if (burstLimited(`run:device:${device}`, RUNS_PER_DEVICE_MIN)) {
    return json(request, env, { error: 'slow down' }, 429, true);
  }

  const body = await readJson(request);
  if (!body) return json(request, env, { error: 'bad body' }, 400, true);

  const day = asDay(body.day);
  const game = typeof body.game === 'string' ? body.game : '';
  const mode = typeof body.mode === 'string' ? body.mode : '';
  const score = typeof body.score === 'number' ? Math.round(body.score) : NaN;
  const height = typeof body.height === 'number' ? Math.round(body.height) : NaN;
  /* A run id must be the client's random UUID; only its hash is stored, so this
     column can never hold free text. */
  const runId = typeof body.runId === 'string' ? body.runId.trim() : '';
  const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (
    day === null ||
    !GAMES.has(game) ||
    !RUN_MODES.has(mode) ||
    !Number.isFinite(score) ||
    !Number.isFinite(height) ||
    score < 0 ||
    score > 700 ||
    height < 0 ||
    height > 14000 ||
    !RUN_ID.test(runId)
  ) {
    return json(request, env, { error: 'bad run' }, 400, true);
  }

  if (!(await underDailyCap(env, day, device, 'run', RUNS_PER_DEVICE_DAY))) {
    return json(request, env, { error: 'daily limit' }, 429, true);
  }

  await env.DB.prepare(
    `INSERT OR IGNORE INTO runs (id, day, game, mode, score, height, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(await deviceKey(runId), day, game, mode, score, height, Date.now())
    .run();

  return json(request, env, { ok: true }, 200, true);
}

async function today(request: Request, env: Env): Promise<Response> {
  await ensureSchema(env);
  const day = dayNumber();
  const [runs, answers] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS climbs, COALESCE(AVG(height), 0) AS avg_height FROM runs WHERE day = ?`,
    )
      .bind(day)
      .first<{ climbs: number; avg_height: number }>(),
    env.DB.prepare(`SELECT COALESCE(SUM(count), 0) AS answers FROM answers WHERE day = ?`)
      .bind(day)
      .first<{ answers: number }>(),
  ]);

  return json(
    request,
    env,
    {
      day,
      climbs: Number(runs?.climbs) || 0,
      avgHeight: Math.round(Number(runs?.avg_height) || 0),
      answers: Number(answers?.answers) || 0,
    },
    200,
    false,
    'public, max-age=15',
  );
}

/* --- router -------------------------------------------------------------- */

export default {
  async fetch(request: Request, env: Env, _ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': request.headers.get('origin') ?? '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type, x-noct-device',
          'access-control-max-age': '86400',
          vary: 'origin',
        },
      });
    }

    if (url.pathname === '/v1/answer' && request.method === 'POST') return answer(request, env);
    if (url.pathname === '/v1/run' && request.method === 'POST') return run(request, env);

    const shareMatch = url.pathname.match(/^\/v1\/prompts\/(\d+)$/);
    if (shareMatch && request.method === 'GET') return shares(request, env, shareMatch[1]);

    if (url.pathname === '/v1/today' && request.method === 'GET') return today(request, env);

    if (url.pathname === '/v1/health') {
      return json(request, env, { ok: true, day: dayNumber() }, 200, false, 'no-store');
    }

    return json(request, env, { error: 'not found' }, 404);
  },
};
