/**
 * The nineteen places, drawn.
 *
 * Each place is a small composition of ASCII sprites in three depths — far,
 * mid, near — plus one light source, a handful of warm glints and at most a
 * few CSS-animated pieces. No image files, no gradients doing the work: the
 * silhouette is what makes a place recognisable at 48 px.
 *
 * Data only. PlaceScene turns it into pixels, and the palette still comes from
 * `scenes.ts`, so a room's weather and its art never disagree.
 */
import type { PlaceId } from './atlas.ts';

export type ArtKey = PlaceId | 'home' | 'arcade' | 'atlas';

/** A silhouette either catches the moonlight or stands black against it. */
export type ArtTone = 'glow' | 'ink';

export type ArtFx = 'smoke' | 'flicker' | 'sway' | 'bob' | 'flag' | 'drift';

export type CreatureKind = 'bird' | 'fish' | 'moth' | 'cat' | 'deer';
export type WindLevel = 'calm' | 'breeze' | 'gust';

export interface ArtCreature {
  kind: CreatureKind;
  /** left edge, in percent of the plate */
  x: number;
  /** bottom edge, in percent of the plate */
  y: number;
  /** width in percent of the plate */
  size: number;
}

export interface ArtPiece {
  grid: string[];
  /** left edge, in percent of the plate */
  x: number;
  /** bottom edge, in percent of the plate */
  y: number;
  /** width in percent of the plate; height follows the grid */
  w: number;
  /** ink pieces are dark silhouettes; glow pieces catch the room's light */
  tone?: ArtTone;
  /** optional pigment for one piece, e.g. a cream moon instead of amber */
  color?: string;
  /** a slow CSS motion; never a timer */
  fx?: ArtFx;
}

export type GlintFx = 'flicker' | 'firefly' | 'ripple' | 'halo';

/** A lit window, a star in the water, a firefly, a moon's breath. */
export interface ArtGlint {
  /** left edge, in percent */
  x: number;
  /** bottom edge, in percent */
  y: number;
  /** diameter, in percent of the plate width */
  size: number;
  fx?: GlintFx;
}

export interface PlaceArt {
  far: ArtPiece[];
  mid: ArtPiece[];
  near: ArtPiece[];
  /** where the place keeps its light */
  light: { x: number; y: number };
  /** ground line, as a share of the plate height */
  ground: number;
  glints?: ArtGlint[];
  /** birds, fish, moths and the neighbours who live here */
  creatures?: ArtCreature[];
  /** how the air moves through this world */
  wind?: WindLevel;
}

/* ------------------------------------------------------------------ sprites */

const PINE = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..', '..X..', '..X..'];
const PINE_TALL = ['..X..', '.XXX.', 'XXXXX', 'XXXXX', '.XXX.', '..X..', '..X..', '..X..'];

const TOWER = [
  '.X.X.X.',
  'XXXXXXX',
  '.XXXXX.',
  '.XX.XX.',
  '.XX.XX.',
  '.XXXXX.',
  '..XXX..',
];
const TOWER_TALL = [
  '..X.X..',
  '.XXXXX.',
  '..XXX..',
  '..XXX..',
  '..X.X..',
  '..XXX..',
  '..XXX..',
  '.XXXXX.',
];
const FLAG = ['XXXX...', 'XXXXXX.', 'XXXX...', 'XX.....'];

const LANTERN = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..', '..X..', '..X..'];
const LANTERN_POST = ['..X..', '.XXX.', '..X..', '..X..', '..X..', '..X..', '..X..', '.XXX.'];
const WINDOW = ['.XXX.', 'X.X.X', 'XXXXX', 'X.X.X', '.XXX.'];

const STALL = [
  'X.X.X.X',
  'XXXXXXX',
  'X.X.X.X',
  '.XXXXX.',
  '.X...X.',
  '.X...X.',
];
const CARD = ['.XX.', 'X..X', 'X..X', '.XX.'];
const CHAIR = ['X...X', 'X...X', 'XXXXX', '..X..', '..X..', '..X..'];
const STONE = ['.XX.', 'XXXX', 'XXXX'];

const ARCH = ['..XXX..', '.X...X.', 'X.....X', 'X.....X', 'X.....X'];
const AQUEDUCT = ['XXXXXXX', 'X.....X', 'X.....X', 'XXXXXXX', '..XXX..'];
const BRIDGE = ['XXXXXXXXX', 'X.......X', 'X.......X', 'X.X...X.X', '..X...X..'];
const BRIDGE_LONG = [
  'XXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXX',
  'XX.....XX.....XX.....XX',
  'XX.....XX.....XX.....XX',
  'XX.....XX.....XX.....XX',
  'XX.....XX.....XX.....XX',
];
const WATER = ['XXXXXXXXXX', 'XXXXXXXXXX'];

