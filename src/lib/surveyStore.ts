import { dayNumber } from '../../shared/dates';
import {
  BALLOONS,
  classicDeck,
  type RunMode,
  type SurveyMode,
  type SurveyPrompt,
  type Tier,
} from '../../shared/survey';

export interface LoggedAnswer {
  promptId: string;
  asked: string;
  given: string;
  matched: string | null;
  weight: number | null;
  points: number;
  tier?: Tier | null;
  rank?: number | null;
}

export interface SurveyRun {
  mode: SurveyMode;
  runMode: RunMode;
  day: number;
  score: number;
  max: number;
  height: number;
  answers: LoggedAnswer[];
  finishedAt: number;
  seed: number;
}

/** A climb in progress: Endless can be picked up after a reload. */
export interface EndlessState {
  mode: SurveyMode;
  day: number;
  seed: number;
  index: number;
  score: number;
  balloons: number;
  answers: LoggedAnswer[];
  updatedAt: number;
}

interface Store {
  daily: Partial<Record<SurveyMode, Record<string, SurveyRun>>>;
  classicBest: Partial<Record<SurveyMode, SurveyRun>>;
  classicLast: Partial<Record<SurveyMode, SurveyRun>>;
  /** ids still undealt in the current Classic cycle of the bank */
  classicDeck: Partial<Record<SurveyMode, string[]>>;
  endless: Partial<Record<SurveyMode, EndlessState>>;
  endlessBest: Partial<Record<SurveyMode, number>>;
}

const KEY = 'noct.survey.v2';

function empty(): Store {
  return { daily: {}, classicBest: {}, classicLast: {}, classicDeck: {}, endless: {}, endlessBest: {} };
}

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    if (!parsed || typeof parsed !== 'object') return empty();
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode: the run still shows for this tab */
  }
}

export function dailyRunFor(mode: SurveyMode, day = dayNumber()): SurveyRun | null {
  return read().daily[mode]?.[String(day)] ?? null;
}

export function saveDailyRun(run: SurveyRun): void {
  const store = read();
  const byDay = store.daily[run.mode] ?? {};
  byDay[String(run.day)] = run;
  store.daily[run.mode] = byDay;
  write(store);
}

export function classicBestRun(mode: SurveyMode): SurveyRun | null {
  return read().classicBest[mode] ?? null;
}

export function classicLastRun(mode: SurveyMode): SurveyRun | null {
  return read().classicLast[mode] ?? null;
}

export function saveClassicRun(run: SurveyRun): void {
  const store = read();
  store.classicLast[run.mode] = run;
  const best = store.classicBest[run.mode];
  if (!best || run.score > best.score) store.classicBest[run.mode] = run;
  write(store);
}

/**
 * Seven Classic prompts off the saved deck. The deck is only reshuffled once
 * the bank has been dealt, so a run never repeats a prompt it has just seen.
 */
export function drawClassicPrompts(mode: SurveyMode): SurveyPrompt[] {
  const store = read();
  const dealt = classicDeck(mode, store.classicDeck?.[mode] ?? [], Date.now());
  store.classicDeck = { ...store.classicDeck, [mode]: dealt.left };
  write(store);
  return dealt.prompts;
}

export function endlessStateFor(mode: SurveyMode): EndlessState | null {
  const state = read().endless[mode];
  if (!state) return null;
  if (state.balloons <= 0) return null;
  return state;
}

export function saveEndlessState(state: EndlessState): void {
  const store = read();
  store.endless[state.mode] = state;
  const best = store.endlessBest[state.mode] ?? 0;
  if (state.score * 20 > best) store.endlessBest[state.mode] = state.score * 20;
  write(store);
}

export function clearEndlessState(mode: SurveyMode): void {
  const store = read();
  delete store.endless[mode];
  write(store);
}

export function endlessBestFor(mode: SurveyMode): number {
  return read().endlessBest[mode] ?? 0;
}

export function startEndlessState(mode: SurveyMode, seed: number): EndlessState {
  return {
    mode,
    day: dayNumber(),
    seed,
    index: 0,
    score: 0,
    balloons: BALLOONS,
    answers: [],
    updatedAt: Date.now(),
  };
}

/** Best run of any mode, used on the start screen. */
export function bestFor(mode: SurveyMode): number {
  const store = read();
  const daily = Object.values(store.daily[mode] ?? {}).reduce((max, run) => Math.max(max, run.score), 0);
  const classic = store.classicBest[mode]?.score ?? 0;
  return Math.max(daily, classic);
}

export function streakFor(mode: SurveyMode, today = dayNumber()): { current: number; best: number } {
  const days = Object.keys(read().daily[mode] ?? {})
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

export function playedCount(mode: SurveyMode): number {
  return Object.keys(read().daily[mode] ?? {}).length;
}
