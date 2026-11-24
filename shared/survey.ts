/**
 * Survey game content and scoring — pure, shared by the client and scripts.
 *
 * Each prompt is a small poll: the weight is the share of people who gave that
 * answer, so a guess can be judged against how common it was. Two games use the
 * same pool in opposite directions: Common rewards the obvious answer, Rare
 * rewards the one hardly anybody gives.
 *
 * The prompts themselves live in promptBank.ts, grouped by climate band.
 */

import { hashSeed, mulberry32 } from './puzzle.ts';
import { BANK, normaliseWeights, promptId, type Band } from './promptBank.ts';

export type SurveyMode = 'common' | 'rare';

export interface SurveyAnswer {
  text: string;
  /** share of answers, in percent */
  weight: number;
  aliases?: string[];
}

export interface SurveyPrompt {
  id: string;
  prompt: string;
  /** which climate of the climb the prompt belongs to */
  band: Band;
  answers: SurveyAnswer[];
}

export const PROMPTS_PER_DAY = 7;
export const SECONDS_PER_PROMPT = 25;
/** A perfect run: seven top answers, 700 points, 14 km of climb. */
export const MAX_PER_PROMPT = 100;
export const HEIGHT_PER_POINT = 20;
export const MAX_HEIGHT = PROMPTS_PER_DAY * MAX_PER_PROMPT * HEIGHT_PER_POINT;
export const ROUTE_KM = 14;
export const BALLOONS = 3;

/** Daily is one try, Classic is repeatable, Endless keeps dealing prompts. */
export type RunMode = 'daily' | 'classic' | 'endless';

/**
 * A guess is placed on a board of nine answers and graded by where it lands.
 * Rank 1 is the best answer for the mode: the most common for Common, the
 * rarest for Rare. The names are the game's own weather.
 */
export type Tier = 'moonrise' | 'aurora' | 'starlit' | 'lantern' | 'ember' | 'grounded' | 'lost';

export const TIERS: Record<Tier, { name: string; points: number; line: string }> = {
  moonrise: { name: 'Moonrise', points: 100, line: 'The answer at the very top of the board.' },
  aurora: { name: 'Aurora', points: 64, line: 'Right at the front of the crowd.' },
  starlit: { name: 'Starlit', points: 32, line: 'On the board, but further down it.' },
  lantern: { name: 'Lantern', points: 16, line: 'Off the board, but somebody said it.' },
  ember: { name: 'Ember', points: 8, line: 'Almost nobody said that.' },
  grounded: { name: 'Grounded', points: 4, line: 'Nobody else said it.' },
  lost: { name: 'Lost', points: 0, line: 'Nothing was accepted.' },
};

/** Board size, and the tiers a board place can reach. */
export const BOARD_SIZE = 9;

/** The bank, with every row's authored share turned into a whole percentage. */
export const SURVEY_PROMPTS: SurveyPrompt[] = BANK.map(({ band, prompt, rows }) => {
  const weights = normaliseWeights(rows.map(([, weight]) => weight));
  return {
    id: promptId(prompt),
    band,
    prompt,
    answers: rows.map(([text, , aliases], index) => ({ text, weight: weights[index], aliases })),
  };
});

const BY_ID = new Map(SURVEY_PROMPTS.map((prompt) => [prompt.id, prompt]));

/** Stable key for comparing a guess with an answer, tolerant of plurals. */
export function normaliseAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(a|an|the|some)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

/** The best matching answer index for a guess, or null when nobody said it. */
export function matchAnswer(prompt: SurveyPrompt, raw: string): number | null {
  const guess = normaliseAnswer(raw);
  if (!guess) return null;

  const forms = (answer: SurveyAnswer): string[] =>
    [answer.text, ...(answer.aliases ?? [])].map(normaliseAnswer);

  for (let i = 0; i < prompt.answers.length; i++) {
    if (forms(prompt.answers[i]).includes(guess)) return i;
  }
  for (let i = 0; i < prompt.answers.length; i++) {
    if (forms(prompt.answers[i]).some((f) => f.length > 3 && (f.includes(guess) || guess.includes(f)))) {
      return i;
    }
  }
  return null;
}

/** Where a guess lands on the board: 1 is the best answer for the mode. */
export function rankFor(mode: SurveyMode, prompt: SurveyPrompt, index: number): number {
  return mode === 'common' ? index + 1 : prompt.answers.length - index;
}

export function tierForRank(rank: number): Tier {
  if (rank <= 1) return 'moonrise';
  if (rank <= 4) return 'aurora';
  if (rank <= BOARD_SIZE) return 'starlit';
  if (rank === BOARD_SIZE + 1) return 'lantern';
  return 'ember';
}

/** Board position, tier and points for an answer index. */
export function scoreFor(
  mode: SurveyMode,
  prompt: SurveyPrompt,
  index: number,
): { rank: number; tier: Tier; points: number } {
  const rank = rankFor(mode, prompt, index);
  const tier = tierForRank(rank);
  return { rank, tier, points: TIERS[tier].points };
}

export function maxPointsFor(_mode: SurveyMode, _prompt?: SurveyPrompt): number {
  return MAX_PER_PROMPT;
}

/** Points turned into metres of climb, the way the game shows progress. */
export function heightFor(points: number): number {
  return Math.max(0, points) * HEIGHT_PER_POINT;
}

/** How obvious the top answer is, shown on the prompt card. */
export function difficultyFor(prompt: SurveyPrompt): 'Easy' | 'Medium' | 'Hard' {
  const top = Math.max(...prompt.answers.map((a) => a.weight));
  if (top >= 30) return 'Easy';
  if (top >= 20) return 'Medium';
  return 'Hard';
}