const HOUSE = [
  '....X....',
  '...XXX...',
  '..XXXXX..',
  '.XXXXXXX.',
  'XXXXXXXXX',
  'X.XXX.XXX',
  'X.XXX.XXX',
  'XXXXXXXXX',
];
const CROOKED = [
  '...XX....',
  '..XXXX...',
  '.XXXXXX..',
  'XXXXXXXX.',
  'X.XXX.XX.',
  'X.XXX.XX.',
  'XXXXXXXXX',
];
const CHIMNEY = ['XX', 'XX', 'XX'];
const WELL = [
  '..XXX..',
  '.X...X.',
  'X.....X',
  '.XXXXX.',
  '.X...X.',
  '.X...X.',
  '.XXXXX.',
];
const BUCKET = ['XXXXX', 'X...X', '.XXX.'];
const ROPE = ['X', 'X', 'X', 'X', 'X', 'X'];

const BELL = [
  '..XXX..',
  '.XXXXX.',
  '.XXXXX.',
  'XXXXXXX',
  'XXXXXXX',
  '..XXX..',
  '...X...',
];
const BELL_TOWER = [
  '..X.X..',
  '.XXXXX.',
  '..XXX..',
  '..X.X..',
  '..XXX..',
  '.XXXXX.',
  'X.....X',
  'X.....X',
];

