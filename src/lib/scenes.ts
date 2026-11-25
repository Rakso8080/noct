/**
 * The living valley: one atmosphere per place, layered over RealmBackdrop.
 *
 * Only data here — no React, no timers. SceneLayer turns it into a handful of
 * CSS-animated spans, and every value stays low-alpha so text contrast never
 * depends on it.
 */
import type { PlaceId } from './atlas.ts';

/** The thirteen places, plus the two rooms that look out over them all. */
export type SceneKey = PlaceId | 'home' | 'arcade' | 'atlas';

export type MoteKind = 'motes' | 'petals' | 'ash' | 'embers' | 'snow' | 'glints' | 'smoke';

export interface SceneSpec {
  /** Sky wash, top and bottom. Alpha keeps it a tint, not a wall. */
  sky: [string, string];
  /** Spark / mote colour. */
  glow: string;
  mote: MoteKind;
  /** 8–16 motes; more than that starts to read as weather, not air. */
  density: number;
  /** Baseline seconds for one full drift. */
  drift: number;
  /** A flat wash for the whole layer, used to warm or cool the room. */
  tint: string;
  /** i18n key: one quiet line about the air in this place. */
  note: string;
}

export const SCENES: Record<SceneKey, SceneSpec> = {
  home: {
    sky: ['rgba(80, 70, 140, 0.1)', 'rgba(10, 8, 20, 0.2)'],
    glow: '#f5c95c',
    mote: 'motes',
    density: 10,
    drift: 30,
    tint: 'rgba(130, 100, 200, 0.04)',
    note: 'The valley at the door, before anyone has chosen a table.',
  },
  common: {
    sky: ['rgba(74, 80, 168, 0.12)', 'rgba(14, 12, 38, 0.24)'],
    glow: '#f5c95c',
    mote: 'motes',
    density: 12,
    drift: 22,
    tint: 'rgba(122, 96, 200, 0.05)',
    note: 'A low chorus of sparks over the water.',
  },
  rare: {
    sky: ['rgba(48, 84, 92, 0.12)', 'rgba(8, 16, 28, 0.24)'],
    glow: '#9fe0c4',
    mote: 'motes',
    density: 10,
    drift: 27,
    tint: 'rgba(90, 170, 150, 0.05)',
    note: 'The hall keeps its breath; dust turns slowly in the dark.',
  },
  noct: {
    sky: ['rgba(58, 76, 144, 0.14)', 'rgba(6, 10, 28, 0.26)'],
    glow: '#9fc0ff',
    mote: 'motes',
    density: 14,
    drift: 24,
    tint: 'rgba(110, 140, 230, 0.05)',
    note: 'Lantern light in four rows, and nothing in a hurry.',
  },
  chess: {
    sky: ['rgba(122, 84, 44, 0.14)', 'rgba(16, 10, 22, 0.26)'],
    glow: '#f0b464',
    mote: 'smoke',
    density: 9,
    drift: 30,
    tint: 'rgba(200, 140, 70, 0.06)',
    note: 'Candle smoke and warm wax; the keep is still awake.',
  },
  mines: {
    sky: ['rgba(62, 60, 116, 0.12)', 'rgba(6, 8, 24, 0.26)'],
    glow: '#c9b6ff',
    mote: 'ash',
    density: 12,
    drift: 28,
    tint: 'rgba(150, 130, 240, 0.05)',
    note: 'Ash from old stars, rising without sound.',
  },
  pairs: {
    sky: ['rgba(38, 96, 92, 0.12)', 'rgba(6, 16, 20, 0.24)'],
    glow: '#7fd9c8',
    mote: 'glints',
    density: 10,
    drift: 20,
    tint: 'rgba(90, 200, 180, 0.05)',
    note: 'Brass dust over the keepsake stall.',
  },
  lights: {
    sky: ['rgba(124, 92, 40, 0.14)', 'rgba(22, 12, 18, 0.24)'],
    glow: '#ffd08a',
    mote: 'embers',
    density: 10,
    drift: 18,
    tint: 'rgba(230, 170, 90, 0.06)',
    note: 'Embers from twenty-five windows, drifting loose.',
  },
  snake: {
    sky: ['rgba(56, 110, 76, 0.12)', 'rgba(4, 18, 14, 0.26)'],
    glow: '#a8e6a0',
    mote: 'glints',
    density: 12,
    drift: 22,
    tint: 'rgba(120, 210, 150, 0.05)',
    note: 'Glass glints among the apple rows.',
  },
  numbers: {
    sky: ['rgba(130, 88, 28, 0.13)', 'rgba(18, 10, 20, 0.24)'],
    glow: '#ffc06a',
    mote: 'embers',
    density: 10,
    drift: 20,
    tint: 'rgba(240, 180, 90, 0.06)',
    note: 'Amber sparks off the doubling lanterns.',
  },
  reversi: {
    sky: ['rgba(96, 104, 152, 0.13)', 'rgba(8, 10, 30, 0.26)'],
    glow: '#dbe4ff',
    mote: 'petals',
    density: 11,
    drift: 26,
    tint: 'rgba(170, 185, 240, 0.05)',
    note: 'Pale petals on a cold, bright garden.',
  },
  checkers: {
    sky: ['rgba(130, 74, 50, 0.12)', 'rgba(18, 8, 12, 0.24)'],
    glow: '#e7a184',
    mote: 'motes',
    density: 9,
    drift: 24,
    tint: 'rgba(210, 130, 100, 0.05)',
    note: 'Clay dust settling over the courtyard.',
  },
  connect4: {
    sky: ['rgba(38, 92, 122, 0.13)', 'rgba(4, 10, 24, 0.26)'],
    glow: '#8fd4ff',
    mote: 'embers',
    density: 12,
    drift: 18,
    tint: 'rgba(110, 190, 240, 0.05)',
    note: 'Fireflies following the aqueduct down to the water.',
  },
  dominoes: {
    sky: ['rgba(70, 78, 98, 0.12)', 'rgba(6, 8, 16, 0.28)'],
    glow: '#ffe9c4',
    mote: 'motes',
    density: 10,
    drift: 34,
    tint: 'rgba(190, 190, 200, 0.04)',
    note: 'Mist on the long bridge, and the water beneath it.',
  },
  arcade: {
    sky: ['rgba(64, 70, 128, 0.12)', 'rgba(8, 8, 22, 0.24)'],
    glow: '#f5c95c',
    mote: 'motes',
    density: 11,
    drift: 26,
    tint: 'rgba(120, 110, 210, 0.05)',
    note: 'The whole valley from the ridge, every table at once.',
  },
  atlas: {
    sky: ['rgba(92, 74, 52, 0.12)', 'rgba(10, 10, 20, 0.26)'],
    glow: '#f5c95c',
    mote: 'glints',
    density: 9,
    drift: 24,
    tint: 'rgba(200, 170, 110, 0.05)',
    note: 'Ink, brass and a lamp left on over the map.',
  },
};

export const SCENE_PLACES = Object.keys(SCENES) as SceneKey[];

export function sceneFor(place: SceneKey): SceneSpec {
  return SCENES[place];
}