export function bandFor(progress: number): 0 | 1 | 2 | 3 {
  const clamped = Math.max(0, Math.min(0.999, progress));
  return Math.floor(clamped * 4) as 0 | 1 | 2 | 3;
}

/* ------------------------------------------------------------------ judge */

const CATCH_ALL = new Set([
  'stuff',
  'thing',
  'things',
  'something',
  'anything',
  'whatever',
  'idk',
  'dunno',
  'none',
  'nothing',
  'who know',
  'etc',
  'other',
  'misc',
]);

export interface Judgement {
  ok: boolean;
  /** Why an answer was turned away, shown under the input. */
  reason: string | null;
  /** Board index when the answer is on the board. */
  index: number | null;
  tier: Tier;
  points: number;
  rank: number | null;
}

const TURNED_DOWN = (reason: string): Judgement => ({
  ok: false,
  reason,
  index: null,
  tier: 'lost',
  points: 0,
  rank: null,
});

/** Off-board answers still get graded, just never better than Lantern. */
function offBoardTier(prompt: SurveyPrompt, given: string): Tier {
  const guess = normaliseAnswer(given);
  const sharesRoot = prompt.answers.some((a) => {
    const form = normaliseAnswer(a.text);
    return form.length > 3 && (form.startsWith(guess.slice(0, 4)) || guess.startsWith(form.slice(0, 4)));
  });
  if (sharesRoot) return 'lantern';
  return guess.length >= 6 ? 'lantern' : 'ember';
}

/**
 * The judge: generous about form, strict about substance. Board answers take
 * their place; a sensible answer off the board is graded no higher than
 * Lantern; jokes, catch-alls and two answers in one are turned away.
 */
export function judge(mode: SurveyMode, prompt: SurveyPrompt, raw: string): Judgement {
  const given = raw.trim();
  if (!given) return TURNED_DOWN('Type an answer first.');

  const norm = normaliseAnswer(given);
  if (!norm) return TURNED_DOWN('Letters and numbers only, please.');
  if (CATCH_ALL.has(norm)) return TURNED_DOWN('That could be anything. Name the thing itself.');

  const parts = given
    .toLowerCase()
    .split(/\band\b|,|\//)
    .map((p) => p.trim())
    .filter((p) => p.length > 2);
  if (parts.length > 1) return TURNED_DOWN('One answer at a time.');

  const promptWords = new Set(normaliseAnswer(prompt.prompt).split(' ').filter((w) => w.length > 3));
  const words = norm.split(' ').filter(Boolean);
  if (words.length && words.every((w) => promptWords.has(w))) {
    return TURNED_DOWN('That is the prompt itself. Name the thing.');
  }

  const index = matchAnswer(prompt, given);
  if (index !== null) {
    const scored = scoreFor(mode, prompt, index);
    return { ok: true, reason: null, index, tier: scored.tier, points: scored.points, rank: scored.rank };
  }

  const tier = offBoardTier(prompt, given);
  return { ok: true, reason: null, index: null, tier, points: TIERS[tier].points, rank: null };
}

/* ------------------------------------------------------- prompt selection */

function shuffled(pool: SurveyPrompt[], seed: number): SurveyPrompt[] {
  const rng = mulberry32(seed);
  const list = pool.slice();
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = list[i];
    list[i] = list[j];
    list[j] = swap;
  }
  return list;
}

/** Seven prompts for Classic, reshuffled from a fresh seed each run. */
export function classicPrompts(mode: SurveyMode, seed: number, count = PROMPTS_PER_DAY): SurveyPrompt[] {
  return shuffled(SURVEY_PROMPTS, hashSeed(`noct-classic-${mode}-${seed}`)).slice(0, count);
}

/**
 * Classic keeps a deck instead of rolling dice: it deals the next seven off a
 * shuffled bank and only reshuffles once the deck runs low, so a prompt cannot
 * come back until the whole bank has been seen.
 */
export function classicDeck(
  mode: SurveyMode,
  left: string[],
  seed: number,
  count = PROMPTS_PER_DAY,
): { left: string[]; prompts: SurveyPrompt[] } {
  const deck = left.filter((id) => BY_ID.has(id));
  const tail = deck.slice(0, count);
  const fresh = shuffled(SURVEY_PROMPTS, hashSeed(`noct-classic-${mode}-${seed}`))
    .map((prompt) => prompt.id)
    .filter((id) => !tail.includes(id));
  const ready = deck.length >= count ? deck : [...tail, ...fresh];
  const dealt = ready.slice(0, count);
  return {
    left: ready.slice(count),
    prompts: dealt.map((id) => BY_ID.get(id)).filter((prompt): prompt is SurveyPrompt => Boolean(prompt)),
  };
}

/** Endless never runs out: it walks the shuffled bank, then reshuffles. */
export function endlessPromptAt(mode: SurveyMode, seed: number, index: number): SurveyPrompt {
  const round = Math.floor(index / SURVEY_PROMPTS.length);
  const order = shuffled(SURVEY_PROMPTS, hashSeed(`noct-endless-${mode}-${seed}-${round}`));
  return order[index % order.length];
}

/** Today's seven prompts, the same for everyone, in a stable shuffled order. */
export function dailyPrompts(day: number, mode: SurveyMode, count = PROMPTS_PER_DAY): SurveyPrompt[] {
  const rng = mulberry32(hashSeed(`noct-survey-${mode}-${day}`));
  const pool = SURVEY_PROMPTS.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = pool[i];
    pool[i] = pool[j];
    pool[j] = swap;
  }
  return pool.slice(0, count);
}

/** Share of respondents who gave the top answer — used in results copy. */
export function topShare(prompt: SurveyPrompt): number {
  return Math.max(...prompt.answers.map((a) => a.weight));
}