const APPLE_TREE = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const HEDGE = ['XXXXXXX', 'XXXXXXX', '.XXXXX.', '.XXXXX.'];
const MOON = ['..XXX..', '.XXXXX.', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..'];
const STAR = ['..X..', '.XXX.', 'XXXXX', '.XXX.', '..X..'];
const CROWN = ['X.X.X', 'XXXXX', 'XXXXX', '.XXX.'];
const DOMINO = ['XX', 'XX', '..', 'XX'];
const CRATER = ['.XXXXX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.'];
const HILL = [
  '.............XXXXXXXXXXXXXXXXX',
  '.........XXXXXXXXXXXXXXXXXXXXX',
  '.....XXXXXXXXXXXXXXXXXXXXXXXXX',
  '..XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
];
const REEDS = ['..X...X..', '..X..X...', '.X..X..X.', 'X..X...X.', 'X.X..X.X.'];
const MENHIR = ['XXX', 'XX.', 'XX.', 'XXX'];
const STONE_CROSS = ['..X..', '..X..', 'XXXXX', '..X..', '..X..', '..X..'];
const FIRE = ['..X..', '.XXX.', 'XXXXX', '.XXX.'];
const CRATE = ['XXXXX', 'X.X.X', 'XXXXX', 'X.X.X', 'XXXXX'];
const CRATE_STACK = [
  '..XXXXX..',
  '..X.X.X..',
  '..XXXXX..',
  'XXXXX....',
  'X.X.X....',
  'XXXXX....',
];
const CART = ['X.....X', 'XXXXXXX', 'X.XXX.X', '..X.X..', '.X...X.'];
const TRELLIS = ['X.X.X.X.X', 'XXXXXXXXX', 'X.X.X.X.X', 'XXXXXXXXX', 'X.X.X.X.X'];
const LOOM = ['XXXXXXXXX', 'X.......X', 'X.XXXXX.X', 'X.......X', 'XXXXXXXXX', '..X...X..'];
const SPOOL = ['.XXX.', 'XXXXX', 'XXXXX', '.XXX.'];

/** Creature silhouettes, one grid per kind; they are animated by PlaceScene. */
export const CREATURE_ART: Record<CreatureKind, string[]> = {
  bird: ['X...X', '.X.X.', '..X..'],
  fish: ['..X..', 'XXXXX', '..X..'],
  moth: ['X.X', '.X.', 'X.X'],
  cat: ['X...X', 'XXXXX', 'XXXXX', 'X.X.X'],
  deer: ['X.X.X', '.XXX.', '.XXX.', '.XXX.', '.X.X.'],
};

/* ------------------------------------------------------------------- places */

export const PLACE_ART: Record<ArtKey, PlaceArt> = {
  home: {
    far: [
      { grid: PINE_TALL, x: 6, y: 30, w: 13 },
      { grid: TOWER_TALL, x: 42, y: 34, w: 16, tone: 'ink' },
      { grid: PINE, x: 82, y: 29, w: 12 },
    ],
    mid: [
      { grid: HOUSE, x: 24, y: 12, w: 16, tone: 'ink' },
      { grid: HOUSE, x: 64, y: 10, w: 14, tone: 'ink' },
      { grid: PINE, x: 92, y: 11, w: 10, fx: 'sway' },
    ],
    near: [{ grid: HEDGE, x: 12, y: 2, w: 24, fx: 'drift' }],
    light: { x: 48, y: 62 },
    ground: 22,
    glints: [
      { x: 28, y: 19, size: 2.4 },
      { x: 33, y: 19, size: 2.2 },
      { x: 69, y: 17, size: 2.3 },
      { x: 74, y: 17, size: 2 },
      { x: 46, y: 36, size: 2.4, fx: 'firefly' },
      { x: 48, y: 62, size: 22, fx: 'halo' },
    ],
  },
  common: {
    far: [{ grid: ARCH, x: 50, y: 34, w: 46 }],
    mid: [
      { grid: LANTERN_POST, x: 16, y: 14, w: 8, fx: 'sway' },
      { grid: LANTERN_POST, x: 84, y: 14, w: 8, fx: 'sway' },
      { grid: HEDGE, x: 50, y: 8, w: 30 },
    ],
    near: [
      { grid: LANTERN, x: 34, y: 30, w: 6, fx: 'bob' },
      { grid: LANTERN, x: 66, y: 30, w: 6, fx: 'bob' },
    ],
    light: { x: 50, y: 40 },
    ground: 20,
    glints: [
      { x: 35, y: 31, size: 3, fx: 'flicker' },
      { x: 67, y: 31, size: 3, fx: 'flicker' },
      { x: 50, y: 40, size: 18, fx: 'halo' },
      { x: 24, y: 58, size: 1.6, fx: 'firefly' },
      { x: 78, y: 52, size: 1.4, fx: 'firefly' },
    ],
  },
  rare: {
    far: [
      { grid: ARCH, x: 20, y: 30, w: 22 },
      { grid: ARCH, x: 80, y: 30, w: 22 },
    ],
    mid: [{ grid: CHAIR, x: 50, y: 12, w: 16 }],
    near: [{ grid: WINDOW, x: 50, y: 60, w: 14, fx: 'flicker' }],
    light: { x: 50, y: 66 },
    ground: 18,
    glints: [
      { x: 50, y: 66, size: 20, fx: 'halo' },
      { x: 54, y: 63, size: 2.6, fx: 'flicker' },
      { x: 22, y: 46, size: 1.5, fx: 'firefly' },
    ],
  },
  noct: {
    far: [{ grid: WINDOW, x: 16, y: 42, w: 18 }],
    mid: [
      { grid: WINDOW, x: 50, y: 46, w: 18 },
      { grid: WINDOW, x: 84, y: 42, w: 18 },
    ],
    near: [
      { grid: HOUSE, x: 50, y: 8, w: 34 },
      { grid: LANTERN, x: 8, y: 12, w: 5, fx: 'bob' },
    ],
    light: { x: 50, y: 50 },
    ground: 20,
    glints: [
      { x: 20, y: 47, size: 2.6, fx: 'flicker' },
      { x: 54, y: 51, size: 2.8, fx: 'flicker' },
      { x: 88, y: 47, size: 2.6, fx: 'flicker' },
      { x: 50, y: 54, size: 20, fx: 'halo' },
      { x: 66, y: 32, size: 1.6, fx: 'firefly' },
    ],
  },
  chess: {
    far: [{ grid: HILL, x: 0, y: 18, w: 52, tone: 'ink' }],
    mid: [
      { grid: HILL, x: -3, y: 14, w: 38, tone: 'ink' },
      { grid: MOON, x: 75, y: 60, w: 13, color: '#f8ecc4' },
      { grid: TOWER_TALL, x: 12, y: 34, w: 18, tone: 'ink' },
      { grid: FLAG, x: 15, y: 48, w: 8, fx: 'flag', color: '#f3c66f' },
      { grid: PINE, x: 3, y: 19, w: 9, tone: 'ink' },
      { grid: PINE_TALL, x: 44, y: 20, w: 10, tone: 'ink' },
      { grid: PINE, x: 52, y: 24, w: 8, tone: 'ink' },
      { grid: BRIDGE_LONG, x: 27, y: 10, w: 48, tone: 'ink' },
      { grid: HOUSE, x: 57, y: 18, w: 16, tone: 'ink' },
      { grid: HOUSE, x: 73, y: 16, w: 15, tone: 'ink' },
      { grid: HOUSE, x: 87, y: 17, w: 13, tone: 'ink' },
      { grid: CHIMNEY, x: 65, y: 27, w: 2.4, fx: 'smoke' },
      { grid: CHIMNEY, x: 90, y: 26, w: 2.2, fx: 'smoke' },
      { grid: LANTERN_POST, x: 26, y: 13, w: 4.5, fx: 'sway' },
    ],
    near: [{ grid: REEDS, x: 2, y: 2, w: 11, tone: 'ink' }],
    light: { x: 80, y: 66 },
    ground: 22,
    glints: [
      { x: 81, y: 66, size: 22, fx: 'halo' },
      { x: 20, y: 42, size: 3.6, fx: 'flicker' },
      { x: 61, y: 21, size: 3.4, fx: 'flicker' },
      { x: 66, y: 21, size: 3.2, fx: 'flicker' },
      { x: 71, y: 21, size: 3.3, fx: 'flicker' },
      { x: 77, y: 20, size: 3.3, fx: 'flicker' },
      { x: 82, y: 20, size: 3.2, fx: 'flicker' },
      { x: 90, y: 20, size: 3.4, fx: 'flicker' },
      { x: 95, y: 20, size: 3.1, fx: 'flicker' },
      { x: 29, y: 16, size: 3, fx: 'flicker' },
      { x: 38, y: 7, size: 5, fx: 'ripple' },
      { x: 50, y: 5, size: 4, fx: 'ripple' },
      { x: 62, y: 7, size: 5, fx: 'ripple' },
      { x: 74, y: 4, size: 4, fx: 'ripple' },
      { x: 86, y: 6, size: 5, fx: 'ripple' },
      { x: 47, y: 31, size: 1.8, fx: 'firefly' },
    ],
  },
  mines: {
    far: [
      { grid: STAR, x: 18, y: 58, w: 8, fx: 'flicker' },
      { grid: STAR, x: 78, y: 66, w: 6, fx: 'flicker' },
      { grid: STAR, x: 46, y: 74, w: 4, fx: 'flicker' },
    ],
    mid: [
      { grid: CRATER, x: 34, y: 14, w: 26 },
      { grid: STONE, x: 72, y: 12, w: 12 },
    ],
    near: [{ grid: STONE, x: 52, y: 6, w: 10 }],
    light: { x: 22, y: 60 },
    ground: 18,
    glints: [
      { x: 22, y: 60, size: 22, fx: 'halo' },
      { x: 40, y: 30, size: 1.4, fx: 'firefly' },
      { x: 58, y: 22, size: 1.2, fx: 'firefly' },
      { x: 66, y: 38, size: 1.6, fx: 'firefly' },
    ],
  },
  pairs: {
    far: [{ grid: STALL, x: 50, y: 32, w: 40 }],
    mid: [
      { grid: CARD, x: 32, y: 16, w: 8 },
      { grid: CARD, x: 68, y: 16, w: 8 },
      { grid: LANTERN, x: 20, y: 44, w: 5, fx: 'sway' },
      { grid: LANTERN, x: 83, y: 44, w: 5, fx: 'sway' },
    ],
    near: [{ grid: LANTERN, x: 50, y: 62, w: 8, fx: 'bob' }],
    light: { x: 50, y: 48 },
    ground: 20,
    glints: [
      { x: 21, y: 45, size: 2.4, fx: 'flicker' },
      { x: 84, y: 45, size: 2.4, fx: 'flicker' },
      { x: 51, y: 63, size: 3.2, fx: 'flicker' },
      { x: 33, y: 18, size: 1.4, fx: 'flicker' },
      { x: 69, y: 18, size: 1.4, fx: 'flicker' },
      { x: 50, y: 50, size: 20, fx: 'halo' },
    ],
  },
  lights: {
    far: [
      { grid: PINE, x: 86, y: 26, w: 14 },
      { grid: PINE_TALL, x: 6, y: 24, w: 12 },
    ],
    mid: [
      { grid: CROOKED, x: 44, y: 30, w: 42 },
      { grid: CHIMNEY, x: 63, y: 58, w: 2.4, fx: 'smoke' },
    ],
    near: [
      { grid: WINDOW, x: 34, y: 44, w: 8, fx: 'flicker' },
      { grid: WINDOW, x: 50, y: 46, w: 8, fx: 'flicker' },
      { grid: WINDOW, x: 66, y: 44, w: 8, fx: 'flicker' },
    ],
    light: { x: 44, y: 52 },
    ground: 20,
    glints: [
      { x: 36, y: 46, size: 2.4, fx: 'flicker' },
      { x: 52, y: 48, size: 2.6, fx: 'flicker' },
      { x: 68, y: 46, size: 2.4, fx: 'flicker' },
      { x: 44, y: 56, size: 22, fx: 'halo' },
      { x: 24, y: 36, size: 1.4, fx: 'firefly' },
      { x: 80, y: 34, size: 1.6, fx: 'firefly' },
    ],
  },
  snake: {
    far: [
      { grid: APPLE_TREE, x: 20, y: 34, w: 20, fx: 'sway' },
      { grid: APPLE_TREE, x: 80, y: 30, w: 18, fx: 'sway' },
    ],
    mid: [{ grid: HEDGE, x: 50, y: 14, w: 34 }],
    near: [{ grid: APPLE_TREE, x: 52, y: 6, w: 14 }],
    light: { x: 50, y: 44 },
    ground: 22,
    glints: [
      { x: 26, y: 41, size: 1.8, fx: 'flicker' },
      { x: 32, y: 38, size: 1.6, fx: 'flicker' },
      { x: 76, y: 37, size: 1.8, fx: 'flicker' },
      { x: 84, y: 40, size: 1.6, fx: 'flicker' },
      { x: 50, y: 46, size: 18, fx: 'halo' },
      { x: 58, y: 30, size: 3, fx: 'ripple' },
    ],
  },
  numbers: {
    far: [{ grid: WINDOW, x: 50, y: 52, w: 22, fx: 'flicker' }],
    mid: [
      { grid: LANTERN, x: 24, y: 18, w: 12, fx: 'bob' },
      { grid: LANTERN, x: 76, y: 18, w: 12, fx: 'bob' },
    ],
    near: [{ grid: LANTERN_POST, x: 50, y: 8, w: 10, fx: 'sway' }],
    light: { x: 50, y: 56 },
    ground: 18,
    glints: [
      { x: 25, y: 19, size: 4, fx: 'flicker' },
      { x: 77, y: 19, size: 4, fx: 'flicker' },
      { x: 50, y: 56, size: 24, fx: 'halo' },
      { x: 51, y: 55, size: 3.4, fx: 'flicker' },
      { x: 50, y: 34, size: 1.6, fx: 'firefly' },
    ],
  },
  reversi: {
    far: [{ grid: MOON, x: 74, y: 68, w: 14 }],
    mid: [
      { grid: HEDGE, x: 18, y: 14, w: 26, fx: 'sway' },
      { grid: HEDGE, x: 84, y: 14, w: 24, fx: 'sway' },
    ],
    near: [
      { grid: STONE, x: 50, y: 12, w: 8 },
      { grid: STONE, x: 62, y: 8, w: 8 },
      { grid: STONE, x: 38, y: 8, w: 7 },
    ],
    light: { x: 74, y: 70 },
    ground: 20,
    glints: [
      { x: 78, y: 70, size: 28, fx: 'halo' },
      { x: 40, y: 26, size: 1.6, fx: 'firefly' },
      { x: 58, y: 32, size: 1.4, fx: 'firefly' },
      { x: 50, y: 42, size: 2, fx: 'flicker' },
    ],
  },
  checkers: {
    far: [{ grid: ARCH, x: 50, y: 30, w: 44 }],
    mid: [{ grid: CROWN, x: 50, y: 14, w: 12 }],
    near: [
      { grid: STONE, x: 22, y: 8, w: 10 },
      { grid: LANTERN_POST, x: 82, y: 10, w: 6, fx: 'sway' },
    ],
    light: { x: 50, y: 46 },
    ground: 20,
    glints: [
      { x: 50, y: 16, size: 2, fx: 'flicker' },
      { x: 83, y: 17, size: 2.6, fx: 'flicker' },
      { x: 28, y: 22, size: 1.4, fx: 'firefly' },
      { x: 50, y: 44, size: 18, fx: 'halo' },
    ],
  },
  connect4: {
    far: [{ grid: AQUEDUCT, x: 30, y: 40, w: 44 }],
    mid: [
      { grid: LANTERN, x: 20, y: 30, w: 7, fx: 'sway' },
      { grid: LANTERN, x: 80, y: 30, w: 7, fx: 'sway' },
    ],
    near: [{ grid: WATER, x: 50, y: 4, w: 78, fx: 'drift' }],
    light: { x: 50, y: 46 },
    ground: 16,
    glints: [
      { x: 21, y: 31, size: 2.6, fx: 'flicker' },
      { x: 81, y: 31, size: 2.6, fx: 'flicker' },
      { x: 36, y: 6, size: 5, fx: 'ripple' },
      { x: 50, y: 5, size: 4, fx: 'ripple' },
      { x: 64, y: 6, size: 5, fx: 'ripple' },
      { x: 50, y: 44, size: 20, fx: 'halo' },
    ],
  },
  dominoes: {
    far: [{ grid: BRIDGE, x: 50, y: 26, w: 60 }],
    mid: [
      { grid: DOMINO, x: 30, y: 34, w: 6 },
      { grid: DOMINO, x: 68, y: 34, w: 6 },
      { grid: LANTERN_POST, x: 14, y: 12, w: 5, fx: 'sway' },
    ],
    near: [{ grid: WATER, x: 50, y: 4, w: 86, fx: 'drift' }],
    light: { x: 50, y: 40 },
    ground: 16,
    glints: [
      { x: 15, y: 18, size: 2.2, fx: 'flicker' },
      { x: 30, y: 6, size: 4, fx: 'ripple' },
      { x: 48, y: 5, size: 5, fx: 'ripple' },
      { x: 66, y: 6, size: 4, fx: 'ripple' },
      { x: 50, y: 38, size: 18, fx: 'halo' },
    ],
  },
  wordwell: {
    far: [
      { grid: PINE, x: 12, y: 28, w: 14, fx: 'sway' },
      { grid: PINE_TALL, x: 88, y: 30, w: 13, fx: 'sway' },
    ],
    mid: [{ grid: WELL, x: 50, y: 22, w: 30 }],
    near: [
      { grid: ROPE, x: 50, y: 46, w: 1.4, fx: 'sway' },
      { grid: BUCKET, x: 50, y: 54, w: 9, fx: 'bob' },
      { grid: HEDGE, x: 22, y: 8, w: 22 },
    ],
    light: { x: 50, y: 58 },
    ground: 20,
    glints: [
      { x: 48, y: 56, size: 3.2, fx: 'flicker' },
      { x: 50, y: 32, size: 2, fx: 'flicker' },
      { x: 50, y: 60, size: 18, fx: 'halo' },
      { x: 38, y: 62, size: 3, fx: 'ripple' },
      { x: 60, y: 63, size: 2.4, fx: 'ripple' },
    ],
  },
  memorybell: {
    far: [{ grid: BELL_TOWER, x: 46, y: 34, w: 26 }],
    mid: [{ grid: BELL, x: 46, y: 58, w: 12, fx: 'sway' }],
    near: [
      { grid: PINE, x: 10, y: 10, w: 16 },
      { grid: HEDGE, x: 78, y: 8, w: 22 },
    ],
    light: { x: 46, y: 62 },
    ground: 20,
    glints: [
      { x: 46, y: 62, size: 22, fx: 'halo' },
      { x: 50, y: 56, size: 2, fx: 'flicker' },
      { x: 50, y: 34, size: 1.8, fx: 'flicker' },
      { x: 24, y: 32, size: 1.5, fx: 'firefly' },
      { x: 72, y: 30, size: 1.4, fx: 'firefly' },
    ],
  },
  mancala: {
    far: [
      { grid: HILL, x: -2, y: 18, w: 50, tone: 'ink' },
      { grid: PINE_TALL, x: 88, y: 24, w: 10, tone: 'ink' },
    ],
    mid: [
      { grid: MOON, x: 78, y: 62, w: 12, color: '#f8ecc4' },
      { grid: MENHIR, x: 16, y: 20, w: 8, tone: 'ink' },
      { grid: MENHIR, x: 31, y: 24, w: 7, tone: 'ink' },
      { grid: MENHIR, x: 74, y: 21, w: 8, tone: 'ink' },
      { grid: FIRE, x: 49, y: 22, w: 8, fx: 'flicker' },
      { grid: STONE, x: 49, y: 10, w: 18, tone: 'ink' },
    ],
    near: [
      { grid: STONE, x: 20, y: 6, w: 10 },
      { grid: HEDGE, x: 70, y: 6, w: 26 },
    ],
    light: { x: 49, y: 30 },
    ground: 20,
    glints: [
      { x: 49, y: 30, size: 18, fx: 'halo' },
      { x: 50, y: 34, size: 3, fx: 'flicker' },
      { x: 38, y: 42, size: 1.6, fx: 'firefly' },
      { x: 62, y: 37, size: 1.5, fx: 'firefly' },
    ],
  },
  pegs: {
    far: [
      { grid: HILL, x: 0, y: 18, w: 52, tone: 'ink' },
      { grid: PINE_TALL, x: 8, y: 28, w: 10, tone: 'ink' },
    ],
    mid: [
      { grid: MOON, x: 78, y: 64, w: 12, color: '#f8ecc4' },
      { grid: STONE_CROSS, x: 52, y: 30, w: 10, color: '#b8ad96' },
      { grid: HOUSE, x: 18, y: 16, w: 15, tone: 'ink' },
      { grid: PINE, x: 84, y: 18, w: 9, tone: 'ink' },
    ],
    near: [
      { grid: LANTERN_POST, x: 28, y: 10, w: 5, fx: 'sway' },
      { grid: HEDGE, x: 65, y: 6, w: 28 },
      { grid: STONE, x: 44, y: 7, w: 7 },
    ],
    light: { x: 52, y: 38 },
    ground: 20,
    glints: [
      { x: 52, y: 38, size: 18, fx: 'halo' },
      { x: 29, y: 17, size: 2.8, fx: 'flicker' },
      { x: 23, y: 21, size: 2.4, fx: 'flicker' },
      { x: 40, y: 27, size: 1.4, fx: 'firefly' },
    ],
  },
  crates: {
    far: [
      { grid: HEDGE, x: 0, y: 18, w: 34, tone: 'ink' },
      { grid: CRATE_STACK, x: 8, y: 28, w: 20, tone: 'ink' },
      { grid: PINE_TALL, x: 86, y: 26, w: 11, tone: 'ink' },
    ],
    mid: [
      { grid: CRATE_STACK, x: 64, y: 28, w: 22, tone: 'ink' },
      { grid: CART, x: 38, y: 24, w: 16 },
      { grid: LANTERN_POST, x: 52, y: 12, w: 6, fx: 'sway' },
      { grid: CRATE, x: 24, y: 14, w: 8 },
    ],
    near: [
      { grid: CRATE, x: 76, y: 8, w: 12 },
      { grid: HEDGE, x: 12, y: 6, w: 24 },
    ],
    light: { x: 55, y: 46 },
    ground: 19,
    glints: [
      { x: 55, y: 24, size: 2.8, fx: 'flicker' },
      { x: 55, y: 46, size: 18, fx: 'halo' },
      { x: 30, y: 38, size: 1.6, fx: 'firefly' },
      { x: 76, y: 34, size: 1.4, fx: 'firefly' },
    ],
  },
  boxes: {
    far: [
      { grid: PINE_TALL, x: 4, y: 30, w: 10, tone: 'ink' },
      { grid: TRELLIS, x: 20, y: 34, w: 44, tone: 'ink' },
      { grid: HEDGE, x: 70, y: 20, w: 30, tone: 'ink' },
    ],
    mid: [
      { grid: LOOM, x: 44, y: 26, w: 22, tone: 'ink' },
      { grid: SPOOL, x: 28, y: 22, w: 8, fx: 'bob' },
      { grid: SPOOL, x: 70, y: 22, w: 8, fx: 'bob' },
      { grid: LANTERN, x: 56, y: 46, w: 5, fx: 'flicker' },
    ],
    near: [
      { grid: SPOOL, x: 82, y: 7, w: 11 },
      { grid: HEDGE, x: 8, y: 6, w: 24 },
      { grid: TRELLIS, x: 48, y: 7, w: 30 },
    ],
    light: { x: 56, y: 49 },
    ground: 19,
    glints: [
      { x: 56, y: 49, size: 18, fx: 'halo' },
      { x: 30, y: 26, size: 2.2, fx: 'flicker' },
      { x: 72, y: 26, size: 2.2, fx: 'flicker' },
      { x: 42, y: 40, size: 1.5, fx: 'firefly' },
      { x: 66, y: 38, size: 1.5, fx: 'firefly' },
    ],
  },
  arcade: {
    far: [
      { grid: TOWER_TALL, x: 14, y: 32, w: 14 },
      { grid: STALL, x: 50, y: 30, w: 20 },
      { grid: BELL_TOWER, x: 84, y: 32, w: 16 },
    ],
    mid: [
      { grid: LANTERN_POST, x: 30, y: 10, w: 6, fx: 'sway' },
      { grid: LANTERN_POST, x: 70, y: 10, w: 6, fx: 'sway' },
      { grid: HOUSE, x: 40, y: 34, w: 12, tone: 'ink' },
      { grid: HOUSE, x: 58, y: 34, w: 12, tone: 'ink' },
    ],
    near: [{ grid: HEDGE, x: 50, y: 6, w: 40 }],
    light: { x: 50, y: 46 },
    ground: 20,
    glints: [
      { x: 31, y: 12, size: 2.2, fx: 'flicker' },
      { x: 71, y: 12, size: 2.2, fx: 'flicker' },
      { x: 43, y: 38, size: 2, fx: 'flicker' },
      { x: 61, y: 38, size: 2, fx: 'flicker' },
      { x: 50, y: 46, size: 22, fx: 'halo' },
      { x: 20, y: 26, size: 1.4, fx: 'firefly' },
      { x: 86, y: 24, size: 1.5, fx: 'firefly' },
    ],
  },
  atlas: {
    far: [{ grid: MOON, x: 82, y: 66, w: 12 }],
    mid: [
      { grid: TOWER, x: 22, y: 24, w: 18 },
      { grid: BRIDGE, x: 60, y: 20, w: 34 },
      { grid: LANTERN_POST, x: 74, y: 8, w: 5, fx: 'sway' },
    ],
    near: [{ grid: PINE, x: 40, y: 8, w: 12 }],
    light: { x: 82, y: 68 },
    ground: 22,
    glints: [
      { x: 84, y: 68, size: 26, fx: 'halo' },
      { x: 75, y: 14, size: 2.2, fx: 'flicker' },
      { x: 24, y: 30, size: 1.8, fx: 'flicker' },
      { x: 38, y: 18, size: 1.5, fx: 'firefly' },
      { x: 64, y: 12, size: 3, fx: 'ripple' },
    ],
  },
};

/**
 * The shared weather of the worlds: one or two creatures per place and an air
 * current. Kept separate from the silhouettes so the art above stays readable.
 */
const LIFE: Record<ArtKey, { wind: WindLevel; creatures: ArtCreature[] }> = {
  home: {
    wind: 'breeze',
    creatures: [
      { kind: 'bird', x: 16, y: 76, size: 5 },
      { kind: 'bird', x: 62, y: 67, size: 4 },
    ],
  },
  common: {
    wind: 'breeze',
    creatures: [
      { kind: 'moth', x: 31, y: 40, size: 3 },
      { kind: 'moth', x: 66, y: 42, size: 2.5 },
    ],
  },
  rare: { wind: 'calm', creatures: [{ kind: 'moth', x: 54, y: 48, size: 2.6 }] },
  noct: {
    wind: 'breeze',
    creatures: [
      { kind: 'bird', x: 20, y: 78, size: 4 },
      { kind: 'moth', x: 70, y: 44, size: 2.4 },
    ],
  },
  chess: {
    wind: 'breeze',
    creatures: [
      { kind: 'bird', x: 58, y: 55, size: 4 },
      { kind: 'fish', x: 63, y: 4, size: 4 },
    ],
  },
  mines: { wind: 'calm', creatures: [{ kind: 'moth', x: 38, y: 52, size: 2.4 }] },
  pairs: {
    wind: 'breeze',
    creatures: [
      { kind: 'cat', x: 20, y: 8, size: 7 },
      { kind: 'moth', x: 72, y: 42, size: 2.2 },
    ],
  },
  lights: { wind: 'breeze', creatures: [{ kind: 'cat', x: 27, y: 8, size: 7 }] },
  snake: {
    wind: 'gust',
    creatures: [
      { kind: 'bird', x: 70, y: 68, size: 4 },
      { kind: 'deer', x: 74, y: 14, size: 9 },
    ],
  },
  numbers: { wind: 'calm', creatures: [{ kind: 'moth', x: 50, y: 68, size: 2.6 }] },
  reversi: { wind: 'breeze', creatures: [{ kind: 'deer', x: 28, y: 12, size: 9 }] },
  checkers: { wind: 'breeze', creatures: [{ kind: 'cat', x: 70, y: 8, size: 7 }] },
  connect4: {
    wind: 'breeze',
    creatures: [
      { kind: 'fish', x: 48, y: 5, size: 4 },
      { kind: 'bird', x: 20, y: 70, size: 4 },
    ],
  },
  dominoes: {
    wind: 'gust',
    creatures: [
      { kind: 'fish', x: 48, y: 4, size: 4 },
      { kind: 'bird', x: 68, y: 64, size: 4 },
    ],
  },
  wordwell: {
    wind: 'breeze',
    creatures: [
      { kind: 'fish', x: 54, y: 4, size: 4 },
      { kind: 'moth', x: 44, y: 44, size: 2.4 },
    ],
  },
  memorybell: {
    wind: 'breeze',
    creatures: [
      { kind: 'moth', x: 32, y: 42, size: 2.4 },
      { kind: 'bird', x: 70, y: 72, size: 4 },
    ],
  },
  mancala: {
    wind: 'breeze',
    creatures: [
      { kind: 'deer', x: 74, y: 13, size: 9 },
      { kind: 'moth', x: 30, y: 43, size: 2.4 },
    ],
  },
  pegs: {
    wind: 'calm',
    creatures: [
      { kind: 'cat', x: 64, y: 9, size: 7 },
      { kind: 'moth', x: 34, y: 46, size: 2.4 },
    ],
  },
  crates: {
    wind: 'breeze',
    creatures: [
      { kind: 'cat', x: 82, y: 8, size: 7 },
      { kind: 'moth', x: 42, y: 42, size: 2.4 },
    ],
  },
  boxes: {
    wind: 'breeze',
    creatures: [
      { kind: 'moth', x: 38, y: 44, size: 2.6 },
      { kind: 'moth', x: 64, y: 38, size: 2.1 },
      { kind: 'bird', x: 22, y: 72, size: 3.8 },
    ],
  },
  arcade: {
    wind: 'breeze',
    creatures: [
      { kind: 'bird', x: 18, y: 75, size: 4 },
      { kind: 'cat', x: 82, y: 8, size: 6 },
    ],
  },
  atlas: {
    wind: 'breeze',
    creatures: [
      { kind: 'bird', x: 62, y: 72, size: 4 },
      { kind: 'moth', x: 42, y: 40, size: 2.2 },
    ],
  },
};

for (const key of Object.keys(PLACE_ART) as ArtKey[]) {
  Object.assign(PLACE_ART[key], LIFE[key]);
}

export function artFor(place: ArtKey): PlaceArt {
  return PLACE_ART[place] ?? PLACE_ART.home;
}
