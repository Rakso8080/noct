/**
 * The Long Road: a projection of the 13 places and the records already kept
 * by the games. Nothing here changes a rule or duplicates a score.
 */
import { MAX_SCORE } from '../../shared/score.ts';
import { dayNumber } from '../../shared/dates.ts';
import type { StatsResponse, TodayResponse } from '../../shared/types.ts';
import type { SurveyMode } from '../../shared/survey.ts';
import type { GamesStore } from './gamesStore.ts';
import {
  bestFor,
  classicBestRun,
  dailyRunFor,
  endlessBestFor,
  playedCount,
  type SurveyRun,
} from './surveyStore.ts';
import { hashSeed, mulberry32 } from './rng.ts';

export type ChapterId = 'choir' | 'keep' | 'tables';

export type PlaceId =
  | 'common'
  | 'rare'
  | 'noct'
  | 'chess'
  | 'mines'
  | 'pairs'
  | 'lights'
  | 'snake'
  | 'numbers'
  | 'reversi'
  | 'checkers'
  | 'connect4'
  | 'dominoes';

type GamePlaceId = Exclude<PlaceId, 'common' | 'rare' | 'noct'>;

export type PlaceShape =
  | 'up'
  | 'down'
  | 'diamond'
  | 'ring'
  | 'rook'
  | 'star'
  | 'cards'
  | 'window'
  | 'apple'
  | 'spark'
  | 'crown'
  | 'drop'
  | 'domino';

export interface Chapter {
  id: ChapterId;
  numeral: string;
  name: string;
  note: string;
}

export interface Place {
  id: PlaceId;
  chapter: ChapterId;
  path: string;
  name: string;
  placeName: string;
  kind: string;
  tone: string;
  shape: PlaceShape;
  note: string;
}

export interface PlaceMarks {
  /** the place has any record at all */
  waymark: boolean;
  /** the place was played today */
  night: boolean;
  /** a personal record, win or comparable mark exists */
  keepsake: boolean;
}

export interface AtlasRecord {
  key: string;
  vars?: Record<string, string | number>;
}

export interface PlaceView extends Place {
  marks: PlaceMarks;
  record: AtlasRecord | null;
}

export interface SurveySnapshot {
  today: SurveyRun | null;
  best: number;
  playedDays: number;
  classic: boolean;
  endlessBest: number;
}

export interface NoctSnapshot {
  playedToday: boolean;
  activeToday: boolean;
  bestScore: number | null;
  completedDays: number;
}

export interface AtlasSources {
  day: number;
  games: GamesStore;
  common: SurveySnapshot;
  rare: SurveySnapshot;
  noct: NoctSnapshot;
}

export const CHAPTERS: readonly Chapter[] = [
  {
    id: 'choir',
    numeral: 'I',
    name: 'The Night Choir',
    note: 'Where the valley sings the same note into the dark.',
  },
  {
    id: 'keep',
    numeral: 'II',
    name: 'The Candle Keep',
    note: 'The old keep above the water, where every table keeps a light.',
  },
  {
    id: 'tables',
    numeral: 'III',
    name: 'The Side Tables',
    note: 'Inns, orchards and quiet rooms along the last stretch of road.',
  },
];

