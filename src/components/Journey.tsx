import { Sprite } from './World';
import { ROUTE_KM } from '../../shared/survey';

/**
 * The run: the traveller crosses a country that changes climate as the score
 * carries them along. Used as a wide strip on the intro and result, and as the
 * whole stage while a run is being played.
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
      <div className="journey-glow" />
      <div className="journey-cloud journey-cloud--a" />
      <div className="journey-cloud journey-cloud--b" />
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
