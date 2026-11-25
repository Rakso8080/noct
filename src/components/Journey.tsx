import { Sprite } from './World';
import { ROUTE_KM } from '../../shared/survey';

/**
 * The run: the traveller crosses a country that changes climate as the score
 * carries them along. Used as a wide strip on the intro and result, and as the
 * whole stage while a run is being played.
 *
 * Two walk frames, a lantern, weather per climate and a scattering of small
 * ground details keep the scene busy without a single image file.
 */

/** A hooded wanderer, one step apart in the two frames. */
const WALK_A = [
  '...XXXX...',
  '..XXXXXX..',
  '..XX..XX..',
  '..XXXXXX..',
  '.XXXXXXXX.',
  '.XXXXXXXX.',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  '.XXXXXXXX.',
  '..XX..XX..',
  '..XX..XX..',
  '.XXX..XXX.',
];

const WALK_B = [
  '...XXXX...',
  '..XXXXXX..',
  '..XX..XX..',
  '..XXXXXX..',
  '.XXXXXXXX.',
  '.XXXXXXXX.',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  'XXXXXXXXXX',
  '.XXXXXXXX.',
  '...XXXX...',
  '...XXXX...',
  '..XXXXXX..',
];

const MOON = [
  '..XXXXX..',
  '.XXXXXXX.',
  'XXXXXXXXX',
  'XXX.XXXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  'XXXXXX.XX',
  'XXXXXXXXX',
  '..XXXXX..',
];

const BIRD_A = ['X.....X', '.X...X.', '..X.X..'];
const BIRD_B = ['X...X', '.X.X.', '..X..'];

const PINE = ['..XX..', '.XXXX.', 'XXXXXX', '.XXXX.', '..XX..', '..XX..', '..XX..'];
const BUSH = ['..XX..', '.XXXX.', 'XXXXXX', 'XXXXXX', '.XXXX.'];
const MUSHROOM = ['..XX..', '.XXXX.', 'XXXXXX', '..XX..', '..XX..'];
const CACTUS = ['..XX..', '..XX..', 'XX.XX.', 'XX.XX.', '..XX..', '..XX..'];
const DRY = ['..X...', '.XXX..', 'X.X.X.', '..X...'];
const ROCK_SMALL = ['.XX.', 'XXXX', 'XXXX'];
const ICE = ['X...X.', 'XX.XX.', 'XXXXX.', '.XXX..', '..X...', '..X...'];
const ICE_SMALL = ['X.X.', 'XXX.', '.X..'];
const ROCK = ['.XXX..', 'XXXXX.', 'XXXXXX', '.XXXX.'];
const DEAD = ['X.X.X.', '.XXX..', '..X...', '..X...', '..X...'];
/** Fixed but uneven spots, so the verge never looks stamped. */
const SCATTER = [
  { left: 3, scale: 1.1 },
  { left: 11, scale: 0.8 },
  { left: 19, scale: 1.25 },
  { left: 27, scale: 0.9 },
  { left: 34, scale: 0.7 },
  { left: 43, scale: 1.15 },
  { left: 52, scale: 0.85 },
  { left: 60, scale: 1.05 },
  { left: 69, scale: 0.75 },
  { left: 78, scale: 1.2 },
  { left: 86, scale: 0.95 },
  { left: 94, scale: 0.7 },
];
const GRASS = ['X..X..X', 'X.XX.XX', '.XXXXX.', '..XXX..'];
const FLOWER = ['X.X.', '.X..', 'XXX.'];

const ROUTE = [
  {
    id: 'forest',
    name: 'The Moss Woods',
    props: [PINE, BUSH, MUSHROOM],
    scatter: [GRASS, FLOWER],
    weather: 'fireflies',
  },
  {
    id: 'desert',
    name: 'The Amber Flats',
    props: [CACTUS, DRY, ROCK_SMALL],
    scatter: [GRASS, ROCK_SMALL],
    weather: 'sand',
  },
  {
    id: 'tundra',
    name: 'The Glass Tundra',
    props: [ICE, PINE, ICE_SMALL],
    scatter: [ICE_SMALL, GRASS],
    weather: 'snow',
  },
  {
    id: 'volcano',
    name: 'The Ember Ridge',
    props: [ROCK, DEAD, ROCK_SMALL],
    scatter: [ROCK_SMALL, GRASS],
    weather: 'embers',
  },
];

export function biomeFor(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  return ROUTE[Math.min(ROUTE.length - 1, Math.floor(clamped * ROUTE.length))];
}

export function distanceFor(progress: number): number {
  return Math.max(0, Math.min(1, progress)) * ROUTE_KM;
}

interface JourneyProps {
  progress: number;
  moving?: boolean;
  /** "strip" is the inline band; "stage" fills its parent as the playfield. */
  variant?: 'strip' | 'stage';
  /** What the traveller is carrying, shown in a bubble like a signpost. */
  answer?: string;
}

export function Journey({ progress, moving = false, variant = 'strip', answer = '' }: JourneyProps) {
  const biome = biomeFor(progress);
  const km = distanceFor(progress);

  return (
    <div className={`journey journey--${variant}`} data-biome={biome.id}>
      <div className="journey-sky" />
      <div className="journey-stars" />
      <div className="journey-cloud journey-cloud--a" />
      <div className="journey-cloud journey-cloud--b" />

      <span className="journey-bird journey-bird--a">
        <Sprite grid={BIRD_A} />
      </span>
      <span className="journey-bird journey-bird--b">
        <Sprite grid={BIRD_B} />
      </span>

      <div className="journey-moon" aria-hidden="true">
        <Sprite grid={MOON} />
      </div>

      <div className="journey-glow" />
      <div className="journey-atlas" aria-hidden="true">
        <span className="journey-atlas-island" />
        <span className="journey-atlas-keep" />
        <span className="journey-atlas-flies">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="journey-far" />
      <div className="journey-mid" />
      <div className="journey-ground" />
      <div className="journey-water" aria-hidden="true" />

      <div className="journey-weather" data-weather={biome.weather} aria-hidden="true" />

      <div className="journey-back" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ left: `${i * 13}%` }}>
            <Sprite grid={biome.props[(i + 1) % biome.props.length]} />
          </span>
        ))}
      </div>

      <div className="journey-track">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="journey-prop" style={{ left: `${i * 14}%` }}>
            <Sprite grid={biome.props[i % biome.props.length]} />
          </span>
        ))}
      </div>

      <div className="journey-scatter" aria-hidden="true">
        {SCATTER.map((spot, i) => (
          <span
            key={i}
            style={{ left: `${spot.left}%`, transform: `scale(${spot.scale})` }}
          >
            <Sprite grid={biome.scatter[i % biome.scatter.length]} />
          </span>
        ))}
      </div>

      <div className={`journey-traveller${moving ? ' is-moving' : ''}`}>
        <span className="journey-frame journey-frame--a">
          <Sprite grid={WALK_A} />
        </span>
        <span className="journey-frame journey-frame--b">
          <Sprite grid={WALK_B} />
        </span>
        <span className="journey-lantern" aria-hidden="true" />
        {answer ? <span className="journey-bubble">{answer}</span> : null}
      </div>

      <div className="journey-hud" aria-hidden="true">
        <span className="journey-biome">{biome.name}</span>
        <span className="journey-km">
          {km.toFixed(1)} / {ROUTE_KM} km
        </span>
      </div>
    </div>
  );
}