export const PLACES: readonly Place[] = [
  {
    id: 'common',
    chapter: 'choir',
    path: '/common',
    name: 'Common',
    placeName: 'The Night Choir',
    kind: 'choir',
    tone: 'ember',
    shape: 'up',
    note: 'A chorus in the valley: seven prompts, one loud answer at a time.',
  },
  {
    id: 'rare',
    chapter: 'choir',
    path: '/rare',
    name: 'Rare',
    placeName: 'The Empty Hall',
    kind: 'hall',
    tone: 'moss',
    shape: 'down',
    note: 'The same seven prompts from the far end, where the quietest answer carries.',
  },
  {
    id: 'noct',
    chapter: 'choir',
    path: '/play',
    name: 'Noct',
    placeName: 'The Lantern Grid',
    kind: 'lanterns',
    tone: 'slate',
    shape: 'diamond',
    note: 'Four boards of dark windows, one spark in every row, column and tone.',
  },
  {
    id: 'chess',
    chapter: 'keep',
    path: '/chess',
    name: 'Chess',
    placeName: 'The Candle Keep',
    kind: 'board',
    tone: 'violet',
    shape: 'rook',
    note: 'Walnut, stone and candlelight; every rule, and a friend across the table.',
  },
  {
    id: 'mines',
    chapter: 'keep',
    path: '/mines',
    name: 'Mines',
    placeName: 'The Fallen Star Field',
    kind: 'sky',
    tone: 'rust',
    shape: 'star',
    note: 'Ten fallen stars under a 9×9 field. The first tap is always safe.',
  },
  {
    id: 'pairs',
    chapter: 'keep',
    path: '/pairs',
    name: 'Pairs',
    placeName: 'The Keepsake Market',
    kind: 'keepsakes',
    tone: 'teal',
    shape: 'cards',
    note: 'A stall of face-down keepsakes, with one honest peek for the road.',
  },
  {
    id: 'lights',
    chapter: 'keep',
    path: '/lights',
    name: 'Lights',
    placeName: 'The Crooked Cottage',
    kind: 'windows',
    tone: 'sand',
    shape: 'window',
    note: 'Twenty-five leaded windows; shut them all and let the stars through.',
  },
  {
    id: 'snake',
    chapter: 'tables',
    path: '/snake',
    name: 'Snake',
    placeName: 'The Glass Orchard',
    kind: 'orchard',
    tone: 'orchard',
    shape: 'apple',
    note: 'One press, one step through the glass rows, twelve apples before the walls.',
  },
  {
    id: 'numbers',
    chapter: 'tables',
    path: '/numbers',
    name: '2048',
    placeName: 'The Doubling Room',
    kind: 'room',
    tone: 'amber',
    shape: 'spark',
    note: 'Slide the lanterns, fuse equals, and light a 512 tile before the room fills.',
  },
  {
    id: 'reversi',
    chapter: 'tables',
    path: '/reversi',
    name: 'Reversi',
    placeName: 'The Moon Garden',
    kind: 'table',
    tone: 'stone',
    shape: 'ring',
    note: 'Bone and obsidian discs turn under the moon; trap a line and take the garden.',
  },
  {
    id: 'checkers',
    chapter: 'tables',
    path: '/checkers',
    name: 'Checkers',
    placeName: 'The Clay Courtyard',
    kind: 'draughts',
    tone: 'clay',
    shape: 'crown',
    note: 'Forced captures and long jumps on warm clay, with a crown waiting at the far rank.',
  },
  {
    id: 'connect4',
    chapter: 'tables',
    path: '/connect4',
    name: 'Connect Four',
    placeName: 'The Lantern Aqueduct',
    kind: 'columns',
    tone: 'channel',
    shape: 'drop',
    note: 'Drop a lantern down the aqueduct; four in a row lights the whole channel.',
  },
  {
    id: 'dominoes',
    chapter: 'tables',
    path: '/dominoes',
    name: 'Dominoes',
    placeName: 'The Long Bridge',
    kind: 'line',
    tone: 'ivory',
    shape: 'domino',
    note: 'Bone, rosewood and brass on a bridge over black water; empty your hand first.',
  },
];

export const PLACE_BY_ID: Record<PlaceId, Place> = PLACES.reduce(
  (map, place) => {
    map[place.id] = place;
    return map;
  },
  {} as Record<PlaceId, Place>,
);

export const ROUTE_STOPS = 3;
const ATLAS_KEY = 'noct.atlas.v1';
const MAX_ROUTE_STAMPS = 30;

export function placesForChapter(chapter: ChapterId): readonly Place[] {
  return PLACES.filter((place) => place.chapter === chapter);
}

function surveyMarks(snapshot: SurveySnapshot): PlaceMarks {
  return {
    waymark:
      snapshot.playedDays > 0 ||
      snapshot.today !== null ||
      snapshot.best > 0 ||
      snapshot.classic ||
      snapshot.endlessBest > 0,
    night: snapshot.today !== null,
    keepsake: snapshot.best > 0 || snapshot.classic || snapshot.endlessBest > 0,
  };
}

function noctMarks(snapshot: NoctSnapshot): PlaceMarks {
  return {
    waymark: snapshot.completedDays > 0 || snapshot.playedToday || snapshot.activeToday,
    night: snapshot.playedToday,
    keepsake: (snapshot.bestScore ?? 0) > 0,
  };
}

function tableRecord(wins: number, losses: number, draws: number): AtlasRecord | null {
  if (wins + losses + draws === 0) return null;
  return { key: '{wins}W · {losses}L · {draws}D', vars: { wins, losses, draws } };
}

