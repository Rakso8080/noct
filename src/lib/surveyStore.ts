import { dayNumber } from '../../shared/dates';
import type { SurveyMode, Tier } from '../../shared/survey';

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
  day: number;
  score: number;
  max: number;
  answers: LoggedAnswer[];
  finishedAt: number;
}

const KEY = 'noct.survey.v1';

type Store = Partial<Record<SurveyMode, Record<string, SurveyRun>>>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode: the run still shows for this tab */
  }
}

export function runFor(mode: SurveyMode, day = dayNumber()): SurveyRun | null {
  return read()[mode]?.[String(day)] ?? null;
}

export function saveRun(run: SurveyRun): void {
  const store = read();
  const byMode = store[run.mode] ?? {};
  byMode[String(run.day)] = run;
  store[run.mode] = byMode;
  write(store);
}

export function streakFor(mode: SurveyMode, today = dayNumber()): { current: number; best: number } {
  const days = Object.keys(read()[mode] ?? {})
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
  return Object.keys(read()[mode] ?? {}).length;
}
