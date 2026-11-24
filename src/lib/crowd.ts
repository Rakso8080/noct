import { normaliseAnswer, type SurveyMode } from '../../shared/survey';

/**
 * The crowd: real shares from the Worker in `crowd/`, or nothing at all.
 *
 * The game works fully offline — when there is no API configured, or the call
 * fails, the authored shares in the prompt bank are used untouched. Answers are
 * posted as free text; the Worker normalises them to an answer key and only
 * counts are ever stored.
 */

/** Below this many answers the authored shares stay on screen. */
export const MIN_SAMPLE = 25;

export interface CrowdPrompt {
  total: number;
  counts: Record<string, number>;
}

const BASE = (import.meta.env.VITE_CROWD_API ?? '').replace(/\/+$/, '');

export const crowdEnabled = Boolean(BASE);

const DEVICE_KEY = 'noct.device.v1';

/** An anonymous id so one device cannot count as a crowd. No account, no email. */
function deviceId(): string {
  try {
    const found = localStorage.getItem(DEVICE_KEY);
    if (found) return found;
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return 'anonymous';
  }
}

const DOWN_KEY = 'noct.crowd.down';

/**
 * When the Worker is unreachable, stop hammering it for a minute: no repeated
 * four-second waits, and no fresh failed request on every prompt.
 */
function apiDown(): boolean {
  try {
    return Number(sessionStorage.getItem(DOWN_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function markDown(): void {
  try {
    sessionStorage.setItem(DOWN_KEY, String(Date.now() + 20_000));
  } catch {
    /* private mode */
  }
}

function markUp(): void {
  try {
    sessionStorage.removeItem(DOWN_KEY);
  } catch {
    /* private mode */
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE || apiDown()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      /* Only writes carry the device id, so reads stay simple CORS requests. */
      headers: init?.body
        ? { 'content-type': 'application/json', 'x-noct-device': deviceId() }
        : undefined,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as T;
    /* The service worker answers { offline: true } when the API cannot be reached. */
    if (body && typeof body === 'object' && (body as { offline?: unknown }).offline === true) {
      markDown();
      return null;
    }
    markUp();
    return body;
  } catch {
    markDown();
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Count one answer and get the prompt's refreshed counts back.
 *
 * The answer is normalised in the browser and only that key is sent: the raw
 * words never leave the device at all.
 */
export async function recordAnswer(input: {
  day: number;
  mode: SurveyMode;
  promptId: string;
  text: string;
}): Promise<CrowdPrompt | null> {
  const answerKey = normaliseAnswer(input.text) || 'other';
  const res = await call<{ total: number; counts: Record<string, number> }>('/v1/answer', {
    method: 'POST',
    body: JSON.stringify({
      day: input.day,
      game: input.mode,
      promptId: input.promptId,
      answerKey,
    }),
  });
  if (!res || typeof res.total !== 'number') return null;
  return { total: res.total, counts: res.counts ?? {} };
}

/** Counts for a handful of prompts, so a whole run can be shown with real shares. */
export async function loadShares(
  ids: string[],
  day: number,
): Promise<Record<string, CrowdPrompt> | null> {
  if (!ids.length) return null;
  const res = await call<{ prompts: Record<string, CrowdPrompt> }>(
    `/v1/prompts/${day}?ids=${encodeURIComponent(ids.join(','))}`,
  );
  return res?.prompts ?? null;
}

/** Count a finished climb in today's totals. */
export async function recordRun(input: {
  day: number;
  mode: SurveyMode;
  runMode: 'daily' | 'classic' | 'endless';
  score: number;
  height: number;
}): Promise<void> {
  const runId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await call('/v1/run', {
    method: 'POST',
    body: JSON.stringify({
      runId,
      day: input.day,
      game: input.mode,
      mode: input.runMode,
      score: input.score,
      height: input.height,
    }),
  });
}

/** How many climbs finished today, and how high the average one went. */
export async function loadToday(): Promise<{ climbs: number; avgHeight: number } | null> {
  const res = await call<{ climbs: number; avgHeight: number }>('/v1/today');
  if (!res) return null;
  return { climbs: Number(res.climbs) || 0, avgHeight: Number(res.avgHeight) || 0 };
}

export function liveCrowd(crowd: CrowdPrompt | undefined): CrowdPrompt | null {
  return crowd && crowd.total >= MIN_SAMPLE ? crowd : null;
}

/** Real share of an answer, or the authored fallback when the sample is small. */
export function shareOf(crowd: CrowdPrompt | null, text: string, fallback: number): number {
  if (!crowd || crowd.total < MIN_SAMPLE) return fallback;
  const count = crowd.counts[normaliseAnswer(text)] ?? 0;
  return Math.round((count / crowd.total) * 100);
}