function gameMarks(id: GamePlaceId, games: GamesStore, day: number): PlaceMarks {
  const key = String(day);

  switch (id) {
    case 'chess': {
      const daily = games.chess.daily[key];
      const total = games.chess.wins + games.chess.losses + games.chess.draws;
      return {
        waymark: Boolean(daily) || total > 0 || games.chess.saved !== null,
        night: Boolean(daily),
        keepsake: total > 0,
      };
    }
    case 'mines': {
      const daily = games.mines.daily[key];
      const hasBest = games.mines.bestFree !== null || Object.keys(games.mines.best).length > 0;
      return {
        waymark: Boolean(daily) || hasBest,
        night: Boolean(daily),
        keepsake: hasBest,
      };
    }
    case 'pairs': {
      const daily = games.pairs.daily[key];
      return {
        waymark:
          Boolean(daily) ||
          games.pairs.bestMoves !== null ||
          games.pairs.bestFreeMoves !== null,
        night: Boolean(daily),
        keepsake: games.pairs.bestMoves !== null || games.pairs.bestFreeMoves !== null,
      };
    }
    case 'lights': {
      const daily = games.lights.daily[key];
      return {
        waymark:
          Boolean(daily) || games.lights.bestMoves !== null || games.lights.bestFree !== null,
        night: Boolean(daily),
        keepsake: games.lights.bestMoves !== null || games.lights.bestFree !== null,
      };
    }
    case 'snake': {
      const daily = games.snake.daily[key];
      return {
        waymark:
          Boolean(daily) || games.snake.best !== null || games.snake.wins > 0 || games.snake.saved !== null,
        night: Boolean(daily),
        keepsake: games.snake.best !== null || games.snake.wins > 0,
      };
    }
    case 'numbers': {
      const daily = games.numbers.daily[key];
      return {
        waymark:
          Boolean(daily) || games.numbers.bestScore !== null || games.numbers.saved !== null,
        night: Boolean(daily),
        keepsake: games.numbers.bestScore !== null,
      };
    }
    case 'reversi': {
      const daily = games.reversi.daily[key];
      const total = games.reversi.wins + games.reversi.losses + games.reversi.draws;
      return {
        waymark: Boolean(daily) || total > 0 || games.reversi.saved !== null,
        night: Boolean(daily),
        keepsake: games.reversi.bestMargin !== null || total > 0,
      };
    }
    case 'checkers': {
      const daily = games.checkers.daily[key];
      const total = games.checkers.wins + games.checkers.losses + games.checkers.draws;
      return {
        waymark: Boolean(daily) || total > 0,
        night: Boolean(daily),
        keepsake: games.checkers.bestWin !== null || total > 0,
      };
    }
    case 'connect4': {
      const daily = games.connect4.daily[key];
      const total = games.connect4.wins + games.connect4.losses + games.connect4.draws;
      return {
        waymark: Boolean(daily) || total > 0,
        night: Boolean(daily),
        keepsake: games.connect4.bestWin !== null || total > 0,
      };
    }
    case 'dominoes': {
      const daily = games.dominoes.daily[key];
      const total = games.dominoes.wins + games.dominoes.losses + games.dominoes.draws;
      return {
        waymark: Boolean(daily) || total > 0,
        night: Boolean(daily),
        keepsake: games.dominoes.bestMargin !== null || total > 0,
      };
    }
  }
}

function gameRecord(id: GamePlaceId, games: GamesStore): AtlasRecord | null {
  switch (id) {
    case 'chess':
      return tableRecord(games.chess.wins, games.chess.losses, games.chess.draws);
    case 'mines': {
      const times = Object.values(games.mines.best);
      const best = games.mines.bestFree ?? (times.length ? Math.min(...times) : null);
      return best === null ? null : { key: 'Best {n}s', vars: { n: (best / 1000).toFixed(1) } };
    }
    case 'pairs': {
      const best = games.pairs.bestMoves ?? games.pairs.bestFreeMoves;
      return best === null ? null : { key: 'Best {n} moves', vars: { n: best } };
    }
    case 'lights': {
      const best = games.lights.bestMoves ?? games.lights.bestFree;
      return best === null ? null : { key: 'Best {n} presses', vars: { n: best } };
    }
    case 'snake':
      return games.snake.best === null
        ? null
        : { key: 'Best {n} steps', vars: { n: games.snake.best } };
    case 'numbers':
      return games.numbers.bestScore === null
        ? null
        : { key: 'Best {n}', vars: { n: games.numbers.bestScore } };
    case 'reversi':
      return tableRecord(games.reversi.wins, games.reversi.losses, games.reversi.draws);
    case 'checkers':
      return tableRecord(games.checkers.wins, games.checkers.losses, games.checkers.draws);
    case 'connect4':
      return tableRecord(games.connect4.wins, games.connect4.losses, games.connect4.draws);
    case 'dominoes':
      return tableRecord(games.dominoes.wins, games.dominoes.losses, games.dominoes.draws);
  }
}

