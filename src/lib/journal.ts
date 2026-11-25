/**
 * The field book: a memory of the valley, not a mechanic.
 *
 * Notes unlock from the marks the atlas already derives, so nothing is stored
 * twice. Sightings are the only new state: six small things to notice in the
 * home scene, kept as a list of ids in this browser.
 */
import {
  PLACES,
  placeView,
  type AtlasSources,
  type PlaceId,
} from './atlas.ts';

const KEY = 'noct.journal.v1';

export interface FieldNote {
  place: PlaceId;
  text: string;
}

/** One note per place, in the atlas order. Unlocked by any mark at all. */
export const FIELD_NOTES: readonly FieldNote[] = [
  {
    place: 'common',
    text: 'The choir does not rehearse. It waits for the first answer, then follows it.',
  },
  {
    place: 'rare',
    text: 'From the far end of the hall the same seven questions sound like new ones.',
  },
  {
    place: 'noct',
    text: 'Four grids, and not one lantern touches another. The valley sleeps in the gaps.',
  },
  {
    place: 'chess',
    text: 'The keep keeps every rule and no clock. Candlelight is the only pressure.',
  },
  {
    place: 'mines',
    text: 'Ten stars fell here. The first stone you turn is always safe; the rest is arithmetic and nerve.',
  },
  {
    place: 'pairs',
    text: 'The market remembers faces. Turn two at a time and the stall gives one honest peek.',
  },
  {
    place: 'lights',
    text: 'Twenty-five windows. Press one and its neighbours answer; the sky comes through when all are shut.',
  },
  {
    place: 'snake',
    text: 'In the glass orchard everything grows in a straight line, until it turns.',
  },
  {
    place: 'numbers',
    text: 'Two lanterns of the same size become one. Keep doubling until the room is bright.',
  },
  {
    place: 'reversi',
    text: 'The garden is generous: every line you trap comes back in your own colour.',
  },
  {
    place: 'checkers',
    text: 'On warm clay a capture is compulsory, and a crown is only a longer way of walking.',
  },
  {
    place: 'connect4',
    text: 'Water falls four deep in the aqueduct. Line the lanterns and the whole channel lights.',
  },
  {
    place: 'dominoes',
    text: 'The bridge is long enough for one more tile. Empty your hand and the water stays quiet.',
  },
];

export type SightingId = 'fireflies' | 'cat' | 'snail' | 'deer' | 'wanderer' | 'tower';

export interface Sighting {
  id: SightingId;
  /** i18n key for the name used in the button and the field book */
  title: string;
  text: string;
}

export const SIGHTINGS: readonly Sighting[] = [
  {
    id: 'fireflies',
    title: 'the fireflies',
    text: 'Five small lights keep their own time above the meadow. They never land.',
  },
  {
    id: 'cat',
    title: 'the cat',
    text: 'The cat on the fence has watched every table in the valley and approves of none.',
  },
  {
    id: 'snail',
    title: 'the snail',
    text: 'A snail crosses the meadow all night and arrives exactly where it meant to.',
  },
  {
    id: 'deer',
    title: 'the stag',
    text: 'The stag walks the ridge at his own pace, antlers first, and never hurries for anyone.',
  },
  {
    id: 'wanderer',
    title: 'the wanderer',
    text: 'The wanderer carries the only lantern on the road. It is always the same size as yours.',
  },
  {
    id: 'tower',
    title: 'the tower window',
    text: 'One window in the keep is lit all night. Nobody has ever been seen inside it.',
  },
];

const SIGHTING_IDS = new Set<string>(SIGHTINGS.map((sighting) => sighting.id));

export function placeNameFor(place: PlaceId): string {
  return PLACES.find((item) => item.id === place)?.placeName ?? place;
}

/** A note appears as soon as the place has any mark: a visit, a night or a keepsake. */
export function unlockedNoteIds(sources: AtlasSources): PlaceId[] {
  return FIELD_NOTES.filter((note) => {
    const { marks } = placeView(note.place, sources);
    return marks.waymark || marks.night || marks.keepsake;
  }).map((note) => note.place);
}

export function unlockedNotes(sources: AtlasSources): FieldNote[] {
  const ids = new Set(unlockedNoteIds(sources));
  return FIELD_NOTES.filter((note) => ids.has(note.place));
}

interface JournalStore {
  sightings: string[];
}

function readJournal(): JournalStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sightings: [] };
    const parsed = JSON.parse(raw) as Partial<JournalStore>;
    return {
      sightings: Array.isArray(parsed.sightings)
        ? parsed.sightings.filter((value): value is string => typeof value === 'string' && SIGHTING_IDS.has(value))
        : [],
    };
  } catch {
    return { sightings: [] };
  }
}

function writeJournal(store: JournalStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* private mode: the sighting still counts for this tab */
  }
}

export function readSightings(): SightingId[] {
  return [...new Set(readJournal().sightings)] as SightingId[];
}

/** Returns true only when this is a new sighting, so callers can celebrate once. */
export function addSighting(id: SightingId): boolean {
  const store = readJournal();
  if (store.sightings.includes(id)) return false;
  writeJournal({ sightings: [...store.sightings, id] });
  return true;
}

export function clearJournal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export interface JournalProgress {
  notes: number;
  sightings: number;
  found: number;
  total: number;
}

export function journalProgress(sources: AtlasSources, sightings: readonly SightingId[]): JournalProgress {
  const notes = unlockedNoteIds(sources).length;
  const seen = new Set(sightings).size;
  return {
    notes,
    sightings: seen,
    found: notes + seen,
    total: FIELD_NOTES.length + SIGHTINGS.length,
  };
}
