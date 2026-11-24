import { Sprite } from './World';

/**
 * The run: instead of climbing a height, the traveller crosses a country.
 * Score pushes you further along a 12 km route, and crossing the thresholds
 * changes the climate around the road.
 */

const FOX = [
  '.......XX...',
  '......XXXX..',
  '.....XXXXX..',
  'X....XXXX...',
  'XX..XXXXX...',
  '.XXXXXXXX...',
  '..XXXXXX....',
  '..XX..XX....',
  '..XX..XX....',
];

const PINE = ['..XX..', '.XXXX.', 'XXXXXX', '.XXXX.', '..XX..', '..XX..', '..XX..'];

const CACTUS = ['..XX..', '..XX..', 'XX.XX.', 'XX.XX.', '..XX..', '..XX..'];

const ICE = ['X...X.', 'XX.XX.', 'XXXXX.', '.XXX..', '..X...', '..X...'];

const ROCK = ['.XXX..', 'XXXXX.', 'XXXXXX', '.XXXX.'];

const ROUTE = [
  { id: 'forest', name: 'The Moss Woods', prop: PINE },
  { id: 'desert', name: 'The Amber Flats', prop: CACTUS },
  { id: 'tundra', name: 'The Glass Tundra', prop: ICE },
  { id: 'volcano', name: 'The Ember Ridge', prop: ROCK },
];

export const ROUTE_KM = 12;

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
}

export function Journey({ progress, moving = false }: JourneyProps) {
  const biome = biomeFor(progress);
  const km = distanceFor(progress);

  return (
    <div className="journey" data-biome={biome.id}>
      <div className="journey-sky" />
      <div className="journey-sun" />
      <div className="journey-far" />
      <div className="journey-mid" />
      <div className="journey-ground" />

      <div className="journey-track">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i} className="journey-prop" style={{ left: `${i * 14}%` }}>
            <Sprite grid={biome.prop} />
          </span>
        ))}
      </div>

      <div className={`journey-traveller${moving ? ' is-moving' : ''}`}>
        <Sprite grid={FOX} />
      </div>

      <div className="journey-hud" aria-hidden="true">
        <span className="journey-biome">{biome.name}</span>
        <span className="journey-km">{km.toFixed(1)} / {ROUTE_KM} km</span>
      </div>
    </div>
  );
}