export function marksFor(id: PlaceId, sources: AtlasSources): PlaceMarks {
  if (id === 'common') return surveyMarks(sources.common);
  if (id === 'rare') return surveyMarks(sources.rare);
  if (id === 'noct') return noctMarks(sources.noct);
  return gameMarks(id, sources.games, sources.day);
}

export function recordFor(id: PlaceId, sources: AtlasSources): AtlasRecord | null {
  if (id === 'common' || id === 'rare') {
    const best = id === 'common' ? sources.common.best : sources.rare.best;
    return best > 0 ? { key: 'Best {n} points', vars: { n: best } } : null;
  }
  if (id === 'noct') {
    if ((sources.noct.bestScore ?? 0) > 0) {
      return {
        key: 'Best {n} / {max}',
        vars: { n: sources.noct.bestScore ?? 0, max: MAX_SCORE },
      };
    }
    return sources.noct.completedDays > 0
      ? { key: '{n} boards finished', vars: { n: sources.noct.completedDays } }
      : null;
  }
  return gameRecord(id, sources.games);
}

export function placeView(id: PlaceId, sources: AtlasSources): PlaceView {
  return {
    ...PLACE_BY_ID[id],
    marks: marksFor(id, sources),
    record: recordFor(id, sources),
  };
}

export function allPlaceViews(sources: AtlasSources): PlaceView[] {
  return PLACES.map((place) => placeView(place.id, sources));
}

/** One stop from each chapter, stable for a given day and identical everywhere. */
export function nightRoute(day: number): Place[] {
  const rnd = mulberry32(hashSeed('atlas-route', day));
  return CHAPTERS.map((chapter) => {
    const places = placesForChapter(chapter.id);
    return places[Math.floor(rnd() * places.length)] ?? PLACES[0];
  });
}

export function routeComplete(views: readonly Pick<PlaceView, 'marks'>[]): boolean {
  return views.length === ROUTE_STOPS && views.every((view) => view.marks.night);
}

export function routeLitCount(views: readonly Pick<PlaceView, 'marks'>[]): number {
  return views.filter((view) => view.marks.night).length;
}

export function surveySnapshot(mode: SurveyMode, day = dayNumber()): SurveySnapshot {
  return {
    today: dailyRunFor(mode, day),
    best: bestFor(mode),
    playedDays: playedCount(mode),
    classic: classicBestRun(mode) !== null,
    endlessBest: endlessBestFor(mode),
  };
}

export function noctSnapshot(
  today: TodayResponse | null,
  stats: StatsResponse | null,
): NoctSnapshot {
  return {
    playedToday: Boolean(today?.played),
    activeToday: Boolean(today?.active),
    bestScore: stats?.bestScore ?? today?.score ?? null,
    completedDays: stats?.dailyCompleted ?? (today?.played ? 1 : 0),
  };
}

interface AtlasStore {
  routeStamps: string[];
}

function readAtlas(): AtlasStore {
  try {
    const raw = localStorage.getItem(ATLAS_KEY);
    if (!raw) return { routeStamps: [] };
    const parsed = JSON.parse(raw) as Partial<AtlasStore>;
    return {
      routeStamps: Array.isArray(parsed.routeStamps)
        ? parsed.routeStamps.filter((value): value is string => typeof value === 'string')
        : [],
    };
  } catch {
    return { routeStamps: [] };
  }
}

function writeAtlas(store: AtlasStore): void {
  try {
    localStorage.setItem(ATLAS_KEY, JSON.stringify(store));
  } catch {
    /* private mode: the seal still shows in this tab */
  }
}

export function readRouteStamps(): number[] {
  return readAtlas().routeStamps
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
}

/** Pure helper so the idempotent seal can be tested without a browser. */
export function addRouteStamp(stamps: readonly number[], day: number): number[] {
  const clean = [...new Set([...stamps, day])]
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((a, b) => a - b);
  return clean.slice(-MAX_ROUTE_STAMPS);
}

export function recordRouteStamp(day: number): boolean {
  const store = readAtlas();
  const current = store.routeStamps.map(Number);
  const next = addRouteStamp(
    current.filter((value) => Number.isInteger(value) && value > 0),
    day,
  );
  if (next.length === current.length && next.every((value, index) => value === current[index])) {
    return false;
  }
  writeAtlas({ routeStamps: next.map(String) });
  return true;
}

export function clearAtlas(): void {
  try {
    localStorage.removeItem(ATLAS_KEY);
  } catch {
    /* private mode */
  }
}
